import type { FastifyInstance } from 'fastify';
import { LedgerEntry } from '@lantern/schema';
import { createLanternFlint, type Flint } from '@lantern/flint';
import {
  buildRecap,
  campaigns,
  createBookCampaign,
  createCampaign,
  endCampaignSession,
  startCampaignSession,
  upsertEntry,
  type Campaign,
} from '../services/campaign.js';
import { sessionView, type GameSession } from '../services/game.js';
import { listCampaignGraphs, loadCampaignGraph, persistSession, store } from './session.js';

/**
 * Write-behind: persistence never blocks a request, but a failure is reported.
 * Swallowing it silently is how a missing database column went unnoticed while
 * every campaign write was failing.
 */
function persistCampaign(campaign: Campaign): void {
  void store()
    .then((s) => s.saveCampaign(campaign))
    .catch((err) => console.warn(`persist campaign: ${(err as Error).message}`));
}

/**
 * What the app needs to render a campaign: where the party is in the book
 * sequence, and at what level. Absent for a single-adventure campaign, which
 * has no books to be anywhere in.
 */
function progressView(campaign: Campaign): object | undefined {
  if (!campaign.book || !campaign.progress) return undefined;
  const books = campaign.book.books;
  const index = campaign.progress.bookIndex;
  return {
    campaign: campaign.book.id,
    title: campaign.book.metadata.title,
    partyLevel: campaign.progress.partyLevel,
    bookIndex: index,
    bookCount: books.length,
    completedBooks: campaign.progress.completedBooks,
    ...(campaign.completedAt ? { completedAt: campaign.completedAt } : {}),
    current: books[index]
      ? {
          id: books[index]!.id,
          title: books[index]!.title,
          adventure: books[index]!.adventure,
          levelStart: books[index]!.levelStart,
          levelEnd: books[index]!.levelEnd,
        }
      : undefined,
    books: books.map((b, i) => ({
      id: b.id,
      title: b.title,
      levelStart: b.levelStart,
      levelEnd: b.levelEnd,
      status: campaign.progress!.completedBooks.includes(b.id)
        ? ('complete' as const)
        : i === index
          ? ('current' as const)
          : ('locked' as const),
    })),
    party: (campaign.party ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      characterClass: c.characterClass,
      level: c.level,
      hp: c.hp,
      hpMax: c.hpMax,
    })),
  };
}

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
  /**
   * Create a campaign — multi-book when `campaign` names a campaign graph,
   * single-adventure when `adventure` names one. The two are not variants of
   * a request shape; they are different objects, and the response says which.
   */
  app.post<{ Body: { adventure?: string; campaign?: string; title?: string } }>(
    '/campaign',
    async (request, reply) => {
      try {
        if (request.body?.campaign) {
          const graph = loadCampaignGraph(request.body.campaign);
          const campaign = createBookCampaign(graph, loadGraph, request.body.title);
          persistCampaign(campaign);
          return {
            campaign: { id: campaign.id, title: campaign.title },
            progress: progressView(campaign),
          };
        }
        const adventureId = request.body?.adventure ?? 'the-bell-at-saltmire';
        const graph = loadGraph(adventureId);
        const campaign = createCampaign(graph, request.body?.title ?? adventureId);
        persistCampaign(campaign);
        return { campaign: { id: campaign.id, title: campaign.title } };
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode ?? 400;
        return reply.code(status).send({ error: (err as Error).message });
      }
    },
  );

  /** Every multi-book campaign on disk, with its books and bands. */
  app.get('/campaign-graphs', async () => {
    const graphs = listCampaignGraphs().map((id) => {
      try {
        const g = loadCampaignGraph(id) as {
          metadata: { title: string; premise: string; tone: string[] };
          books: Array<{ id: string; title: string; levelStart: number; levelEnd: number }>;
        };
        return {
          id,
          playable: true as const,
          title: g.metadata.title,
          premise: g.metadata.premise,
          tone: g.metadata.tone,
          books: g.books.length,
          levelStart: g.books[0]!.levelStart,
          levelEnd: g.books[g.books.length - 1]!.levelEnd,
        };
      } catch (err) {
        return { id, playable: false as const, error: (err as Error).message.split('\n')[0] };
      }
    });
    return { campaigns: graphs };
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
      persistCampaign(campaign!);
      return { state: sessionView(session), progress: progressView(campaign) };
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
    const result = await endCampaignSession(
      campaign,
      session,
      hasKey ? flint() : undefined,
      loadGraph,
    );
    persistSession(session, campaign.id);
    persistCampaign(campaign);
    return {
      delta: result.delta,
      compaction: result.compaction,
      recap: buildRecap(campaign),
      ...(result.transition
        ? {
            transition: {
              completed: result.transition.completed.id,
              next: result.transition.next?.id,
              skipped: result.transition.skipped.map((b) => b.id),
              partyLevel: result.transition.partyLevel,
              featuresGained: result.transition.featuresGained,
            },
          }
        : {}),
      progress: progressView(campaign),
    };
  });

  app.get<{ Params: { id: string } }>('/campaign/:id/recap', async (request, reply) => {
    const campaign = campaigns.get(request.params.id);
    if (!campaign) return reply.code(404).send({ error: 'no such campaign' });
    return { recap: buildRecap(campaign), progress: progressView(campaign) };
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
