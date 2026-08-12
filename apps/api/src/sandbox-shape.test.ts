import { describe, expect, it } from 'vitest';
import { remapModule } from './services/ingestion.js';
import { createSession, chooseOption, visibleOptions, combatAttack, combatFlee, restParty } from './services/game.js';

/**
 * Does the mapper generalise, or was it fitted to two examples?
 *
 * Both modules that have been ingested for real are small linear dungeons —
 * seven and twenty-five areas, a spine with short branches, at most six
 * connections anywhere. Every mapper decision was made while looking at those,
 * which is exactly the condition under which code quietly stops working on
 * anything else.
 *
 * A sandbox is the opposite shape: no spine, every region touching four to six
 * neighbours, several endings rather than one, and no order the areas have to
 * be visited in. That exercises the parts a corridor never reaches — the
 * fan-out that splits a hub with more than three exits, the undirected-map
 * inference, and the guarantee that some ending stays reachable when the party
 * can be almost anywhere.
 *
 * This does not test extraction. A real third module is still wanted for that,
 * and the roadmap says so. It tests the half that can be tested without one.
 */

/** A hex field: nineteen regions, each connected to its neighbours. */
function hexCrawl() {
  // Axial coordinates for a radius-2 hex field.
  const coords: Array<[number, number]> = [];
  for (let q = -2; q <= 2; q++) {
    for (let r = Math.max(-2, -q - 2); r <= Math.min(2, -q + 2); r++) coords.push([q, r]);
  }

  const id = (q: number, r: number) => `region-${q + 2}-${r + 2}`;
  const NEIGHBOURS: Array<[number, number]> = [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
  ];
  const has = (q: number, r: number) => coords.some(([a, b]) => a === q && b === r);

  const rooms = coords.map(([q, r], index) => {
    const connections = NEIGHBOURS.filter(([dq, dr]) => has(q + dq, r + dr)).map(([dq, dr]) =>
      id(q + dq, r + dr),
    );

    // Three endings, scattered rather than terminal-at-the-far-wall, and two
    // of them gated the way a module gates its conclusion.
    const ending = index === 6 || index === 12 || index === 17;
    const requires = index === 12 ? [id(-2, 0)] : index === 17 ? [id(2, -2)] : [];

    return {
      id: id(q, r),
      name: `Region ${q + 2}-${r + 2}`,
      description:
        `Open country, ${index} miles from anywhere that has a name. What the party finds ` +
        `here depends entirely on which way they came in, because nothing here is on the ` +
        `way to anything else.`,
      connections,
      npcs: [],
      requires,
      isEnding: ending,
      ...(index % 4 === 1
        ? {
            encounter: {
              creatures: [{ name: 'wolf', count: 2 }],
              victory: 'defeat-all' as const,
            },
          }
        : {}),
    };
  });

  return { title: 'The Ashfell Reaches', summary: 'A sandbox of open country.', rooms, partyLevel: 3 };
}

const result = remapModule(hexCrawl());

describe('a sandbox-shaped module', () => {
  it('maps and lints clean, with no hand-editing', () => {
    expect(result.lintErrors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('keeps every region rather than dropping what will not fit a chain', () => {
    const graph = result.graph as { beats: Array<{ id: string }> };
    const ids = new Set(graph.beats.map((b) => b.id));
    const missing = hexCrawl().rooms.map((r) => r.id).filter((id) => !ids.has(id));
    expect(missing).toEqual([]);
    // The nineteen regions, plus the choice beats a hub with more than three
    // exits gets split across.
    expect(graph.beats.length).toBeGreaterThan(19);
  });

  it('reads the map as undirected, the way a printed map is drawn', () => {
    // Each hex names all its neighbours, so nothing should need inferring
    // here — but the pass must not invent anything either.
    for (const added of result.report.inferredReturns) {
      expect(added.room).not.toBe(added.target);
    }
  });

  it('splits hubs with more than three exits instead of losing the extras', () => {
    expect(result.report.fannedOut.length).toBeGreaterThan(0);
    const graph = result.graph as {
      beats: Array<{ id: string; terminal?: boolean; options: unknown[] }>;
    };
    for (const beat of graph.beats) {
      if (beat.terminal) continue;
      expect(beat.options.length).toBeLessThanOrEqual(3);
    }
  });

  it('leaves an ending reachable from anywhere the party can be', () => {
    // Every warning is a way this could have gone wrong; stranding is the one
    // that matters on a map with no spine.
    expect(result.lintWarnings.filter((w) => /strand|no guaranteed/.test(w))).toEqual([]);
  });

  it('plays to an ending on every seed', () => {
    const graph = result.graph;
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']) {
      const session = createSession(graph, `sandbox-${seed}`);
      const seen = new Map<string, number>();

      for (let step = 0; step < 400 && !session.ended; step++) {
        if (session.combat) {
          const up = session.combat.order[session.combat.turnIndex];
          const actor = session.party.find((p) => p.id === up && p.hp > 0 && !p.dead);
          const target = session.combat.monsters.find((m) => m.hp > 0);
          if (actor && target) combatAttack(session, actor.id, target.combatantId);
          else combatFlee(session);
          continue;
        }
        if (session.party.some((p) => p.hp < p.hpMax / 2 && !p.dead)) {
          restParty(session, 'long');
          continue;
        }
        const options = visibleOptions(session);
        if (options.length === 0) break;
        // Prefer somewhere new, which is what a party in open country does.
        const next =
          [...options].sort((a, b) => (seen.get(a.target) ?? 0) - (seen.get(b.target) ?? 0))[0]!;
        seen.set(next.target, (seen.get(next.target) ?? 0) + 1);
        chooseOption(session, next.id);
      }

      expect(session.ended, `seed ${seed} never reached an ending`).toBe(true);
    }
  });
});
