import {
  CampaignGraph,
  LedgerEntry,
  type Book,
  type CampaignProgress,
  type Character,
  type FlagValue,
} from '@lantern/schema';
import { evaluateGuard, levelParty } from '@lantern/engine';
import { PREGENS, PREGENS_LEVEL_1 } from '@lantern/srd';
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
  /** The adventure currently in play. For a multi-book campaign, the current book's. */
  graph: unknown;
  ledger: LedgerEntry[];
  sessions: CampaignSessionRecord[];
  activeSession?: string;

  // -- Multi-book (Phase 6). Absent on a single-adventure campaign. -----------

  /** The book sequence. Its presence is what makes a campaign multi-book. */
  book?: CampaignGraph;
  /** Which book, what level, what is finished. */
  progress?: CampaignProgress;
  /**
   * The party, carried across books with its levels and its wounds.
   *
   * This is why it lives on the campaign rather than the session: a session is
   * one book, and a party that reset between books would make levelling
   * pointless.
   */
  party?: Character[];
  /** Set once every book has been played (or skipped by an unmet gate). */
  completedAt?: string;
}

let campaignCounter = 0;
export const campaigns = new Map<string, Campaign>();

function currentBook(campaign: Campaign): Book | undefined {
  if (!campaign.book || !campaign.progress) return undefined;
  return campaign.book.books[campaign.progress.bookIndex];
}

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

/**
 * The pregens at any level, built by advancing the nearest lower baseline.
 *
 * Two baselines exist because `levelUp` cannot run backwards. Picking the
 * highest one at or below the target matters: a level-3+ campaign starts from
 * the authored level-3 sheets and keeps their fuller spell lists, while a
 * campaign opening at 1 or 2 starts from the level-1 sheets instead of
 * silently getting level-3 characters — which is what happened when this
 * called `levelParty(PREGENS, 1)` and got back four unchanged level-3
 * characters, because levelling down is a no-op.
 */
export function partyAtLevel(level: number): Character[] {
  const base = level >= 3 ? PREGENS : PREGENS_LEVEL_1;
  return levelParty(base, level).map((r) => r.character);
}

/**
 * Start a multi-book campaign.
 *
 * The party is built at the first book's `levelStart` up front rather than
 * assumed: a campaign that opens at level 5 opens with a level-5 party, and
 * the levelling goes through the same `levelParty` play uses.
 *
 * @param resolve Adventure id -> graph. Injected so this service never touches
 *   the filesystem; the route owns that, and the linter still gates it.
 */
export function createBookCampaign(
  input: unknown,
  resolve: (adventureId: string) => unknown,
  title?: string,
  /** A character the player made, in place of the pregen of their class. */
  character?: Character,
): Campaign {
  const book = CampaignGraph.parse(input);
  const first = book.books[0]!;
  const campaign: Campaign = {
    id: `campaign-${++campaignCounter}`,
    title: title ?? book.metadata.title,
    graph: resolve(first.adventure),
    book,
    progress: {
      campaign: book.id,
      bookIndex: 0,
      partyLevel: first.levelStart,
      completedBooks: [],
    },
    party: character
      ? // Levelled to the band first, so a level-1 sheet can start a campaign
        // that opens at 5 without arriving four levels short.
        levelParty(
          partyAtLevel(first.levelStart).map((p) =>
            p.characterClass === character.characterClass ? character : p,
          ),
          first.levelStart,
        ).map((r) => r.character)
      : partyAtLevel(first.levelStart),
    ledger: [],
    sessions: [],
  };
  campaigns.set(campaign.id, campaign);
  return campaign;
}

export interface BookTransition {
  completed: Book;
  /** Absent when the campaign is over — either out of books, or all gates failed. */
  next?: Book;
  /** Books skipped because their entry guard did not hold. */
  skipped: Book[];
  /** Level the party was raised to on completing the book. */
  partyLevel: number;
  featuresGained: string[];
  /**
   * Who died in the book just finished. They are replaced before the next one
   * opens — a table does not play three books down three characters — and the
   * between-books screen says so rather than quietly handing back a full
   * party.
   */
  fallen?: string[];
}

/**
 * Finish the current book and open the next one.
 *
 * Three things happen here that nothing else does: the book's `onComplete`
 * lands in the ledger (so a later book can read it), the party levels to the
 * book's `levelEnd`, and the next enterable book is chosen by evaluating entry
 * guards against campaign state — which is what makes a campaign branch rather
 * than merely concatenate.
 */
export function completeBook(
  campaign: Campaign,
  resolve: (adventureId: string) => unknown,
): BookTransition | undefined {
  const book = currentBook(campaign);
  if (!book || !campaign.book || !campaign.progress) return undefined;

  for (const mutation of book.onComplete) {
    campaign.ledger = upsertEntry(campaign.ledger, {
      kind: 'flag',
      flag: mutation.flag,
      value: mutation.value,
    });
  }

  // A book ends; the dead are replaced before the next one starts.
  //
  // Death is permanent within a session — that is deliberate and stays. But a
  // campaign carried the corpses forward: three of four died in book two and
  // the party walked into book three as one fighter on 1 hit point, against
  // encounters balanced for four. Nothing said so and nothing could fix it.
  //
  // A table does not play that way. Someone rolls a new character and turns up
  // in the next chapter, at the level everyone else is. So does this — same
  // class, so the party keeps its shape and the encounter maths still holds.
  const fallen = (campaign.party ?? PREGENS).filter((p) => p.dead);
  if (fallen.length > 0) {
    const replacements = partyAtLevel(book.levelEnd);
    campaign.party = (campaign.party ?? PREGENS).map((member) => {
      if (!member.dead) return member;
      const fresh =
        replacements.find((r) => r.characterClass === member.characterClass) ?? replacements[0]!;
      return structuredClone(fresh);
    });
  }

  const results = levelParty(campaign.party ?? PREGENS, book.levelEnd);
  campaign.party = results.map((r) => r.character);
  campaign.progress.partyLevel = book.levelEnd;
  campaign.progress.completedBooks = [...campaign.progress.completedBooks, book.id];

  // Guards read the ledger, not session flags — a book gate may depend on
  // something set several books ago.
  const flags = clockFlags(campaign.ledger);
  const skipped: Book[] = [];
  let next: Book | undefined;
  for (let i = campaign.progress.bookIndex + 1; i < campaign.book.books.length; i++) {
    const candidate = campaign.book.books[i]!;
    if (evaluateGuard(candidate.entryWhen, flags)) {
      next = candidate;
      campaign.progress.bookIndex = i;
      break;
    }
    skipped.push(candidate);
  }

  if (next) {
    campaign.graph = resolve(next.adventure);
    // The party enters the next book at its own start level. Normally equal to
    // the previous book's levelEnd — the linter rejects a campaign where it
    // is not — but honour the declaration rather than assume.
    if (next.levelStart > campaign.progress.partyLevel) {
      campaign.party = levelParty(campaign.party, next.levelStart).map((r) => r.character);
      campaign.progress.partyLevel = next.levelStart;
    }
  } else {
    campaign.progress.bookIndex = campaign.book.books.length;
    campaign.completedAt = new Date().toISOString();
  }

  return {
    completed: book,
    ...(next ? { next } : {}),
    skipped,
    partyLevel: campaign.progress.partyLevel,
    featuresGained: [...new Set(results.flatMap((r) => r.featuresGained))],
    // Who did not come back. Reported so the between-books screen can say it
    // rather than quietly handing the player a full party again.
    ...(fallen.length > 0 ? { fallen: fallen.map((p) => p.name) } : {}),
  };
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
  if (campaign.book && !currentBook(campaign)) {
    throw new Error('campaign is complete — every book has been played');
  }
  const session = createSession(
    campaign.graph,
    `${campaign.id}-s${campaign.sessions.length + 1}`,
    campaign.party,
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
  /** Set when this session finished a book and the campaign moved on. */
  transition?: BookTransition;
}

/**
 * @param resolve Adventure resolver, required only for multi-book campaigns —
 *   a book transition has to load the next book's graph.
 */
export async function endCampaignSession(
  campaign: Campaign,
  session: GameSession,
  flint?: Flint,
  resolve?: (adventureId: string) => unknown,
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

  // The party carries forward with whatever the book cost it. Wounds persist
  // across books; that is the point of a campaign.
  if (campaign.book) campaign.party = session.party.map((p) => structuredClone(p));

  // A book is finished when its graph reached a terminal beat. A session that
  // merely stopped early leaves the book open, to be resumed next sitting.
  let transition: BookTransition | undefined;
  if (campaign.book && session.ended && resolve) {
    transition = completeBook(campaign, resolve);
  }

  return { campaign, delta, compaction, ...(transition ? { transition } : {}) };
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
