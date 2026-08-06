import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MemoryStore, PrismaStore, ledgerKey, type Store } from './services/store.js';
import { createSession, chooseOption } from './services/game.js';
import { createCampaign, upsertEntry } from './services/campaign.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..');
const saltmire = JSON.parse(
  readFileSync(join(repoRoot, 'content', 'adventures', 'the-bell-at-saltmire.json'), 'utf8'),
);

/**
 * Store contract tests run against BOTH implementations; the Prisma suite
 * uses a real throwaway SQLite file pushed once per run — persistence is
 * integration-tested for real, not mocked.
 */

function contractTests(name: string, getStore: () => Store) {
  describe(`${name}: store contract`, () => {
    it('round-trips a played session, turns intact', async () => {
      const store = getStore();
      const session = createSession(saltmire, `${name}-rt`);
      chooseOption(session, 'cross-now');
      chooseOption(session, 'dash'); // rolls a check → a turn with a resolution
      await store.saveSession(session);

      const revived = await store.loadSession(session.id);
      expect(revived).toBeDefined();
      expect(revived!.currentBeat).toBe(session.currentBeat);
      expect(revived!.flags).toEqual(session.flags);
      expect(revived!.turns).toHaveLength(session.turns.length);
      // The audit trail survives the round trip byte-for-byte.
      expect(revived!.turns[0]!.resolution).toEqual(session.turns[0]!.resolution);
    });

    it('round-trips a campaign with its ledger', async () => {
      const store = getStore();
      const campaign = createCampaign(saltmire, `${name} campaign`);
      campaign.ledger = upsertEntry(campaign.ledger, {
        kind: 'faction_clock',
        faction: 'drowned-cult',
        filled: 2,
        segments: 3,
        consequence: 'the congregation walks',
      });
      campaign.ledger = upsertEntry(campaign.ledger, {
        kind: 'npc_disposition',
        npc: 'old-wend',
        axis: 'trust',
        value: 2,
      });
      await store.saveCampaign(campaign);

      const revived = await store.loadCampaign(campaign.id);
      expect(revived).toBeDefined();
      expect(revived!.title).toBe(campaign.title);
      expect(revived!.ledger).toHaveLength(2);
      const clock = revived!.ledger.find((e) => e.kind === 'faction_clock');
      expect(clock).toMatchObject({ faction: 'drowned-cult', filled: 2 });
    });

    it('upserted ledger entries overwrite by kind+key on re-save', async () => {
      const store = getStore();
      const campaign = createCampaign(saltmire, `${name} upsert`);
      campaign.ledger = [{ kind: 'flag', flag: 'learned-name', value: true }];
      await store.saveCampaign(campaign);
      campaign.ledger = [{ kind: 'flag', flag: 'learned-name', value: false }];
      await store.saveCampaign(campaign);

      const revived = await store.loadCampaign(campaign.id);
      expect(revived!.ledger).toHaveLength(1);
      expect(revived!.ledger[0]).toMatchObject({ value: false });
    });

    it('returns undefined for unknown ids', async () => {
      const store = getStore();
      expect(await store.loadSession('never-existed')).toBeUndefined();
      expect(await store.loadCampaign('never-existed')).toBeUndefined();
    });
  });
}

describe('ledgerKey', () => {
  it('mirrors the in-memory upsert identity', () => {
    expect(ledgerKey({ kind: 'npc_disposition', npc: 'wend', axis: 'trust', value: 1 })).toBe('wend:trust');
    expect(ledgerKey({ kind: 'flag', flag: 'x', value: 1 })).toBe('x');
    expect(
      ledgerKey({ kind: 'faction_clock', faction: 'cult', filled: 0, segments: 4, consequence: 'c' }),
    ).toBe('cult');
  });
});

contractTests('memory', () => new MemoryStore());

describe('sqlite integration', () => {
  const dbDir = mkdtempSync(join(tmpdir(), 'lantern-store-'));
  const dbUrl = `file:${join(dbDir, 'test.db')}`;
  let prismaStore: PrismaStore | undefined;
  let client: import('@lantern/db').PrismaClient | undefined;

  beforeAll(async () => {
    execSync(`pnpm --filter @lantern/db exec prisma db push --skip-generate`, {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: 'pipe',
    });
    // The shared client binds DATABASE_URL at first import — set it first.
    process.env.DATABASE_URL = dbUrl;
    const db = await import('@lantern/db');
    client = db.prisma;
    prismaStore = new PrismaStore(db.prisma as never);
  }, 60_000);

  afterAll(() => {
    delete process.env.DATABASE_URL;
  });

  contractTests('sqlite', () => {
    if (!prismaStore) throw new Error('prisma store not initialized');
    return prismaStore;
  });

  it('persists turns as queryable rows, not only inside the snapshot', async () => {
    const session = createSession(saltmire, 'sqlite-rows');
    chooseOption(session, 'cross-now');
    chooseOption(session, 'dash');
    await prismaStore!.saveSession(session);

    const rows = await client!.turn.findMany({ where: { sessionId: 'sqlite-rows' } });
    expect(rows.length).toBe(session.turns.length);
    // Auditable without deserializing the session: the resolution row alone
    // carries dice, modifiers, DC, and margin.
    const res = JSON.parse(rows[0]!.resolutionJson) as { roll?: { natural: number }; dc?: number };
    expect(res.roll?.natural).toBeGreaterThanOrEqual(1);
    expect(res.dc).toBe(12);
  });
});
