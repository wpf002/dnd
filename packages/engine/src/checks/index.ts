import type {
  Ability,
  AbilityScores,
  Character,
  DifficultyClass,
  Modifier,
  Outcome,
  Resolution,
  RollMode,
  Seed,
  Skill,
} from '@lantern/schema';
import { SKILL_ABILITY } from '@lantern/schema';
import { rollD20 } from '../dice/index.js';

/**
 * Ability checks, saving throws, DC comparison, margin.
 *
 * All derived values live here and only here. The character sheet stores raw
 * scores and proficiency lists; everything the tray displays is computed at
 * resolution time and persisted on the Resolution.
 */

// ---------------------------------------------------------------------------
// Derivation — the numbers the sheet does NOT store
// ---------------------------------------------------------------------------

/** Vol I Part XI §4: floor((score − 10) / 2). */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** 5e progression: +2 at levels 1–4, +3 at 5–8, ... +6 at 17–20. */
export function proficiencyBonus(level: number): number {
  return 2 + Math.floor((level - 1) / 4);
}

export function skillModifier(character: Character, skill: Skill): Modifier[] {
  const ability = SKILL_ABILITY[skill];
  const mods: Modifier[] = [
    { source: ability, value: abilityModifier(character.abilities[ability]) },
  ];
  if (character.skillExpertise.includes(skill)) {
    mods.push({ source: 'expertise', value: proficiencyBonus(character.level) * 2 });
  } else if (character.skillProficiencies.includes(skill)) {
    mods.push({ source: 'proficiency', value: proficiencyBonus(character.level) });
  }
  return mods;
}

export function saveModifier(character: Character, ability: Ability): Modifier[] {
  const mods: Modifier[] = [
    { source: ability, value: abilityModifier(character.abilities[ability]) },
  ];
  if (character.saveProficiencies.includes(ability)) {
    mods.push({ source: 'proficiency', value: proficiencyBonus(character.level) });
  }
  return mods;
}

/** dnd-101 §7: 10 + Wis modifier + proficiency if proficient in Perception. */
export function passivePerception(character: Character): number {
  return 10 + skillModifier(character, 'perception').reduce((s, m) => s + m.value, 0);
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

function outcomeOf(naturalFace: number, total: number, dc: number): Outcome {
  // Nat 20 / nat 1 only decide attack rolls and death saves automatically;
  // for checks and saves 5e RAW compares totals. We keep crit detection at the
  // attack layer and use plain comparison here.
  return total >= dc ? 'success' : 'failure';
}

export interface CheckInput {
  seed: Seed;
  character: Character;
  dc: DifficultyClass;
  mode?: RollMode;
}

/** An ability check, optionally through a skill. */
export function resolveCheck(
  input: CheckInput & { ability: Ability; skill?: Skill },
): Resolution {
  const { seed, character, dc, ability, skill } = input;
  const mode = input.mode ?? 'normal';
  const record = rollD20(seed, mode);
  const modifiers = skill ? skillModifier(character, skill) : [
    { source: ability, value: abilityModifier(character.abilities[ability]) },
  ];
  const total = record.natural + modifiers.reduce((s, m) => s + m.value, 0);
  const margin = total - dc;

  return {
    actionType: 'ability-check',
    checkKind: 'ability-check',
    roll: record,
    modifiers,
    total,
    dc,
    margin,
    outcome: outcomeOf(record.natural, total, dc),
    effects: [],
  };
}

/** A saving throw. */
export function resolveSave(input: CheckInput & { ability: Ability }): Resolution {
  const { seed, character, dc, ability } = input;
  const mode = input.mode ?? 'normal';
  const record = rollD20(seed, mode);
  const modifiers = saveModifier(character, ability);
  const total = record.natural + modifiers.reduce((s, m) => s + m.value, 0);
  const margin = total - dc;

  return {
    actionType: 'saving-throw',
    checkKind: 'saving-throw',
    roll: record,
    modifiers,
    total,
    dc,
    margin,
    outcome: outcomeOf(record.natural, total, dc),
    effects: [],
  };
}

/**
 * Raw scores → modifiers for monster saves (monsters carry scores, not
 * proficiency lists, in this subset).
 */
export function scoresSaveModifier(scores: AbilityScores, ability: Ability): Modifier[] {
  return [{ source: ability, value: abilityModifier(scores[ability]) }];
}
