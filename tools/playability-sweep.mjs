#!/usr/bin/env node
/**
 * Play every adventure and every campaign, and report which ones finish.
 *
 *   node tools/playability-sweep.mjs
 *
 * The linter proves a graph is well-formed. It cannot prove a session reaches
 * an ending — that needs the engine, the dice, and a player. This drives all
 * three, with no model calls, so it is free and can run on every change.
 *
 * The policy is a plausible player rather than an optimal one: explore what
 * you have not seen, heal whoever is down, rest when hurt, and once the job is
 * done head for the exit. A driver that plays nothing like a player proves
 * nothing about play.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
process.loadEnvFile?.(join(root, '.env'));

const {
  createSession,
  chooseOption,
  visibleOptions,
  combatAttack,
  combatFlee,
  restParty,
  castSpell,
  partyWith,
} = await import(join(root, 'apps/api/dist/services/game.js'));
const { createCharacter, STANDARD_ARRAY } = await import(join(root, 'packages/engine/dist/index.js'));
const { createBookCampaign, startCampaignSession, endCampaignSession } = await import(
  join(root, 'apps/api/dist/services/campaign.js')
);
const { lintGraph } = await import(join(root, 'packages/linter/dist/index.js'));
const { evaluateGuard } = await import(join(root, 'packages/engine/dist/index.js'));

const SEEDS = (process.env.SEEDS ?? 'a,b,c').split(',');

/**
 * A party is no longer four frozen pregens — a player can make their own
 * character, and it takes the place of the pregen of its class. That is a
 * different party in every fight in every adventure, so it gets swept too.
 * One made character per class, built the way the creation screen builds them.
 */
const [best, good, fair, fine, low, worst] = STANDARD_ARRAY;
const MADE = [
  ['fighter', 'dwarf', 'soldier',
    { str: best, con: good, dex: fair, wis: fine, cha: low, int: worst },
    ['athletics', 'perception']],
  ['rogue', 'halfling', 'criminal',
    { dex: best, con: good, str: fair, int: fine, wis: low, cha: worst },
    ['stealth', 'acrobatics', 'perception', 'deception']],
  ['cleric', 'human', 'acolyte',
    { wis: best, con: good, str: fair, cha: fine, dex: low, int: worst },
    ['religion', 'insight']],
  ['wizard', 'elf', 'sage',
    { int: best, dex: good, con: fair, wis: fine, str: low, cha: worst },
    ['arcana', 'investigation']],
].map(([characterClass, lineage, background, abilities, skills]) =>
  createCharacter({
    name: `Made ${characterClass}`,
    characterClass,
    lineage,
    background,
    abilities,
    skills,
  }),
);
const STEP_BUDGET = 400;
const REST_BUDGET = 25;

// ---------------------------------------------------------------------------

/**
 * Where a beat can lead GIVEN the current state.
 *
 * Guards matter here. Ignoring them made the driver keep aiming at an ending
 * it could not yet enter — the option was hidden, the pick fell through, and
 * it oscillated between two rooms forever while the content was perfectly
 * playable. A player heads for the exit when the exit is open, and explores
 * when it is not.
 */
function exitsOf(graph, beat, flags) {
  const enterable = (id) => {
    const target = graph.beats.find((b) => b.id === id);
    return !target || evaluateGuard(target.entryWhen ?? { op: 'always' }, flags);
  };
  const out = new Set();
  for (const option of beat.options ?? []) {
    if (option.visibleWhen && !evaluateGuard(option.visibleWhen, flags)) continue;
    if (enterable(option.target)) out.add(option.target);
  }
  for (const edge of graph.edges ?? []) {
    if (edge.from === beat.id && edge.when.op !== 'always' && enterable(edge.to)) out.add(edge.to);
  }
  for (const encounter of graph.encounters ?? []) {
    if (beat.encounter !== encounter.id) continue;
    // Victory and flight only. Routing through onDefeat plans a loss, and a
    // driver that does keeps walking into a fight it then wins, over and over,
    // because the ending it was aiming for lay on the far side of losing.
    for (const target of [encounter.onVictory, encounter.onFlee]) {
      if (target && enterable(target)) out.add(target);
    }
  }
  return [...out];
}

/** Shortest route to any terminal beat, over every transition the engine takes. */
function routeToEnding(graph, from, flags) {
  const terminal = new Set(graph.beats.filter((b) => b.terminal).map((b) => b.id));
  const queue = [[from]];
  const seen = new Set([from]);
  while (queue.length > 0) {
    const path = queue.shift();
    const beat = graph.beats.find((b) => b.id === path[path.length - 1]);
    if (!beat) continue;
    for (const next of exitsOf(graph, beat, flags)) {
      if (seen.has(next)) continue;
      if (terminal.has(next)) return [...path, next];
      seen.add(next);
      queue.push([...path, next]);
    }
  }
  return undefined;
}

function healIfDying(session, actor) {
  const sc = actor.spellcasting;
  if (!sc) return undefined;
  const dying = session.party.find((p) => p.hp === 0 && !p.dead);
  if (!dying) return undefined;
  const spell = ['healing-word', 'cure-wounds'].find((id) => sc.prepared.includes(id));
  const slot = sc.slotsRemaining.findIndex((n, level) => level >= 1 && n > 0);
  if (!spell || slot < 1) return undefined;
  try {
    return castSpell(session, actor.id, spell, dying.id, slot);
  } catch {
    return undefined;
  }
}

/** Play one session to an ending. Returns what happened. */
function play(session) {
  const graph = session.graph;
  const seen = new Set();
  const aimed = new Map();
  const visits = new Map();
  const won = new Set();
  let rests = 0;

  for (let i = 0; i < STEP_BUDGET && !session.ended; i++) {
    seen.add(session.currentBeat);
    for (const [id, cleared] of Object.entries(session.cleared ?? {})) if (cleared) won.add(id);

    if (session.combat) {
      const up = session.combat.order[session.combat.turnIndex];
      const actor = session.party.find((p) => p.id === up && p.hp > 0 && !p.dead);
      const target = session.combat.monsters.find((m) => m.hp > 0);
      const encounterId = session.combat.encounterId;
      if (!actor || won.has(encounterId)) {
        // Already beaten once and sent back into it: winning again changes
        // nothing, so get out and try another way.
        combatFlee(session);
      } else if (!healIfDying(session, actor)) {
        if (target) combatAttack(session, actor.id, target.combatantId);
        else combatFlee(session);
      }
      continue;
    }

    if (rests < REST_BUDGET && session.party.some((p) => p.hp < p.hpMax / 2 && !p.dead)) {
      restParty(session, 'long');
      rests++;
      continue;
    }

    const options = visibleOptions(session);
    if (options.length === 0) break;

    visits.set(session.currentBeat, (visits.get(session.currentBeat) ?? 0) + 1);

    // Standing somewhere for the fourth time means the plan is not working.
    // One adventure loops a party between a choice and a fight whose victory
    // returns them to the same choice, and the only way on is a flag they do
    // not have. A player notices and tries something else.
    const looping = (visits.get(session.currentBeat) ?? 0) > 3;
    const route = looping ? undefined : routeToEnding(graph, session.currentBeat, session.flags);
    const next =
      (route && options.find((o) => o.target === route[1])) ??
      [...options].sort((a, b) => (aimed.get(a.target) ?? 0) - (aimed.get(b.target) ?? 0))[0];
    aimed.set(next.target, (aimed.get(next.target) ?? 0) + 1);
    if (process.env.TRACE) console.log(`   ${session.currentBeat} -> ${next.target}${route ? '' : ' (no route)'}`);
    chooseOption(session, next.id);
  }

  return {
    ended: session.ended,
    turns: session.turns.length,
    beats: seen.size,
    total: graph.beats.length,
    dead: session.party.filter((p) => p.dead).length,
  };
}

// ---------------------------------------------------------------------------

const dirs = [join(root, 'content'), join(root, 'content-local')];
const adventures = new Map();
const campaigns = new Map();
for (const dir of dirs) {
  for (const [kind, target] of [['adventures', adventures], ['campaigns', campaigns]]) {
    const path = join(dir, kind);
    if (!existsSync(path)) continue;
    for (const file of readdirSync(path).filter((f) => f.endsWith('.json'))) {
      const value = JSON.parse(readFileSync(join(path, file), 'utf8'));
      target.set(value.id ?? file, value);
    }
  }
}

console.log(`${adventures.size} adventures, ${campaigns.size} campaigns\n`);

let unplayable = 0;
let lintFailed = 0;
const slow = [];
const madeFailed = [];

const ONLY = process.env.ONLY;
for (const [id, graph] of [...adventures].sort()) {
  if (ONLY && id !== ONLY) continue;
  const lint = lintGraph(graph);
  if (!lint.ok) {
    lintFailed++;
    console.log(`LINT  ${id} — ${lint.errors[0].message.slice(0, 70)}`);
    continue;
  }
  let finished = 0;
  let crash;
  for (const seed of SEEDS) {
    try {
      if (play(createSession(graph, `sweep-${id}-${seed}`)).ended) finished++;
    } catch (err) {
      crash = err.message;
    }
  }
  // The same adventure again, once per made character. A level-1 wizard the
  // player built walks into the same fights the level-3 pregen was balanced
  // for, so this is where that shows up.
  for (const made of MADE) {
    try {
      const session = createSession(graph, `sweep-${id}-made-${made.characterClass}`, partyWith(made));
      if (!play(session).ended) madeFailed.push(`${id} (${made.characterClass})`);
    } catch (err) {
      crash ??= `made ${made.characterClass}: ${err.message}`;
    }
  }
  if (crash) {
    unplayable++;
    console.log(`CRASH ${id} — ${crash.slice(0, 80)}`);
  } else if (finished === 0) {
    unplayable++;
    console.log(`STALL ${id} — 0/${SEEDS.length} reached an ending`);
  } else if (finished < SEEDS.length) {
    slow.push(`${id} (${finished}/${SEEDS.length})`);
  }
}

console.log();
for (const [id, campaign] of [...campaigns].sort()) {
  const resolve = (adventureId) => {
    const graph = adventures.get(adventureId);
    if (!graph) throw new Error(`no adventure '${adventureId}'`);
    return graph;
  };
  try {
    const state = createBookCampaign(campaign, resolve);
    const played = [];
    for (let n = 0; n < 12 && !state.completedAt; n++) {
      const session = startCampaignSession(state);
      const result = play(session);
      played.push(result.ended);
      if (!result.ended) break;
      await endCampaignSession(state, session, undefined, resolve);
    }
    const ok = Boolean(state.completedAt);
    if (!ok) unplayable++;
    console.log(
      `${ok ? 'OK   ' : 'STALL'} campaign ${id} — ${state.progress.completedBooks.length}/${campaign.books.length} books, party level ${state.party[0].level}`,
    );
  } catch (err) {
    unplayable++;
    console.log(`ERROR campaign ${id} — ${err.message}`);
  }
}

console.log();
if (slow.length) console.log(`finished on some seeds but not all: ${slow.join(', ')}`);
if (madeFailed.length)
  console.log(`stalled for a made character: ${madeFailed.slice(0, 12).join(', ')}${madeFailed.length > 12 ? ` … and ${madeFailed.length - 12} more` : ''}`);
console.log(
  `${adventures.size - unplayable - lintFailed}/${adventures.size} adventures playable` +
    `${lintFailed ? `, ${lintFailed} fail the linter` : ''}` +
    `${unplayable ? `, ${unplayable} stall` : ''}`,
);
console.log(
  madeFailed.length === 0
    ? `all ${adventures.size} playable by a character the player made, in all four classes`
    : `${madeFailed.length} runs stalled for a made character`,
);
process.exit(unplayable + lintFailed + madeFailed.length > 0 ? 1 : 0);
