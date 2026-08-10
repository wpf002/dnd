import { describe, expect, it } from 'vitest';
import { PREGENS, PREGEN_FIGHTER, PREGEN_ROGUE, PREGEN_WIZARD } from '@lantern/srd';
import { levelUp, levelParty, sneakAttackDiceFor, spellSaveDc } from './advancement/index.js';
import { proficiencyBonus } from './checks/index.js';

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
