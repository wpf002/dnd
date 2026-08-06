import { LedgerEntry, Resolution } from '@lantern/schema';
import type { Campaign } from './campaign.js';
import type { GameSession } from './game.js';

/**
 * Persistence. Two implementations of one interface:
 *
 *  - MemoryStore — what the routes always start from; zero dependencies.
 *  - PrismaStore — SQLite via @lantern/db. Sessions persist as full
 *    snapshots (resume state), turns ALSO persist as individual rows so the
 *    audit trail (invariant 5) is queryable without deserializing sessions,
 *    and ledger entries persist as kind+key rows (structured and queryable,
 *    per Phase 4 — never a transcript).
 *
 * The store is write-behind: routes mutate in memory and call persist();
 * on a cold start, load() rehydrates. A store failure never blocks a turn —
 * persistence errors are logged and play continues, because a private tool
 * that refuses to play because its disk hiccupped has its priorities wrong.
 */

export interface Store {
  saveSession(session: GameSession, campaignId?: string): Promise<void>;
  loadSession(id: string): Promise<GameSession | undefined>;
  saveCampaign(campaign: Campaign): Promise<void>;
  loadCampaign(id: string): Promise<Campaign | undefined>;
  listCampaigns(): Promise<Array<{ id: string; title: string }>>;
}

export class MemoryStore implements Store {
  private readonly sessions = new Map<string, string>();
  private readonly campaigns = new Map<string, string>();

  saveSession(session: GameSession): Promise<void> {
    this.sessions.set(session.id, JSON.stringify(session));
    return Promise.resolve();
  }
  loadSession(id: string): Promise<GameSession | undefined> {
    const raw = this.sessions.get(id);
    return Promise.resolve(raw ? (JSON.parse(raw) as GameSession) : undefined);
  }
  saveCampaign(campaign: Campaign): Promise<void> {
    this.campaigns.set(campaign.id, JSON.stringify(campaign));
    return Promise.resolve();
  }
  loadCampaign(id: string): Promise<Campaign | undefined> {
    const raw = this.campaigns.get(id);
    return Promise.resolve(raw ? (JSON.parse(raw) as Campaign) : undefined);
  }
  listCampaigns(): Promise<Array<{ id: string; title: string }>> {
    return Promise.resolve(
      [...this.campaigns.values()].map((raw) => {
        const c = JSON.parse(raw) as Campaign;
        return { id: c.id, title: c.title };
      }),
    );
  }
}

/** Ledger key derivation — the same identity upsertEntry uses in memory. */
export function ledgerKey(e: LedgerEntry): string {
  switch (e.kind) {
    case 'npc_disposition':
      return `${e.npc}:${e.axis}`;
    case 'faction_clock':
      return e.faction;
    case 'promise':
      return `${e.to}:${e.description}`;
    case 'flag':
      return e.flag;
    case 'inventory':
      return e.item;
    case 'wound':
      return `${e.character}:${e.description}`;
  }
}

type PrismaLike = {
  session: {
    upsert(args: object): Promise<unknown>;
    findUnique(args: object): Promise<{ stateJson: string } | null>;
  };
  turn: { upsert(args: object): Promise<unknown> };
  campaign: {
    upsert(args: object): Promise<unknown>;
    findUnique(args: object): Promise<{
      id: string;
      title: string;
      adventureId: string;
      graphJson: string;
      activeSession: string | null;
    } | null>;
    findMany(args?: object): Promise<Array<{ id: string; title: string }>>;
  };
  ledgerEntry: {
    upsert(args: object): Promise<unknown>;
    findMany(args: object): Promise<Array<{ valueJson: string }>>;
  };
};

export class PrismaStore implements Store {
  constructor(private readonly prisma: PrismaLike) {}

  async saveSession(session: GameSession, campaignId?: string): Promise<void> {
    await this.prisma.session.upsert({
      where: { id: session.id },
      create: {
        id: session.id,
        campaignId: campaignId ?? null,
        stateJson: JSON.stringify(session),
        currentBeat: session.currentBeat,
        ended: session.ended,
      },
      update: {
        stateJson: JSON.stringify(session),
        currentBeat: session.currentBeat,
        ended: session.ended,
        ...(session.ended ? { endedAt: new Date() } : {}),
      },
    });
    // The audit trail as rows: idempotent upserts keyed by (session, idx).
    for (const turn of session.turns) {
      await this.prisma.turn.upsert({
        where: { sessionId_idx: { sessionId: session.id, idx: turn.index } },
        create: {
          sessionId: session.id,
          idx: turn.index,
          rawInput: turn.rawInput ?? null,
          resolutionJson: JSON.stringify(turn.resolution),
        },
        update: {},
      });
    }
  }

  async loadSession(id: string): Promise<GameSession | undefined> {
    const row = await this.prisma.session.findUnique({ where: { id } });
    if (!row) return undefined;
    const session = JSON.parse(row.stateJson) as GameSession;
    // Validate the trust surface on the way back in: every persisted turn's
    // resolution must still parse. A corrupt snapshot fails loudly here, not
    // silently mid-play.
    for (const t of session.turns) Resolution.parse(t.resolution);
    return session;
  }

  async saveCampaign(campaign: Campaign): Promise<void> {
    await this.prisma.campaign.upsert({
      where: { id: campaign.id },
      create: {
        id: campaign.id,
        title: campaign.title,
        adventureId: (campaign.graph as { id?: string }).id ?? 'unknown',
        graphJson: JSON.stringify(campaign.graph),
        activeSession: campaign.activeSession ?? null,
      },
      update: {
        title: campaign.title,
        activeSession: campaign.activeSession ?? null,
      },
    });
    for (const entry of campaign.ledger) {
      const parsed = LedgerEntry.parse(entry); // validated JSON, always
      await this.prisma.ledgerEntry.upsert({
        where: {
          campaignId_kind_key: {
            campaignId: campaign.id,
            kind: parsed.kind,
            key: ledgerKey(parsed),
          },
        },
        create: {
          campaignId: campaign.id,
          kind: parsed.kind,
          key: ledgerKey(parsed),
          valueJson: JSON.stringify(parsed),
        },
        update: { valueJson: JSON.stringify(parsed) },
      });
    }
  }

  async loadCampaign(id: string): Promise<Campaign | undefined> {
    const row = await this.prisma.campaign.findUnique({ where: { id } });
    if (!row) return undefined;
    const rows = await this.prisma.ledgerEntry.findMany({ where: { campaignId: id } });
    const ledger = rows.map((r) => LedgerEntry.parse(JSON.parse(r.valueJson)));
    return {
      id: row.id,
      title: row.title,
      graph: JSON.parse(row.graphJson),
      ledger,
      sessions: [], // session records rehydrate lazily from the Session table
      ...(row.activeSession ? { activeSession: row.activeSession } : {}),
    };
  }

  listCampaigns(): Promise<Array<{ id: string; title: string }>> {
    return this.prisma.campaign.findMany({ select: { id: true, title: true } }) as Promise<
      Array<{ id: string; title: string }>
    >;
  }
}

/**
 * Store factory: Prisma-backed when DATABASE_URL is set and the client
 * initializes; memory otherwise. Never throws — the fallback is the point.
 */
export async function createStore(): Promise<Store> {
  if (!process.env.DATABASE_URL) return new MemoryStore();
  try {
    const { prisma } = await import('@lantern/db');
    return new PrismaStore(prisma as unknown as PrismaLike);
  } catch (err) {
    console.warn(`store: falling back to memory (${(err as Error).message})`);
    return new MemoryStore();
  }
}
