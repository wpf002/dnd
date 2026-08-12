import { z } from 'zod';
import {
  Ability,
  Condition,
  DamageType,
  DiceNotation,
  Id,
  Skill,
  SpellLevel,
} from '@lantern/schema';

/**
 * SRD 5.1 content as inert data. Zero logic — nothing here rolls, resolves, or
 * derives. `@lantern/engine` does all of that.
 *
 * **On the dependency boundary.** The guard states srd must have no runtime
 * dependencies beyond zod. `@lantern/schema` is a pure contract package whose
 * only dependency *is* zod, so srd's runtime dependency closure remains exactly
 * {zod} — the invariant holds. The guard's rules permit this explicitly: srd is
 * forbidden from importing flint, engine, and db, but not schema. Sharing the
 * contract is the point; duplicating `Ability` and `DamageType` here would
 * create two sources of truth for the same vocabulary.
 */

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

export const WeaponProperty = z.enum([
  'ammunition',
  'finesse',
  'heavy',
  'light',
  'loading',
  'reach',
  'thrown',
  'two-handed',
  'versatile',
]);
export type WeaponProperty = z.infer<typeof WeaponProperty>;

export const Weapon = z.object({
  id: Id,
  name: z.string(),
  category: z.enum(['simple-melee', 'simple-ranged', 'martial-melee', 'martial-ranged']),
  damage: DiceNotation,
  damageType: DamageType,
  /** Damage when wielded two-handed. Only set on `versatile` weapons. */
  versatileDamage: DiceNotation.optional(),
  properties: z.array(WeaponProperty).default([]),
  /** Normal / long range in feet. Set on ranged and thrown weapons. */
  range: z.tuple([z.number().int(), z.number().int()]).optional(),
  weight: z.number(),
  cost: z.string(),
});
export type Weapon = z.infer<typeof Weapon>;
export type WeaponInput = z.input<typeof Weapon>;

export const Armor = z.object({
  id: Id,
  name: z.string(),
  category: z.enum(['light', 'medium', 'heavy', 'shield']),
  /** Base AC. The engine adds the Dex contribution per `maxDexBonus`. */
  baseAc: z.number().int(),
  /**
   * `null` means unlimited Dex (light armor); a number caps it (medium);
   * `0` means Dex does not apply at all (heavy).
   */
  maxDexBonus: z.number().int().nullable(),
  /** Minimum Strength score, below which speed is reduced. */
  strengthRequirement: z.number().int().optional(),
  stealthDisadvantage: z.boolean().default(false),
  weight: z.number(),
  cost: z.string(),
});
export type Armor = z.infer<typeof Armor>;
export type ArmorInput = z.input<typeof Armor>;

// ---------------------------------------------------------------------------
// Spells
// ---------------------------------------------------------------------------

export const SpellSchool = z.enum([
  'abjuration',
  'conjuration',
  'divination',
  'enchantment',
  'evocation',
  'illusion',
  'necromancy',
  'transmutation',
]);
export type SpellSchool = z.infer<typeof SpellSchool>;

/**
 * How a spell resolves mechanically. The engine branches on this — it is the
 * difference between rolling to hit, forcing a save, or applying an effect
 * with no roll at all.
 */
export const SpellResolution = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('attack'), ranged: z.boolean().default(true) }),
  z.object({ kind: z.literal('save'), ability: Ability, halfOnSave: z.boolean().default(false) }),
  z.object({ kind: z.literal('none') }),
]);
export type SpellResolution = z.infer<typeof SpellResolution>;

export const Spell = z.object({
  id: Id,
  name: z.string(),
  level: SpellLevel,
  school: SpellSchool,
  castingTime: z.string(),
  range: z.string(),
  components: z.array(z.enum(['V', 'S', 'M'])),
  materials: z.string().optional(),
  duration: z.string(),
  concentration: z.boolean().default(false),
  ritual: z.boolean().default(false),
  resolution: SpellResolution,
  damage: DiceNotation.optional(),
  damageType: DamageType.optional(),
  /** Extra dice per slot level above the spell's base level. */
  upcastDamage: DiceNotation.optional(),
  healing: DiceNotation.optional(),
  appliesCondition: Condition.optional(),
  classes: z.array(Id).default([]),
  text: z.string(),
});
export type Spell = z.infer<typeof Spell>;
export type SpellInput = z.input<typeof Spell>;

// ---------------------------------------------------------------------------
// Monsters
// ---------------------------------------------------------------------------

export const CreatureSize = z.enum(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']);
export type CreatureSize = z.infer<typeof CreatureSize>;

export const CreatureType = z.enum([
  'aberration',
  'beast',
  'celestial',
  'construct',
  'dragon',
  'elemental',
  'fey',
  'fiend',
  'giant',
  'humanoid',
  'monstrosity',
  'ooze',
  'plant',
  'undead',
]);
export type CreatureType = z.infer<typeof CreatureType>;

export const MonsterAttack = z.object({
  name: z.string(),
  /** Total attack bonus. Pre-computed per SRD statblock convention. */
  toHit: z.number().int(),
  reach: z.number().int().optional(),
  range: z.tuple([z.number().int(), z.number().int()]).optional(),
  damage: DiceNotation,
  damageType: DamageType,
  /** Rider save, e.g. a poison effect on a hit. */
  save: z
    .object({ ability: Ability, dc: z.number().int(), onFail: Condition.optional() })
    .optional(),
});
export type MonsterAttack = z.infer<typeof MonsterAttack>;

export const Monster = z.object({
  id: Id,
  name: z.string(),
  size: CreatureSize,
  type: CreatureType,
  ac: z.number().int(),
  hp: z.number().int(),
  hitDice: DiceNotation,
  speed: z.number().int(),
  abilities: z.object({
    str: z.number().int(),
    dex: z.number().int(),
    con: z.number().int(),
    int: z.number().int(),
    wis: z.number().int(),
    cha: z.number().int(),
  }),
  /** Challenge Rating. Fractions allowed (1/8, 1/4, 1/2). */
  cr: z.number(),
  xp: z.number().int(),
  attacks: z.array(MonsterAttack).default([]),
  /** Attacks per Attack action. */
  multiattack: z.number().int().min(1).default(1),
  skills: z.array(Skill).default([]),
  damageResistances: z.array(DamageType).default([]),
  damageImmunities: z.array(DamageType).default([]),
  conditionImmunities: z.array(Condition).default([]),
  senses: z.array(z.string()).default([]),
  traits: z.array(z.object({ name: z.string(), text: z.string() })).default([]),
});
export type Monster = z.infer<typeof Monster>;
export type MonsterInput = z.input<typeof Monster>;

// ---------------------------------------------------------------------------
// Character creation
// ---------------------------------------------------------------------------

/**
 * A species. Called lineage throughout because that is the field name the
 * Character schema has always used.
 */
export const Lineage = z.object({
  id: Id,
  name: z.string(),
  size: CreatureSize,
  speed: z.number().int().min(0),
  /** Named traits, as printed. Descriptive: the engine reads speed and size. */
  traits: z.array(z.object({ name: z.string(), text: z.string() })).default([]),
});
export type Lineage = z.infer<typeof Lineage>;
export type LineageInput = z.input<typeof Lineage>;

export const Background = z.object({
  id: Id,
  name: z.string(),
  /** The three abilities this background improves. */
  abilities: z.array(Ability).length(3),
  skillProficiencies: z.array(Skill).default([]),
  /** Tool proficiency as printed. The engine has no tool rules yet. */
  tool: z.string().optional(),
});
export type Background = z.infer<typeof Background>;
export type BackgroundInput = z.input<typeof Background>;
