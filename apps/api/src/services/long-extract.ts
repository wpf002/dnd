import type { IngestedChapter, IngestedFragment, IngestedLinks, IngestedRoom } from '@lantern/schema';

/**
 * Long-document extraction — Phase 7 item 3.
 *
 * A published campaign book runs to hundreds of pages. Even at a million
 * tokens of context, handing the whole thing over in one call and asking for
 * one structured object is the wrong shape: the output is the constraint, not
 * the input. Three hundred rooms of read-aloud text will not come back
 * complete and correct from a single generation, and when it fails there is
 * no partial result to keep.
 *
 * So the document is chunked, each chunk is extracted on its own, and the
 * pieces are merged. The thing that makes this work rather than produce three
 * hundred disconnected fragments is the running index: every call is told
 * which areas, NPCs, and chapters have already been seen, so chapter 14 can
 * connect a passage back to a room named in chapter 2 instead of inventing a
 * near-duplicate.
 *
 * Chunking and merging are pure functions, tested without a model. The
 * extraction call is injected, so this file never decides how to talk to a
 * provider.
 */

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

/**
 * Headings a published module actually uses.
 *
 * Three distinct forms, kept separate because they need different case rules.
 * A single combined pattern with the `i` flag was catastrophic: it made the
 * shouted-heading branch match any line of ordinary text without punctuation,
 * so a 15,000-character module split into 64 sections — most of them cut
 * mid-sentence — and cost 64 model calls instead of seven.
 */
const HEADINGS = [
  /** "Chapter One", "Part 2: The Descent", "Appendix A". Case-insensitive. */
  /^\s{0,3}(?:chapter|part|act|book|appendix)\b[^\n]{0,80}$/i,
  /**
   * "1. Beer Cellar", "12) The Vault". The keyed-area heading, which is how
   * most dungeons number their rooms — and which the original pattern could
   * not match at all, because it required a letter first.
   *
   * Deliberately short and punctuation-free: a real book is full of numbered
   * lists and table rows ("1. They eat all manner of creatures", "19: deafened
   * for 1d4 rounds") and a looser pattern turned every one of them into a
   * section boundary.
   */
  /^\s{0,3}\d{1,3}[.:)]\s+[A-Z][^\n.,;!?]{0,38}$/,
  /** "THE SUNKEN VAULT". Case-SENSITIVE: shouted means shouted. */
  /^\s{0,3}[A-Z][A-Z0-9 '’\-:&]{5,60}$/,
  /**
   * "Hex 0304: The Drowned Chapel", "Hex 12.05", "Area 7 — The Kiln".
   *
   * A dungeon numbers its rooms; a hexcrawl keys its areas by coordinate, and
   * a region book by name-and-number. None of the patterns above match any of
   * those, so a whole hexcrawl arrived as one chunk with no area boundaries in
   * it at all — every location in the book extracted, if it extracted, as part
   * of whatever came first.
   */
  /^\s{0,3}(?:hex|area|location|site|region|encounter)\s+\d{1,4}(?:[.\-]\d{1,4})?\s*(?:[.:)—–-]\s*[A-Z][^\n.,;!?]{0,38})?$/i,
  /**
   * "0402  Broken Aqueduct" — the bare coordinate, which hexcrawls print
   * without the word "hex" once the reader knows what they are looking at.
   *
   * Four digits, then whitespace, then a short unpunctuated title. Tight on
   * purpose: a looser rule turns every year and every table row into a
   * section boundary.
   */
  /^\s{0,3}\d{4}(?:[.\-]\d{1,4})?\s{1,6}[A-Z][^\n.,;!?]{0,38}$/,
];

function isHeading(line: string): boolean {
  return line.trim().length > 0 && HEADINGS.some((pattern) => pattern.test(line));
}

export interface Chunk {
  index: number;
  /** The heading this chunk falls under, when there was one. */
  heading?: string;
  text: string;
}

/**
 * Split module text into extractable chunks.
 *
 * Splits on headings first, because a module's own structure is a better
 * boundary than any character count. A section longer than `maxChars` is then
 * split again on blank lines — never mid-paragraph, since a room description
 * cut in half extracts as two broken rooms.
 */
export function chunkModule(text: string, maxChars = 12_000): Chunk[] {
  const lines = text.split(/\r?\n/);

  // Pass 1: group lines under headings.
  const sections: Array<{ heading?: string; lines: string[] }> = [];
  let current: { heading?: string; lines: string[] } = { lines: [] };
  for (const line of lines) {
    if (isHeading(line)) {
      if (current.lines.some((l) => l.trim())) sections.push(current);
      current = { heading: line.trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.some((l) => l.trim()) || current.heading) sections.push(current);

  // Pass 1b: a heading repeated back-to-back is a running page header, not a
  // new section. A 64-page PDF prints its chapter name on every page, which
  // turned one chapter into a dozen sections. Merge them back.
  const merged: Array<{ heading?: string; lines: string[] }> = [];
  for (const section of sections) {
    const previous = merged[merged.length - 1];
    if (previous && previous.heading !== undefined && previous.heading === section.heading) {
      previous.lines.push(...section.lines);
      continue;
    }
    merged.push(section);
  }
  sections.length = 0;
  sections.push(...merged);

  // Pass 2: split oversized sections on paragraph boundaries.
  const chunks: Chunk[] = [];
  for (const section of sections) {
    const body = section.lines.join('\n').trim();
    if (!body) continue;

    if (body.length <= maxChars) {
      chunks.push({
        index: chunks.length,
        ...(section.heading ? { heading: section.heading } : {}),
        text: section.heading ? `${section.heading}\n\n${body}` : body,
      });
      continue;
    }

    const paragraphs = body.split(/\n{2,}/);
    let buffer: string[] = [];
    let length = 0;
    const flush = () => {
      if (buffer.length === 0) return;
      const joined = buffer.join('\n\n');
      chunks.push({
        index: chunks.length,
        ...(section.heading ? { heading: section.heading } : {}),
        text: section.heading ? `${section.heading} (continued)\n\n${joined}` : joined,
      });
      buffer = [];
      length = 0;
    };
    for (const paragraph of paragraphs) {
      // A single paragraph over the limit still goes through whole. Cutting
      // it would corrupt exactly the read-aloud text this pipeline exists to
      // preserve verbatim.
      if (length > 0 && length + paragraph.length > maxChars) flush();
      buffer.push(paragraph);
      length += paragraph.length + 2;
    }
    flush();
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// The running index
// ---------------------------------------------------------------------------

/**
 * What earlier chunks established. Small on purpose — it goes into every
 * subsequent prompt, so it carries identity and nothing else.
 */
export interface RunningIndex {
  rooms: Array<{ id: string; name: string }>;
  npcs: string[];
  chapters: Array<{ id: string; title: string }>;
}

export function emptyIndex(): RunningIndex {
  return { rooms: [], npcs: [], chapters: [] };
}

export function indexFrom(module: Partial<IngestedFragment>): RunningIndex {
  return {
    rooms: (module.rooms ?? []).map((r) => ({ id: r.id, name: r.name })),
    npcs: [...new Set((module.rooms ?? []).flatMap((r) => r.npcs.map((n) => n.name)))],
    chapters: (module.chapters ?? []).map((c) => ({ id: c.id, title: c.title })),
  };
}

/**
 * The index as prompt text.
 *
 * Truncated because a three-hundred-room module's index would otherwise grow
 * to dominate every later call. Rooms are the part that matters for
 * connections, so they get the room; NPC names are cheap and useful for
 * recognising a returning character.
 */
export function renderIndex(index: RunningIndex, maxRooms = 200): string {
  if (index.rooms.length === 0 && index.npcs.length === 0) {
    return 'Nothing has been extracted yet. This is the first section.';
  }
  const rooms = index.rooms.slice(-maxRooms);
  const omitted = index.rooms.length - rooms.length;
  const lines = [
    'Already extracted — reuse these ids exactly rather than creating near-duplicates,',
    'and connect to them by id when this section references them:',
    '',
    `Areas (${index.rooms.length}${omitted > 0 ? `, showing the last ${rooms.length}` : ''}):`,
    ...rooms.map((r) => `  ${r.id} — ${r.name}`),
  ];
  if (index.npcs.length > 0) {
    lines.push('', `NPCs: ${index.npcs.join(', ')}`);
  }
  if (index.chapters.length > 0) {
    lines.push('', `Chapters: ${index.chapters.map((c) => `${c.id} (${c.title})`).join(', ')}`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Merging
// ---------------------------------------------------------------------------

export interface MergeReport {
  /** Rooms a later chunk described again. Their connections were unioned. */
  mergedRooms: string[];
  /** Ids a later chunk reused for a plainly different room. Kept, renamed, reported. */
  collidedRooms: Array<{ id: string; keptName: string; renamedTo: string; renamedName: string }>;
  /** Chunks that produced nothing at all. Usually front matter or appendices. */
  emptyChunks: number[];
}

/**
 * Fold one chunk's extraction into the accumulating module.
 *
 * A room seen twice is the normal case, not an error: modules cross-reference
 * constantly, and the running index is what makes the second mention reuse the
 * first mention's id. Connections are unioned; prose fields prefer whichever
 * version actually has content, with the first description winning ties
 * because the first mention is usually the room's own entry rather than a
 * passing reference elsewhere.
 */
export function mergeExtraction(
  into: { title: string; summary: string; rooms: IngestedRoom[]; chapters: IngestedChapter[] },
  chunk: Partial<IngestedFragment>,
  report: MergeReport,
  chunkIndex: number,
): void {
  const rooms = chunk.rooms ?? [];
  const chapters = chunk.chapters ?? [];
  if (rooms.length === 0 && chapters.length === 0) {
    report.emptyChunks.push(chunkIndex);
    return;
  }

  const byId = new Map(into.rooms.map((r) => [r.id, r]));

  for (const incoming of rooms) {
    const existing = byId.get(incoming.id);
    if (!existing) {
      into.rooms.push({ ...incoming });
      byId.set(incoming.id, into.rooms[into.rooms.length - 1]!);
      continue;
    }

    // Same id, plainly different room. Keep both — dropping one loses content
    // and overwriting loses more. The suffix is deterministic so a re-run of
    // the same document produces the same ids.
    const sameRoom =
      existing.name.trim().toLowerCase() === incoming.name.trim().toLowerCase();
    if (!sameRoom) {
      const renamed = `${incoming.id}-${chunkIndex}`;
      report.collidedRooms.push({
        id: incoming.id,
        keptName: existing.name,
        renamedTo: renamed,
        renamedName: incoming.name,
      });
      const copy = { ...incoming, id: renamed };
      into.rooms.push(copy);
      byId.set(renamed, copy);
      continue;
    }

    report.mergedRooms.push(incoming.id);
    for (const connection of incoming.connections) {
      if (!existing.connections.includes(connection)) existing.connections.push(connection);
    }
    for (const npc of incoming.npcs) {
      if (!existing.npcs.some((n) => n.name === npc.name)) existing.npcs.push(npc);
    }
    if (!existing.readAloud && incoming.readAloud) existing.readAloud = incoming.readAloud;
    if (incoming.description.length > existing.description.length * 2) {
      // A much fuller description is the room's real entry; the shorter one
      // was a cross-reference from somewhere else.
      existing.description = incoming.description;
    }
    if (!existing.encounter && incoming.encounter) existing.encounter = incoming.encounter;
    existing.isEnding = existing.isEnding || incoming.isEnding;
  }

  for (const incoming of chapters) {
    const existing = into.chapters.find((c) => c.id === incoming.id);
    if (!existing) {
      into.chapters.push({ ...incoming, rooms: [...incoming.rooms] });
      continue;
    }
    for (const roomId of incoming.rooms) {
      if (!existing.rooms.includes(roomId)) existing.rooms.push(roomId);
    }
  }
}

/**
 * Final tidy-up before the result is handed to the mapper.
 *
 * Only removes what is provably broken — connections to rooms that were never
 * extracted, and chapter entries for rooms that do not exist. Both are
 * reported. Nothing is invented: a module missing an ending stays missing one,
 * and the linter says so.
 */
export function finalizeExtraction(
  assembled: { title: string; summary: string; rooms: IngestedRoom[]; chapters: IngestedChapter[] },
): { module: unknown; droppedConnections: Array<{ room: string; target: string }> } {
  const ids = new Set(assembled.rooms.map((r) => r.id));
  const droppedConnections: Array<{ room: string; target: string }> = [];

  for (const room of assembled.rooms) {
    room.connections = room.connections.filter((target) => {
      if (ids.has(target)) return true;
      droppedConnections.push({ room: room.id, target });
      return false;
    });
  }

  const chapters = assembled.chapters
    .map((chapter) => ({ ...chapter, rooms: chapter.rooms.filter((id) => ids.has(id)) }))
    .filter((chapter) => chapter.rooms.length >= 2);

  return {
    module: {
      title: assembled.title,
      summary: assembled.summary,
      rooms: assembled.rooms,
      ...(chapters.length > 0 ? { chapters } : {}),
    },
    droppedConnections,
  };
}

// ---------------------------------------------------------------------------
// The driver
// ---------------------------------------------------------------------------

export interface LongExtractReport extends MergeReport {
  chunks: number;
  /** Connections the linking pass added that the first pass could not see. */
  connectionsLinked: number;
  /** Chunks whose linking call failed. Their forward references stay missing. */
  failedLinks: Array<{ index: number; detail: string }>;
  /** Chunks whose extraction call failed outright. Their content is lost. */
  failedChunks: Array<{ index: number; detail: string }>;
  droppedConnections: Array<{ room: string; target: string }>;
  rooms: number;
  chapters: number;
}

export type ChunkExtractor = (input: {
  chunk: Chunk;
  index: RunningIndex;
  total: number;
}) => Promise<{ ok: true; value: Partial<IngestedFragment> } | { ok: false; detail: string }>;

/**
 * Second pass: given a chunk and the COMPLETE area list, say what each area in
 * that chunk connects to. This is what makes a forward reference expressible.
 */
export type ChunkLinker = (input: {
  chunk: Chunk;
  index: RunningIndex;
  total: number;
}) => Promise<{ ok: true; value: IngestedLinks } | { ok: false; detail: string }>;

/**
 * Extract a long module chunk by chunk.
 *
 * A failed chunk does not fail the run. Losing one section of a three-hundred
 * page book and being told which one is far more useful than losing the whole
 * extraction, and the repair pass needs somewhere to start.
 */
export async function extractLongModule(
  text: string,
  title: string,
  summary: string,
  extract: ChunkExtractor,
  options: { maxChars?: number; link?: ChunkLinker } = {},
): Promise<{ module: unknown; report: LongExtractReport }> {
  const chunks = chunkModule(text, options.maxChars);
  const assembled = { title, summary, rooms: [] as IngestedRoom[], chapters: [] as IngestedChapter[] };
  const report: LongExtractReport = {
    chunks: chunks.length,
    connectionsLinked: 0,
    failedLinks: [],
    mergedRooms: [],
    collidedRooms: [],
    emptyChunks: [],
    failedChunks: [],
    droppedConnections: [],
    rooms: 0,
    chapters: 0,
  };

  for (const chunk of chunks) {
    // Sequential, not parallel: each call depends on what the previous ones
    // established. That is the whole point of the running index.
    const result = await extract({
      chunk,
      index: indexFrom(assembled),
      total: chunks.length,
    });

    if (!result.ok) {
      report.failedChunks.push({ index: chunk.index, detail: result.detail });
      continue;
    }
    mergeExtraction(assembled, result.value, report, chunk.index);
  }

  // Second pass. Every chunk is revisited with the complete area list, so a
  // junction described early can finally point at the rooms described later.
  // Skipped for a single chunk, which has nothing it could not already see.
  if (options.link && chunks.length > 1) {
    const complete = indexFrom(assembled);
    const byId = new Map(assembled.rooms.map((r) => [r.id, r]));

    for (const chunk of chunks) {
      const linked = await options.link({ chunk, index: complete, total: chunks.length });
      if (!linked.ok) {
        report.failedLinks.push({ index: chunk.index, detail: linked.detail });
        continue;
      }
      for (const entry of linked.value.rooms) {
        const room = byId.get(entry.id);
        if (!room) continue;
        for (const target of entry.connections) {
          if (!byId.has(target) || target === room.id) continue;
          if (!room.connections.includes(target)) {
            room.connections.push(target);
            report.connectionsLinked++;
          }
        }
      }
    }
  }

  const { module, droppedConnections } = finalizeExtraction(assembled);
  report.droppedConnections = droppedConnections;
  report.rooms = assembled.rooms.length;
  report.chapters = (module as { chapters?: unknown[] }).chapters?.length ?? 0;

  return { module, report };
}
