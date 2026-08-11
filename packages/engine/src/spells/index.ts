import type {
  AbilityScores,
  Character,
  Condition,
  Effect,
  Modifier,
  Resolution,
  Seed,
  SpellLevel,
} from '@lantern/schema';
import type { SpellInput } from '@lantern/srd';
import { abilityModifier, proficiencyBonus, resolveSave } from '../checks/index.js';
import { resolveAttack } from '../combat/index.js';
import { spellSaveDc } from '../advancement/index.js';
import { roll } from '../dice/index.js';
import { applyHealing, hasSlot, spendSlot } from '../state/index.js';

/**
 * Spellcasting — healing only.
 *
 * This exists because permanent death exposed a gap: the cleric had
 * `cure-wounds` prepared since the first pregen was written, the SRD data
 * carried its dice, and `spendSlot` and `applyHealing` both existed — but
 * nothing connected them, and the session layer offered exactly two combat
 * actions, attack and flee. A party could not heal at all. That was survivable
 * only while death silently undid itself at the next long rest.
 *
 * Deliberately narrow: attack spells, saving-throw spells, and area effects
 * are NOT implemented. Healing is the subset that makes death fair, which is
 * the problem actually at hand. Anything else belongs with real spell
 * targeting, and pretending otherwise would put half a feature in the engine.
 */

export interface CastHealingInput {
  seed: Seed;
  caster: Character;
  spell: SpellInput;
  target: Character;
  /** Slot to spend. May exceed the spell's level to upcast. */
  slotLevel: SpellLevel;
}

export interface CastHealingResult {
  resolution: Resolution;
  /** The caster, with the slot spent. */
  caster: Character;
  /** The target, healed. Unchanged if they were dead. */
  target: Character;
  healed: number;
}

export class CastError extends Error {}

export function castHealing(input: CastHealingInput): CastHealingResult {
  const { seed, caster, spell, target, slotLevel } = input;

  if (!spell.healing) {
    throw new CastError(`'${spell.id}' is not a healing spell — only healing is implemented`);
  }
  if (!caster.spellcasting) {
    throw new CastError(`${caster.name} is not a spellcaster`);
  }
  if (!caster.spellcasting.prepared.includes(spell.id)) {
    throw new CastError(`${caster.name} does not have '${spell.id}' prepared`);
  }
  if (slotLevel < spell.level) {
    throw new CastError(`'${spell.id}' is level ${spell.level}; cannot cast it with a level-${slotLevel} slot`);
  }
  if (!hasSlot(caster, slotLevel)) {
    throw new CastError(`${caster.name} has no level-${slotLevel} slot remaining`);
  }
  if (target.dead) {
    throw new CastError(`${target.name} is dead — healing does not raise the dead`);
  }

  // Upcasting adds one die per slot level above the spell's own, which is how
  // every healing spell in the SRD subset scales.
  const extra = slotLevel - spell.level;
  const base = /^(\d+)d(\d+)$/.exec(spell.healing);
  if (!base) throw new CastError(`'${spell.id}' has unparseable healing dice '${spell.healing}'`);
  const notation = `${Number(base[1]) + extra}d${base[2]}`;

  const record = roll(seed, notation).record;
  const abilityMod = abilityModifier(caster.abilities[caster.spellcasting.ability]);
  const amount = Math.max(0, record.natural + abilityMod);

  const healedTarget = applyHealing(target, amount);
  const actualHealed = healedTarget.hp - target.hp;
  const spentCaster = spendSlot(caster, slotLevel);

  const effects: Effect[] = [
    { kind: 'heal', target: target.id, amount: actualHealed, roll: record },
    { kind: 'slot-spent', level: slotLevel },
  ];

  const resolution: Resolution = {
    actionType: 'cast-spell',
    // No attack roll and no save: cure spells just land. The dice are damage
    // dice in reverse, not a check, so `none` is the honest kind.
    checkKind: 'none',
    roll: record,
    modifiers: [{ source: caster.spellcasting.ability, value: abilityMod }],
    // Hit points the spell produced. What actually landed can be less, when
    // the target is near their maximum — the effect carries that number.
    total: record.natural + abilityMod,
    outcome: 'success',
    effects,
    fallbackNarration: `${caster.name} casts ${spell.name} on ${target.name}, restoring ${actualHealed} hit points.`,
  };

  return { resolution, caster: spentCaster, target: healedTarget, healed: actualHealed };
}

// ---------------------------------------------------------------------------
// Offensive and control spells
// ---------------------------------------------------------------------------

/**
 * Cantrip damage steps with the caster's level, not the slot — 5th, 11th, 17th.
 */
function cantripDiceMultiplier(casterLevel: number): number {
  if (casterLevel < 5) return 1;
  if (casterLevel < 11) return 2;
  if (casterLevel < 17) return 3;
  return 4;
}

/** `3d6` and `1d6` per level above base -> `5d6` in a 3rd-level slot. */
function scaleDamage(spell: SpellInput, slotLevel: number, casterLevel: number): string | undefined {
  if (!spell.damage) return undefined;
  const base = /^(\d+)d(\d+)\s*(?:([+-])\s*(\d+))?$/.exec(spell.damage);
  if (!base) return spell.damage;

  const size = Number(base[2]);
  const flat = base[3] ? `${base[3]}${base[4]}` : '';
  let count = Number(base[1]);

  if (spell.level === 0) {
    count *= cantripDiceMultiplier(casterLevel);
  } else if (spell.upcastDamage) {
    const extra = /^(\d+)d(\d+)$/.exec(spell.upcastDamage);
    if (extra && Number(extra[2]) === size) {
      count += Number(extra[1]) * Math.max(0, slotLevel - spell.level);
    }
  }
  return `${count}d${size}${flat}`;
}

/** Attack roll modifiers for a spell: proficiency plus the casting ability. */
export function spellAttackModifiers(caster: Character): Modifier[] {
  if (!caster.spellcasting) return [];
  const ability = caster.spellcasting.ability;
  return [
    { source: ability, value: abilityModifier(caster.abilities[ability]) },
    { source: 'proficiency', value: proficiencyBonus(caster.level) },
  ];
}

/** What the engine needs to know about the thing being targeted. */
export interface SpellTarget {
  id: string;
  ac: number;
  /** Current hit points — `sleep` compares against them. */
  hp: number;
  abilities: AbilityScores;
}

export interface CastAtTargetResult {
  resolution: Resolution;
  /** The caster, with the slot spent. */
  caster: Character;
  /** Damage to apply to the target. */
  damage: number;
  /** Condition the spell imposed, if any. */
  condition?: Condition;
}

/**
 * Cast a spell at a hostile target.
 *
 * Covers the four shapes the SRD subset actually uses:
 *
 *  - **attack** — a spell attack roll against AC, then damage
 *  - **save** — the target saves against the caster's DC; full damage on a
 *    failure, half on a success when the spell says so, and any condition
 *    lands only on a failure
 *  - **auto damage** — no roll at all, which is what magic missile is
 *  - **sleep** — its dice are a pool of hit points, not damage. Rolling them
 *    as damage would make the signature level-1 control spell a damage spell
 *
 * Utility spells with no damage and no condition are refused rather than
 * silently doing nothing.
 */
export function castAtTarget(input: {
  seed: Seed;
  caster: Character;
  spell: SpellInput;
  slotLevel: SpellLevel;
  target: SpellTarget;
}): CastAtTargetResult {
  const { seed, caster, spell, slotLevel, target } = input;

  if (!caster.spellcasting) throw new CastError(`${caster.name} is not a spellcaster`);
  if (!caster.spellcasting.prepared.includes(spell.id)) {
    throw new CastError(`${caster.name} does not have '${spell.id}' prepared`);
  }
  if (spell.healing) throw new CastError(`'${spell.id}' heals — cast it on an ally`);
  if (!spell.damage && !spell.appliesCondition) {
    throw new CastError(`'${spell.id}' has no effect this engine can resolve at a target`);
  }
  if (slotLevel < spell.level) {
    throw new CastError(`'${spell.id}' is level ${spell.level}; a level-${slotLevel} slot is too small`);
  }
  // Cantrips cost nothing. Everything else spends the slot it was cast with.
  if (spell.level > 0 && !hasSlot(caster, slotLevel)) {
    throw new CastError(`${caster.name} has no level-${slotLevel} slot remaining`);
  }

  const spentCaster = spell.level > 0 ? spendSlot(caster, slotLevel) : caster;
  const notation = scaleDamage(spell, slotLevel, caster.level);
  const dc = spellSaveDc(caster)!;
  const effects: Effect[] = [];
  if (spell.level > 0) effects.push({ kind: 'slot-spent', level: slotLevel });

  // --- sleep: a pool of hit points, not damage
  if (spell.appliesCondition === 'unconscious' && notation && spell.resolution.kind === 'none') {
    const pool = roll(`${seed}:pool`, notation).record;
    const takesEffect = target.hp <= pool.natural;
    if (takesEffect) effects.push({ kind: 'condition-applied', target: target.id, condition: 'unconscious' });
    return {
      resolution: {
        actionType: 'cast-spell',
        checkKind: 'none',
        roll: pool,
        modifiers: [],
        total: pool.natural,
        outcome: takesEffect ? 'success' : 'failure',
        effects,
        fallbackNarration: takesEffect
          ? `${caster.name} casts ${spell.name}; ${pool.natural} hit points of sleep is enough, and the target drops.`
          : `${caster.name} casts ${spell.name}, but ${pool.natural} hit points of sleep is not enough to take hold.`,
      },
      caster: spentCaster,
      damage: 0,
      ...(takesEffect ? { condition: 'unconscious' as Condition } : {}),
    };
  }

  // --- attack roll
  if (spell.resolution.kind === 'attack') {
    const resolution = resolveAttack({
      seed,
      attackerId: caster.id,
      targetId: target.id,
      targetAc: target.ac,
      attackModifiers: spellAttackModifiers(caster),
      damage: notation ?? '1d4',
      damageType: spell.damageType ?? 'force',
      // A spell's damage does not add the casting ability modifier.
      damageModifiers: [],
    });
    const dealt = resolution.effects
      .filter((e): e is Extract<Effect, { kind: 'damage' }> => e.kind === 'damage')
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      resolution: { ...resolution, actionType: 'cast-spell', effects: [...resolution.effects, ...effects] },
      caster: spentCaster,
      damage: dealt,
    };
  }

  // --- saving throw
  if (spell.resolution.kind === 'save') {
    const ability = spell.resolution.ability;
    const save = resolveSave({
      seed: `${seed}:save`,
      // Monsters carry scores, not proficiency lists, in this subset.
      character: { ...caster, abilities: target.abilities, saveProficiencies: [] },
      dc,
      ability,
    });
    const saved = save.outcome === 'success' || save.outcome === 'critical-success';

    let damage = 0;
    let damageRoll;
    if (notation) {
      damageRoll = roll(`${seed}:damage`, notation).record;
      const full = damageRoll.natural;
      damage = saved ? (spell.resolution.halfOnSave ? Math.floor(full / 2) : 0) : full;
    }
    if (damage > 0) {
      effects.push({
        kind: 'damage',
        target: target.id,
        amount: damage,
        damageType: spell.damageType ?? 'force',
        ...(damageRoll ? { roll: damageRoll } : {}),
      });
    }
    const condition = !saved ? spell.appliesCondition : undefined;
    if (condition) effects.push({ kind: 'condition-applied', target: target.id, condition });

    return {
      resolution: {
        ...save,
        actionType: 'cast-spell',
        effects,
        fallbackNarration:
          `${caster.name} casts ${spell.name} (DC ${dc} ${ability}); the target ` +
          `${saved ? 'resists' : 'fails'}${damage > 0 ? ` and takes ${damage}` : ''}.`,
      },
      caster: spentCaster,
      damage,
      ...(condition ? { condition } : {}),
    };
  }

  // --- no roll at all: magic missile
  const record = notation ? roll(`${seed}:auto`, notation).record : undefined;
  const damage = record ? record.natural + roll(`${seed}:auto`, notation!).modifier : 0;
  if (damage > 0) {
    effects.push({
      kind: 'damage',
      target: target.id,
      amount: damage,
      damageType: spell.damageType ?? 'force',
      ...(record ? { roll: record } : {}),
    });
  }
  return {
    resolution: {
      actionType: 'cast-spell',
      checkKind: 'none',
      ...(record ? { roll: record } : {}),
      modifiers: [],
      ...(record ? { total: damage } : {}),
      outcome: 'success',
      effects,
      fallbackNarration: `${caster.name} casts ${spell.name}; it strikes without a roll for ${damage}.`,
    },
    caster: spentCaster,
    damage,
  };
}
