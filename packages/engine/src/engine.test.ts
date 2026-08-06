import { describe, expect, it } from 'vitest';
import { Resolution } from '@lantern/schema';
import {
  abilityModifier,
  applyDamage,
  applyHealing,
  applyRest,
  conditionEffects,
  createRng,
  parseNotation,
  passivePerception,
  proficiencyBonus,
  resolveAttack,
  resolveCheck,
  resolveDeathSave,
  resolveSave,
  roll,
  rollD20,
  rollDamage,
  rollInitiative,
  spendSlot,
  hasSlot,
  tickConditions,
  addCondition,
} from './index.js';
import { PREGEN_CLERIC, PREGEN_FIGHTER, PREGEN_ROGUE, PREGEN_WIZARD } from '@lantern/srd';

describe('dice — determinism', () => {
  it('same seed, same faces, always', () => {
    for (let i = 0; i < 50; i++) {
      const a = roll(`seed-${i}`, '4d8+4');
      const b = roll(`seed-${i}`, '4d8+4');
      expect(a.record.dice).toEqual(b.record.dice);
      expect(a.record.natural).toBe(b.record.natural);
    }
  });

  it('different seeds diverge', () => {
    const faces = new Set<number>();
    for (let i = 0; i < 40; i++) faces.add(rollD20(`s-${i}`).natural);
    expect(faces.size).toBeGreaterThan(5);
  });

  it('faces stay in range across 10k rolls', () => {
    for (let i = 0; i < 10_000; i++) {
      const r = rollD20(`range-${i}`);
      expect(r.natural).toBeGreaterThanOrEqual(1);
      expect(r.natural).toBeLessThanOrEqual(20);
    }
  });

  it('d20 distribution is roughly uniform', () => {
    const counts = new Array(21).fill(0);
    const n = 20_000;
    for (let i = 0; i < n; i++) counts[rollD20(`dist-${i}`).natural]++;
    for (let face = 1; face <= 20; face++) {
      // Expect 5% each; allow generous tolerance.
      expect(counts[face] / n).toBeGreaterThan(0.03);
      expect(counts[face] / n).toBeLessThan(0.07);
    }
  });

  it('advantage keeps the higher face and preserves the discarded one', () => {
    for (let i = 0; i < 200; i++) {
      const r = rollD20(`adv-${i}`, 'advantage');
      expect(r.dice).toHaveLength(1);
      expect(r.discarded).toHaveLength(1);
      expect(r.dice[0]!.face).toBeGreaterThanOrEqual(r.discarded[0]!.face);
    }
  });

  it('disadvantage keeps the lower face', () => {
    for (let i = 0; i < 200; i++) {
      const r = rollD20(`dis-${i}`, 'disadvantage');
      expect(r.dice[0]!.face).toBeLessThanOrEqual(r.discarded[0]!.face);
    }
  });

  it('parses notation with spaces and negative modifiers', () => {
    expect(parseNotation('4d8 + 4')).toEqual({ count: 4, size: 8, modifier: 4 });
    expect(parseNotation('3d6-1')).toEqual({ count: 3, size: 6, modifier: -1 });
    expect(() => parseNotation('2d7' as never)).toThrow();
  });

  it('critical hits double dice, not the modifier', () => {
    const normal = rollDamage('crit-test', '2d6+3', false);
    const crit = rollDamage('crit-test', '2d6+3', true);
    expect(normal.record.dice).toHaveLength(2);
    expect(crit.record.dice).toHaveLength(4);
    expect(normal.modifier).toBe(3);
    expect(crit.modifier).toBe(3); // flat bonus not doubled
  });
});

describe('checks — derivation', () => {
  it('implements the modifier table', () => {
    expect(abilityModifier(8)).toBe(-1);
    expect(abilityModifier(10)).toBe(0);
    expect(abilityModifier(15)).toBe(2);
    expect(abilityModifier(20)).toBe(5);
    expect(abilityModifier(1)).toBe(-5);
  });

  it('implements proficiency progression', () => {
    expect(proficiencyBonus(1)).toBe(2);
    expect(proficiencyBonus(4)).toBe(2);
    expect(proficiencyBonus(5)).toBe(3);
    expect(proficiencyBonus(17)).toBe(6);
  });

  it('computes passive perception from the sheet, not from storage', () => {
    // Fighter: Wis 12 (+1), proficient in perception, level 3 (+2) → 13
    expect(passivePerception(PREGEN_FIGHTER)).toBe(13);
    // Wizard: Wis 12 (+1), not proficient → 11
    expect(passivePerception(PREGEN_WIZARD)).toBe(11);
  });

  it('expertise doubles proficiency', () => {
    // Rogue: Dex 17 (+3), expertise in stealth at level 3 (+4) → check total mods = +7
    const res = resolveCheck({
      seed: 'x',
      character: PREGEN_ROGUE,
      dc: 10,
      ability: 'dex',
      skill: 'stealth',
    });
    const modSum = res.modifiers.reduce((s, m) => s + m.value, 0);
    expect(modSum).toBe(7);
  });

  it('margin is total minus DC and every resolution validates against the schema', () => {
    const res = resolveCheck({
      seed: 'margin-test',
      character: PREGEN_CLERIC,
      dc: 15,
      ability: 'wis',
      skill: 'insight',
    });
    expect(res.margin).toBe(res.total! - 15);
    expect(Resolution.safeParse(res).success).toBe(true);
  });

  it('save proficiency applies only to proficient saves', () => {
    const conSave = resolveSave({ seed: 's', character: PREGEN_FIGHTER, dc: 10, ability: 'con' });
    expect(conSave.modifiers.some((m) => m.source === 'proficiency')).toBe(true);
    const wisSave = resolveSave({ seed: 's', character: PREGEN_FIGHTER, dc: 10, ability: 'wis' });
    expect(wisSave.modifiers.some((m) => m.source === 'proficiency')).toBe(false);
  });
});

describe('combat', () => {
  it('initiative is deterministic and dex-tiebroken', () => {
    const combatants = [
      { id: 'a', dexScore: 14 },
      { id: 'b', dexScore: 18 },
      { id: 'c', dexScore: 10 },
    ];
    const first = rollInitiative('battle-1', combatants);
    const second = rollInitiative('battle-1', combatants);
    expect(first).toEqual(second);
    // Sorted descending by roll
    for (let i = 1; i < first.length; i++) {
      expect(first[i - 1]!.roll).toBeGreaterThanOrEqual(first[i]!.roll);
    }
  });

  it('nat 20 hits regardless of AC and doubles damage dice', () => {
    // Find a seed producing a nat 20
    let seed = '';
    for (let i = 0; i < 2000; i++) {
      if (rollD20(`hunt-${i}:attack`).natural === 20) {
        seed = `hunt-${i}`;
        break;
      }
    }
    expect(seed).not.toBe('');
    const res = resolveAttack({
      seed,
      attackerId: 'pc',
      targetId: 'target',
      targetAc: 30,
      attackModifiers: [{ source: 'str', value: 0 }],
      damage: '1d8',
      damageType: 'slashing',
    });
    expect(res.outcome).toBe('critical-success');
    const dmg = res.effects.find((e) => e.kind === 'damage');
    expect(dmg && dmg.kind === 'damage' && dmg.roll?.dice.length).toBe(2);
  });

  it('nat 1 misses regardless of modifiers', () => {
    let seed = '';
    for (let i = 0; i < 2000; i++) {
      if (rollD20(`fumble-${i}:attack`).natural === 1) {
        seed = `fumble-${i}`;
        break;
      }
    }
    expect(seed).not.toBe('');
    const res = resolveAttack({
      seed,
      attackerId: 'pc',
      targetId: 'target',
      targetAc: 2,
      attackModifiers: [{ source: 'str', value: 99 }],
      damage: '1d8',
      damageType: 'slashing',
    });
    expect(res.outcome).toBe('critical-failure');
    expect(res.effects).toHaveLength(0);
  });

  it('death saves follow the three-count rules', () => {
    let char = { ...PREGEN_FIGHTER, hp: 0 };
    let stable = false;
    let dead = false;
    for (let i = 0; i < 10 && !stable && !dead; i++) {
      const r = resolveDeathSave(`ds-${i}`, char);
      char = r.character;
      if (r.final === 'stable') stable = true;
      if (r.final === 'dead') dead = true;
      if (r.final === 'conscious') break;
      expect(char.deathSaveSuccesses).toBeLessThanOrEqual(3);
      expect(char.deathSaveFailures).toBeLessThanOrEqual(3);
    }
  });
});

describe('state', () => {
  it('temp HP absorbs damage first', () => {
    const c = { ...PREGEN_FIGHTER, tempHp: 5 };
    const after = applyDamage(c, 8);
    expect(after.tempHp).toBe(0);
    expect(after.hp).toBe(PREGEN_FIGHTER.hp - 3);
  });

  it('dropping to 0 applies unconscious; healing from 0 removes it', () => {
    const down = applyDamage(PREGEN_WIZARD, 999);
    expect(down.hp).toBe(0);
    expect(down.conditions.some((c) => c.condition === 'unconscious')).toBe(true);
    const up = applyHealing(down, 1);
    expect(up.hp).toBe(1);
    expect(up.conditions.some((c) => c.condition === 'unconscious')).toBe(false);
  });

  it('healing caps at max HP', () => {
    expect(applyHealing(PREGEN_FIGHTER, 999).hp).toBe(PREGEN_FIGHTER.hpMax);
  });

  it('slots spend down and long rest restores them', () => {
    let c = PREGEN_CLERIC;
    expect(hasSlot(c, 1)).toBe(true);
    c = spendSlot(c, 1);
    c = spendSlot(c, 1);
    expect(c.spellcasting!.slotsRemaining[1]).toBe(2);
    expect(() => {
      let x = c;
      x = spendSlot(x, 2);
      x = spendSlot(x, 2);
      spendSlot(x, 2); // third level-2 spend must throw
    }).toThrow();
    const rested = applyRest(c, 'long');
    expect(rested.spellcasting!.slotsRemaining).toEqual(rested.spellcasting!.slotsMax);
    expect(rested.hp).toBe(rested.hpMax);
  });

  it('exhaustion stacks; other conditions are idempotent', () => {
    let conds = addCondition([], { condition: 'exhaustion', level: 1 });
    conds = addCondition(conds, { condition: 'exhaustion', level: 1 });
    expect(conds.find((c) => c.condition === 'exhaustion')?.level).toBe(2);
    conds = addCondition(conds, { condition: 'prone' });
    conds = addCondition(conds, { condition: 'prone' });
    expect(conds.filter((c) => c.condition === 'prone')).toHaveLength(1);
  });

  it('timed conditions expire on tick', () => {
    let conds = addCondition([], { condition: 'frightened', remaining: 2 });
    conds = tickConditions(conds);
    expect(conds).toHaveLength(1);
    conds = tickConditions(conds);
    expect(conds).toHaveLength(0);
  });

  it('paralysis grants attackers advantage and blocks action', () => {
    const fx = conditionEffects([{ condition: 'paralyzed' }]);
    expect(fx.attackedAdvantage).toBe(true);
    expect(fx.cannotAct).toBe(true);
    expect(fx.autoFailStrDex).toBe(true);
  });
});

describe('rng quality guard', () => {
  it('mean of the raw generator sits near 0.5', () => {
    const rng = createRng('quality');
    let sum = 0;
    const n = 100_000;
    for (let i = 0; i < n; i++) sum += rng();
    expect(sum / n).toBeGreaterThan(0.49);
    expect(sum / n).toBeLessThan(0.51);
  });
});
