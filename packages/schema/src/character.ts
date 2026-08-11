import { z } from 'zod';
import {
  Ability,
  Alignment,
  Condition,
  Id,
  Level,
  Skill,
  SpellLevel,
} from './primitives.js';

/**
 * The character sheet.
 *
 * Structured against docs/reference/character-creation-flow.md, which is the
 * full build decision tree. The UI for that tree is deferred to Phase 4 — four
 * pregens until then — but the shape lands now so the schema does not have to
 * change when the builder arrives.
 *
 * Nothing derived is stored. No modifiers, no proficiency bonus, no AC, no
 * passive Perception, no spell save DC. All of it is computed by
 * `@lantern/engine` on read. Storing a derived value would create a second
 * source of truth for a number the engine is supposed to own — ROADMAP
 * invariant 1.
 */

// ---------------------------------------------------------------------------
// Concept — narrative only, zero mechanical weight
// ---------------------------------------------------------------------------

export const Motivation = z.enum(['justice', 'power', 'curiosity', 'freedom', 'chaos']);
export const Origin = z.enum(['city', 'village', 'temple', 'wilderness', 'underdark']);
export const RoleFantasy = z.enum(['warrior', 'healer', 'caster', 'trickster', 'leader']);

export const Concept = z.object({
  motivation: Motivation,
  origin: Origin,
  roleFantasy: RoleFantasy,
});
export type Concept = z.infer<typeof Concept>;

// ---------------------------------------------------------------------------
// Ability scores
// ---------------------------------------------------------------------------

/**
 * Raw scores only. The modifier table (Vol I Part XI §4) is applied by the
 * engine — `floor((score - 10) / 2)`.
 */
export const AbilityScores = z.object({
  str: z.number().int().min(1).max(30),
  dex: z.number().int().min(1).max(30),
  con: z.number().int().min(1).max(30),
  int: z.number().int().min(1).max(30),
  wis: z.number().int().min(1).max(30),
  cha: z.number().int().min(1).max(30),
});
export type AbilityScores = z.infer<typeof AbilityScores>;

// ---------------------------------------------------------------------------
// Spellcasting
// ---------------------------------------------------------------------------

export const MagicSource = z.enum(['arcane', 'divine', 'primal', 'infused']);
export type MagicSource = z.infer<typeof MagicSource>;

/**
 * Absent entirely on non-casters — an optional field rather than a zeroed
 * structure, so "has no spellcasting" and "has spellcasting with nothing left"
 * are distinguishable.
 */
export const Spellcasting = z.object({
  source: MagicSource,
  ability: Ability,
  known: z.array(Id).default([]),
  prepared: z.array(Id).default([]),
  /** Index is spell level 1–9; slots[0] is unused (cantrips are unlimited). */
  slotsMax: z.array(z.number().int().min(0)).length(10),
  slotsRemaining: z.array(z.number().int().min(0)).length(10),
});
export type Spellcasting = z.infer<typeof Spellcasting>;

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export const InventoryItem = z.object({
  item: Id,
  quantity: z.number().int().min(1).default(1),
  equipped: z.boolean().default(false),
  /** Attunement is a relationship, not bookkeeping. Vol III Ch7 §IV. */
  attuned: z.boolean().default(false),
});
export type InventoryItem = z.infer<typeof InventoryItem>;

// ---------------------------------------------------------------------------
// Story ties — the bridge into the Phase 4 ledger
// ---------------------------------------------------------------------------

/**
 * "Where do I fit in the world?" Each field seeds a ledger entry:
 * `faction` → `faction_clock`, `deity`/`nemesis` → `npc_disposition`,
 * `quest` → `promise`.
 */
export const StoryTies = z.object({
  deity: z.string().optional(),
  faction: z.string().optional(),
  nemesis: z.string().optional(),
  relic: z.string().optional(),
  quest: z.string().optional(),
});
export type StoryTies = z.infer<typeof StoryTies>;

export const Personality = z.object({
  traits: z.array(z.string()).default([]),
  ideals: z.array(z.string()).default([]),
  bonds: z.array(z.string()).default([]),
  flaws: z.array(z.string()).default([]),
});
export type Personality = z.infer<typeof Personality>;

// ---------------------------------------------------------------------------
// Character
// ---------------------------------------------------------------------------

export const ActiveCondition = z.object({
  condition: Condition,
  /** Rounds remaining; absent means "until removed". */
  remaining: z.number().int().min(1).optional(),
  /** Exhaustion is the only condition with levels. */
  level: z.number().int().min(1).max(6).optional(),
});
export type ActiveCondition = z.infer<typeof ActiveCondition>;

export const Character = z.object({
  id: Id,
  name: z.string().min(1),

  lineage: Id.describe('SRD species/lineage id'),
  characterClass: Id.describe('SRD class id'),
  subclass: Id.optional(),
  background: Id,
  level: Level,

  abilities: AbilityScores,

  /** Proficiencies are stored; the *bonus* they grant is derived. */
  skillProficiencies: z.array(Skill).default([]),
  skillExpertise: z.array(Skill).default([]),
  saveProficiencies: z.array(Ability).default([]),

  /** Current and max. Temp HP is separate — it does not heal and is lost first. */
  hp: z.number().int(),
  hpMax: z.number().int().min(1),
  tempHp: z.number().int().min(0).default(0),

  /** Death saves. Reset on stabilize or heal. dnd-101.md §11. */
  deathSaveSuccesses: z.number().int().min(0).max(3).default(0),
  deathSaveFailures: z.number().int().min(0).max(3).default(0),

  /**
   * Three failed death saves. Persisted on the sheet, because a death that
   * lives only in the resolution that caused it is a death nothing downstream
   * can honour — a long rest reset the failure count and healed the character
   * back to full, so dying had no lasting consequence at all.
   *
   * Only true resurrection clears this. Healing and rest do not.
   */
  dead: z.boolean().default(false),

  hitDiceRemaining: z.number().int().min(0).default(0),
  speed: z.number().int().min(0).default(30),

  conditions: z.array(ActiveCondition).default([]),
  inventory: z.array(InventoryItem).default([]),
  spellcasting: Spellcasting.optional(),

  alignment: Alignment.optional(),
  concept: Concept.optional(),
  personality: Personality.default({ traits: [], ideals: [], bonds: [], flaws: [] }),
  ties: StoryTies.default({}),
});
export type Character = z.infer<typeof Character>;

/** Slot bookkeeping helper shape used by rest logic in the engine. */
export const RestKind = z.enum(['short', 'long']);
export type RestKind = z.infer<typeof RestKind>;

export type { SpellLevel };
