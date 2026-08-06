import { z } from 'zod';
import {
  ArtSlotId,
  BeatId,
  CombatantId,
  EncounterId,
  Id,
  Level,
  Tier,
  Tone,
} from './primitives.js';

/**
 * The beat-graph: the authored structure of an adventure.
 *
 * A `BeatGraph` is what the generator emits and what the linter gates. Hand-authored
 * graphs pass through the same linter — nothing bypasses it, ROADMAP invariant 6.
 */

// ---------------------------------------------------------------------------
// State and guards
// ---------------------------------------------------------------------------

export const FlagValue = z.union([z.boolean(), z.number(), z.string()]);
export type FlagValue = z.infer<typeof FlagValue>;

/**
 * A predicate over campaign state. Kept deliberately small — comparison
 * operators and boolean combinators, no arithmetic, no function calls.
 *
 * The narrow surface is the point: the linter must be able to statically
 * enumerate every flag a graph reads and every flag it writes, and prove there
 * are no orphans. A richer expression language would make that undecidable.
 */
export type Guard =
  | { op: 'always' }
  | { op: 'never' }
  | { op: 'eq'; flag: string; value: FlagValue }
  | { op: 'neq'; flag: string; value: FlagValue }
  | { op: 'gte'; flag: string; value: number }
  | { op: 'lte'; flag: string; value: number }
  | { op: 'set'; flag: string }
  | { op: 'unset'; flag: string }
  | { op: 'and'; clauses: Guard[] }
  | { op: 'or'; clauses: Guard[] }
  | { op: 'not'; clause: Guard };

export const Guard: z.ZodType<Guard> = z.lazy(() =>
  z.discriminatedUnion('op', [
    z.object({ op: z.literal('always') }),
    z.object({ op: z.literal('never') }),
    z.object({ op: z.literal('eq'), flag: Id, value: FlagValue }),
    z.object({ op: z.literal('neq'), flag: Id, value: FlagValue }),
    z.object({ op: z.literal('gte'), flag: Id, value: z.number() }),
    z.object({ op: z.literal('lte'), flag: Id, value: z.number() }),
    z.object({ op: z.literal('set'), flag: Id }),
    z.object({ op: z.literal('unset'), flag: Id }),
    z.object({ op: z.literal('and'), clauses: z.array(Guard).min(1) }),
    z.object({ op: z.literal('or'), clauses: z.array(Guard).min(1) }),
    z.object({ op: z.literal('not'), clause: Guard }),
  ]),
);

/** A write to campaign state. The linter pairs these against guard reads. */
export const StateMutation = z.object({
  flag: Id,
  value: FlagValue,
});
export type StateMutation = z.infer<typeof StateMutation>;

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/**
 * One of the three authored choices on a beat.
 *
 * Per Vol II Part II §10, a choice is meaningful only when outcomes differ and
 * costs exist. Options that all lead to the same target with no state change
 * are false choices, and the linter should flag them.
 */
export const BeatOption = z.object({
  id: Id,
  /** Shown to the player. Describes intent, not mechanics. */
  label: z.string().min(1),
  /** Hidden unless the guard passes. Absent means always shown. */
  visibleWhen: Guard.optional(),
  /** Where this leads. */
  target: BeatId,
  /** Applied on selection, before the target beat is entered. */
  effects: z.array(StateMutation).default([]),
  /** Optional gate — a check the option requires before it resolves. */
  requiresCheck: z
    .object({
      ability: z.string().min(1),
      skill: z.string().optional(),
      dc: z.number().int().min(1).max(30),
      /** Where failure leads. Failure must go *somewhere* — see below. */
      onFailure: BeatId,
    })
    .optional(),
});
export type BeatOption = z.infer<typeof BeatOption>;

// ---------------------------------------------------------------------------
// Beat
// ---------------------------------------------------------------------------

/** Vol III Ch1 §VI.2 room categories, generalized from dungeons to beats. */
export const BeatKind = z.enum([
  'threshold',
  'transit',
  'discovery',
  'social',
  'decision',
  'conflict',
  'hazard',
  'puzzle',
  'climax',
  'ending',
]);
export type BeatKind = z.infer<typeof BeatKind>;

export const Beat = z.object({
  id: BeatId,
  kind: BeatKind,
  title: z.string().min(1),

  /**
   * The prose slot. This is a *brief* for the narration consumer, not the text
   * shown to the player — `dm-narration` renders it in the graph's voice.
   * Authored prose that must appear verbatim goes in `readAloud`.
   */
  prose: z.string().min(1),
  readAloud: z.string().optional(),

  /** Every beat has art. The linter enforces coverage. */
  art: ArtSlotId,

  /**
   * Exactly three authored options on playable beats, per the design. Free
   * text is handled separately via the improv budget — it is not a fourth
   * option. Terminal beats end the adventure and carry no options.
   */
  options: z.array(BeatOption).max(3),

  /**
   * How many off-graph resolutions this beat will absorb before free text
   * starts resolving as in-fiction constraint.
   *
   * Tune generously. Inference cost is not a constraint at n=1, and a visible
   * rail breaks immersion badly for a player who knows how the machine works.
   * This is the single largest experiential risk in the project — ROADMAP
   * Phase 2, "The improv budget".
   */
  improvBudget: z.number().int().min(0).max(20).default(5),

  /** Must hold for this beat to be enterable. */
  entryWhen: Guard.default({ op: 'always' }),
  /** Applied on entry. */
  onEntry: z.array(StateMutation).default([]),
  /** Applied on exit, whichever option was taken. */
  onExit: z.array(StateMutation).default([]),

  /** Set when this beat runs an encounter. */
  encounter: EncounterId.optional(),

  /** Terminal beats end the adventure. The linter requires at least one reachable. */
  terminal: z.boolean().default(false),
}).superRefine((beat, ctx) => {
  // Three beat shapes, each with its own option arity:
  //  - terminal: the adventure ends here; no options.
  //  - encounter: combat runs on entry and the Encounter's onVictory/onDefeat/
  //    onFlee transitions route the outcome; options would be dead weight.
  //  - playable: exactly three authored options, always.
  if (beat.terminal && beat.options.length !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['options'],
      message: 'terminal beats end the adventure and must have no options',
    });
  } else if (beat.encounter !== undefined && beat.options.length !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['options'],
      message:
        'encounter beats route through the encounter\'s onVictory/onDefeat/onFlee and must have no options',
    });
  } else if (!beat.terminal && beat.encounter === undefined && beat.options.length !== 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['options'],
      message: 'non-terminal beats must have exactly three authored options',
    });
  }
});
export type Beat = z.infer<typeof Beat>;

// ---------------------------------------------------------------------------
// Edge
// ---------------------------------------------------------------------------

/**
 * Transitions not owned by an option — encounter outcomes, timed events,
 * state-triggered moves. Options carry their own targets; edges cover
 * everything else.
 */
export const Edge = z.object({
  from: BeatId,
  to: BeatId,
  when: Guard.default({ op: 'always' }),
  /** Documentation for the linter's error output and for graph debugging. */
  note: z.string().optional(),
});
export type Edge = z.infer<typeof Edge>;

// ---------------------------------------------------------------------------
// Encounter
// ---------------------------------------------------------------------------

export const Combatant = z.object({
  id: CombatantId,
  /** SRD monster id, or `pc` for a player character slot. */
  statblock: Id,
  count: z.number().int().min(1).max(20).default(1),
  /** Overrides the statblock default where the encounter needs a variant. */
  hpOverride: z.number().int().min(1).optional(),
  hostile: z.boolean().default(true),
});
export type Combatant = z.infer<typeof Combatant>;

/**
 * Vol III Ch2 §X — terrain creates choices; flat rooms create repetitive
 * combat. These flags are what the engine uses to make position matter.
 */
export const TerrainFlag = z.enum([
  'difficult',
  'darkness',
  'dim-light',
  'cover-heavy',
  'cover-light',
  'water',
  'ice',
  'lava',
  'fog',
  'wind',
  'vertical',
  'unstable',
  'cramped',
  'open',
]);
export type TerrainFlag = z.infer<typeof TerrainFlag>;

/**
 * Vol III Ch2 §XIV — objectives beyond killing. An encounter whose only
 * victory condition is `defeat-all` is mechanically valid but narratively
 * thin, and the linter warns on a graph where every encounter is that.
 */
export const VictoryCondition = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('defeat-all') }),
  z.object({ kind: z.literal('survive-rounds'), rounds: z.number().int().min(1) }),
  z.object({ kind: z.literal('reach-location'), description: z.string().min(1) }),
  z.object({ kind: z.literal('protect'), target: CombatantId }),
  z.object({ kind: z.literal('destroy'), target: CombatantId }),
  z.object({ kind: z.literal('escape') }),
  z.object({ kind: z.literal('flag'), flag: Id }),
]);
export type VictoryCondition = z.infer<typeof VictoryCondition>;

export const Encounter = z.object({
  id: EncounterId,
  title: z.string().min(1),
  combatants: z.array(Combatant).min(1),
  terrain: z.array(TerrainFlag).default([]),
  victory: VictoryCondition,
  /** Where the graph goes on success. */
  onVictory: BeatId,
  /**
   * Where the graph goes on defeat. Required, not optional — a TPK must lead
   * somewhere authored. Vol III Ch8 §VII: failure moves the story, it does not
   * halt it.
   */
  onDefeat: BeatId,
  /** Vol III Ch1 §XV — retreat should remain possible unless fiction prevents it. */
  onFlee: BeatId.optional(),
});
export type Encounter = z.infer<typeof Encounter>;

// ---------------------------------------------------------------------------
// BeatGraph
// ---------------------------------------------------------------------------

/**
 * Content boundaries, honored by every Flint consumer that generates prose.
 * Set at Session Zero (Vol III Ch10 §I) and carried on the graph so they travel
 * with the content rather than living in app config.
 */
export const ContentLimits = z.object({
  exclude: z.array(z.string()).default([]),
  /** Free-text guidance appended to every narration system block for this graph. */
  note: z.string().optional(),
});
export type ContentLimits = z.infer<typeof ContentLimits>;

export const GraphMetadata = z.object({
  title: z.string().min(1),
  premise: z.string().min(1).describe('One or two sentences. Vol II Part IV §3.'),
  tone: z.array(Tone).min(1).max(3),
  tier: Tier.default('local'),
  partyLevel: Level,
  /**
   * The narration register for this graph. A horror one-shot and a comedy heist
   * need opposite voices — this is why Flint's voice block must be opt-in per
   * consumer rather than baked into the seam. ROADMAP "Flint finding #1".
   */
  narrationVoice: z.string().min(1),
  contentLimits: ContentLimits.default({ exclude: [] }),
  /** `authored` or the Davis run that produced it. */
  provenance: z.enum(['authored', 'davis', 'ingested']).default('authored'),
});
export type GraphMetadata = z.infer<typeof GraphMetadata>;

export const BeatGraph = z.object({
  id: Id,
  schemaVersion: z.literal(1),
  metadata: GraphMetadata,
  /** Where play begins. Must exist in `beats`. */
  entry: BeatId,
  beats: z.array(Beat).min(1),
  edges: z.array(Edge).default([]),
  encounters: z.array(Encounter).default([]),
});
export type BeatGraph = z.infer<typeof BeatGraph>;
