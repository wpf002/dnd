import { LedgerEntry, type FlagValue } from '@lantern/schema';
import { callStructured, type Flint } from '@lantern/flint';
import { z } from 'zod';
import { createSession, type GameSession } from './game.js';

/**
 * Phase 4 — campaigns that span sessions.
 *
 * The ledger is structured and queryable, NOT a transcript. Between sessions
 * a summarization pass writes *to the ledger*; the recap screen reads *from*
 * it. Faction clocks advance on session boundaries and visibly change
 * available content by seeding the next session's flags — which the graph's
 * ordinary guards then read. No new guard machinery: clocks reach the graph
 * through the same flag namespace everything else uses.
 *
 * Storage is in-memory behind the same shapes as the Prisma skeleton
 * (Campaign / Session / LedgerEntry); the swap to Postgres is an adapter.
 */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface CampaignSessionRecord {
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  endingBeat?: string;
  turnCount: number;
}

export interface Campaign {
  id: string;
  title: string;
  /** The adventure this campaign replays/continues. Multi-graph comes later. */
  graph: unknown;
  ledger: LedgerEntry[];
  sessions: CampaignSessionRecord[];
  activeSession?: string;
}

let campaignCounter = 0;
export const campaigns = new Map<string, Campaign>();

export function createCampaign(graph: unknown, title: string): Campaign {
  const campaign: Campaign = {
    id: `campaign-${++campaignCounter}`,
    title,
    graph,
    ledger: [],
    sessions: [],
  };
  campaigns.set(campaign.id, campaign);
  return campaign;
}

// ---------------------------------------------------------------------------
// Ledger primitives
// ---------------------------------------------------------------------------

/** Upsert semantics per kind — the Prisma skeleton's @@unique([kind, key]) mirrored. */
export function upsertEntry(ledger: LedgerEntry[], entry: LedgerEntry): LedgerEntry[] {
  const keyOf = (e: LedgerEntry): string => {
    switch (e.kind) {
      case 'npc_disposition':
        return `${e.kind}:${e.npc}:${e.axis}`;
      case 'faction_clock':
        return `${e.kind}:${e.faction}`;
      case 'promise':
        return `${e.kind}:${e.to}:${e.description}`;
      case 'flag':
        return `${e.kind}:${e.flag}`;
      case 'inventory':
        return `${e.kind}:${e.item}`;
      case 'wound':
        return `${e.kind}:${e.character}:${e.description}`;
    }
  };
  const key = keyOf(entry);
  const rest = ledger.filter((e) => keyOf(e) !== key);
  return [...rest, entry];
}

export function clockFlags(ledger: LedgerEntry[]): Record<string, FlagValue> {
  const flags: Record<string, FlagValue> = {};
  for (const e of ledger) {
    if (e.kind === 'faction_clock') {
      flags[`clock-${e.faction}`] = e.filled;
      if (e.filled >= e.segments) flags[`clock-${e.faction}-filled`] = true;
    }
    if (e.kind === 'flag') flags[e.flag] = e.value;
  }
  return flags;
}

// ---------------------------------------------------------------------------
// Session lifecycle within a campaign
// ---------------------------------------------------------------------------

export function startCampaignSession(campaign: Campaign): GameSession {
  if (campaign.activeSession) throw new Error('a session is already active');
  const session = createSession(
    campaign.graph,
    `${campaign.id}-s${campaign.sessions.length + 1}`,
  );
  // The ledger is the context: world flags and clock state seed the session,
  // so graph guards can gate content on what previous sessions did.
  session.flags = { ...clockFlags(campaign.ledger), ...session.flags };
  campaign.sessions.push({
    sessionId: session.id,
    startedAt: new Date().toISOString(),
    turnCount: 0,
  });
  campaign.activeSession = session.id;
  return session;
}

/**
 * The compaction schema: what a summarization pass is allowed to say. This is
 * what makes compaction a structured job rather than a text squeeze — output
 * that isn't a valid ledger delta is rejected by the same validate-then-repair
 * machinery as everything else.
 */
export const LedgerDelta = z.object({
  entries: z.array(LedgerEntry).max(30),
});
export type LedgerDelta = z.infer<typeof LedgerDelta>;

/**
 * Mechanical compaction — the deterministic floor. Session flags become
 * ledger flags; party wounds become wound entries; the ending is recorded.
 * A model pass (when a key exists) can *add* dispositions and promises on
 * top, but the floor guarantees the campaign never loses mechanical state.
 */
export function mechanicalDelta(session: GameSession): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  for (const [flag, value] of Object.entries(session.flags)) {
    if (flag.startsWith('clock-')) continue; // derived, not stored back
    entries.push({ kind: 'flag', flag, value });
  }
  for (const pc of session.party) {
    if (pc.hp < pc.hpMax / 2) {
      entries.push({
        kind: 'wound',
        character: pc.id,
        description: `left ${session.graph.metadata.title} at ${pc.hp}/${pc.hpMax} HP`,
        severity: pc.hp === 0 ? 'grievous' : pc.hp < pc.hpMax / 4 ? 'serious' : 'minor',
        healed: false,
      });
    }
  }
  return entries;
}

export interface EndSessionResult {
  campaign: Campaign;
  delta: LedgerEntry[];
  compaction: 'mechanical' | 'model';
}

export async function endCampaignSession(
  campaign: Campaign,
  session: GameSession,
  flint?: Flint,
): Promise<EndSessionResult> {
  if (campaign.activeSession !== session.id) throw new Error('session is not this campaign\'s active session');

  let delta = mechanicalDelta(session);
  let compaction: EndSessionResult['compaction'] = 'mechanical';

  // Optional model pass: structured summarization *to the ledger*, through
  // the generator-grade validation loop. Skipped cleanly when no key.
  if (flint) {
    const result = await callStructured(flint, 'compaction', {
      schema: LedgerDelta,
      schemaName: 'LedgerDelta',
      maxRepairs: 1,
      input: {
        input: [
          `Summarize this play session as ledger entries (dispositions, promises, flags, wounds).`,
          `Only record what the turn log supports. Turn log:`,
          JSON.stringify(session.turns.slice(-50)),
          `Final beat: ${session.currentBeat}. Flags: ${JSON.stringify(session.flags)}.`,
        ].join('\n'),
      },
    });
    if (result.ok) {
      // Re-parse at the seam boundary: flint's generic returns the value under
      // its own zod identity; parsing pins it to the app's schema types.
      const parsed = LedgerDelta.parse(result.value);
      delta = [...delta, ...parsed.entries];
      compaction = 'model';
    }
  }

  for (const entry of delta) campaign.ledger = upsertEntry(campaign.ledger, entry);

  // Faction clocks advance on session boundaries — every clock, one segment.
  for (const entry of campaign.ledger) {
    if (entry.kind === 'faction_clock') {
      entry.filled = Math.min(entry.segments, entry.filled + 1);
    }
  }

  const record = campaign.sessions.find((s) => s.sessionId === session.id)!;
  record.endedAt = new Date().toISOString();
  record.endingBeat = session.currentBeat;
  record.turnCount = session.turns.length;
  delete campaign.activeSession;

  return { campaign, delta, compaction };
}

// ---------------------------------------------------------------------------
// Recap — reads FROM the ledger, never from a transcript
// ---------------------------------------------------------------------------

export interface Recap {
  title: string;
  sessions: number;
  lastPlayed?: string;
  dispositions: Array<{ npc: string; axis: string; value: number }>;
  clocks: Array<{ faction: string; filled: number; segments: number; consequence: string }>;
  promises: Array<{ to: string; description: string; status: string }>;
  wounds: Array<{ character: string; description: string; severity: string }>;
  worldFlags: Array<{ flag: string; value: FlagValue }>;
}

export function buildRecap(campaign: Campaign): Recap {
  const pick = <K extends LedgerEntry['kind']>(kind: K) =>
    campaign.ledger.filter((e): e is Extract<LedgerEntry, { kind: K }> => e.kind === kind);
  return {
    title: campaign.title,
    sessions: campaign.sessions.filter((s) => s.endedAt).length,
    ...(campaign.sessions.at(-1)?.endedAt !== undefined
      ? { lastPlayed: campaign.sessions.at(-1)!.endedAt! }
      : {}),
    dispositions: pick('npc_disposition').map((e) => ({ npc: e.npc, axis: e.axis, value: e.value })),
    clocks: pick('faction_clock').map((e) => ({
      faction: e.faction,
      filled: e.filled,
      segments: e.segments,
      consequence: e.consequence,
    })),
    promises: pick('promise')
      .filter((e) => e.status === 'open')
      .map((e) => ({ to: e.to, description: e.description, status: e.status })),
    wounds: pick('wound')
      .filter((e) => !e.healed)
      .map((e) => ({ character: e.character, description: e.description, severity: e.severity })),
    worldFlags: pick('flag').map((e) => ({ flag: e.flag, value: e.value })),
  };
}
