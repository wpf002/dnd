import type { Character } from '@lantern/schema';
import {
  CLASS_PROGRESSION,
  sneakAttackDice,
  type ClassProgression,
  type ProgressionClassId,
} from '@lantern/srd';
import { abilityModifier, proficiencyBonus } from '../checks/index.js';
import { roll } from '../dice/index.js';

/**
 * Character advancement — Phase 6.
 *
 * Deterministic, like every other rules module: given a character, a target
 * level, and a seed, the resulting sheet is reproducible. No model involved
 * (invariant 1), and every rolled value records its inputs (invariant 5).
 *
 * Derived values are still never persisted. `levelUp` writes only what is
 * genuinely state — level, hpMax, hit dice, slot maxima, features gained —
 * and leaves proficiency bonus, AC, and save DCs to be computed on read, the
 * same as at level 3.
 */

export type HpMethod = 'average' | 'roll';

export interface LevelUpStep {
  level: number;
  /** HP added at this level, before the Constitution modifier. */
  hpRolled: number;
  /** Constitution modifier applied at this level. */
  conBonus: number;
  features: readonly string[];
  asi: boolean;
  /** Dice record when `method` was `roll`; absent when averaged. */
  roll?: ReturnType<typeof roll>['record'];
}

export interface LevelUpResult {
  character: Character;
  steps: LevelUpStep[];
  /** Features gained across every step, in order. */
  featuresGained: string[];
  /** Levels at which an ASI is owed. The player chooses; the engine records. */
  asiPending: number[];
}

function progressionFor(character: Character): ClassProgression {
  const id = character.characterClass as ProgressionClassId;
  const prog = CLASS_PROGRESSION[id];
  if (!prog) {
    throw new Error(
      `no progression table for class '${character.characterClass}' — ` +
        `add it to @lantern/srd progression.ts before levelling this character`,
    );
  }
  return prog;
}

/**
 * Average HP per level, the standard alternative to rolling: half the hit die
 * rounded up, i.e. d10 -> 6. Chosen as the default because a campaign that
 * runs to level 20 should not have its survivability decided by twenty
 * unlucky rolls.
 */
function averageHp(hitDie: number): number {
  return Math.floor(hitDie / 2) + 1;
}

/**
 * Advance a character to `targetLevel`, applying every intervening level.
 *
 * Levels are applied one at a time rather than by table lookup, because HP is
 * cumulative and per-level — jumping straight to the target would silently
 * skip the hit dice in between.
 */
export function levelUp(
  character: Character,
  targetLevel: number,
  options: { method?: HpMethod; seed?: string } = {},
): LevelUpResult {
  const method = options.method ?? 'average';
  if (targetLevel < 1 || targetLevel > 20) {
    throw new RangeError(`target level out of range: ${targetLevel}`);
  }
  if (targetLevel < character.level) {
    throw new RangeError(
      `cannot level down: character is ${character.level}, target ${targetLevel}`,
    );
  }

  const prog = progressionFor(character);
  const conBonus = abilityModifier(character.abilities.con);
  const steps: LevelUpStep[] = [];

  let hpMax = character.hpMax;
  let hitDice = character.hitDiceRemaining;

  for (let level = character.level + 1; level <= targetLevel; level++) {
    const entry = prog.levels[level - 1]!;
    let hpRolled: number;
    let record: ReturnType<typeof roll>['record'] | undefined;

    if (method === 'roll') {
      // Seeded per level so the whole advancement replays identically.
      record = roll(`${options.seed ?? character.id}:level:${level}`, `1d${prog.hitDie}`).record;
      hpRolled = record.natural;
    } else {
      hpRolled = averageHp(prog.hitDie);
    }

    // A character never gains less than 1 HP from a level, even with a
    // Constitution penalty deep enough to zero it out.
    hpMax += Math.max(1, hpRolled + conBonus);
    hitDice += 1;

    steps.push({
      level,
      hpRolled,
      conBonus,
      features: entry.features,
      asi: entry.asi,
      ...(record ? { roll: record } : {}),
    });
  }

  const advanced: Character = {
    ...character,
    level: targetLevel,
    hpMax,
    // Levelling does not heal. A party that levels mid-book keeps its wounds;
    // the new maximum simply rises above current HP.
    hp: character.hp,
    hitDiceRemaining: hitDice,
    ...(character.spellcasting
      ? {
          spellcasting: {
            ...character.spellcasting,
            slotsMax: [...prog.slots[targetLevel]!],
            // Slots do not refill on level-up — that is a long rest's job.
            slotsRemaining: [...character.spellcasting.slotsRemaining],
          },
        }
      : {}),
  };

  return {
    character: advanced,
    steps,
    featuresGained: steps.flatMap((s) => [...s.features]),
    asiPending: steps.filter((s) => s.asi).map((s) => s.level),
  };
}

/** Sneak Attack dice for a rogue. Zero for every other class. */
export function sneakAttackDiceFor(character: Character): number {
  return character.characterClass === 'rogue' ? sneakAttackDice(character.level) : 0;
}

/**
 * Spell save DC: 8 + proficiency + spellcasting ability modifier.
 * Derived on read, like every other computed value.
 */
export function spellSaveDc(character: Character): number | undefined {
  if (!character.spellcasting) return undefined;
  const ability = character.spellcasting.ability;
  return 8 + proficiencyBonus(character.level) + abilityModifier(character.abilities[ability]);
}

/** Advance a whole party to the same level — the usual campaign operation. */
export function levelParty(
  party: readonly Character[],
  targetLevel: number,
  options: { method?: HpMethod; seed?: string } = {},
): LevelUpResult[] {
  return party.map((c) =>
    c.level >= targetLevel
      ? { character: c, steps: [], featuresGained: [], asiPending: [] }
      : levelUp(c, targetLevel, options),
  );
}
