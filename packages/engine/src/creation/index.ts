import { Character, type Ability, type Skill } from '@lantern/schema';
import {
  CLASS_PROGRESSION,
  FULL_CASTER_SLOTS,
  SRD52_BACKGROUNDS,
  SRD52_LINEAGES,
  type BackgroundInput,
  type LineageInput,
  type ProgressionClassId,
} from '@lantern/srd';
import { abilityModifier } from '../checks/index.js';
import { roll } from '../dice/index.js';

/**
 * Character creation.
 *
 * Four pregens frozen at level 3 was the entire roster, and it was on the cut
 * list — reasonable while there was one adventure. With eighty-three of them
 * and a campaign that runs to level 20, playing someone who is not Branka
 * Ironvow is the difference between a demo and a game.
 *
 * Deterministic like everything else in this package: same choices and same
 * seed, same sheet. No model involved. What it will not do is decide for the
 * player — every choice a character has is a parameter, and the ones the
 * engine cannot yet act on (a background's tool proficiency, a species trait)
 * are recorded on the sheet rather than silently dropped.
 */

export const CREATION_CLASSES = Object.keys(CLASS_PROGRESSION) as ProgressionClassId[];

/** Species available to a new character. */
export function lineages(): LineageInput[] {
  return Object.values(SRD52_LINEAGES).sort((a, b) => a.name.localeCompare(b.name));
}

/** Backgrounds available to a new character. */
export function backgrounds(): BackgroundInput[] {
  return Object.values(SRD52_BACKGROUNDS).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The standard array. Offered because rolling can hand a player a character
 * they resent for twenty levels, and this is a solo game with no table to
 * re-roll in front of.
 */
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

export interface RolledAbility {
  /** The four dice, highest three kept — recorded so the roll is auditable. */
  dice: number[];
  score: number;
}

/**
 * Roll 4d6, drop the lowest, six times. Seeded, so a player can be shown the
 * dice that made them.
 */
export function rollAbilityScores(seed: string): RolledAbility[] {
  return Array.from({ length: 6 }, (_, i) => {
    const record = roll(`${seed}:ability:${i}`, '4d6').record;
    const dice = record.dice.map((d) => d.face);
    const dropped = Math.min(...dice);
    return { dice, score: dice.reduce((a, b) => a + b, 0) - dropped };
  });
}

export interface CreationChoices {
  name: string;
  lineage: string;
  characterClass: ProgressionClassId;
  background: string;
  /** The six scores, before the background's improvements. */
  abilities: Record<Ability, number>;
  /**
   * Which of the background's three abilities gets +2, and which gets +1.
   * Both must be among the background's abilities.
   */
  improvements?: { plusTwo: Ability; plusOne: Ability };
  /** Skills chosen from the class's list, on top of the background's. */
  skills?: Skill[];
  /**
   * The seed the scores were rolled with, if they were rolled.
   *
   * Without it there is no way to tell a rolled 18 from a claimed one — every
   * number 3 to 18 is reachable on 4d6. With it the engine rolls the same dice
   * again and checks the sheet against them, which is the same bargain the
   * rest of the engine makes: the inputs to an outcome are kept.
   */
  rollSeed?: string;
}

export class CreationError extends Error {}

/**
 * Skills each class may choose from. The SRD prints these per class; this is
 * the subset for the four classes the progression tables cover.
 */
export const CLASS_SKILLS: Record<ProgressionClassId, Skill[]> = {
  fighter: ['acrobatics', 'animal-handling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'],
  rogue: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'persuasion', 'sleight-of-hand', 'stealth'],
  cleric: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
  wizard: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion'],
};

/** Saving throws each class is proficient in. */
const CLASS_SAVES: Record<ProgressionClassId, Ability[]> = {
  fighter: ['str', 'con'],
  rogue: ['dex', 'int'],
  cleric: ['wis', 'cha'],
  wizard: ['int', 'wis'],
};

/** How many skills each class picks. */
export const CLASS_SKILL_COUNT: Record<ProgressionClassId, number> = {
  fighter: 2,
  rogue: 4,
  cleric: 2,
  wizard: 2,
};

/** Starting gear, kept deliberately simple: enough to be equipped and fight. */
const CLASS_GEAR: Record<ProgressionClassId, Array<{ item: string; equipped?: boolean; quantity?: number }>> = {
  fighter: [
    { item: 'longsword', equipped: true },
    { item: 'shield', equipped: true },
    { item: 'chain-mail', equipped: true },
    { item: 'handaxe', quantity: 2 },
  ],
  rogue: [
    { item: 'rapier', equipped: true },
    { item: 'leather', equipped: true },
    { item: 'dagger', quantity: 2 },
    { item: 'shortbow' },
  ],
  cleric: [
    { item: 'mace', equipped: true },
    { item: 'chain-shirt', equipped: true },
    { item: 'shield', equipped: true },
  ],
  wizard: [{ item: 'quarterstaff', equipped: true }, { item: 'dagger' }],
};

/** Level-1 spell lists, matching what the pregens of each class carry. */
const CLASS_SPELLS: Partial<
  Record<ProgressionClassId, { source: 'arcane' | 'divine'; ability: Ability; known: string[]; prepared: string[] }>
> = {
  cleric: {
    source: 'divine',
    ability: 'wis',
    known: ['sacred-flame', 'guidance', 'thaumaturgy', 'cure-wounds', 'bless', 'shield-of-faith', 'guiding-bolt', 'healing-word'],
    prepared: ['cure-wounds', 'bless', 'guiding-bolt', 'healing-word'],
  },
  wizard: {
    source: 'arcane',
    ability: 'int',
    known: ['fire-bolt', 'ray-of-frost', 'light', 'mage-hand', 'prestidigitation', 'magic-missile', 'shield', 'sleep', 'burning-hands', 'detect-magic'],
    prepared: ['fire-bolt', 'ray-of-frost', 'magic-missile', 'burning-hands'],
  },
};

/**
 * Build a level-1 character from a player's choices.
 *
 * Every rule applied here is one the engine will later resolve against: hit
 * points from the class hit die and Constitution, proficiencies from class and
 * background, spell slots from the progression table. Nothing is decorative,
 * and nothing is invented — a choice the player did not make is an error, not
 * a default quietly filled in.
 */
export function createCharacter(choices: CreationChoices): Character {
  const progression = CLASS_PROGRESSION[choices.characterClass];
  if (!progression) {
    throw new CreationError(
      `no class '${choices.characterClass}' — choose from ${CREATION_CLASSES.join(', ')}`,
    );
  }

  const lineage = SRD52_LINEAGES[choices.lineage];
  if (!lineage) {
    throw new CreationError(
      `no species '${choices.lineage}' — choose from ${lineages().map((l) => l.id).join(', ')}`,
    );
  }

  const background = SRD52_BACKGROUNDS[choices.background];
  if (!background) {
    throw new CreationError(
      `no background '${choices.background}' — choose from ${backgrounds().map((b) => b.id).join(', ')}`,
    );
  }

  // The six numbers must be the six numbers the player was given, rearranged.
  // The creation screen offers a swap and cannot produce anything else, but
  // the screen is not where the rule lives — a sheet posted straight at the
  // API is held to the same standard, and a rolled set is checked by rolling
  // the same seed again.
  const source = choices.rollSeed
    ? rollAbilityScores(choices.rollSeed).map((r) => r.score)
    : [...STANDARD_ARRAY];
  const got = Object.values(choices.abilities).sort((a, b) => a - b);
  const want = [...source].sort((a, b) => a - b);
  if (got.length !== want.length || got.some((n, i) => n !== want[i])) {
    throw new CreationError(
      choices.rollSeed
        ? `those are not the numbers seed '${choices.rollSeed}' rolled (${want.join(', ')}) — assign them, do not change them`
        : `assign the standard array (${STANDARD_ARRAY.join(', ')}), each number once`,
    );
  }

  // Background ability improvements: +2 and +1 among the background's three.
  const abilities = { ...choices.abilities };
  const improvements = choices.improvements ?? {
    plusTwo: background.abilities[0]!,
    plusOne: background.abilities[1]!,
  };
  for (const [ability, amount] of [
    [improvements.plusTwo, 2],
    [improvements.plusOne, 1],
  ] as const) {
    if (!background.abilities.includes(ability)) {
      throw new CreationError(
        `${background.name} improves ${background.abilities.join(', ')} — not ${ability}`,
      );
    }
    abilities[ability] = (abilities[ability] ?? 10) + amount;
  }
  if (improvements.plusTwo === improvements.plusOne) {
    throw new CreationError('the +2 and the +1 must go to different abilities');
  }

  // Skills: the background's, plus the player's picks from the class list.
  const allowed = CLASS_SKILLS[choices.characterClass];
  const picked = choices.skills ?? [];
  const wanted = CLASS_SKILL_COUNT[choices.characterClass];
  if (picked.length > wanted) {
    throw new CreationError(`a ${progression.name} chooses ${wanted} skills, not ${picked.length}`);
  }
  for (const skill of picked) {
    if (!allowed.includes(skill)) {
      throw new CreationError(
        `a ${progression.name} cannot choose ${skill} — pick from ${allowed.join(', ')}`,
      );
    }
  }
  // Fill any the player left unchosen, so a half-finished sheet is still legal.
  const skills = new Set<Skill>([...(background.skillProficiencies ?? []), ...picked]);
  for (const skill of allowed) {
    if (picked.length + (skills.size - new Set(background.skillProficiencies ?? []).size) >= wanted) break;
    skills.add(skill);
  }

  const hp = progression.hitDie + abilityModifier(abilities.con);
  const casting = CLASS_SPELLS[choices.characterClass];

  return Character.parse({
    id: `pc-${choices.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unnamed'}`,
    name: choices.name,
    lineage: lineage.id,
    characterClass: choices.characterClass,
    background: background.id,
    level: 1,
    abilities,
    skillProficiencies: [...skills],
    saveProficiencies: CLASS_SAVES[choices.characterClass],
    hp,
    hpMax: hp,
    hitDiceRemaining: 1,
    speed: lineage.speed,
    inventory: CLASS_GEAR[choices.characterClass],
    ...(casting
      ? {
          spellcasting: {
            source: casting.source,
            ability: casting.ability,
            known: casting.known,
            prepared: casting.prepared,
            slotsMax: [...FULL_CASTER_SLOTS[1]!],
            slotsRemaining: [...FULL_CASTER_SLOTS[1]!],
          },
        }
      : {}),
    // Recorded rather than dropped: the engine has no tool rules and no
    // species-trait rules yet, and a sheet that quietly loses what the player
    // chose is worse than one that carries it unused.
    personality: {
      traits: lineage.traits?.map((t) => `${t.name}. ${t.text}`).slice(0, 4) ?? [],
      ideals: [],
      bonds: [],
      flaws: [],
    },
    ...(background.tool ? { ties: { relic: background.tool } } : {}),
  });
}
