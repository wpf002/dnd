import { describe, expect, it } from 'vitest';
import { PREGENS, PREGENS_LEVEL_1, PREGEN_FIGHTER, PREGEN_ROGUE, PREGEN_WIZARD, PREGEN_CLERIC, SPELLS } from '@lantern/srd';
import { levelUp, levelParty, sneakAttackDiceFor, spellSaveDc } from './advancement/index.js';
import { proficiencyBonus, resolveGroupCheck } from './checks/index.js';
import { resolveDeathSave } from './combat/index.js';
import { applyHealing, applyRest } from './state/index.js';
import { castAtTarget } from './spells/index.js';

/**
 * Phase 6 exit criterion: levelling is correct and reproducible.
 *
 * The kill condition on Phase 6 is levelling correctness — a campaign that
 * runs to 20 is worthless if the sheet it produces at 14 is wrong. These
 * tests check the things that are actually easy to get wrong: cumulative HP,
 * the class-specific ASI levels, slot tables at the boundaries, and the
 * seeded reproducibility every other rules module promises.
 */

describe('proficiency bonus', () => {
  it('steps at 5, 9, 13, and 17', () => {
    expect([1, 4].map(proficiencyBonus)).toEqual([2, 2]);
    expect([5, 8].map(proficiencyBonus)).toEqual([3, 3]);
    expect([9, 12].map(proficiencyBonus)).toEqual([4, 4]);
    expect([13, 16].map(proficiencyBonus)).toEqual([5, 5]);
    expect([17, 20].map(proficiencyBonus)).toEqual([6, 6]);
  });
});

describe('levelUp — hit points', () => {
  it('accumulates every intervening level rather than jumping', () => {
    // Fighter: d10, CON 16 (+3). Average HP per level is 6, so each level
    // adds 9. Level 3 -> 6 is three levels: 31 + 27 = 58.
    const { character, steps } = levelUp(PREGEN_FIGHTER, 6);
    expect(steps.map((s) => s.level)).toEqual([4, 5, 6]);
    expect(character.hpMax).toBe(31 + 27);
  });

  it('never adds less than 1 hp for a level', () => {
    const frail = { ...PREGEN_WIZARD, abilities: { ...PREGEN_WIZARD.abilities, con: 1 } };
    const { character } = levelUp(frail, 4);
    // d6 average is 4, CON -5 would be -1; the floor keeps it at +1/level.
    expect(character.hpMax).toBe(frail.hpMax + 1);
  });

  it('does not heal, and does not refill slots', () => {
    const wounded = { ...PREGEN_WIZARD, hp: 4 };
    const { character } = levelUp(wounded, 5);
    expect(character.hp).toBe(4);
    expect(character.hpMax).toBeGreaterThan(wounded.hpMax);
    expect(character.spellcasting?.slotsRemaining).toEqual(wounded.spellcasting?.slotsRemaining);
  });

  it('is reproducible under a seed and varies without one', () => {
    const a = levelUp(PREGEN_FIGHTER, 10, { method: 'roll', seed: 'campaign-a' });
    const b = levelUp(PREGEN_FIGHTER, 10, { method: 'roll', seed: 'campaign-a' });
    const c = levelUp(PREGEN_FIGHTER, 10, { method: 'roll', seed: 'campaign-b' });
    expect(a.character.hpMax).toBe(b.character.hpMax);
    expect(a.steps.map((s) => s.hpRolled)).not.toEqual(c.steps.map((s) => s.hpRolled));
  });

  it('records the dice inputs when rolling (invariant 5)', () => {
    const { steps } = levelUp(PREGEN_FIGHTER, 4, { method: 'roll', seed: 's' });
    const step = steps[0]!;
    expect(step.roll).toBeDefined();
    expect(step.roll!.natural).toBeGreaterThanOrEqual(1);
    expect(step.roll!.natural).toBeLessThanOrEqual(10);
  });
});

describe('levelUp — features and ASIs', () => {
  it('gives the fighter its bonus ASIs at 6 and 14', () => {
    expect(levelUp(PREGEN_FIGHTER, 20).asiPending).toEqual([4, 6, 8, 12, 14, 16, 19]);
  });

  it('gives the rogue its bonus ASI at 10', () => {
    expect(levelUp(PREGEN_ROGUE, 20).asiPending).toEqual([4, 8, 10, 12, 16, 19]);
  });

  it('gives the wizard only the universal ASIs', () => {
    expect(levelUp(PREGEN_WIZARD, 20).asiPending).toEqual([4, 8, 12, 16, 19]);
  });

  it('reports features in the order they are gained', () => {
    const { featuresGained } = levelUp(PREGEN_FIGHTER, 11);
    expect(featuresGained).toContain('Extra Attack');
    expect(featuresGained).toContain('Extra Attack (2)');
    expect(featuresGained.indexOf('Extra Attack')).toBeLessThan(
      featuresGained.indexOf('Extra Attack (2)'),
    );
  });
});

describe('levelUp — spell slots', () => {
  it('sets slot maxima from the full-caster table', () => {
    expect(levelUp(PREGEN_WIZARD, 5).character.spellcasting?.slotsMax).toEqual([
      0, 4, 3, 2, 0, 0, 0, 0, 0, 0,
    ]);
    expect(levelUp(PREGEN_WIZARD, 20).character.spellcasting?.slotsMax).toEqual([
      0, 4, 3, 3, 3, 3, 2, 2, 1, 1,
    ]);
  });

  it('leaves non-casters without spellcasting', () => {
    expect(levelUp(PREGEN_FIGHTER, 20).character.spellcasting).toBeUndefined();
  });
});

describe('derived values', () => {
  it('computes spell save DC from the levelled proficiency bonus', () => {
    const at5 = levelUp(PREGEN_WIZARD, 5).character;
    const at17 = levelUp(PREGEN_WIZARD, 17).character;
    expect(spellSaveDc(at17)! - spellSaveDc(at5)!).toBe(
      proficiencyBonus(17) - proficiencyBonus(5),
    );
  });

  it('scales sneak attack for the rogue and nobody else', () => {
    expect(sneakAttackDiceFor(levelUp(PREGEN_ROGUE, 11).character)).toBe(6);
    expect(sneakAttackDiceFor(levelUp(PREGEN_FIGHTER, 11).character)).toBe(0);
  });
});

describe('bounds', () => {
  it('refuses to level down or past 20', () => {
    expect(() => levelUp(PREGEN_FIGHTER, 2)).toThrow(/cannot level down/);
    expect(() => levelUp(PREGEN_FIGHTER, 21)).toThrow(/out of range/);
  });

  it('names the class when no progression table exists', () => {
    const bard = { ...PREGEN_FIGHTER, characterClass: 'bard' as never };
    expect(() => levelUp(bard, 4)).toThrow(/bard/);
  });
});

describe('levelParty', () => {
  it('advances the whole party and leaves those already there alone', () => {
    const results = levelParty(PREGENS, 8);
    expect(results.every((r) => r.character.level === 8)).toBe(true);

    const again = levelParty(
      results.map((r) => r.character),
      8,
    );
    expect(again.every((r) => r.steps.length === 0)).toBe(true);
  });
});

describe('the level-1 pregens are the level-3 pregens, un-advanced', () => {
  /**
   * Both sets are authored, because levelling cannot run backwards. This is
   * what keeps them from drifting apart: advance the level-1 sheets and the
   * mechanical numbers on the level-3 sheets must come back exactly.
   *
   * Spell selection is excluded deliberately — which spells a caster knows is
   * a player's choice, not something advancement derives.
   */
  it('reproduces hp, hit dice, and slots exactly', () => {
    const advanced = levelParty(PREGENS_LEVEL_1, 3).map((r) => r.character);
    for (const authored of PREGENS) {
      const derived = advanced.find((c) => c.id === authored.id)!;
      expect(derived.hpMax, `${authored.name} hpMax`).toBe(authored.hpMax);
      expect(derived.hitDiceRemaining, `${authored.name} hit dice`).toBe(
        authored.hitDiceRemaining,
      );
      expect(derived.spellcasting?.slotsMax, `${authored.name} slots`).toEqual(
        authored.spellcasting?.slotsMax,
      );
    }
  });
});

describe('death is permanent state, not a transient result', () => {
  /**
   * `resolveDeathSave` computed `final: 'dead'` and nothing ever stored it.
   * The character sheet only carried `deathSaveFailures`, and both
   * `applyRest` and `applyHealing` reset that and healed to full — so a
   * character who failed three death saves came back at the next long rest,
   * fully healed, with no record that they had died.
   */
  const corpse = { ...PREGEN_FIGHTER, hp: 0, deathSaveFailures: 3, dead: true };

  it('is not undone by a long rest', () => {
    const rested = applyRest(corpse, 'long');
    expect(rested.dead).toBe(true);
    expect(rested.hp).toBe(0);
  });

  it('is not undone by healing', () => {
    const healed = applyHealing(corpse, 50);
    expect(healed.dead).toBe(true);
    expect(healed.hp).toBe(0);
  });

  it('still lets the living rest normally', () => {
    const hurt = { ...PREGEN_FIGHTER, hp: 1 };
    expect(applyRest(hurt, 'long').hp).toBe(hurt.hpMax);
    expect(applyHealing(hurt, 5).hp).toBe(6);
  });

  it('is recorded on the sheet the moment the third save fails', () => {
    // Seeds are searched rather than assumed: the point is that whenever the
    // engine reports 'dead', the character it returns says so too.
    let sawDeath = false;
    for (let i = 0; i < 200 && !sawDeath; i++) {
      let pc = { ...PREGEN_FIGHTER, hp: 0 };
      for (let save = 0; save < 5; save++) {
        const r = resolveDeathSave(`death-seed-${i}-${save}`, pc);
        pc = r.character;
        if (r.final === 'dead') {
          expect(pc.dead).toBe(true);
          sawDeath = true;
          break;
        }
        if (r.final) break; // stable or revived
      }
    }
    expect(sawDeath, 'no seed in 200 produced a death — widen the search').toBe(true);
  });
});

describe('casting at a target', () => {
  /**
   * Until this existed the wizard had fire-bolt, magic missile, sleep and
   * burning hands prepared and no way to cast any of them: the only combat
   * actions were attack, heal, and flee.
   */
  const goblin = { id: 'g1', ac: 15, hp: 7, abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 } };
  const wizard = PREGEN_WIZARD;

  it('resolves an attack cantrip against AC and spends no slot', () => {
    const before = wizard.spellcasting!.slotsRemaining;
    const r = castAtTarget({ seed: 'bolt', caster: wizard, spell: SPELLS['fire-bolt'], slotLevel: 0, target: goblin });
    expect(r.resolution.checkKind).toBe('attack-roll');
    expect(r.caster.spellcasting!.slotsRemaining).toEqual(before); // cantrips are free
  });

  it('spends the slot a levelled spell was cast with', () => {
    const r = castAtTarget({ seed: 'mm', caster: wizard, spell: SPELLS['magic-missile'], slotLevel: 1, target: goblin });
    expect(r.caster.spellcasting!.slotsRemaining[1]).toBe(wizard.spellcasting!.slotsRemaining[1]! - 1);
    // Magic missile does not roll to hit; it simply lands.
    expect(r.resolution.checkKind).toBe('none');
    expect(r.damage).toBeGreaterThan(0);
  });

  it('halves a save spell on a success and applies nothing on it', () => {
    // Searched rather than assumed: the point is that whenever the target
    // saves, damage is halved and no condition lands.
    let sawSave = false;
    for (let i = 0; i < 60 && !sawSave; i++) {
      const r = castAtTarget({
        seed: `burn-${i}`,
        caster: wizard,
        spell: SPELLS['burning-hands'],
        slotLevel: 1,
        target: goblin,
      });
      if (r.resolution.outcome === 'success') {
        sawSave = true;
        expect(r.condition).toBeUndefined();
        expect(r.damage).toBeGreaterThan(0); // burning hands is half-on-save
      }
    }
    expect(sawSave).toBe(true);
  });

  it('treats sleep as a pool of hit points, not damage', () => {
    // 5d8 against a 7 hp goblin lands essentially always, and deals nothing.
    const r = castAtTarget({ seed: 'zzz', caster: wizard, spell: SPELLS.sleep, slotLevel: 1, target: goblin });
    expect(r.damage).toBe(0);
    expect(r.condition).toBe('unconscious');

    // Against something far tougher the same pool does nothing at all.
    const ogre = { ...goblin, id: 'o1', hp: 59 };
    const miss = castAtTarget({ seed: 'zzz', caster: wizard, spell: SPELLS.sleep, slotLevel: 1, target: ogre });
    expect(miss.condition).toBeUndefined();
  });

  it('scales a cantrip with the caster level, not the slot', () => {
    const low = castAtTarget({ seed: 's', caster: wizard, spell: SPELLS['fire-bolt'], slotLevel: 0, target: goblin });
    const high = castAtTarget({
      seed: 's',
      caster: levelUp(wizard, 11).character,
      spell: SPELLS['fire-bolt'],
      slotLevel: 0,
      target: goblin,
    });
    const dice = (r: typeof low) => r.resolution.effects.flatMap((e) => ('roll' in e && e.roll ? e.roll.dice : []));
    // Same seed, more dice: 1d10 at level 3, 3d10 at level 11.
    expect(dice(high).length).toBeGreaterThan(dice(low).length);
  });

  it('refuses a spell it cannot resolve rather than doing nothing', () => {
    expect(() =>
      castAtTarget({ seed: 'x', caster: wizard, spell: SPELLS['mage-hand'], slotLevel: 0, target: goblin }),
    ).toThrow(/no effect/);
    // The cleric HAS cure-wounds prepared, so this reaches the healing check
    // rather than stopping at "not prepared".
    expect(() =>
      castAtTarget({ seed: 'x', caster: PREGEN_CLERIC, spell: SPELLS['cure-wounds'], slotLevel: 1, target: goblin }),
    ).toThrow(/cast it on an ally/);
  });
});

describe('group checks', () => {
  /**
   * Modules print these constantly — "DC 13 group Stealth check, Success:
   * avoid the encounter" — and without them an avoidable obstacle could only
   * be represented as the fight that follows failing it.
   */
  const party = PREGENS;

  it('succeeds when at least half the party succeeds', () => {
    // A DC anyone clears: everyone passes, so the party passes.
    const easy = resolveGroupCheck({ seed: 'g1', party, dc: 1, ability: 'dex', skill: 'stealth' });
    expect(easy.succeeded).toBe(true);
    expect(easy.passed).toBe(easy.attempted);

    // A DC nobody clears.
    const hard = resolveGroupCheck({ seed: 'g1', party, dc: 30, ability: 'dex', skill: 'stealth' });
    expect(hard.succeeded).toBe(false);
    expect(hard.passed).toBe(0);
  });

  it('returns every roll, not just the tally', () => {
    // A party told "you were heard" is owed the dice that said so.
    const result = resolveGroupCheck({ seed: 'g2', party, dc: 12, ability: 'dex', skill: 'stealth' });
    expect(result.resolutions).toHaveLength(party.length);
    for (const res of result.resolutions) expect(res.roll).toBeDefined();
  });

  it('leaves out the unconscious and the dead', () => {
    const hurt = party.map((p, i) => (i === 0 ? { ...p, hp: 0 } : i === 1 ? { ...p, dead: true } : p));
    const result = resolveGroupCheck({ seed: 'g3', party: hurt, dc: 10, ability: 'dex' });
    expect(result.attempted).toBe(party.length - 2);
  });

  it('fails when nobody can attempt it', () => {
    const down = party.map((p) => ({ ...p, hp: 0 }));
    const result = resolveGroupCheck({ seed: 'g4', party: down, dc: 5, ability: 'dex' });
    expect(result.attempted).toBe(0);
    expect(result.succeeded).toBe(false);
  });

  it('is reproducible under a seed', () => {
    const a = resolveGroupCheck({ seed: 'same', party, dc: 12, ability: 'dex', skill: 'stealth' });
    const b = resolveGroupCheck({ seed: 'same', party, dc: 12, ability: 'dex', skill: 'stealth' });
    expect(a.resolutions.map((r) => r.total)).toEqual(b.resolutions.map((r) => r.total));
  });
});
