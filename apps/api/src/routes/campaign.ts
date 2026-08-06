import type { FastifyInstance } from 'fastify';
import { LedgerEntry } from '@lantern/schema';
import { createLanternFlint, type Flint } from '@lantern/flint';
import {
  buildRecap,
  campaigns,
  createCampaign,
  endCampaignSession,
  startCampaignSession,
  upsertEntry,
} from '../services/campaign.js';
import { sessionView, type GameSession } from '../services/game.js';
import { persistSession, store } from './session.js';

let flintInstance: Flint | undefined;
function flint(): Flint {
  flintInstance ??= createLanternFlint();
  return flintInstance;
}
/** Test seam. */
export function setCampaignFlint(instance: Flint | undefined): void {
  flintInstance = instance;
}

export function registerCampaignRoutes(
  app: FastifyInstance,
  sessions: Map<string, GameSession>,
  loadGraph: (adventureId: string) => unknown,
): void {
  app.post<{ Body: { adventure?: string; title?: string } }>('/campaign', async (request) => {
    const adventureId = request.body?.adventure ?? 'the-bell-at-saltmire';
    const graph = loadGraph(adventureId);
    const campaign = createCampaign(graph, request.body?.title ?? adventureId);
    void store().then((s) => s.saveCampaign(campaign)).catch(() => {});
    return { campaign: { id: campaign.id, title: campaign.title } };
  });

  app.get('/campaigns', async () => {
    const persisted = await (await store()).listCampaigns().catch(() => []);
    const live = [...campaigns.values()].map((c) => ({ id: c.id, title: c.title }));
    const seen = new Set(live.map((c) => c.id));
    return { campaigns: [...live, ...persisted.filter((c) => !seen.has(c.id))] };
  });

  app.post<{ Params: { id: string } }>('/campaign/:id/session', async (request, reply) => {
    let campaign = campaigns.get(request.params.id);
    if (!campaign) {
      campaign = await (await store()).loadCampaign(request.params.id).catch(() => undefined);
      if (campaign) campaigns.set(campaign.id, campaign);
    }
    if (!campaign) return reply.code(404).send({ error: 'no such campaign' });
    try {
      const session = startCampaignSession(campaign);
      sessions.set(session.id, session);
      persistSession(session, campaign.id);
      void store().then((s) => s.saveCampaign(campaign!)).catch(() => {});
      return { state: sessionView(session) };
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  app.post<{ Params: { id: string } }>('/campaign/:id/end-session', async (request, reply) => {
    const campaign = campaigns.get(request.params.id);
    if (!campaign) return reply.code(404).send({ error: 'no such campaign' });
    const session = campaign.activeSession ? sessions.get(campaign.activeSession) : undefined;
    if (!session) return reply.code(400).send({ error: 'no active session' });
    // The model compaction pass runs only when a credential exists; the
    // mechanical floor always runs. Neither blocks on the other.
    const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
    const result = await endCampaignSession(campaign, session, hasKey ? flint() : undefined);
    persistSession(session, campaign.id);
    void store().then((s) => s.saveCampaign(campaign)).catch(() => {});
    return { delta: result.delta, compaction: result.compaction, recap: buildRecap(campaign) };
  });

  app.get<{ Params: { id: string } }>('/campaign/:id/recap', async (request, reply) => {
    const campaign = campaigns.get(request.params.id);
    if (!campaign) return reply.code(404).send({ error: 'no such campaign' });
    return { recap: buildRecap(campaign) };
  });

  /** Author-side: seed ledger entries (clocks especially) onto a campaign. */
  app.post<{ Params: { id: string }; Body: { entries: unknown[] } }>(
    '/campaign/:id/ledger',
    async (request, reply) => {
      const campaign = campaigns.get(request.params.id);
      if (!campaign) return reply.code(404).send({ error: 'no such campaign' });
      try {
        for (const raw of request.body.entries) {
          campaign.ledger = upsertEntry(campaign.ledger, LedgerEntry.parse(raw));
        }
        return { ledger: campaign.ledger };
      } catch (err) {
        return reply.code(400).send({ error: (err as Error).message });
      }
    },
  );
}
