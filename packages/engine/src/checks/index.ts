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
  // Unreachable from validated content now that BeatOption.requiresCheck uses
  // the Skill enum — but the engine must never be the thing that emits a NaN
  // modifier. A check that resolves to nothing is worse than one that stops.
  if (!ability) {
    throw new Error(
      `unknown skill '${String(skill)}' — no governing ability. Valid skills: ${Object.keys(SKILL_ABILITY).join(', ')}`,
    );
  }
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

export interface GroupCheckResult {
  /** One resolution per participant, in party order. */
  resolutions: Resolution[];
  /** The party succeeds when at least half of them do. */
  succeeded: boolean;
  passed: number;
  attempted: number;
}

/**
 * A group check: everyone rolls, and the party succeeds if at least half do.
 *
 * The rule exists because some obstacles are faced together — a whole party
 * sneaking past a den, crossing ice, keeping a story straight — and resolving
 * that as one character's roll misrepresents it in both directions: the
 * party's best hides everyone, or its worst dooms them.
 *
 * Every participant's roll is returned, not just the tally. A player who was
 * told "you failed" is owed the six dice that said so.
 */
export function resolveGroupCheck(input: {
  seed: Seed;
  party: readonly Character[];
  dc: DifficultyClass;
  ability: Ability;
  skill?: Skill;
  mode?: RollMode;
}): GroupCheckResult {
  const { seed, party, dc, ability, skill } = input;
  // The unconscious and the dead do not attempt it; a party of none fails.
  const participants = party.filter((c) => c.hp > 0 && !c.dead);
  const resolutions = participants.map((character, i) =>
    resolveCheck({
      seed: `${seed}:${character.id}:${i}`,
      character,
      dc,
      ability,
      ...(skill ? { skill } : {}),
      ...(input.mode ? { mode: input.mode } : {}),
    }),
  );
  const passed = resolutions.filter(
    (r) => r.outcome === 'success' || r.outcome === 'critical-success',
  ).length;
  return {
    resolutions,
    passed,
    attempted: participants.length,
    succeeded: participants.length > 0 && passed * 2 >= participants.length,
  };
}
