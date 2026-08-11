import type { Character, Effect, Resolution, Seed, SpellLevel } from '@lantern/schema';
import type { SpellInput } from '@lantern/srd';
import { abilityModifier } from '../checks/index.js';
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
