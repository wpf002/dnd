import { z } from 'zod';
import { ContentLimits, Guard, StateMutation } from './beat.js';
import { Id, Level, Tier, Tone } from './primitives.js';

/**
 * Campaign scale — Phase 6.
 *
 * A `BeatGraph` is one adventure: 10–16 beats, one sitting. A `CampaignGraph`
 * is a sequence of them that carries a party from level 1 toward 20.
 *
 * The distinction the old model got wrong: `Campaign` held a single graph and
 * replayed it. A published campaign is multi-book, so anything ingested into
 * one graph collapses its structure — which is exactly why Phase 7 depends on
 * this landing first.
 *
 * Books reference adventures by id rather than inlining them. Adventures
 * already live as individually-linted files on disk, so a book is a pointer
 * plus the campaign-level facts a standalone graph cannot know: which levels
 * it covers, what must be true to enter it, and what it leaves behind.
 */

// ---------------------------------------------------------------------------
// Book
// ---------------------------------------------------------------------------

export const Book = z.object({
  id: Id,
  title: z.string().min(1),
  /** The `BeatGraph` this book plays. Resolved against content/adventures/. */
  adventure: Id,

  /**
   * The level band this book is balanced for. `levelStart` is the level the
   * party is expected to enter at; `levelEnd` the level they leave at.
   *
   * The linter requires Book N's `levelEnd` to equal Book N+1's `levelStart` —
   * a campaign with a gap is a campaign where the party arrives under-levelled
   * for content the encounter math assumed they were ready for.
   */
  levelStart: Level,
  levelEnd: Level,

  /**
   * Must hold for this book to be enterable. Read against campaign ledger
   * state, not session state — a book gate can depend on something that
   * happened books ago.
   */
  entryWhen: Guard.default({ op: 'always' }),

  /** Written to the ledger when the book completes. Survives into later books. */
  onComplete: z.array(StateMutation).default([]),

  /** Author-facing note on what this book is for. Never shown to the player. */
  note: z.string().optional(),
});
export type Book = z.infer<typeof Book>;

// ---------------------------------------------------------------------------
// CampaignGraph
// ---------------------------------------------------------------------------

export const CampaignMetadata = z.object({
  title: z.string().min(1),
  premise: z.string().min(1),
  tone: z.array(Tone).min(1).max(3),
  /**
   * The campaign's arc across the four tiers (Compendium Vol III Ch6 §IV).
   * A 1→20 campaign passes through all of them; a shorter one need not.
   */
  tierStart: Tier.default('local'),
  tierEnd: Tier.default('mythic'),
  narrationVoice: z.string().min(1),
  contentLimits: ContentLimits.default({ exclude: [] }),
  /**
   * `authored`, `flint` (generated), or `ingested` (Phase 7 — a published
   * module the user owns). Provenance is per-campaign because an ingested
   * campaign's books are all ingested together.
   */
  provenance: z.enum(['authored', 'flint', 'ingested']).default('authored'),
  /**
   * Set only on `ingested` campaigns: the source this was extracted from.
   * Attribution and audit — never enters a generation prompt.
   */
  ingestedFrom: z.string().optional(),
});
export type CampaignMetadata = z.infer<typeof CampaignMetadata>;

export const CampaignGraph = z.object({
  id: Id,
  schemaVersion: z.literal(1),
  metadata: CampaignMetadata,

  /** Ordered. Book 0 is where play begins; there is no separate entry field. */
  books: z.array(Book).min(1).max(12),

  /**
   * Ledger flags that must survive book transitions.
   *
   * Session state is discarded between books; the ledger is the campaign's
   * spine. Declaring the carried keys explicitly lets the linter prove that a
   * guard in Book IV reads something Book I actually wrote, instead of
   * discovering it as a dead gate mid-play.
   */
  carryFlags: z.array(Id).default([]),
});
export type CampaignGraph = z.infer<typeof CampaignGraph>;

// ---------------------------------------------------------------------------
// Runtime progress
// ---------------------------------------------------------------------------

/**
 * Where a party is within a campaign. Persisted alongside the ledger; this is
 * what the between-books transition screen and the recap read from.
 */
export const CampaignProgress = z.object({
  campaign: Id,
  /** Index into `books`. */
  bookIndex: z.number().int().min(0),
  /** Current party level. Advances via the engine, never set by content. */
  partyLevel: Level,
  completedBooks: z.array(Id).default([]),
});
export type CampaignProgress = z.infer<typeof CampaignProgress>;
