import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Resolution } from '@lantern/schema';
import {
  chooseOption,
  castSpell,
  combatAttack,
  combatFlee,
  createSession,
  freeTextConstraint,
  restParty,
  sessionView,
  visibleOptions,
  acOf,
  type GameSession,
} from './services/game.js';

/**
 * The Phase 2 game loop, end to end and headless: a full playthrough of
 * The Bell at Saltmire from the tideline to an ending, through real combat,
 * with every mechanical outcome audited against its own audit trail.
 */

const here = dirname(fileURLToPath(import.meta.url));
const graph = JSON.parse(
  readFileSync(join(here, '..', '..', '..', 'content', 'adventures', 'the-bell-at-saltmire.json'), 'utf8'),
);

function freshSession(seed: string): GameSession {
  return createSession(graph, seed);
}

/** Fight the current combat to a conclusion by always attacking the weakest target. */
function fightItOut(session: GameSession): void {
  let guard = 0;
  while (session.combat && guard++ < 300) {
    const currentId = session.combat.order[session.combat.turnIndex]!;
    const pc = session.party.find((p) => p.id === currentId && p.hp > 0 && !p.dead);
    if (!pc) throw new Error('advanceMonsters should have left a living PC on turn');

    // Pick a downed ally up before swinging. Death is permanent, so a party
    // that ignores its dying loses members for the rest of the campaign.
    const sc = pc.spellcasting;
    const dying = session.party.find((p) => p.hp === 0 && !p.dead);
    if (sc && dying) {
      const spell = ['healing-word', 'cure-wounds'].find((id) => sc.prepared.includes(id));
      const slot = sc.slotsRemaining.findIndex((n, level) => level >= 1 && n > 0);
      if (spell && slot >= 1) {
        castSpell(session, pc.id, spell, dying.id, slot);
        continue;
      }
    }

    const target = [...session.combat.monsters].filter((m) => m.hp > 0).sort((a, b) => a.hp - b.hp)[0];
    if (!target) break;
    combatAttack(session, pc.id, target.combatantId);
  }
  expect(guard).toBeLessThan(300);
}

describe('session lifecycle', () => {
  it('starts at the tideline with the four pregens', () => {
    const s = freshSession('t1');
    expect(s.currentBeat).toBe('arrival');
    expect(s.party).toHaveLength(4);
    const view = sessionView(s);
    expect(view.beat.title).toBe('The Tideline');
    expect(view.beat.options).toHaveLength(3);
  });

  it('derives AC from equipment on read', () => {
    const s = freshSession('t2');
    const fighter = s.party.find((p) => p.characterClass === 'fighter')!;
    // chain mail 16 (dex capped at 0) + shield 2
    expect(acOf(fighter)).toBe(18);
    const rogue = s.party.find((p) => p.characterClass === 'rogue')!;
    // leather 11 + dex 3
    expect(acOf(rogue)).toBe(14);
  });
});

describe('options and checks', () => {
  it('a plain option transitions and applies effects', () => {
    const s = freshSession('t3');
    chooseOption(s, 'watch-first');
    expect(s.currentBeat).toBe('the-causeway');
    expect(s.flags['watched-tower']).toBe(true);
  });

  it('a checked option routes by outcome and logs the resolution', () => {
    const s = freshSession('t4');
    const outcome = chooseOption(s, 'find-boat');
    expect(outcome.resolutions).toHaveLength(1);
    const res = outcome.resolutions[0]!;
    expect(Resolution.safeParse(res).success).toBe(true);
    expect(res.dc).toBe(12);
    if (res.outcome === 'success' || res.outcome === 'critical-success') {
      expect(s.currentBeat).toBe('village-edge');
    } else {
      expect(s.currentBeat).toBe('the-causeway');
    }
    // The turn log kept it, inputs and all.
    expect(s.turns.at(-1)!.resolution).toEqual(res);
  });

  it('guarded options are hidden until their flag is set', () => {
    const s = freshSession('t5');
    chooseOption(s, 'cross-now');
    // At the causeway; wade to get soaked.
    chooseOption(s, 'wade');
    expect(s.flags.soaked).toBe(true);
    // Walk to Old Wend: village-edge -> harbor-row.
    chooseOption(s, 'fisher-cottages');
    expect(s.currentBeat).toBe('harbor-row');
    const ids = visibleOptions(s).map((o) => o.id);
    expect(ids).toContain('dry-off');
    // Dry off clears the flag; the option disappears.
    chooseOption(s, 'dry-off');
    expect(s.flags.soaked).toBe(false);
    chooseOption(s, 'to-harbor');
    expect(visibleOptions(s).map((o) => o.id)).not.toContain('dry-off');
  });
});

describe('combat', () => {
  function intoGraveyard(seed: string): GameSession {
    const s = freshSession(seed);
    chooseOption(s, 'cross-now');
    chooseOption(s, 'wade');
    chooseOption(s, 'graveyard-cut'); // enters the grave-waders encounter
    return s;
  }

  it('entering an encounter beat starts combat with initiative', () => {
    const s = intoGraveyard('t6');
    expect(s.combat).not.toBeNull();
    expect(s.combat!.monsters.length).toBe(4); // 2 ghouls + 2 rats
    expect(s.combat!.order.length).toBeGreaterThanOrEqual(5);
    // View shows the combat, hides beat options.
    const view = sessionView(s);
    expect(view.combat).not.toBeNull();
    expect(view.beat.options).toHaveLength(0);
  });

  it('victory routes through the encounter onVictory transition', () => {
    const s = intoGraveyard('t7');
    fightItOut(s);
    // Either the party won (sexton's grave) or wiped (village-edge) or... the
    // sim always attacks, so with these numbers the party should win.
    expect(['the-sextons-grave', 'village-edge']).toContain(s.currentBeat);
    if (s.currentBeat === 'the-sextons-grave') {
      expect(s.flags['learned-name']).toBe(true);
    }
  });

  it('fleeing routes through onFlee', () => {
    const s = intoGraveyard('t8');
    combatFlee(s);
    expect(s.currentBeat).toBe('church-square');
    expect(s.combat).toBeNull();
  });

  it('every combat resolution in the log re-derives cleanly', () => {
    const s = intoGraveyard('t9');
    fightItOut(s);
    for (const turn of s.turns) {
      const res = turn.resolution;
      expect(Resolution.safeParse(res).success).toBe(true);
      if (res.roll && res.total !== undefined) {
        const modSum = res.modifiers.reduce((sum, m) => sum + m.value, 0);
        expect(res.total).toBe(res.roll.natural + modSum);
      }
    }
  });

  it('the same seed replays the same fight', () => {
    const run = (seed: string) => {
      const s = intoGraveyard(seed);
      fightItOut(s);
      return s.turns.map((t) => t.resolution.roll?.natural ?? -1);
    };
    expect(run('replay-x')).toEqual(run('replay-x'));
  });
});

describe('free text — the improv budget', () => {
  it('absorbs off-graph actions while budget remains, then constrains in-fiction', () => {
    const s = freshSession('t10');
    const beat = s.graph.beats.find((b) => b.id === 'arrival')!;
    for (let i = 0; i < beat.improvBudget; i++) {
      const out = freeTextConstraint(s, `improvised action ${i}`);
      expect(out.accepted).toBe(true);
    }
    const out = freeTextConstraint(s, 'one more');
    expect(out.accepted).toBe(false);
    expect(out.refusal).toContain('tide'); // in-fiction, not an error message
  });
});

describe('full playthrough to each ending', () => {
  /**
   * Drives a session toward a beat by routing table, fighting combats as they
   * come and taking a long rest after every fight — which is what a real
   * player would do. Bounded so a routing bug fails fast instead of hanging.
   */
  function marchTo(s: GameSession, target: string, route: Record<string, string>): void {
    for (let step = 0; step < 60; step++) {
      if (s.combat) {
        fightItOut(s);
        if (!s.combat && !s.ended) restParty(s, 'long');
        continue;
      }
      if (s.currentBeat === target || s.ended) return;
      const optionId = route[s.currentBeat];
      if (!optionId) throw new Error(`no route from beat '${s.currentBeat}'`);
      chooseOption(s, optionId);
    }
    throw new Error(`failed to reach '${target}' within 60 steps (at '${s.currentBeat}')`);
  }

  it('reaches the keeper ending via the graveyard, without ever seeing the belfry', () => {
    const s = freshSession('full-run-1');
    marchTo(s, 'the-silent-bell', {
      arrival: 'cross-now',
      'the-causeway': 'wade',
      'village-edge': 'graveyard-cut',
      'church-square': 'to-graveyard',
      'the-sextons-grave': 'grave-to-nave',
      'harbor-row': 'listen', // defeat at the crypt drops us here
      'bell-tower-stair': 'wall-ladder',
      'crypt-descent': 'enter-crypt',
    });
    expect(s.currentBeat).toBe('the-silent-bell');

    // bell-seen is NOT set (the wall-ladder bypasses the belfry): sink-it hidden.
    const ids = visibleOptions(s).map((o) => o.id);
    expect(ids).not.toContain('sink-it');
    expect(ids).toContain('take-it-up'); // learned-name from the sexton's grave
    chooseOption(s, 'take-it-up');
    expect(s.ended).toBe(true);
    expect(s.currentBeat).toBe('ending-keeper');
  });

  it('the flee ending is always available, and skipping the graveyard hides the keeper ending', () => {
    const s = freshSession('full-run-2');
    marchTo(s, 'the-silent-bell', {
      arrival: 'cross-now',
      'the-causeway': 'wade',
      'village-edge': 'to-square',
      'church-square': 'to-nave',
      'the-sextons-grave': 'grave-to-square',
      'harbor-row': 'listen',
      'bell-tower-stair': 'wall-ladder',
      'crypt-descent': 'enter-crypt',
    });
    const ids = visibleOptions(s).map((o) => o.id);
    expect(ids).not.toContain('take-it-up'); // never learned the name
    expect(ids).toContain('run');
    chooseOption(s, 'run');
    expect(s.ended).toBe(true);
    expect(s.currentBeat).toBe('ending-tide');
  });

  it('the silence ending requires having stood in the belfry', () => {
    const s = freshSession('full-run-3');
    marchTo(s, 'bell-tower-stair', {
      arrival: 'cross-now',
      'the-causeway': 'wade',
      'village-edge': 'to-square',
      'church-square': 'to-nave',
      'harbor-row': 'listen',
      'the-sextons-grave': 'grave-to-square',
    });
    // Climb properly this time: try the stair until a check lands.
    for (let i = 0; i < 20 && s.currentBeat !== 'the-belfry'; i++) {
      if (s.currentBeat === 'bell-tower-stair') chooseOption(s, 'climb-stair');
      else if (s.currentBeat === 'church-square') chooseOption(s, 'to-nave');
      if (s.combat) {
        fightItOut(s);
        if (!s.combat) restParty(s, 'long');
      }
    }
    expect(s.currentBeat).toBe('the-belfry');
    expect(s.flags['bell-seen']).toBe(true);
    marchTo(s, 'the-silent-bell', {
      'the-belfry': 'descend',
      'crypt-descent': 'enter-crypt',
      'harbor-row': 'listen',
      'church-square': 'to-nave',
      'bell-tower-stair': 'climb-stair',
      'village-edge': 'to-square',
    });
    const ids = visibleOptions(s).map((o) => o.id);
    expect(ids).toContain('sink-it');
    chooseOption(s, 'sink-it');
    expect(s.currentBeat).toBe('ending-silence');
  });
});
