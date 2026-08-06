import { z } from 'zod';
import {
  ArmorClass,
  CombatantId,
  Condition,
  DamageType,
  DiceNotation,
  DieSize,
  DifficultyClass,
  Id,
  RollMode,
  Seed,
  SpellLevel,
} from './primitives.js';

/**
 * `Resolution` is what the engine returns and what gets persisted. It is also
 * the *only* thing Flint's narration consumer is given.
 *
 * The direction of travel matters: an already-computed outcome goes in, prose
 * comes out. A number is never passed to Flint and read back — if that ever
 * happens the architecture has failed. ROADMAP invariant 2.
 *
 * Every field needed to re-derive the outcome is stored: the individual die
 * faces, each modifier with its source, the target number, and the margin.
 * That is what makes the dice tray honest — the UI renders this object rather
 * than computing anything of its own, so display cannot drift from the math.
 * ROADMAP invariant 5.
 */

// ---------------------------------------------------------------------------
// Dice
// ---------------------------------------------------------------------------

/** A single physical die and the face it showed. */
export const DieRoll = z.object({
  size: DieSize,
  face: z.number().int().min(1),
});
export type DieRoll = z.infer<typeof DieRoll>;

/**
 * One complete roll of dice notation.
 *
 * On advantage/disadvantage both d20 faces are kept: `dice` holds every die
 * actually rolled and `discarded` records the one that was set aside. The tray
 * shows both — a discarded 19 is part of the story.
 */
export const RollRecord = z.object({
  notation: DiceNotation,
  seed: Seed,
  mode: RollMode.default('normal'),
  dice: z.array(DieRoll).min(1),
  discarded: z.array(DieRoll).default([]),
  /** Sum of kept faces, before modifiers. */
  natural: z.number().int(),
});
export type RollRecord = z.infer<typeof RollRecord>;

/**
 * A single named contribution to a total. Broken out rather than pre-summed so
 * the tray can show *why* the number is what it is.
 */
export const Modifier = z.object({
  source: z.string().min(1).describe('e.g. "dex", "proficiency", "bless", "cover"'),
  value: z.number().int(),
});
export type Modifier = z.infer<typeof Modifier>;

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------

/** State changes the engine applied as a consequence of this resolution. */
export const Effect = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('damage'),
    target: CombatantId,
    amount: z.number().int().min(0),
    damageType: DamageType,
    roll: RollRecord.optional(),
  }),
  z.object({
    kind: z.literal('heal'),
    target: CombatantId,
    amount: z.number().int().min(0),
    roll: RollRecord.optional(),
  }),
  z.object({
    kind: z.literal('condition-applied'),
    target: CombatantId,
    condition: Condition,
    /** Rounds; absent means "until removed". */
    duration: z.number().int().min(1).optional(),
  }),
  z.object({
    kind: z.literal('condition-removed'),
    target: CombatantId,
    condition: Condition,
  }),
  z.object({ kind: z.literal('slot-spent'), level: SpellLevel }),
  z.object({ kind: z.literal('item-consumed'), item: Id }),
  z.object({ kind: z.literal('item-lost'), item: Id }),
  z.object({ kind: z.literal('flag-set'), flag: Id, value: z.union([z.boolean(), z.number(), z.string()]) }),
  z.object({ kind: z.literal('movement'), target: CombatantId, feet: z.number().int() }),
  z.object({
    kind: z.literal('death-save'),
    target: CombatantId,
    outcome: z.enum(['success', 'failure', 'critical-success', 'critical-failure']),
    successes: z.number().int().min(0).max(3),
    failures: z.number().int().min(0).max(3),
  }),
]);
export type Effect = z.infer<typeof Effect>;

// ---------------------------------------------------------------------------
// Outcome
// ---------------------------------------------------------------------------

/**
 * Note `critical-success` / `critical-failure` are distinct from plain
 * success/failure: a natural 20 on an attack is not merely "success by a large
 * margin", it changes damage dice.
 */
export const Outcome = z.enum([
  'critical-success',
  'success',
  'failure',
  'critical-failure',
  /** No roll was required — the action resolved deterministically. */
  'automatic',
]);
export type Outcome = z.infer<typeof Outcome>;

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/** What was being tested. Determines which target-number field is meaningful. */
export const CheckKind = z.enum([
  'ability-check',
  'saving-throw',
  'attack-roll',
  'death-save',
  /** Narrative resolution with no dice — Speak, most Interact. */
  'none',
]);
export type CheckKind = z.infer<typeof CheckKind>;

export const Resolution = z.object({
  /** Echoes the action that produced this, for audit. */
  actionType: z.string().min(1),
  checkKind: CheckKind,

  /** Absent when `checkKind` is `none`. */
  roll: RollRecord.optional(),
  modifiers: z.array(Modifier).default([]),

  /** Roll total plus modifiers. Absent when no roll occurred. */
  total: z.number().int().optional(),

  /** Exactly one of these is set for a rolled check — DC for checks/saves, AC for attacks. */
  dc: DifficultyClass.optional(),
  ac: ArmorClass.optional(),

  /**
   * `total - target`. Negative means failure. Surfaced in the tray because
   * "failed by 1" and "failed by 12" are different stories, and the narration
   * consumer needs to know which.
   */
  margin: z.number().int().optional(),

  outcome: Outcome,
  effects: z.array(Effect).default([]),

  /**
   * Templated prose derived mechanically from this object. Used verbatim when
   * `dm-narration` fails or times out — a turn is never blocked on narration.
   * ROADMAP Phase 2 retry policy.
   */
  fallbackNarration: z.string().optional(),
});
export type Resolution = z.infer<typeof Resolution>;

/**
 * Persisted turn record. Mirrors the `Turn` model in the Prisma skeleton.
 * Deliberately lossless: raw input, parsed action, and full resolution are all
 * retained so any roll can be reconstructed months later.
 */
export const TurnRecord = z.object({
  index: z.number().int().min(0),
  rawInput: z.string().optional(),
  /** Absent when the turn came from an authored option rather than free text. */
  parseResult: z.unknown().optional(),
  resolution: Resolution,
  narration: z.string().optional(),
});
export type TurnRecord = z.infer<typeof TurnRecord>;
