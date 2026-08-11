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
  /**
   * Creatures as printed. Names are free text and mapped to SRD statblocks
   * later; `cr` and `type` are what make that mapping survivable when the
   * name has no SRD equivalent.
   *
   * Without them every unmatched creature fell back to one fixed statblock,
   * so a module's giant centipedes and its fire spider both became bandits —
   * which fails "recognizably itself" long before anyone reads the prose.
   */
  creatures: z
    .array(
      z.object({
        name: z.string(),
        count: z.number().int().min(1).max(20),
        /** Challenge rating as printed. 1/4 is 0.25. */
        cr: z.number().min(0).max(30).optional(),
        /** beast, humanoid, undead, monstrosity, construct, giant, … */
        type: z.string().optional(),
        /**
         * Whose side they are on.
         *
         * Modules put allies and bystanders in the same statblock list as the
         * monsters, marked only in prose — "(ally)", "(non-combatant)". With
         * no way to say so, every one of them came out hostile, and a real
         * module's friendly chipmunk archer, pixie ranger, and a snail were
         * all set on the party they were supposed to be helping.
         */
        role: z.enum(['enemy', 'ally', 'noncombatant']).default('enemy'),
      }),
    )
    .min(1),
  setup: z.string().optional(),
  /**
   * How the encounter is won, as the module frames it.
   *
   * Not every fight is a fight to the death, and assuming so is how a real
   * module's "avoid the weasel den or else fend them off" became a pack of
   * predators that level-1 woodland critters were required to kill — which
   * the solvability check correctly called impossible.
   */
  victory: z.enum(['defeat-all', 'escape', 'survive-rounds']).default('defeat-all'),
  /** Rounds to survive, when `victory` is `survive-rounds`. */
  rounds: z.number().int().min(1).max(20).optional(),
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
  /**
   * Areas that must be dealt with before this one can be entered.
   *
   * Modules state this constantly — a conclusion the party can only reach
   * once the job is actually done, a door that opens when the seal is broken.
   * Without it the mapper wires the conclusion as just another exit, and the
   * whole dungeon becomes optional: the first real module through this
   * pipeline could be finished by killing the rats in the entry room and
   * walking back out.
   */
  requires: z.array(Id).default([]),
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
   * The level the module is written for, as printed. Defaults to 3 only
   * because that is what the pregens are; a first-level adventure that says
   * so on its cover should not be listed as third-level.
   */
  partyLevel: Level.default(3),
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

/**
 * A linking pass over one chunk, once every area in the document is known.
 *
 * Sequential extraction cannot make forward references: when the chunk
 * describing a junction is read, the areas it leads to have not been seen yet,
 * so their ids do not exist to connect to. The first real module through the
 * chunked path lost most of its map that way — a corridor with three exits
 * came back with one.
 *
 * So connections are asked for a second time, with the complete area list in
 * hand. Only ids and connections; the prose is already extracted.
 */
export const IngestedLinks = z.object({
  rooms: z
    .array(z.object({ id: Id, connections: z.array(Id).default([]) }))
    .default([]),
});
export type IngestedLinks = z.infer<typeof IngestedLinks>;
