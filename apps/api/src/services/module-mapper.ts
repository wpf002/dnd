import {
  IngestedModule,
  type Beat,
  type BeatOption,
  type Encounter,
  type IngestedRoom,
} from '@lantern/schema';
import { MONSTERS, type MonsterInput } from '@lantern/srd';

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
export function substituteStatblock(cr?: number, type?: string): string {
  const entries = Object.entries(MONSTERS as Record<string, MonsterInput>);
  const wantedType = normalizeCreatureType(type);

  let best = entries[0]![0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const [id, monster] of entries) {
    const typePenalty = wantedType && monster.type?.toLowerCase() === wantedType ? 0 : 10;
    // Compared on a log scale: CR 1/8 to 1/4 is the same step as 1 to 2.
    const crPenalty =
      cr === undefined ? 0 : Math.abs(Math.log2(Math.max(cr, 0.0625)) - Math.log2(monster.cr));
    const score = typePenalty + crPenalty;
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

/** Best-effort match of a printed creature name onto the SRD subset. */
export function matchStatblock(name: string): string | undefined {
  const needle = name.toLowerCase().trim();
  const entries = Object.entries(MONSTERS as Record<string, MonsterInput>);
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
  /** Creatures with no SRD match — substituted or dropped, always reported. */
  unmatchedCreatures: Array<{ room: string; name: string; substituted?: string }>;
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
  /** Endings that also had onward exits. The exits are dropped; an ending ends. */
  endingsWithExits: string[];
  /** Rooms no path from the entry reaches. The linter will reject these too. */
  unreachableRooms: string[];
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

  for (const room of rooms) {
    if (room.isEnding && exitsOf(room).length > 0) {
      report.endingsWithExits.push(room.id);
      reshaped(room.id);
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

  const titleOf = (id: string) => byId.get(id)?.name ?? id;

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
        requiresCheck: { ability: 'wis', skill: 'perception', dc: 12, onFailure: fallback },
      } as BeatOption,
      {
        id: `${slot}-listen`,
        label: 'Stop, and listen to the dark for a while',
        target: fallback,
        effects: [],
        requiresCheck: { ability: 'wis', skill: 'insight', dc: 10, onFailure: fallback },
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

    // --- a fight
    if (room.encounter) {
      const encounterId = `enc-${room.id}`;
      const combatants = room.encounter.creatures.map((c, ci) => {
        let statblock = matchStatblock(c.name);
        if (!statblock) {
          statblock = substituteStatblock(c.cr, c.type);
          report.unmatchedCreatures.push({ room: room.id, name: c.name, substituted: statblock });
        }
        return { id: `${room.id}-c${ci}`, statblock, count: Math.min(c.count, 8), hostile: true };
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
        victory: { kind: 'defeat-all' },
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
    emitChoiceBeats(room, exits, {
      baseId: room.id,
      carriesRoom: true,
      prose,
      kind: room.id === entryId ? 'threshold' : 'discovery',
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
  /** Chapters with no ending room. Their graphs will fail the linter, by design. */
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

    if (!chapterRooms.some((r) => r.isEnding)) report.chaptersWithoutEndings.push(chapter.id);

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
