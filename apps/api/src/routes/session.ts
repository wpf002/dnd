import type { FastifyInstance } from 'fastify';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { lintCampaign, lintGraph } from '@lantern/linter';
import {
  chooseOption,
  combatAttack,
  castSpell,
  combatFlee,
  createSession,
  partyWith,
  freeTextConstraint,
  restParty,
  sessionView,
  templateNarration,
  type GameSession,
  type TurnOutcome,
} from '../services/game.js';
import {
  CREATION_CLASSES,
  createCharacter,
  backgrounds,
  CLASS_SKILLS,
  CLASS_SKILL_COUNT,
  lineages,
  rollAbilityScores,
  STANDARD_ARRAY,
} from '@lantern/engine';
import { CLASS_PROGRESSION } from '@lantern/srd';
import { parseIntent } from '../services/intent.js';
import { createStore, type Store } from '../services/store.js';
import { narrate } from '../services/narration.js';

/**
 * Session routes. In-memory store — the Prisma-backed store lands when a
 * Postgres is reachable; the shapes (TurnRecord et al.) already match the
 * Prisma skeleton so the swap is an adapter, not a redesign.
 */

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, '..', '..', '..', '..');

/**
 * Content lives in two places.
 *
 * `content/` is committed: authored and generated adventures, which are this
 * project's own work. `content-local/` is gitignored, and is where anything
 * ingested from a module the user owns goes — those are the user's materials,
 * and the repo does not redistribute them (ROADMAP, Content and licensing).
 *
 * Both are read the same way and gated by the same linter. The split is about
 * what gets committed, not about what is playable.
 */
const LOCAL_ROOT = process.env.LANTERN_LOCAL_CONTENT ?? join(REPO, 'content-local');
const ADVENTURE_DIRS = [join(REPO, 'content', 'adventures'), join(LOCAL_ROOT, 'adventures')];
const CAMPAIGN_DIRS = [join(REPO, 'content', 'campaigns'), join(LOCAL_ROOT, 'campaigns')];

/** First directory containing `<id>.json`, or undefined. */
function findContent(dirs: string[], id: string): string | undefined {
  for (const dir of dirs) {
    const path = join(dir, `${id}.json`);
    if (existsSync(path)) return path;
  }
  return undefined;
}

/** Ids available across all the given directories, deduped, first wins. */
function listContent(dirs: string[]): string[] {
  const ids = new Set<string>();
  for (const dir of dirs) {
    try {
      for (const file of readdirSync(dir)) {
        if (file.endsWith('.json')) ids.add(file.replace(/\.json$/, ''));
      }
    } catch {
      // A missing content-local is the normal case, not an error.
    }
  }
  return [...ids].sort();
}

export const sessions = new Map<string, GameSession>();

let storePromise: Promise<Store> | undefined;
export function store(): Promise<Store> {
  storePromise ??= createStore();
  return storePromise;
}

/** Write-behind: persistence never blocks or fails a turn. */
export function persistSession(session: GameSession, campaignId?: string): void {
  void store()
    .then((s) => s.saveSession(session, campaignId))
    .catch((err) => console.warn(`persist: ${(err as Error).message}`));
}

async function getSession(id: string): Promise<GameSession | undefined> {
  const live = sessions.get(id);
  if (live) return live;
  const revived = await (await store()).loadSession(id).catch(() => undefined);
  if (revived) sessions.set(id, revived);
  return revived;
}

export function loadGraph(adventureId: string): unknown {
  // Only kebab-case ids; the path never leaves the adventures directory.
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(adventureId)) {
    throw Object.assign(new Error('invalid adventure id'), { statusCode: 400 });
  }
  const path = findContent(ADVENTURE_DIRS, adventureId);
  if (!path) {
    throw Object.assign(new Error(`no adventure '${adventureId}'`), { statusCode: 404 });
  }
  const raw = JSON.parse(readFileSync(path, 'utf8'));

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

/**
 * Load a multi-book campaign, with its books resolved and linted.
 *
 * Invariant 6 again: a campaign passes through `lintCampaign` with its
 * adventures resolved, so a level-band gap or a dead book gate is caught at
 * load rather than twenty hours into play.
 */
export function loadCampaignGraph(campaignId: string): unknown {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(campaignId)) {
    throw Object.assign(new Error('invalid campaign id'), { statusCode: 400 });
  }
  const campaignPath = findContent(CAMPAIGN_DIRS, campaignId);
  if (!campaignPath) {
    throw Object.assign(new Error(`no campaign '${campaignId}'`), { statusCode: 404 });
  }
  const raw = JSON.parse(readFileSync(campaignPath, 'utf8')) as {
    books?: Array<{ adventure: string }>;
  };

  const adventures = new Map<string, unknown>();
  for (const book of raw.books ?? []) {
    // A book pointing at a broken adventure is left unresolved; lintCampaign
    // then reports it as missing, which is the accurate finding.
    try {
      adventures.set(book.adventure, loadGraph(book.adventure));
    } catch {
      /* reported below */
    }
  }

  const lint = lintCampaign(raw, adventures);
  if (!lint.ok) {
    throw Object.assign(
      new Error(
        `campaign '${campaignId}' fails the linter:\n${lint.errors.map((e) => e.message).join('\n')}`,
      ),
      { statusCode: 500 },
    );
  }
  return raw;
}

export function listCampaignGraphs(): string[] {
  return listContent(CAMPAIGN_DIRS);
}

async function respond(outcome: TurnOutcome): Promise<object> {
  // Narration policy: one model attempt with templated fallback — the turn
  // never blocks. `narrate` internally applies the dm-narration retry policy.
  const prose = await narrate(outcome);
  persistSession(outcome.session);
  return {
    state: sessionView(outcome.session),
    resolutions: outcome.resolutions,
    narration: prose,
  };
}

export function registerSessionRoutes(app: FastifyInstance): void {
  /**
   * What a player can choose from when making a character. The API answers
   * this rather than the client hardcoding it, so the two cannot drift.
   */
  app.get('/creation', async () => ({
    classes: CREATION_CLASSES.map((id) => ({
      id,
      name: CLASS_PROGRESSION[id].name,
      hitDie: CLASS_PROGRESSION[id].hitDie,
      caster: Boolean(CLASS_PROGRESSION[id].spellcastingAbility),
      skills: CLASS_SKILLS[id],
      skillCount: CLASS_SKILL_COUNT[id],
    })),
    lineages: lineages().map((l) => ({ id: l.id, name: l.name, speed: l.speed, size: l.size })),
    backgrounds: backgrounds().map((b) => ({
      id: b.id,
      name: b.name,
      abilities: b.abilities,
      skills: b.skillProficiencies ?? [],
    })),
    standardArray: [...STANDARD_ARRAY],
  }));

  /**
   * Roll 4d6-drop-lowest six times. Seeded, and it shows every die.
   *
   * The seed comes back with the scores because it is what makes them
   * checkable: creation re-rolls it and refuses a sheet the dice did not
   * produce, so a rolled 18 has to be an 18 somebody actually rolled.
   */
  app.post<{ Body: { seed?: string } }>('/creation/roll', async (request) => {
    const seed = request.body?.seed ?? `roll-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return { seed, scores: rollAbilityScores(seed) };
  });

  /**
   * Build the sheet without starting anything, so a player can see what their
   * choices produce — hit points, speed, proficiencies, slots — before
   * committing to twenty levels of it.
   */
  app.post<{ Body: unknown }>('/creation/preview', async (request, reply) => {
    try {
      return { character: createCharacter(request.body as never) };
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  /**
   * Every playable adventure. A graph that fails the linter is reported as
   * unplayable rather than omitted — silently hiding broken content is how you
   * end up not noticing it broke.
   */
  app.get('/adventures', async () => {
    const adventures = listContent(ADVENTURE_DIRS)
      .map((id) => {
        try {
          const g = loadGraph(id) as {
            metadata: {
              title: string;
              premise: string;
              tone: string[];
              partyLevel: number;
              tier?: string;
              provenance?: string;
            };
            beats: unknown[];
            encounters: unknown[];
          };
          return {
            id,
            playable: true as const,
            title: g.metadata.title,
            premise: g.metadata.premise,
            tone: g.metadata.tone,
            tier: g.metadata.tier ?? 'local',
            provenance: g.metadata.provenance ?? 'authored',
            partyLevel: g.metadata.partyLevel,
            beats: g.beats.length,
            encounters: g.encounters.length,
            endings: (g.beats as Array<{ terminal?: boolean }>).filter((b) => b.terminal).length,
          };
        } catch (err) {
          return { id, playable: false as const, error: (err as Error).message.split('\n')[0] };
        }
      })
      .sort((a, b) => a.id.localeCompare(b.id));
    return { adventures };
  });

  app.post<{ Body: { adventure?: string; character?: unknown } }>(
    '/session',
    async (request, reply) => {
      const adventureId = request.body?.adventure ?? 'the-bell-at-saltmire';
      const graph = loadGraph(adventureId);

      // A character the player made takes the place of the pregen of their
      // class. The party stays at four, which is what every encounter in
      // every shipped adventure was balanced against.
      let party;
      if (request.body?.character) {
        try {
          party = partyWith(createCharacter(request.body.character as never));
        } catch (err) {
          return reply.code(400).send({ error: (err as Error).message });
        }
      }

      const session = createSession(graph, undefined, party);
      sessions.set(session.id, session);
      persistSession(session);
      return { state: sessionView(session) };
    },
  );

  app.get<{ Params: { id: string } }>('/session/:id', async (request, reply) => {
    const session = await getSession(request.params.id);
    if (!session) return reply.code(404).send({ error: 'no such session' });
    return { state: sessionView(session) };
  });

  app.post<{ Params: { id: string }; Body: { option: string } }>(
    '/session/:id/choose',
    async (request, reply) => {
      const session = await getSession(request.params.id);
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
      const session = await getSession(request.params.id);
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
      const session = await getSession(request.params.id);
      if (!session) return reply.code(404).send({ error: 'no such session' });
      try {
        return await respond(combatAttack(session, request.body.actor, request.body.target));
      } catch (err) {
        return reply.code(400).send({ error: (err as Error).message });
      }
    },
  );

  /**
   * Cast a healing spell. Healing is the only spellcasting implemented — the
   * route rejects anything else rather than pretending to cast it.
   */
  app.post<{
    Params: { id: string };
    Body: { caster: string; spell: string; target: string; slot?: number };
  }>('/session/:id/cast', async (request, reply) => {
    const session = await getSession(request.params.id);
    if (!session) return reply.code(404).send({ error: 'no such session' });
    const { caster, spell, target, slot } = request.body;
    try {
      return await respond(castSpell(session, caster, spell, target, slot));
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  app.post<{ Params: { id: string } }>('/session/:id/flee', async (request, reply) => {
    const session = await getSession(request.params.id);
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
      const session = await getSession(request.params.id);
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
