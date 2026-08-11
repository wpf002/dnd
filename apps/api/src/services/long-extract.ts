import type { IngestedChapter, IngestedFragment, IngestedRoom } from '@lantern/schema';

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
 * Headings a published module actually uses. Deliberately conservative: a
 * false positive splits a room's description in half, which is worse than a
 * chunk running slightly long.
 */
const HEADING = /^\s{0,3}(?:(?:chapter|part|act|book|appendix)\b[^\n]{0,80}|[A-Z][A-Z0-9 '’\-:]{6,60})\s*$/i;

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
    if (HEADING.test(line) && line.trim().length > 0) {
      if (current.lines.some((l) => l.trim())) sections.push(current);
      current = { heading: line.trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.some((l) => l.trim()) || current.heading) sections.push(current);

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
  options: { maxChars?: number } = {},
): Promise<{ module: unknown; report: LongExtractReport }> {
  const chunks = chunkModule(text, options.maxChars);
  const assembled = { title, summary, rooms: [] as IngestedRoom[], chapters: [] as IngestedChapter[] };
  const report: LongExtractReport = {
    chunks: chunks.length,
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

  const { module, droppedConnections } = finalizeExtraction(assembled);
  report.droppedConnections = droppedConnections;
  report.rooms = assembled.rooms.length;
  report.chapters = (module as { chapters?: unknown[] }).chapters?.length ?? 0;

  return { module, report };
}
