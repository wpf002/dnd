import {
  IngestedModule,
  type Beat,
  type BeatOption,
  type Encounter,
  type IngestedRoom,
} from '@lantern/schema';
import { MONSTERS, type MonsterInput } from '@lantern/srd';
import { statedHazard, statedSearchCheck, statesAPuzzle } from './stated-mechanics.js';

/**
 * IngestedModule → BeatGraph. Deterministic, no model involved.
 *
 * Split out of `ingestion.ts` because this is the part Phase 7 turns on: the
 * extraction is a model job that will always be somewhat lossy, but the
 * mapping is plain code, and a plain-code mistake here becomes every ingested
 * module's shape.
 *
 * The mistake it was making: the first version walked `module.rooms` in array
 * order and padded every beat to three options by repeating the same target.
 * A hub with five exits kept three. A loop became a chain. Two of every three
 * "choices" led to the same room with no difference between them. That is the
 * railroad the roadmap predicted — but it was this file's doing, not anything
 * inherent to beat-graphs, and `Edge`, `Guard`, and `connections` were all
 * already there to do better.
 */

// ---------------------------------------------------------------------------
// Creature name → SRD statblock matching
// ---------------------------------------------------------------------------

/**
 * Closest SRD stand-in for a creature the subset does not have.
 *
 * Ranked by creature type first, then by challenge rating, because a party
 * fighting something of roughly the right shape and difficulty is far closer
 * to the printed encounter than one fighting a fixed fallback. A module's
 * giant centipedes become wolves rather than bandits.
 *
 * With no CR and no type to go on it still has to pick something; it says so
 * through the mapping report either way.
 */
export function substituteStatblock(cr?: number, type?: string, name?: string): string {
  const entries = Object.entries(USABLE);
  const wantedType = normalizeCreatureType(type);
  const words = (name ?? '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 2 && !['the', 'giant', 'adult', 'young'].includes(w));

  let best = entries[0]![0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const [id, monster] of entries) {
    // A shared word in the name outweighs everything. A module's scaled-up
    // "Great Horned Owl" is a CR 4 creature, and the only CR 4 beasts in the
    // SRD are an elephant and a hippopotamus — mechanically defensible and
    // unreadable in narration. An owl that is too weak is a better lie than
    // an elephant, and the report says the challenge rating moved.
    const namePenalty = words.some((w) => id.includes(w)) ? 0 : 20;
    const typePenalty = wantedType && monster.type?.toLowerCase() === wantedType ? 0 : 10;
    // Compared on a log scale: CR 1/8 to 1/4 is the same step as 1 to 2.
    const crPenalty =
      cr === undefined ? 0 : Math.abs(Math.log2(Math.max(cr, 0.0625)) - Math.log2(Math.max(monster.cr, 0.0625)));
    const score = namePenalty + typePenalty + crPenalty;
    if (score < bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}

/**
 * Pull the creature type out of whatever the module printed.
 *
 * Statblocks say "Small monstrosity" or "Large Monstrosity, Unaligned", not
 * "monstrosity", so a bare equality check never matched and every
 * substitution fell back to challenge rating alone.
 *
 * Types with no representative in the SRD subset map to the nearest category
 * that does. A giant centipede is animalistic whatever the statblock calls
 * it, so a beast is a closer stand-in than a skeleton of the same CR.
 */
export function normalizeCreatureType(printed?: string): string | undefined {
  if (!printed) return undefined;
  const text = printed.toLowerCase();
  const known = ['beast', 'humanoid', 'undead', 'construct', 'giant'];
  for (const type of known) if (text.includes(type)) return type;
  for (const animalistic of ['monstrosity', 'aberration', 'ooze', 'plant', 'dragon', 'elemental']) {
    if (text.includes(animalistic)) return 'beast';
  }
  if (text.includes('fiend') || text.includes('undead')) return 'undead';
  return undefined;
}

/**
 * Stat blocks the engine can actually run a fight with.
 *
 * Twenty-six of the imported creatures carry no attack — their damage is
 * stated in prose the importer does not read, and it leaves them empty rather
 * than inventing numbers. Matching one would put a creature on the battle map
 * that stands still, so they are skipped here and the near-match logic finds
 * an armed relative instead: a module's badger becomes a giant badger, not a
 * badger that cannot bite.
 */
const USABLE = Object.fromEntries(
  Object.entries(MONSTERS as Record<string, MonsterInput>).filter(
    ([, m]) => (m.attacks?.length ?? 0) > 0,
  ),
);

/** Best-effort match of a printed creature name onto the SRD subset. */
export function matchStatblock(name: string): string | undefined {
  const needle = name.toLowerCase().trim();
  const entries = Object.entries(USABLE);
  // Exact id or name match first.
  for (const [id, m] of entries) {
    if (id === needle || m.name.toLowerCase() === needle) return id;
  }
  // Then containment either way ("cult fanatic guard" → none; "giant rat swarm" → giant-rat).
  for (const [id, m] of entries) {
    if (needle.includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(needle)) return id;
  }
  // Singular/plural.
  const singular = needle.replace(/s$/, '');
  for (const [id, m] of entries) {
    if (m.name.toLowerCase() === singular) return id;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export interface MappingReport {
  /**
   * Creatures with no SRD match. Always reported, with the challenge rating
   * the module printed beside the one the stand-in actually has — a
   * substitution that changes the difficulty is the thing a human most needs
   * to see.
   */
  unmatchedCreatures: Array<{
    room: string;
    name: string;
    substituted?: string;
    printedCr?: number;
    substituteCr?: number;
  }>;
  /**
   * Every room whose shape had to be reworked to fit the three-option rule.
   * The fields below say what happened to each; this is the flat list the
   * repair surface reads.
   */
  reshapedRooms: string[];
  /** Hubs with more than three exits, split across extra beats to keep them all. */
  fannedOut: Array<{ room: string; exits: number; extraBeats: number }>;
  /** Rooms with fewer than three exits, padded up to three. */
  paddedRooms: string[];
  /** Connections naming a room that does not exist. Dropped, never guessed at. */
  danglingConnections: Array<{ room: string; target: string }>;
  /**
   * Endings that listed connections. An ending has no way on, so those are
   * read as inbound instead — the areas named are the ones that lead here.
   */
  endingsWithExits: string[];
  /** Rooms no path from the entry reaches. The linter will reject these too. */
  unreachableRooms: string[];
  /** Areas the module gates behind a check, given an approach beat. */
  checkedApproaches: Array<{ room: string; dc: number }>;
  /** Traps read out of the area's own prose and made real. */
  statedHazards: Array<{ room: string; dc: number; damage: string; puzzle: boolean }>;
  /** Search checks taken from the module's own printed DC rather than invented. */
  statedSearches: Array<{ room: string; dc: number; skill?: string }>;
  /**
   * Set when every ending the module prints is conditional and a withdrawal
   * ending was added so the party can always leave.
   */
  addedWithdrawal?: string;
  /** Counts read from a party-size table rather than taken flat. */
  scaledCounts: Array<{ room: string; creature: string; partySize: number; count: number }>;
  /**
   * Exits added because another area listed this one. A printed dungeon map is
   * undirected — a door between two rooms is one door — but extraction records
   * it from whichever side the text happened to mention.
   */
  inferredReturns: Array<{ room: string; target: string }>;
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

/**
 * Map an IngestedModule onto a BeatGraph candidate.
 *
 * The topology is the module's own:
 *  - exits come from `connections`, and all of them survive. A room with more
 *    than three is split across follow-on beats, which costs a beat and keeps
 *    the shape.
 *  - rooms with fewer than three exits are padded with options that actually
 *    differ — searching (sets a flag and then hides itself) and doubling back
 *    along a reverse connection.
 *  - encounter outcomes route topologically: victory onward, defeat and
 *    flight back the way the party came.
 *
 * Known, accepted losses:
 *  - Unmatched creatures substitute the closest SRD monster (reported).
 *  - DM improvisation notes have nowhere to live and fold into prose.
 *  - Timed events, reactive factions, and simultaneity are not expressed at
 *    all. The improv budget absorbs some of it; the rest is genuinely gone,
 *    and no amount of mapper cleverness recovers it.
 */
/**
 * The party this content is being built for.
 *
 * Four, because that is how many pregens there are. A published module scales
 * its encounters by party size, and picking the wrong column is the
 * difference between a fight and a slaughter.
 */
export const PARTY_SIZE = 4;

export function mapModuleToGraph(moduleInput: unknown): {
  graph: unknown;
  report: MappingReport;
} {
  // Parse at the boundary so defaults (connections, npcs) are applied whether
  // the IR came from the extractor or from a hand-edited repair file.
  const module = IngestedModule.parse(moduleInput);
  const report: MappingReport = {
    unmatchedCreatures: [],
    reshapedRooms: [],
    fannedOut: [],
    paddedRooms: [],
    danglingConnections: [],
    endingsWithExits: [],
    unreachableRooms: [],
    inferredReturns: [],
    checkedApproaches: [],
    statedHazards: [],
    statedSearches: [],
    scaledCounts: [],
  };

  const rooms = module.rooms;
  const byId = new Map(rooms.map((r) => [r.id, r]));
  const entryId = rooms[0]!.id;
  const encounters: Encounter[] = [];
  const beats: Beat[] = [];
  const edges: Array<{ from: string; to: string; when: unknown; note: string }> = [];

  const reshaped = (id: string) => {
    if (!report.reshapedRooms.includes(id)) report.reshapedRooms.push(id);
  };

  // -- Topology -------------------------------------------------------------

  /** Real exits: existing rooms, no self-loops, deduped, order preserved. */
  const exitsOf = (room: IngestedRoom): string[] => {
    const out: string[] = [];
    for (const target of room.connections) {
      if (target === room.id) continue;
      if (!byId.has(target)) {
        report.danglingConnections.push({ room: room.id, target });
        continue;
      }
      if (!out.includes(target)) out.push(target);
    }
    return out;
  };

  const forward = new Map<string, string[]>();
  for (const room of rooms) forward.set(room.id, room.isEnding ? [] : exitsOf(room));

  // A printed map is undirected: a door between two rooms is one door, and the
  // text describes it from whichever side it happens to be describing. Taking
  // connections as one-way strands whole wings of a dungeon — chunked
  // extraction of a real module left its storeroom and its conclusion
  // unreachable purely because no earlier section happened to mention them.
  //
  // Endings are excluded: an ending ends.
  for (const room of rooms) {
    if (room.isEnding) continue;
    for (const target of forward.get(room.id)!) {
      const back = forward.get(target);
      if (!back || byId.get(target)?.isEnding) continue;
      if (!back.includes(room.id)) {
        back.push(room.id);
        report.inferredReturns.push({ room: target, target: room.id });
      }
    }
  }

  // An ending's own connection list is really "how the party gets here",
  // written from the wrong side. Dropping it — which is what this used to do —
  // left the conclusion unreachable and the adventure unable to end.
  for (const room of rooms) {
    if (!room.isEnding) continue;
    const named = exitsOf(room);
    if (named.length === 0) continue;
    report.endingsWithExits.push(room.id);
    reshaped(room.id);
    for (const target of named) {
      if (byId.get(target)?.isEnding) continue;
      const exits = forward.get(target);
      if (exits && !exits.includes(room.id)) exits.push(room.id);
    }
  }

  // Who leads here. Used for doubling back, and for where a lost fight leaves
  // the party — a module's movement is bidirectional far more often than its
  // printed connection lists bother to say.
  const reverse = new Map<string, string[]>();
  for (const room of rooms) reverse.set(room.id, []);
  for (const [from, targets] of forward) {
    for (const target of targets) {
      const list = reverse.get(target)!;
      if (!list.includes(from)) list.push(from);
    }
  }

  /** Where the party most plausibly came from. */
  const camefrom = (id: string): string | undefined => {
    const back = (reverse.get(id) ?? []).find((r) => r !== id);
    if (back) return back;
    return id === entryId ? undefined : entryId;
  };

  /**
   * A party must always be able to walk away.
   *
   * Modules gate their conclusion on having done the job — "return to
   * Glowkindle once the cellar is clear" — which is right for a printed
   * adventure with a DM in the room. Mapped literally it produces a graph whose
   * only ending is behind a flag, so a party that loses the fight, or flees it,
   * or simply never finds the storeroom, walks the same three rooms forever.
   * That is not a hard adventure; it is an adventure with no exit.
   *
   * If nothing terminal can be reached without a flag, the module gets one more
   * ending: leaving with the job unfinished. It hangs off the entry, where a
   * party doubling back arrives anyway, and it is a real D&D outcome rather
   * than a safety valve — walking out of a job you cannot finish is a session,
   * and a worse one than winning, which is the point.
   */
  const everyEndingIsGated =
    rooms.some((r) => r.isEnding) &&
    rooms.filter((r) => r.isEnding).every((r) => r.requires.some((id) => byId.has(id)));

  if (everyEndingIsGated) {
    let withdrawalId = 'withdrew';
    for (let n = 2; byId.has(withdrawalId); n++) withdrawalId = `withdrew-${n}`;

    const withdrawal: IngestedRoom = {
      id: withdrawalId,
      // Named for how it reads as an option, not for how it reads as a title:
      // every option is labelled "Toward <name>", and "Toward Calling it" was
      // the second thing a party saw on the opening scene.
      name: 'the road home',
      description:
        'The job is not finished and the party knows it. There is no shame in the walk back ' +
        'that there would be in the walk in — only the weight of what was left behind, and ' +
        'whoever asked for the work still waiting on an answer.',
      connections: [],
      npcs: [],
      requires: [],
      isEnding: true,
    } as IngestedRoom;

    rooms.push(withdrawal);
    byId.set(withdrawal.id, withdrawal);
    forward.set(withdrawal.id, []);
    forward.get(entryId)!.push(withdrawal.id);
    report.addedWithdrawal = withdrawal.id;
  }

  /**
   * Areas the module gates behind a check get an approach beat, and every
   * route into them is redirected to it.
   *
   * This has to happen before any beat is emitted: a room processed earlier
   * would already have written an option pointing straight at the fight, and
   * rewiring afterwards leaves it there.
   */
  /** Areas whose trap the module says can be reasoned past. */
  const puzzleRooms = new Set(
    rooms
      .filter((r) => !r.isEnding && statedHazard(r.description) && statesAPuzzle(r.description))
      .map((r) => r.id),
  );

  const approachOf = new Map<string, string>();
  for (const room of rooms) {
    if (room.isEnding) continue;
    if (room.check && room.encounter) {
      approachOf.set(room.id, `${room.id}-approach`);
      report.checkedApproaches.push({ room: room.id, dc: room.check.dc });
      continue;
    }
    // A riddle-trap gets one too, for the same reason: the decision has to be
    // available *before* the party is standing on the thing. The verses on the
    // mosaic corridor's wall name the safe panels, and a party that stops to
    // read them should cross untouched — which is impossible if the blade has
    // already gone off by the time they can choose to look.
    if (puzzleRooms.has(room.id)) approachOf.set(room.id, `${room.id}-approach`);
  }
  if (approachOf.size > 0) {
    for (const [id, list] of forward) {
      forward.set(
        id,
        list.map((target) => (approachOf.has(target) && target !== id ? approachOf.get(target)! : target)),
      );
    }
    // The approach stands where the room did, so reverse lookups — and with
    // them "where the party came from" — must be rebuilt.
    reverse.clear();
    for (const room of rooms) reverse.set(room.id, []);
    for (const id of approachOf.values()) reverse.set(id, []);
    for (const [from, targets] of forward) {
      for (const target of targets) {
        const list = reverse.get(target);
        if (list && !list.includes(from)) list.push(from);
      }
    }
  }

  /**
   * What to call a destination in an option label.
   *
   * Approach beats are not rooms, so they are not in `byId`, and the fallback
   * printed their raw id: "Toward mosaic-corridor-approach". A player should
   * never be shown a beat id. An approach is named for the area it approaches.
   */
  const titleOf = (id: string): string => {
    const room = byId.get(id);
    if (room) return room.name;
    const approached = [...approachOf.entries()].find(([, approachId]) => approachId === id)?.[0];
    if (approached) return byId.get(approached)?.name ?? approached;
    return id;
  };

  // Reachability is the linter's call, but reporting it here tells the repair
  // pass which room to reconnect rather than leaving it to read a lint error.
  const seen = new Set<string>([entryId]);
  const queue = [entryId];
  while (queue.length > 0) {
    for (const next of forward.get(queue.shift()!) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  for (const room of rooms) if (!seen.has(room.id)) report.unreachableRooms.push(room.id);

  // -- Options --------------------------------------------------------------

  const searchFlag = (roomId: string) => `searched-${roomId}`;
  /** Set once a room's fight is over, so re-entering does not restart it. */
  const clearedFlag = (roomId: string) => `cleared-${roomId}`;
  /** Set on entering a room with no fight in it. */
  const visitedFlag = (roomId: string) => `visited-${roomId}`;

  /**
   * The flag that means "this area has been dealt with": winning its fight if
   * it has one, reaching it otherwise.
   */
  const dealtWithFlag = (roomId: string) =>
    byId.get(roomId)?.encounter ? clearedFlag(roomId) : visitedFlag(roomId);

  /** Rooms some other room lists as a prerequisite. Only these need a marker. */
  const requiredRooms = new Set(rooms.flatMap((r) => r.requires.filter((id) => byId.has(id))));

  /**
   * What searching this area rolls: the module's printed check if it states
   * one, and a plain Investigation 13 if it does not.
   */
  const searchCheckFor = (room: IngestedRoom, fallback: string) => {
    const stated = statedSearchCheck(room.description);
    if (stated) {
      report.statedSearches.push({
        room: room.id,
        dc: stated.dc,
        ...(stated.skill ? { skill: stated.skill } : {}),
      });
      return {
        ability: stated.ability,
        ...(stated.skill ? { skill: stated.skill } : {}),
        dc: stated.dc,
        onFailure: fallback,
      };
    }
    return { ability: 'int' as const, skill: 'investigation' as const, dc: 13, onFailure: fallback };
  };

  /**
   * The trap this area prints, if it prints one.
   *
   * When the room also states a puzzle whose answer is in the room — verses on
   * the wall and panels that match them — the hazard is avoidable by working
   * it out, and the beat gets an option to do so. That is the difference
   * between a riddle that is scenery and a riddle that is the point.
   */
  const hazardFor = (room: IngestedRoom) => {
    const stated = statedHazard(room.description);
    if (!stated) return undefined;
    const puzzle = statesAPuzzle(room.description);
    report.statedHazards.push({
      room: room.id,
      dc: stated.dc,
      damage: stated.damage,
      puzzle,
    });
    return {
      ability: stated.ability,
      dc: stated.dc,
      damage: stated.damage,
      halfOnSave: stated.halfOnSave,
      source: stated.source,
      ...(puzzle ? { avoidedWhen: { op: 'set' as const, flag: solvedFlag(room.id) } } : {}),
    };
  };

  const solvedFlag = (roomId: string) => `worked-out-${roomId}`;


  /** `entryWhen` for a room that states prerequisites. */
  const entryGuardFor = (room: IngestedRoom): object | undefined => {
    const needed = room.requires.filter((id) => byId.has(id) && id !== room.id);
    if (needed.length === 0) return undefined;
    const clauses = needed.map((id) => ({ op: 'set' as const, flag: dealtWithFlag(id) }));
    return clauses.length === 1 ? clauses[0]! : { op: 'and', clauses };
  };

  /**
   * Exactly three options for a beat exposing `targets` (at most three —
   * anything larger has already been split by the fan-out below).
   *
   * Padding never repeats a bare target: a repeated destination always carries
   * an effect or a check, so the outcomes genuinely differ and the linter's
   * false-choice rule is satisfied by construction rather than by luck.
   */
  const optionsFor = (room: IngestedRoom, targets: string[], slot: string): BeatOption[] => {
    const options: BeatOption[] = targets.map((target, i) => ({
      id: `${slot}-to-${i}`,
      label: `Toward ${titleOf(target)}`,
      target,
      effects: [],
    }));

    // Where padding sends the party when the room has nowhere of its own to
    // go: onward if there is an onward, otherwise back the way they came.
    const back = camefrom(room.id);
    const fallback = targets[0] ?? back ?? entryId;

    // Padders in preference order. Each is applied at most once, and each
    // differs from the others by more than its label — an effect, a distinct
    // destination, or a check. A dead-end room genuinely has one way out, so
    // its three options share a target; they are still not a false choice,
    // because what happens on the way differs.
    const padders: BeatOption[] = [
      {
        id: `${slot}-search`,
        label: `Search ${room.name} before moving on`,
        target: fallback,
        effects: [{ flag: searchFlag(room.id), value: true }],
        visibleWhen: { op: 'unset', flag: searchFlag(room.id) },
        // A check, so that searching produces something.
        //
        // Without it the option set a flag and said nothing: the party
        // searched, and the game returned the next room's description with no
        // acknowledgement that anything had been looked for. It satisfied the
        // linter's false-choice rule by construction and was still a false
        // choice to the person clicking it, because a resolution is what the
        // narrator has to describe — and `interact / automatic / no effects`
        // describes nothing.
        //
        // Deliberately not gated on success: a failed search is a party that
        // looked and found nothing, which is a real outcome and a different
        // sentence. The flag records that they looked either way.
        // The module's own printed check when it states one — "a character
        // who searches the room and makes a DC 13 Wisdom (Perception) check
        // notices one book that seems strange" — because rolling a DC the
        // book never printed is the app overruling the book it is running.
        //
        // Otherwise Intelligence (Investigation) 13: deliberately not the
        // Wisdom (Perception) 12 that "press on quickly" already rolls, since
        // the same check on both would make the two options identical in
        // everything but their labels, which is the false choice this padder
        // exists to avoid.
        //
        // Failure leads the same way success does. Searching is not a gate —
        // the party goes on either way, and what changes is whether they go on
        // having found anything.
        requiresCheck: searchCheckFor(room, fallback),
      } as BeatOption,
      ...(back && !targets.includes(back)
        ? [
            {
              id: `${slot}-back`,
              label: `Back toward ${titleOf(back)}`,
              target: back,
              effects: [],
            } as BeatOption,
          ]
        : []),
      {
        id: `${slot}-press`,
        label: 'Press on quickly, without checking the way',
        target: fallback,
        effects: [],
        requiresCheck: { ability: 'wis', skill: 'perception', dc: 12, onFailure: fallback, group: false },
      } as BeatOption,
      {
        id: `${slot}-listen`,
        label: 'Stop, and listen to the dark for a while',
        target: fallback,
        effects: [],
        requiresCheck: { ability: 'wis', skill: 'insight', dc: 10, onFailure: fallback, group: false },
      } as BeatOption,
    ];

    for (const padder of padders) {
      if (options.length >= 3) break;
      options.push(padder);
    }

    // A room with no exits at all still has to produce three. If that ever
    // fails, the graph would be schema-invalid in a way that is hard to trace
    // back here, so say so at the source instead.
    if (options.length !== 3) {
      throw new Error(
        `room '${room.id}' produced ${options.length} options, not 3 — ` +
          `${targets.length} exits, back=${back ?? 'none'}`,
      );
    }

    return options;
  };

  // -- Beats ----------------------------------------------------------------

  /**
   * Emit the beat (or beats) that offer `exits` as choices, and return the id
   * of the first one.
   *
   * Shared by ordinary rooms and by the aftermath of a fight, because both
   * face the same constraint: three options per beat, and every exit has to
   * survive. More than three means follow-on beats.
   */
  const emitChoiceBeats = (
    room: IngestedRoom,
    exits: string[],
    opts: {
      baseId: string;
      carriesRoom: boolean;
      prose: string;
      kind: string;
      /** Applied on entering the FIRST emitted beat only. */
      onEntry?: Array<{ flag: string; value: boolean }> | undefined;
      /** Guard on the FIRST emitted beat only. */
      entryWhen?: object | undefined;
      /** The area's stated trap, on the FIRST emitted beat only. */
      hazard?: object | undefined;
    },
  ): string => {
    const chunks: string[][] = [];
    if (exits.length <= 3) {
      chunks.push(exits);
    } else {
      let rest = [...exits];
      while (rest.length > 3) {
        chunks.push(rest.slice(0, 2));
        rest = rest.slice(2);
      }
      chunks.push(rest);
    }

    if (exits.length > 3) {
      report.fannedOut.push({ room: room.id, exits: exits.length, extraBeats: chunks.length - 1 });
      reshaped(room.id);
    } else if (exits.length < 3) {
      report.paddedRooms.push(room.id);
      reshaped(room.id);
    }

    chunks.forEach((chunk, ci) => {
      const isFirst = ci === 0;
      const id = isFirst ? opts.baseId : `${opts.baseId}-ways-${ci}`;
      const last = ci === chunks.length - 1;

      const options: BeatOption[] = last
        ? optionsFor(room, chunk, id)
        : [
            ...chunk.map((target, i) => ({
              id: `${id}-to-${i}`,
              label: `Toward ${titleOf(target)}`,
              target,
              effects: [],
            })),
            {
              id: `${id}-more`,
              label: `Look for another way out of ${room.name}`,
              target: `${opts.baseId}-ways-${ci + 1}`,
              effects: [],
            },
          ];

      beats.push({
        id,
        kind: isFirst ? opts.kind : 'decision',
        title: isFirst
          ? opts.carriesRoom
            ? room.name
            : `${room.name} — after the fight`
          : `${room.name} — another way`,
        prose: isFirst
          ? opts.prose
          : `You look again at ${room.name}. There are ways out of here you have not taken.`,
        ...(isFirst && opts.carriesRoom && room.readAloud !== undefined
          ? { readAloud: room.readAloud }
          : {}),
        art: isFirst
          ? opts.carriesRoom
            ? `art-${room.id}`
            : `art-${opts.baseId}`
          : `art-${opts.baseId}-ways-${ci}`,
        improvBudget: isFirst && opts.carriesRoom ? 6 : 3,
        ...(isFirst && opts.onEntry ? { onEntry: opts.onEntry } : {}),
        ...(isFirst && opts.entryWhen ? { entryWhen: opts.entryWhen } : {}),
        // The area's trap goes on the beat that carries the area's prose, so
        // it fires when the party is actually standing in the room rather
        // than on one of the extra beats a wide hub is fanned across.
        ...(isFirst && opts.carriesRoom && opts.hazard ? { hazard: opts.hazard } : {}),
        options,
        terminal: false,
      } as Beat);
    });

    return opts.baseId;
  };


  for (const room of rooms) {
    const exits = forward.get(room.id)!;
    const prose = [
      room.description,
      ...room.npcs.map(
        (n) => `NPC: ${n.name}${n.role ? ` — ${n.role}` : ''}${n.wants ? `; wants ${n.wants}` : ''}`,
      ),
    ].join('\n');

    // --- an ending
    if (room.isEnding) {
      const guard = entryGuardFor(room);
      beats.push({
        id: room.id,
        kind: 'ending',
        title: room.name,
        prose,
        ...(room.readAloud !== undefined ? { readAloud: room.readAloud } : {}),
        art: `art-${room.id}`,
        improvBudget: 6,
        options: [] as BeatOption[],
        ...(guard ? { entryWhen: guard } : {}),
        terminal: true,
      } as Beat);
      continue;
    }

    // --- the approach to a gated area
    const approachId = approachOf.get(room.id);

    // --- the near side of a riddle-trap
    //
    // The verses are readable from the edge; the blade is not. So the choice
    // that matters — read it, or walk on and find out — belongs here, one step
    // before the room whose entry sets the trap off.
    //
    // No check on working it out. The module prints the answer on the wall in
    // Common, and inventing a DC for reading something the book simply tells
    // you is the mapper overruling the module. What the party spends is time
    // and attention, and the trap is what happens to those who spend neither.
    if (approachId && puzzleRooms.has(room.id)) {
      const back = camefrom(room.id) ?? entryId;
      beats.push({
        id: approachId,
        kind: 'threshold',
        title: `${room.name} — the near side`,
        prose:
          `${room.description}\n\nFrom the edge of it you can read the whole thing without ` +
          `setting foot on anything. Working out what it means is a matter of taking the time.`,
        ...(room.readAloud !== undefined ? { readAloud: room.readAloud } : {}),
        art: `art-${room.id}-approach`,
        improvBudget: 6,
        options: [
          {
            id: `${approachId}-study`,
            label: `Read it through before setting foot on ${room.name}`,
            target: room.id,
            effects: [{ flag: solvedFlag(room.id), value: true }],
          },
          {
            id: `${approachId}-chance`,
            label: 'Walk on and take your chances',
            target: room.id,
            effects: [],
          },
          {
            id: `${approachId}-back`,
            label: `Back toward ${titleOf(back)}`,
            target: back,
            effects: [],
          },
        ] as BeatOption[],
        terminal: false,
      } as Beat);
    } else if (approachId) {
      const onward = exits[0] ?? camefrom(room.id) ?? entryId;
      const check = room.check!;
      beats.push({
        id: approachId,
        kind: 'threshold',
        title: `${room.name} — the approach`,
        prose:
          `${room.description}\n\nThere is a way past this without being noticed, ` +
          `if everyone is careful.`,
        art: `art-${room.id}-approach`,
        improvBudget: 6,
        options: [
          {
            id: `${approachId}-try`,
            label: `Slip past ${room.name} together`,
            target: onward,
            effects: [],
            requiresCheck: {
              ability: check.ability,
              ...(check.skill ? { skill: check.skill } : {}),
              dc: check.dc,
              group: check.group,
              onFailure: room.id,
            },
          },
          {
            id: `${approachId}-confront`,
            label: `Face what is in ${room.name}`,
            target: room.id,
            effects: [],
          },
          {
            id: `${approachId}-back`,
            label: `Turn back from ${room.name}`,
            target: (reverse.get(approachId) ?? []).find((r) => r !== approachId) ?? onward,
            effects: [],
          },
        ] as BeatOption[],
        terminal: false,
      } as Beat);
    }

    // --- a fight
    if (room.encounter) {
      const encounterId = `enc-${room.id}`;
      const combatants = room.encounter.creatures
        // Bystanders are not combatants. Putting a non-combatant snail on the
        // battle map as a creature to be killed is worse than leaving it to
        // the prose, which still describes it.
        .filter((c) => c.role !== 'noncombatant')
        .map((c, ci) => {
          let statblock = matchStatblock(c.name);
          if (!statblock) {
            statblock = substituteStatblock(c.cr, c.type, c.name);
            report.unmatchedCreatures.push({
              room: room.id,
              name: c.name,
              substituted: statblock,
              ...(c.cr !== undefined ? { printedCr: c.cr } : {}),
              substituteCr: (MONSTERS as Record<string, MonsterInput>)[statblock]!.cr,
            });
          }
          // A printed scaling table beats a flat number: it is what the
          // module says this party faces.
          let count = c.count;
          const scaled = c.countByPartySize?.[String(PARTY_SIZE)];
          if (scaled !== undefined) {
            count = scaled;
            report.scaledCounts.push({
              room: room.id,
              creature: c.name,
              partySize: PARTY_SIZE,
              count: scaled,
            });
          }

          return {
            id: `${room.id}-c${ci}`,
            statblock,
            count: Math.max(1, Math.min(count, 8)),
            hostile: c.role !== 'ally',
          };
        });

      // Victory pushes the party ON, not back the way they came. `exits[0]`
      // is very often the room they entered from — a real module's connection
      // lists are bidirectional — and routing victory there made everything
      // past the first fight unreachable.
      const back = camefrom(room.id);
      const onwardExits = exits.filter((exit) => exit !== back);

      // Every fight gets an aftermath beat. Two reasons, and the second is
      // the one that matters: a room that is both a fight and a junction
      // cannot express its exits through onVictory/onDefeat/onFlee alone, and
      // the aftermath is the only place that can honestly record that the
      // fight is over.
      const afterExits = onwardExits.length > 0 ? onwardExits : back ? [back] : [];
      const onward = emitChoiceBeats(room, afterExits, {
        baseId: `${room.id}-after`,
        carriesRoom: false,
        prose:
          `The fighting is over. ${room.name} is yours for the moment` +
          `${room.npcs.length > 0 ? `, and ${room.npcs.map((n) => n.name).join(' and ')} still here` : ''}.` +
          `\n\n${room.description}`,
        kind: 'discovery',
        onEntry: [{ flag: clearedFlag(room.id), value: true }],
      });

      // Walking back into a room you have already cleared should find it
      // empty, not full of the same monsters again. A published module's
      // connections are bidirectional, so without this the party can grind
      // the first fight forever — which is exactly what happened on the
      // first real module put through this pipeline.
      {
        edges.push({
          from: room.id,
          to: onward,
          when: { op: 'set', flag: clearedFlag(room.id) },
          note: `${room.name} has already been cleared`,
        });
      }

      const retreat = back ?? onward;
      encounters.push({
        id: encounterId,
        title: room.name,
        combatants,
        terrain: [],
        victory:
          room.encounter.victory === 'escape'
            ? { kind: 'escape' }
            : room.encounter.victory === 'survive-rounds'
              ? { kind: 'survive-rounds', rounds: room.encounter.rounds ?? 3 }
              : { kind: 'defeat-all' },
        onVictory: onward,
        onDefeat: retreat,
        onFlee: retreat,
      } as Encounter);

      beats.push({
        id: room.id,
        kind: 'conflict',
        title: room.name,
        prose,
        ...(room.readAloud !== undefined ? { readAloud: room.readAloud } : {}),
        art: `art-${room.id}`,
        improvBudget: 6,
        options: [] as BeatOption[],
        encounter: encounterId,
        ...(entryGuardFor(room) ? { entryWhen: entryGuardFor(room) } : {}),
        terminal: false,
      } as Beat);
      continue;
    }

    // --- an ordinary room, possibly a hub
    const hazard = hazardFor(room);
    emitChoiceBeats(room, exits, {
      baseId: room.id,
      carriesRoom: true,
      prose,
      kind: room.id === entryId ? 'threshold' : 'discovery',
      ...(hazard ? { hazard } : {}),
      ...(requiredRooms.has(room.id)
        ? { onEntry: [{ flag: visitedFlag(room.id), value: true }] }
        : {}),
      ...(entryGuardFor(room) ? { entryWhen: entryGuardFor(room) } : {}),
    });
  }

  // Every `searched-<room>` flag is read by the very option that sets it — the
  // option hides itself once used — so the linter's orphan-flag check passes
  // by construction. The previous version wrote those flags with no reader and
  // then rewired an arbitrary option on the last beat to read them.

  const graphId =
    module.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'ingested-module';

  const graph = {
    id: graphId,
    schemaVersion: 1,
    metadata: {
      title: module.title,
      premise: module.summary,
      tone: ['exploration'],
      partyLevel: module.partyLevel,
      narrationVoice:
        'Faithful to the source module: descriptive, unhurried, keeping the original read-aloud text intact where it exists.',
      provenance: 'ingested',
    },
    entry: entryId,
    beats,
    // Edges carry transitions no option owns. The one the mapper can derive
    // honestly is "this fight is already over" — everything else a module
    // triggers on state lives in prose the IR does not capture, and inventing
    // it here would be the mapper writing content.
    edges,
    encounters,
  };

  return { graph, report };
}

// ---------------------------------------------------------------------------
// Chapters → books
// ---------------------------------------------------------------------------

export interface CampaignMappingReport {
  /** One per book, keyed by chapter id. */
  books: Array<{ chapter: string; adventure: string; report: MappingReport }>;
  /**
   * Connections that left their chapter. Dropped from the book's graph —
   * a book is a graph, and a graph cannot point into another one. Where the
   * party goes next is the campaign's business, not the beat's.
   */
  crossChapterExits: Array<{ chapter: string; room: string; target: string; targetChapter: string }>;
  /**
   * Chapters with no ending of their own. Every one but the last gets a
   * synthetic hand-off beat; the last is a real problem and stays reported.
   */
  chaptersWithoutEndings: string[];
  /** Rooms in no chapter at all. Extraction dropped them on the floor. */
  orphanedRooms: string[];
  /** Level bands that do not chain. Reported, never silently patched. */
  levelBandBreaks: Array<{ from: string; to: string; endsAt: number; startsAt: number }>;
}

/**
 * Map a chaptered module onto a CampaignGraph plus one BeatGraph per chapter.
 *
 * This is why Phase 7 waited on Phase 6. Without a campaign container every
 * ingested module was compressed into a single graph, which is the reason the
 * Phase 5 spike produced a railroad even before the topology bug: a
 * three-hundred-room campaign does not fit in sixteen beats, so most of it
 * was never going to survive.
 *
 * Nothing here silently repairs the module. A level band that does not chain,
 * a chapter with no ending, a room in no chapter — each is reported and left
 * for the linter to reject and a human to fix, which is invariant 6 doing its
 * job rather than the mapper guessing at a published author's intent.
 */
export function mapModuleToCampaign(moduleInput: unknown): {
  campaign: unknown;
  adventures: Array<{ id: string; graph: unknown }>;
  report: CampaignMappingReport;
} {
  const module = IngestedModule.parse(moduleInput);
  const chapters = module.chapters;
  if (!chapters || chapters.length === 0) {
    throw new Error('module has no chapters — use mapModuleToGraph for a single-book module');
  }

  const report: CampaignMappingReport = {
    books: [],
    crossChapterExits: [],
    chaptersWithoutEndings: [],
    orphanedRooms: [],
    levelBandBreaks: [],
  };

  const roomsById = new Map(module.rooms.map((r) => [r.id, r]));
  /** Which chapter each room belongs to. A room in two chapters belongs to the first. */
  const chapterOf = new Map<string, string>();
  for (const chapter of chapters) {
    for (const roomId of chapter.rooms) {
      if (!chapterOf.has(roomId)) chapterOf.set(roomId, chapter.id);
    }
  }
  for (const room of module.rooms) {
    if (!chapterOf.has(room.id)) report.orphanedRooms.push(room.id);
  }

  const slug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);

  const moduleSlug = slug(module.title) || 'ingested-module';
  const adventures: Array<{ id: string; graph: unknown }> = [];

  for (const chapter of chapters) {
    const adventureId = `${moduleSlug}-${slug(chapter.id)}`.slice(0, 60);

    // Build a standalone module out of this chapter's rooms, severing exits
    // that leave it. `mapModuleToGraph` then does the ordinary topology work,
    // so a chapter is mapped exactly the way a single-book module is.
    const chapterRooms = chapter.rooms
      .map((id) => roomsById.get(id))
      .filter((r): r is IngestedRoom => r !== undefined)
      .map((room) => {
        const kept: string[] = [];
        for (const target of room.connections) {
          const targetChapter = chapterOf.get(target);
          if (targetChapter !== undefined && targetChapter !== chapter.id) {
            report.crossChapterExits.push({
              chapter: chapter.id,
              room: room.id,
              target,
              targetChapter,
            });
            continue;
          }
          kept.push(target);
        }
        return { ...room, connections: kept };
      });

    // A chapter that continues into the next one has no ending of its own —
    // it hands off. That is not a defect in the module, it is what a chapter
    // IS, and requiring a terminal beat per book made the first real
    // multi-chapter ingest fail on two of its three books.
    //
    // The hand-off is built from the connections that left the chapter, which
    // were already being detected and thrown away: the rooms that pointed
    // onward are exactly where the story moves on.
    const isLast = chapter.id === chapters[chapters.length - 1]!.id;
    const needsHandoff = !chapterRooms.some((r) => r.isEnding);
    if (needsHandoff) report.chaptersWithoutEndings.push(chapter.id);

    if (needsHandoff && !isLast) {
      const handoffId = `${slug(chapter.id)}-ends`;
      const departures = new Set(
        report.crossChapterExits.filter((x) => x.chapter === chapter.id).map((x) => x.room),
      );
      // Nothing pointed onward: the chapter's last-described area is the
      // hand-off point, which is the best the text supports.
      if (departures.size === 0 && chapterRooms.length > 0) {
        departures.add(chapterRooms[chapterRooms.length - 1]!.id);
      }
      for (const room of chapterRooms) {
        if (departures.has(room.id) && !room.connections.includes(handoffId)) {
          room.connections.push(handoffId);
        }
      }
      chapterRooms.push({
        id: handoffId,
        name: `${chapter.title} — the story moves on`,
        description:
          `The party's part in ${chapter.title} is finished. What happens next belongs to the ` +
          `chapter that follows.`,
        connections: [] as string[],
        npcs: [],
        isEnding: true,
        requires: [] as string[],
      } as IngestedRoom);
    }

    const { graph, report: chapterReport } = mapModuleToGraph({
      title: chapter.title,
      summary: chapter.summary ?? module.summary,
      rooms: chapterRooms,
    });

    // The chapter's own id and level band, not the ones mapModuleToGraph
    // derived from the title.
    const withIdentity = {
      ...(graph as Record<string, unknown>),
      id: adventureId,
      metadata: {
        ...((graph as { metadata: Record<string, unknown> }).metadata),
        partyLevel: chapter.levelStart,
      },
    };

    adventures.push({ id: adventureId, graph: withIdentity });
    report.books.push({ chapter: chapter.id, adventure: adventureId, report: chapterReport });
  }

  for (let i = 1; i < chapters.length; i++) {
    const prev = chapters[i - 1]!;
    const next = chapters[i]!;
    if (prev.levelEnd !== next.levelStart) {
      report.levelBandBreaks.push({
        from: prev.id,
        to: next.id,
        endsAt: prev.levelEnd,
        startsAt: next.levelStart,
      });
    }
  }

  // Each book records that it finished; the next book reads it. That is the
  // minimum honest continuity — the module's real cross-chapter conditions
  // live in prose the extractor does not yet capture, and inventing guards
  // for them would be the mapper writing the campaign.
  const finishedFlag = (chapterId: string) => `finished-${slug(chapterId)}`;

  const books = chapters.map((chapter, i) => ({
    id: slug(chapter.id),
    title: chapter.title,
    adventure: report.books[i]!.adventure,
    levelStart: chapter.levelStart,
    levelEnd: chapter.levelEnd,
    ...(i === 0
      ? {}
      : { entryWhen: { op: 'set' as const, flag: finishedFlag(chapters[i - 1]!.id) } }),
    onComplete: [{ flag: finishedFlag(chapter.id), value: true }],
    ...(chapter.summary ? { note: chapter.summary } : {}),
  }));

  const campaign = {
    id: moduleSlug,
    schemaVersion: 1,
    metadata: {
      title: module.title,
      premise: module.summary,
      tone: ['exploration'],
      narrationVoice:
        'Faithful to the source module: descriptive, unhurried, keeping the original read-aloud text intact where it exists.',
      provenance: 'ingested',
      ingestedFrom: module.title,
    },
    books,
    // The last book's flag is written and never read, which the campaign
    // linter warns about — so it is deliberately not carried.
    carryFlags: chapters.slice(0, -1).map((c) => finishedFlag(c.id)),
  };

  return { campaign, adventures, report };
}
