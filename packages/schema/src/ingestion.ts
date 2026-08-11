import { z } from 'zod';
import { Id, Level } from './primitives.js';

/**
 * Phase 5 — the intermediate representation for module ingestion.
 *
 * A published adventure is extracted into this shape first, then mapped onto
 * a BeatGraph deterministically. Two stages on purpose: extraction is a model
 * job (messy prose in, structure out), while room→beat mapping is plain code
 * that can be tested without a model and repaired by hand when extraction
 * mangles something. The linter gates the result like any other graph.
 *
 * Honest scope note (from the roadmap): published modules are branching,
 * spatial, and DM-improvisation-dependent in ways a beat-graph doesn't
 * natively express. This IR keeps only what maps: rooms, connections,
 * encounters, read-aloud text, NPCs. Expect the first pass at any real module
 * to play like a railroad of the original; that is the research finding, not
 * a bug in the pipeline.
 */

export const IngestedEncounter = z.object({
  /** Free-text creature names as printed; mapped to SRD statblocks later. */
  creatures: z.array(z.object({ name: z.string(), count: z.number().int().min(1).max(20) })).min(1),
  setup: z.string().optional(),
});
export type IngestedEncounter = z.infer<typeof IngestedEncounter>;

export const IngestedNpc = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  wants: z.string().optional(),
});
export type IngestedNpc = z.infer<typeof IngestedNpc>;

export const IngestedRoom = z.object({
  id: Id,
  name: z.string().min(1),
  /** Boxed/read-aloud text, verbatim where present. */
  readAloud: z.string().optional(),
  /** DM-facing description, condensed. */
  description: z.string().min(1),
  /** Ids of rooms this one connects to. */
  connections: z.array(Id).default([]),
  encounter: IngestedEncounter.optional(),
  npcs: z.array(IngestedNpc).default([]),
  /** Marks a plausible conclusion point of the module. */
  isEnding: z.boolean().default(false),
});
export type IngestedRoom = z.infer<typeof IngestedRoom>;

/**
 * A chapter or act of a published campaign — one book of a `CampaignGraph`.
 *
 * Rooms are referenced by id rather than nested, so the module keeps a single
 * room list. That matters because published chapters are not cleanly
 * separable: a connection that crosses a chapter boundary is real information
 * about the module, and nesting would have thrown it away at extraction time
 * instead of reporting it at mapping time.
 */
export const IngestedChapter = z.object({
  id: Id,
  title: z.string().min(1),
  summary: z.string().optional(),
  /** The module's own level band for this chapter, as printed. */
  levelStart: Level,
  levelEnd: Level,
  /** Room ids in this chapter. The first is where the chapter begins. */
  rooms: z.array(Id).min(2),
});
export type IngestedChapter = z.infer<typeof IngestedChapter>;

export const IngestedModule = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  /** First room is the entrance. */
  rooms: z.array(IngestedRoom).min(2).max(400),
  /**
   * Chapters, when the source is a multi-part campaign rather than a single
   * dungeon. Absent means one book — which is what every module was before
   * Phase 6 gave campaigns a container to map onto.
   */
  chapters: z.array(IngestedChapter).max(12).optional(),
});
export type IngestedModule = z.infer<typeof IngestedModule>;

/**
 * One chunk's worth of extraction, for a document too long to do in one call.
 *
 * Everything is optional because a chunk may legitimately contain no areas at
 * all — front matter, an appendix, a table of random encounters. Requiring
 * two rooms the way `IngestedModule` does would make the extractor invent
 * them, which is the one thing worse than extracting nothing.
 */
export const IngestedFragment = z.object({
  /** Set on whichever chunk carries the module's title page. */
  title: z.string().optional(),
  summary: z.string().optional(),
  rooms: z.array(IngestedRoom).default([]),
  chapters: z.array(IngestedChapter).default([]),
});
export type IngestedFragment = z.infer<typeof IngestedFragment>;
