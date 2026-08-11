import { describe, expect, it } from 'vitest';
import type { IngestedChapter, IngestedRoom } from '@lantern/schema';
import {
  chunkModule,
  emptyIndex,
  extractLongModule,
  finalizeExtraction,
  indexFrom,
  mergeExtraction,
  renderIndex,
  type ChunkExtractor,
  type MergeReport,
} from './services/long-extract.js';

/**
 * Phase 7 item 3: extraction that survives a document larger than one
 * generation can produce.
 *
 * Chunking and merging are pure, so all of this runs without a model. The
 * extraction call is injected; the scripted extractor below stands in for it
 * and lets the tests assert the thing that actually matters — that a later
 * chunk connects back to a room an earlier chunk named, rather than inventing
 * a near-duplicate.
 */

const room = (id: string, name: string, connections: string[] = [], extra = {}): IngestedRoom =>
  ({ id, name, description: `${name} description.`, connections, npcs: [], isEnding: false, ...extra }) as IngestedRoom;

const freshReport = (): MergeReport => ({ mergedRooms: [], collidedRooms: [], emptyChunks: [] });
const freshAssembly = () => ({
  title: 'T',
  summary: 'S',
  rooms: [] as IngestedRoom[],
  chapters: [] as IngestedChapter[],
});

// ---------------------------------------------------------------------------

describe('chunking', () => {
  it("splits on the module's own headings", () => {
    const text = [
      'CHAPTER ONE: THE ROAD',
      '',
      'A muddy track leads north.',
      '',
      'Chapter Two: The Keep',
      '',
      'The keep is empty.',
    ].join('\n');

    const chunks = chunkModule(text);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]!.heading).toBe('CHAPTER ONE: THE ROAD');
    expect(chunks[0]!.text).toContain('muddy track');
    expect(chunks[1]!.heading).toBe('Chapter Two: The Keep');
    expect(chunks[1]!.text).not.toContain('muddy track');
  });

  it('splits an oversized section on paragraph boundaries, never mid-paragraph', () => {
    const paragraph = `${'word '.repeat(60).trim()}.`;
    const text = ['THE LONG HALL', '', ...Array.from({ length: 40 }, () => paragraph)].join('\n\n');

    const chunks = chunkModule(text, 1_000);
    expect(chunks.length).toBeGreaterThan(1);
    // Every paragraph survives whole in exactly one chunk.
    const total = chunks.reduce(
      (n, c) => n + (c.text.match(/word word/g) ?? []).length,
      0,
    );
    const expected = (text.match(/word word/g) ?? []).length;
    expect(total).toBe(expected);
  });

  it('passes an over-long single paragraph through whole rather than cutting it', () => {
    // Read-aloud text is the thing this pipeline promises to preserve
    // verbatim; splitting it to respect a size cap would break that promise.
    const giant = 'A '.repeat(5_000);
    const chunks = chunkModule(`THE VAULT\n\n${giant}`, 1_000);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.text).toContain(giant.trim());
  });

  it('handles text with no headings at all', () => {
    const chunks = chunkModule('Just some prose.\n\nAnd more of it.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.heading).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------

describe('the running index', () => {
  it('says plainly when nothing has been extracted yet', () => {
    expect(renderIndex(emptyIndex())).toMatch(/first section/i);
  });

  it('carries room ids, names, and NPCs forward', () => {
    const index = indexFrom({
      rooms: [room('salt-stair', 'The Salt Stair', [], { npcs: [{ name: 'Derben' }] })],
    });
    const rendered = renderIndex(index);
    expect(rendered).toContain('salt-stair — The Salt Stair');
    expect(rendered).toContain('Derben');
  });

  it('truncates a huge index rather than letting it dominate every prompt', () => {
    const index = indexFrom({
      rooms: Array.from({ length: 500 }, (_, i) => room(`r-${i}`, `Room ${i}`)),
    });
    const rendered = renderIndex(index, 50);
    expect(rendered).toContain('showing the last 50');
    expect(rendered).toContain('r-499');
    expect(rendered).not.toContain('r-100 ');
  });
});

// ---------------------------------------------------------------------------

describe('merging', () => {
  it('unions the connections of a room two chunks both describe', () => {
    const into = freshAssembly();
    const report = freshReport();
    mergeExtraction(into, { rooms: [room('hall', 'Great Hall', ['north'])] }, report, 0);
    mergeExtraction(into, { rooms: [room('hall', 'Great Hall', ['south'])] }, report, 1);

    expect(into.rooms).toHaveLength(1);
    expect(into.rooms[0]!.connections).toEqual(['north', 'south']);
    expect(report.mergedRooms).toEqual(['hall']);
  });

  it('prefers the fuller description — the room entry over a cross-reference', () => {
    const into = freshAssembly();
    const report = freshReport();
    mergeExtraction(into, { rooms: [{ ...room('crypt', 'The Crypt'), description: 'See below.' }] }, report, 0);
    mergeExtraction(
      into,
      { rooms: [{ ...room('crypt', 'The Crypt'), description: 'A long, cold vault with nine niches cut into the wall.' }] },
      report,
      1,
    );
    expect(into.rooms[0]!.description).toContain('nine niches');
  });

  it('keeps both rooms when a later chunk reuses an id for a different place', () => {
    const into = freshAssembly();
    const report = freshReport();
    mergeExtraction(into, { rooms: [room('vault', 'The Sunken Vault')] }, report, 0);
    mergeExtraction(into, { rooms: [room('vault', 'The Bone Vault')] }, report, 3);

    expect(into.rooms.map((r) => r.id)).toEqual(['vault', 'vault-3']);
    expect(report.collidedRooms).toEqual([
      { id: 'vault', keptName: 'The Sunken Vault', renamedTo: 'vault-3', renamedName: 'The Bone Vault' },
    ]);
  });

  it('records a chunk that produced nothing', () => {
    const into = freshAssembly();
    const report = freshReport();
    mergeExtraction(into, { rooms: [] }, report, 7);
    expect(report.emptyChunks).toEqual([7]);
  });

  it('accumulates a chapter mentioned across several chunks', () => {
    const into = freshAssembly();
    const report = freshReport();
    const chapter = (rooms: string[]): IngestedChapter =>
      ({ id: 'ch1', title: 'Chapter One', levelStart: 1, levelEnd: 3, rooms }) as IngestedChapter;
    mergeExtraction(into, { chapters: [chapter(['a', 'b'])] }, report, 0);
    mergeExtraction(into, { chapters: [chapter(['b', 'c'])] }, report, 1);
    expect(into.chapters[0]!.rooms).toEqual(['a', 'b', 'c']);
  });
});

// ---------------------------------------------------------------------------

describe('finalizing', () => {
  it('drops connections to rooms that were never extracted, and reports them', () => {
    const assembly = freshAssembly();
    assembly.rooms = [room('a', 'A', ['b', 'ghost']), room('b', 'B', [])];

    const { module, droppedConnections } = finalizeExtraction(assembly);
    expect((module as { rooms: IngestedRoom[] }).rooms[0]!.connections).toEqual(['b']);
    expect(droppedConnections).toEqual([{ room: 'a', target: 'ghost' }]);
  });

  it('omits chapters entirely when the source had none', () => {
    const assembly = freshAssembly();
    assembly.rooms = [room('a', 'A'), room('b', 'B')];
    expect((finalizeExtraction(assembly).module as { chapters?: unknown }).chapters).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------

describe('the driver', () => {
  /** An extractor that answers per heading and cites the running index. */
  function scripted(byHeading: Record<string, Partial<{ rooms: IngestedRoom[] }>>): {
    extractor: ChunkExtractor;
    indexesSeen: string[][];
  } {
    const indexesSeen: string[][] = [];
    const extractor: ChunkExtractor = ({ chunk, index }) => {
      indexesSeen.push(index.rooms.map((r) => r.id));
      const payload = byHeading[chunk.heading ?? ''] ?? { rooms: [] };
      return Promise.resolve({ ok: true as const, value: payload });
    };
    return { extractor, indexesSeen };
  }

  it('lets a later chunk connect back to a room an earlier chunk named', async () => {
    const text = ['CHAPTER ONE', '', 'The gate.', '', 'CHAPTER TWO', '', 'The deep.'].join('\n');
    const { extractor, indexesSeen } = scripted({
      'CHAPTER ONE': { rooms: [room('gate', 'The Gate', [])] },
      // Chapter two connects to 'gate' — only possible because it was told.
      'CHAPTER TWO': { rooms: [room('deep', 'The Deep', ['gate'])] },
    });

    const { module, report } = await extractLongModule(text, 'M', 'S', extractor);

    expect(report.chunks).toBe(2);
    expect(indexesSeen[0]).toEqual([]); // first chunk knows nothing
    expect(indexesSeen[1]).toEqual(['gate']); // second chunk knows the first
    // The cross-chunk connection survives finalization, so it pointed at a
    // room that really exists.
    const rooms = (module as { rooms: IngestedRoom[] }).rooms;
    expect(rooms.find((r) => r.id === 'deep')!.connections).toEqual(['gate']);
    expect(report.droppedConnections).toEqual([]);
  });

  it('loses one chunk rather than the whole extraction when a call fails', async () => {
    const text = ['CHAPTER ONE', '', 'A.', '', 'CHAPTER TWO', '', 'B.', '', 'CHAPTER THREE', '', 'C.'].join('\n');
    const extractor: ChunkExtractor = ({ chunk }) =>
      Promise.resolve(
        chunk.index === 1
          ? { ok: false as const, detail: 'provider refused' }
          : { ok: true as const, value: { rooms: [room(`r-${chunk.index}`, `Room ${chunk.index}`)] } },
      );

    const { module, report } = await extractLongModule(text, 'M', 'S', extractor);

    expect(report.failedChunks).toEqual([{ index: 1, detail: 'provider refused' }]);
    expect((module as { rooms: IngestedRoom[] }).rooms.map((r) => r.id)).toEqual(['r-0', 'r-2']);
    expect(report.rooms).toBe(2);
  });
});
