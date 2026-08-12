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

const { createSession, chooseOption, visibleOptions, combatAttack, combatFlee, restParty, castSpell } =
  await import(join(root, 'apps/api/dist/services/game.js'));
const { createBookCampaign, startCampaignSession, endCampaignSession } = await import(
  join(root, 'apps/api/dist/services/campaign.js')
);
const { lintGraph } = await import(join(root, 'packages/linter/dist/index.js'));
const { evaluateGuard } = await import(join(root, 'packages/engine/dist/index.js'));

const SEEDS = (process.env.SEEDS ?? 'a,b,c').split(',');
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
  let rests = 0;

  for (let i = 0; i < STEP_BUDGET && !session.ended; i++) {
    seen.add(session.currentBeat);

    if (session.combat) {
      const up = session.combat.order[session.combat.turnIndex];
      const actor = session.party.find((p) => p.id === up && p.hp > 0 && !p.dead);
      const target = session.combat.monsters.find((m) => m.hp > 0);
      if (actor) {
        if (!healIfDying(session, actor)) {
          if (target) combatAttack(session, actor.id, target.combatantId);
          else combatFlee(session);
        }
      } else {
        combatFlee(session);
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

    const route = routeToEnding(graph, session.currentBeat, session.flags);
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
console.log(
  `${adventures.size - unplayable - lintFailed}/${adventures.size} adventures playable` +
    `${lintFailed ? `, ${lintFailed} fail the linter` : ''}` +
    `${unplayable ? `, ${unplayable} stall` : ''}`,
);
process.exit(unplayable + lintFailed > 0 ? 1 : 0);
