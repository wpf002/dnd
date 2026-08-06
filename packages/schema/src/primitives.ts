import { z } from 'zod';

/**
 * Shared primitives. Everything here is inert vocabulary — no logic, no
 * derivation. Derived values (modifiers, proficiency bonus, AC, passive
 * Perception, spell save DC) are computed by `@lantern/engine` and never
 * persisted on a character. See ROADMAP invariant 1.
 */

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

/** Stable, human-readable ids. Authored by hand and by Davis, so keep them legible. */
export const Id = z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
  message: 'ids must be lowercase kebab-case',
});
export type Id = z.infer<typeof Id>;

export const BeatId = Id.describe('Beat identifier');
export const EncounterId = Id.describe('Encounter identifier');
export const ArtSlotId = Id.describe('Art slot identifier — resolved against the art manifest');
export const CombatantId = Id.describe('Combatant identifier, unique within an encounter');

// ---------------------------------------------------------------------------
// Abilities and skills — dnd-101.md §4, §6
// ---------------------------------------------------------------------------

export const Ability = z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha']);
export type Ability = z.infer<typeof Ability>;

/**
 * The skill list, each bound to its governing ability. Bindings are fixed by
 * SRD 5.1 and are not configurable — the engine is the rules authority and
 * homebrew is on the cut list.
 */
export const SKILL_ABILITY = {
  athletics: 'str',
  acrobatics: 'dex',
  'sleight-of-hand': 'dex',
  stealth: 'dex',
  arcana: 'int',
  history: 'int',
  investigation: 'int',
  nature: 'int',
  religion: 'int',
  'animal-handling': 'wis',
  insight: 'wis',
  medicine: 'wis',
  perception: 'wis',
  survival: 'wis',
  deception: 'cha',
  intimidation: 'cha',
  performance: 'cha',
  persuasion: 'cha',
} as const satisfies Record<string, Ability>;

export const Skill = z.enum(
  Object.keys(SKILL_ABILITY) as [keyof typeof SKILL_ABILITY, ...Array<keyof typeof SKILL_ABILITY>],
);
export type Skill = z.infer<typeof Skill>;

// ---------------------------------------------------------------------------
// Dice — dnd-101.md §3, Vol I Part XI
// ---------------------------------------------------------------------------

export const DieSize = z.union([
  z.literal(4),
  z.literal(6),
  z.literal(8),
  z.literal(10),
  z.literal(12),
  z.literal(20),
  z.literal(100),
]);
export type DieSize = z.infer<typeof DieSize>;

/**
 * Standard notation: `2d6`, `1d20+5`, `4d8 + 4`, `3d6-1`.
 * Parsing lives in `@lantern/engine`; the schema only guarantees shape.
 */
export const DiceNotation = z
  .string()
  .regex(/^\s*\d+d(?:4|6|8|10|12|20|100)\s*(?:[+-]\s*\d+)?\s*$/i, {
    message: 'expected dice notation like "2d6" or "1d20+5"',
  });
export type DiceNotation = z.infer<typeof DiceNotation>;

/** Roll two d20s, keep higher / lower. dnd-101.md §"Advantage". */
export const RollMode = z.enum(['normal', 'advantage', 'disadvantage']);
export type RollMode = z.infer<typeof RollMode>;

/**
 * Seeded RNG input. Every roll records its seed so any session replays exactly
 * — this is what makes the engine test suite deterministic and makes a
 * disputed roll auditable after the fact. ROADMAP invariant 5.
 */
export const Seed = z.string().min(1);
export type Seed = z.infer<typeof Seed>;

// ---------------------------------------------------------------------------
// Damage and conditions
// ---------------------------------------------------------------------------

export const DamageType = z.enum([
  'acid',
  'bludgeoning',
  'cold',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'piercing',
  'poison',
  'psychic',
  'radiant',
  'slashing',
  'thunder',
]);
export type DamageType = z.infer<typeof DamageType>;

export const Condition = z.enum([
  'blinded',
  'charmed',
  'deafened',
  'frightened',
  'grappled',
  'incapacitated',
  'invisible',
  'paralyzed',
  'petrified',
  'poisoned',
  'prone',
  'restrained',
  'stunned',
  'unconscious',
  'exhaustion',
]);
export type Condition = z.infer<typeof Condition>;

// ---------------------------------------------------------------------------
// Difficulty — dnd-101.md §"DC"
// ---------------------------------------------------------------------------

/**
 * Bounded deliberately. Fifth Edition's bounded accuracy keeps DCs in a narrow
 * band (Vol I Part XI §10); a DC of 45 is a content bug, and the linter should
 * be able to say so.
 */
export const DifficultyClass = z.number().int().min(1).max(30);
export type DifficultyClass = z.infer<typeof DifficultyClass>;

export const ArmorClass = z.number().int().min(1).max(30);
export type ArmorClass = z.infer<typeof ArmorClass>;

export const Level = z.number().int().min(1).max(20);
export type Level = z.infer<typeof Level>;

/** Spell levels 1–9; 0 is a cantrip. Vol I Part IX §2. */
export const SpellLevel = z.number().int().min(0).max(9);
export type SpellLevel = z.infer<typeof SpellLevel>;

// ---------------------------------------------------------------------------
// Alignment — descriptive only, carries no mechanical weight (Vol I Part XI §14)
// ---------------------------------------------------------------------------

export const Alignment = z.enum([
  'lawful-good',
  'neutral-good',
  'chaotic-good',
  'lawful-neutral',
  'true-neutral',
  'chaotic-neutral',
  'lawful-evil',
  'neutral-evil',
  'chaotic-evil',
]);
export type Alignment = z.infer<typeof Alignment>;

// ---------------------------------------------------------------------------
// Tone vocabulary — closed set, see docs/reference/great-campaigns.md
// ---------------------------------------------------------------------------

/**
 * Davis picks from this set rather than inventing tone strings, so the same tag
 * produces the same register across generations. Derived from the theme column
 * of the campaign canon; genre implications are defined in Compendium Vol II
 * Part XII.
 */
export const Tone = z.enum([
  'gothic-horror',
  'survival-horror',
  'arctic-survival',
  'jungle-survival',
  'urban-intrigue',
  'heist',
  'political-fantasy',
  'infernal-war',
  'high-adventure',
  'exploration',
  'megadungeon',
  'cosmic-horror',
  'whimsical-fey',
  'mystery',
  'anthology',
  'nautical',
  'epic-finale',
  'beginner-classic',
  'sandbox',
  'west-marches',
]);
export type Tone = z.infer<typeof Tone>;

/**
 * Campaign scale. Vol III Ch6 §IV (the four-tier structure) crossed with
 * Ch5 Appendix C (cosmic scale).
 */
export const Tier = z.enum(['local', 'regional', 'national', 'mythic']);
export type Tier = z.infer<typeof Tier>;
