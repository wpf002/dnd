import type { FastifyInstance } from 'fastify';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { lintGraph } from '@lantern/linter';
import {
  chooseOption,
  combatAttack,
  combatFlee,
  createSession,
  freeTextConstraint,
  restParty,
  sessionView,
  templateNarration,
  type GameSession,
  type TurnOutcome,
} from '../services/game.js';
import { parseIntent } from '../services/intent.js';
import { narrate } from '../services/narration.js';

/**
 * Session routes. In-memory store — the Prisma-backed store lands when a
 * Postgres is reachable; the shapes (TurnRecord et al.) already match the
 * Prisma skeleton so the swap is an adapter, not a redesign.
 */

const here = dirname(fileURLToPath(import.meta.url));
const ADVENTURES_DIR = join(here, '..', '..', '..', '..', 'content', 'adventures');

export const sessions = new Map<string, GameSession>();

export function loadGraph(adventureId: string): unknown {
  // Only kebab-case ids; the path never leaves the adventures directory.
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(adventureId)) {
    throw Object.assign(new Error('invalid adventure id'), { statusCode: 400 });
  }
  const raw = JSON.parse(readFileSync(join(ADVENTURES_DIR, `${adventureId}.json`), 'utf8'));

  // Invariant 6: the linter is the sole gate. Hand-authored content loads
  // through the exact same check generated content would.
  const lint = lintGraph(raw);
  if (!lint.ok) {
    throw Object.assign(
      new Error(`adventure '${adventureId}' fails the linter:\n${lint.errors.map((e) => e.message).join('\n')}`),
      { statusCode: 500 },
    );
  }
  return raw;
}

async function respond(outcome: TurnOutcome): Promise<object> {
  // Narration policy: one model attempt with templated fallback — the turn
  // never blocks. `narrate` internally applies the dm-narration retry policy.
  const prose = await narrate(outcome);
  return {
    state: sessionView(outcome.session),
    resolutions: outcome.resolutions,
    narration: prose,
  };
}

export function registerSessionRoutes(app: FastifyInstance): void {
  app.post<{ Body: { adventure?: string } }>('/session', async (request) => {
    const adventureId = request.body?.adventure ?? 'the-bell-at-saltmire';
    const graph = loadGraph(adventureId);
    const session = createSession(graph);
    sessions.set(session.id, session);
    return { state: sessionView(session) };
  });

  app.get<{ Params: { id: string } }>('/session/:id', async (request, reply) => {
    const session = sessions.get(request.params.id);
    if (!session) return reply.code(404).send({ error: 'no such session' });
    return { state: sessionView(session) };
  });

  app.post<{ Params: { id: string }; Body: { option: string } }>(
    '/session/:id/choose',
    async (request, reply) => {
      const session = sessions.get(request.params.id);
      if (!session) return reply.code(404).send({ error: 'no such session' });
      try {
        return await respond(chooseOption(session, request.body.option));
      } catch (err) {
        return reply.code(400).send({ error: (err as Error).message });
      }
    },
  );

  app.post<{ Params: { id: string }; Body: { text: string } }>(
    '/session/:id/free-text',
    async (request, reply) => {
      const session = sessions.get(request.params.id);
      if (!session) return reply.code(404).send({ error: 'no such session' });
      const text = request.body?.text?.trim();
      if (!text) return reply.code(400).send({ error: 'empty input' });

      // Fail-closed pipeline: parse first; any rejection becomes in-fiction
      // refusal. An accepted action then draws on the improv budget.
      const parsed = await parseIntent(session, text);
      if (!parsed.accepted) {
        return {
          state: sessionView(session),
          resolutions: [],
          narration: [refusalLine(parsed.reason)],
          rejected: { reason: parsed.reason },
        };
      }

      const outcome = freeTextConstraint(session, text);
      if (!outcome.accepted) {
        return {
          state: sessionView(session),
          resolutions: [],
          narration: [outcome.refusal!],
          rejected: { reason: 'budget-exhausted' },
        };
      }
      return await respond(outcome);
    },
  );

  app.post<{ Params: { id: string }; Body: { actor: string; target: string } }>(
    '/session/:id/attack',
    async (request, reply) => {
      const session = sessions.get(request.params.id);
      if (!session) return reply.code(404).send({ error: 'no such session' });
      try {
        return await respond(combatAttack(session, request.body.actor, request.body.target));
      } catch (err) {
        return reply.code(400).send({ error: (err as Error).message });
      }
    },
  );

  app.post<{ Params: { id: string } }>('/session/:id/flee', async (request, reply) => {
    const session = sessions.get(request.params.id);
    if (!session) return reply.code(404).send({ error: 'no such session' });
    try {
      return await respond(combatFlee(session));
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  app.post<{ Params: { id: string }; Body: { kind?: 'short' | 'long' } }>(
    '/session/:id/rest',
    async (request, reply) => {
      const session = sessions.get(request.params.id);
      if (!session) return reply.code(404).send({ error: 'no such session' });
      if (session.combat) return reply.code(400).send({ error: 'cannot rest in combat' });
      restParty(session, request.body?.kind ?? 'long');
      return { state: sessionView(session) };
    },
  );
}

/** Invariant 7: refusals are in-fiction constraint, keyed by rejection reason. */
function refusalLine(reason: string): string {
  switch (reason) {
    case 'unavailable':
      return 'You reach for what is not there. The village offers only what it offers.';
    case 'illegal':
      return 'Your body knows before your mind does: that cannot be done from where you stand.';
    case 'budget-exhausted':
      return 'The moment closes around you like the tide around a stone. The paths before you remain.';
    default:
      return 'The intent slips away from you, unformed — the salt air swallows half-made plans. Try another way.';
  }
}

export { templateNarration };
