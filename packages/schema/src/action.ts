import { z } from 'zod';
import { Ability, CombatantId, Id, RollMode, Skill, SpellLevel } from './primitives.js';

/**
 * `Action` is the structured object intent parsing must emit — or fail to emit.
 *
 * This is the single most safety-critical type in the project. Free text like
 * "I seduce the door" must produce a valid Action or an explicit rejection.
 * A hallucinated valid action is strictly worse than an error, because the
 * engine will execute it without question.
 *
 * Hence `ActionParseResult` below: parsing returns a discriminated
 * accepted/rejected union, never a nullable Action. There is no representation
 * of "probably this action" — the type system refuses to let a guess through.
 *
 * See ROADMAP Phase 2 (Flint v2) and docs/reference/dnd-101.md §15.
 */

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

/**
 * What an action points at. `self` and `combatant` are engine-resolvable;
 * `object` and `direction` are fiction-space and resolve against the beat, not
 * the combat grid.
 */
export const Target = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('self') }),
  z.object({ kind: z.literal('combatant'), id: CombatantId }),
  z.object({ kind: z.literal('object'), description: z.string().min(1) }),
  z.object({ kind: z.literal('direction'), description: z.string().min(1) }),
]);
export type Target = z.infer<typeof Target>;

// ---------------------------------------------------------------------------
// The action union
// ---------------------------------------------------------------------------

const base = {
  /** The player's original text, carried through for audit and narration context. */
  rawInput: z.string().optional(),
};

export const AttackAction = z.object({
  ...base,
  type: z.literal('attack'),
  weapon: Id.describe('SRD weapon id, or a natural-weapon id'),
  target: Target,
  mode: RollMode.default('normal'),
});

export const CastSpellAction = z.object({
  ...base,
  type: z.literal('cast-spell'),
  spell: Id.describe('SRD spell id'),
  /** Slot level actually spent. May exceed the spell's base level (upcasting). */
  atLevel: SpellLevel,
  targets: z.array(Target).max(8).default([]),
});

export const AbilityCheckAction = z.object({
  ...base,
  type: z.literal('ability-check'),
  ability: Ability,
  /** Present when the attempt maps onto a trained skill. */
  skill: Skill.optional(),
  mode: RollMode.default('normal'),
  /**
   * What the character is trying to do, in fiction. The engine sets the DC —
   * this field never carries one. Players describe intent; they do not name
   * their own difficulty.
   */
  intent: z.string().min(1),
});

export const MoveAction = z.object({
  ...base,
  type: z.literal('move'),
  target: Target,
  /** Feet of movement. The engine validates against remaining speed. */
  distance: z.number().int().min(0).max(500).optional(),
});

export const UseItemAction = z.object({
  ...base,
  type: z.literal('use-item'),
  item: Id,
  target: Target.optional(),
});

export const InteractAction = z.object({
  ...base,
  type: z.literal('interact'),
  target: Target,
  /** "pull the lever", "search the bookshelf", "bar the door". */
  intent: z.string().min(1),
});

export const SpeakAction = z.object({
  ...base,
  type: z.literal('speak'),
  target: Target.optional(),
  utterance: z.string().min(1),
});

export const Action = z.discriminatedUnion('type', [
  AttackAction,
  CastSpellAction,
  AbilityCheckAction,
  MoveAction,
  UseItemAction,
  InteractAction,
  SpeakAction,
]);
export type Action = z.infer<typeof Action>;

export type ActionType = Action['type'];

// ---------------------------------------------------------------------------
// Fail-closed parse result
// ---------------------------------------------------------------------------

/**
 * Why an intent could not be turned into an Action. Each maps to a distinct
 * in-fiction response, which is why these are enumerated rather than free text
 * — the narration layer must be able to branch on the reason without parsing
 * an error message.
 */
export const RejectionReason = z.enum([
  /** The text does not describe an action at all. */
  'unintelligible',
  /** A coherent action the rules have no representation for. */
  'unsupported',
  /** Names a target, item, or spell that is not present. */
  'unavailable',
  /** Well-formed but not legal right now — wrong turn phase, no slots, incapacitated. */
  'illegal',
  /** Legal, but the beat's improv budget is spent. Resolves as in-fiction constraint. */
  'budget-exhausted',
]);
export type RejectionReason = z.infer<typeof RejectionReason>;

/**
 * The contract for `intent-parse`. Note there is no third state: no "maybe",
 * no partial action, no confidence score to threshold on. Either a validated
 * Action or an explicit refusal.
 *
 * Retry policy for this consumer is **zero retries** — a silent retry burns
 * 2–3 seconds mid-turn and usually returns the same garbage. The rejection
 * surfaces as in-fiction refusal instead. ROADMAP Phase 2.
 */
export const ActionParseResult = z.discriminatedUnion('accepted', [
  z.object({
    accepted: z.literal(true),
    action: Action,
  }),
  z.object({
    accepted: z.literal(false),
    reason: RejectionReason,
    /**
     * Diagnostic only — for the telemetry log and for debugging prompts.
     * Never shown to the player verbatim; the narration layer writes the
     * in-fiction refusal from `reason`.
     */
    detail: z.string().optional(),
  }),
]);
export type ActionParseResult = z.infer<typeof ActionParseResult>;
