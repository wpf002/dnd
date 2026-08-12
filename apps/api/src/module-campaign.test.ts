import { describe, expect, it } from 'vitest';
import { lintCampaign, lintGraph } from '@lantern/linter';
import { MONSTERS } from '@lantern/srd';
import { mapModuleToCampaign, mapModuleToGraph } from './services/module-mapper.js';
import { remapModule } from './services/ingestion.js';

/**
 * Phase 7 item 2: a published campaign's chapters become a CampaignGraph's
 * books, with the module's own level bands.
 *
 * This is the piece that depended on Phase 6. Without a campaign container
 * every ingested module was compressed into one 16-beat graph, which is why
 * the Phase 5 spike produced a railroad before the topology bug was even
 * reached: a multi-chapter campaign does not fit in one graph, so most of it
 * was never going to survive.
 */

const room = (
  id: string,
  name: string,
  connections: string[],
  extra: Record<string, unknown> = {},
) => ({ id, name, description: `${name} description.`, connections, ...extra });

/** Three chapters, level bands chaining 1 → 8. */
function chapteredModule() {
  return {
    title: 'The Sunless Compact',
    summary: 'A three-part descent under the salt flats.',
    rooms: [
      room('camp', 'Surface Camp', ['shaft']),
      room('shaft', 'The Shaft', ['gallery', 'camp']),
      room('gallery', 'First Gallery', ['ch1-end', 'shaft'], {
        encounter: { creatures: [{ name: 'kobold', count: 4 }] },
      }),
      room('ch1-end', 'The Sealed Door', [], { isEnding: true }),

      room('under-door', 'Beyond the Door', ['cistern']),
      room('cistern', 'The Cistern', ['ch2-end', 'under-door']),
      room('ch2-end', 'The Drowned Stair', [], { isEnding: true }),

      room('deep-hall', 'The Deep Hall', ['throne']),
      room('throne', 'The Salt Throne', ['ch3-end'], {
        encounter: { creatures: [{ name: 'wight', count: 1 }] },
      }),
      room('ch3-end', 'The Compact Broken', [], { isEnding: true }),
    ],
    chapters: [
      { id: 'ch1', title: 'Chapter 1 — The Shaft', levelStart: 1, levelEnd: 3, rooms: ['camp', 'shaft', 'gallery', 'ch1-end'] },
      { id: 'ch2', title: 'Chapter 2 — The Cistern', levelStart: 3, levelEnd: 5, rooms: ['under-door', 'cistern', 'ch2-end'] },
      { id: 'ch3', title: 'Chapter 3 — The Salt Throne', levelStart: 5, levelEnd: 8, rooms: ['deep-hall', 'throne', 'ch3-end'] },
    ],
  };
}

describe('chapters become books', () => {
  it('produces one linted adventure per chapter and a campaign that links them', () => {
    const { campaign, adventures, report } = mapModuleToCampaign(chapteredModule());

    expect(adventures).toHaveLength(3);
    for (const adventure of adventures) {
      const lint = lintGraph(adventure.graph);
      expect(lint.ok, `${adventure.id}: ${lint.errors.map((e) => e.message).join('; ')}`).toBe(true);
    }

    // The campaign passes the same gate a hand-authored one does, with its
    // books resolved — level bands, book gates, per-band solvability.
    const resolved = new Map(adventures.map((a) => [a.id, a.graph]));
    const lint = lintCampaign(campaign, resolved);
    expect(lint.errors).toEqual([]);
    expect(lint.warnings).toEqual([]);

    expect(report.levelBandBreaks).toEqual([]);
    expect(report.orphanedRooms).toEqual([]);
    expect(report.chaptersWithoutEndings).toEqual([]);
  });

  it("keeps the module's own level bands rather than inventing a progression", () => {
    const { campaign } = mapModuleToCampaign(chapteredModule());
    const books = (campaign as { books: Array<{ levelStart: number; levelEnd: number }> }).books;
    expect(books.map((b) => [b.levelStart, b.levelEnd])).toEqual([
      [1, 3],
      [3, 5],
      [5, 8],
    ]);
  });

  it('gates each book on the one before it', () => {
    const { campaign } = mapModuleToCampaign(chapteredModule());
    const books = (campaign as {
      books: Array<{ id: string; entryWhen?: { op: string; flag: string }; onComplete: Array<{ flag: string }> }>;
    }).books;

    expect(books[0]!.entryWhen).toBeUndefined(); // the first book needs no key
    expect(books[1]!.entryWhen).toEqual({ op: 'set', flag: books[0]!.onComplete[0]!.flag });
    expect(books[2]!.entryWhen).toEqual({ op: 'set', flag: books[1]!.onComplete[0]!.flag });
  });

  it('marks each chapter as ingested, with the source named for audit', () => {
    const { campaign } = mapModuleToCampaign(chapteredModule());
    const metadata = (campaign as { metadata: Record<string, unknown> }).metadata;
    expect(metadata.provenance).toBe('ingested');
    expect(metadata.ingestedFrom).toBe('The Sunless Compact');
  });
});

describe('what the mapper refuses to paper over', () => {
  it('reports a connection that leaves its chapter instead of following it', () => {
    // A book is one graph; a graph cannot point into another one. Where the
    // party goes next is the campaign's business.
    const module = chapteredModule();
    module.rooms[3]!.connections = ['under-door']; // ch1-end reaches into ch2
    module.rooms[3]!.isEnding = true;

    const { report } = mapModuleToCampaign(module);
    expect(report.crossChapterExits).toContainEqual({
      chapter: 'ch1',
      room: 'ch1-end',
      target: 'under-door',
      targetChapter: 'ch2',
    });
  });

  it('reports a level band that does not chain, and lets the linter reject it', () => {
    const module = chapteredModule();
    module.chapters[1]!.levelStart = 4; // ch1 ends at 3

    const { campaign, adventures, report } = mapModuleToCampaign(module);
    expect(report.levelBandBreaks).toContainEqual({
      from: 'ch1',
      to: 'ch2',
      endsAt: 3,
      startsAt: 4,
    });

    // Reported, not silently patched — the linter is still the gate.
    const resolved = new Map(adventures.map((a) => [a.id, a.graph]));
    expect(lintCampaign(campaign, resolved).errors.map((e) => e.code)).toContain('level-band-gap');
  });

  it('hands a middle chapter off to the next instead of demanding an ending', () => {
    // A chapter that continues has no ending of its own — that is what a
    // chapter IS. Requiring a terminal beat per book failed two of the three
    // books on the first real multi-chapter module.
    const module = chapteredModule();
    module.rooms[6]!.isEnding = false; // ch2 loses its only ending

    const { report, adventures } = mapModuleToCampaign(module);
    expect(report.chaptersWithoutEndings).toContain('ch2');

    const ch2 = adventures.find((a) => a.id.endsWith('ch2'))!;
    const lint = lintGraph(ch2.graph);
    expect(lint.ok, lint.errors.map((e) => e.message).join('; ')).toBe(true);

    const terminal = (ch2.graph as { beats: Array<{ id: string; terminal?: boolean }> }).beats.filter(
      (b) => b.terminal,
    );
    expect(terminal.map((b) => b.id)).toEqual(['ch2-ends']);
  });

  it('still fails when the LAST chapter has no ending', () => {
    // Nothing follows it, so there is nothing to hand off to. That is a real
    // defect in the extraction and stays a lint failure.
    const module = chapteredModule();
    module.rooms[9]!.isEnding = false; // ch3 is last

    const { report, adventures } = mapModuleToCampaign(module);
    expect(report.chaptersWithoutEndings).toContain('ch3');
    const ch3 = adventures.find((a) => a.id.endsWith('ch3'))!;
    expect(lintGraph(ch3.graph).ok).toBe(false);
  });

  it('reports rooms that belong to no chapter', () => {
    const module = chapteredModule();
    module.rooms.push(room('forgotten-vault', 'The Forgotten Vault', ['camp']));

    const { report } = mapModuleToCampaign(module);
    expect(report.orphanedRooms).toContain('forgotten-vault');
  });

  it('refuses to map a module with no chapters', () => {
    expect(() => mapModuleToCampaign({ ...chapteredModule(), chapters: undefined })).toThrow(
      /no chapters/,
    );
  });
});

describe('a single-book module still maps as one graph', () => {
  it('ignores the campaign path entirely', () => {
    const module = chapteredModule();
    const { graph } = mapModuleToGraph({
      title: module.title,
      summary: module.summary,
      rooms: module.rooms.slice(0, 4),
    });
    expect(lintGraph(graph).ok).toBe(true);
  });
});

describe('the repair loop', () => {
  it('re-maps a hand-edited IR with no model call, and lints it', () => {
    const broken = chapteredModule();
    broken.chapters[1]!.levelStart = 4; // a band that does not chain

    const first = remapModule(broken);
    expect(first.ok).toBe(false);
    expect(first.lintErrors.some((e) => e.includes('level'))).toBe(true);
    // The IR comes back so there is something to edit.
    expect(first.ir).toBeDefined();

    // A human fixes the IR and resubmits. Free, deterministic, repeatable.
    const repaired = JSON.parse(JSON.stringify(first.ir)) as ReturnType<typeof chapteredModule>;
    repaired.chapters[1]!.levelStart = 3;

    const second = remapModule(repaired);
    expect(second.ok).toBe(true);
    expect(second.lintErrors).toEqual([]);
    expect(second.adventures).toHaveLength(3);
  });

  it('rejects an IR that does not parse, rather than throwing past the caller', () => {
    expect(() => remapModule({ title: 'x' })).toThrow();
  });
});

describe('what a real published module exposed', () => {
  /** A fight room that is also a junction, plus a gated conclusion. */
  function dungeon() {
    return {
      title: 'Cellar Test',
      summary: 'A cellar, a corridor, and a way out.',
      rooms: [
        room('entry', 'The Hatch', ['cellar']),
        room('cellar', 'The Cellar', ['entry', 'corridor', 'exit'], {
          encounter: {
            creatures: [{ name: 'Bramblewisp Swarmling', count: 3, cr: 0.25, type: 'Small monstrosity' }],
          },
        }),
        room('corridor', 'The Corridor', ['cellar', 'vault']),
        room('vault', 'The Vault', ['corridor'], {
          encounter: {
            creatures: [{ name: 'Emberweave Colossus', count: 1, cr: 1, type: 'Large Monstrosity' }],
          },
        }),
        room('exit', 'Back to Daylight', [], { isEnding: true, requires: ['vault'] }),
      ],
    };
  }

  const beatsOf = (graph: unknown) =>
    (graph as { beats: Array<Record<string, unknown>> }).beats;

  it("sends a won fight onward, not back the way the party came", () => {
    const { graph } = mapModuleToGraph(dungeon());
    const encounter = (graph as { encounters: Array<{ id: string; onVictory: string; onDefeat: string }> })
      .encounters.find((e) => e.id === 'enc-cellar')!;
    // 'entry' is the room they arrived from and is first in `connections`.
    // Routing victory there made everything past the first fight unreachable.
    expect(encounter.onVictory).toBe('cellar-after');
    expect(encounter.onDefeat).toBe('entry');
  });

  it('gives every fight an aftermath beat that records the win', () => {
    const { graph } = mapModuleToGraph(dungeon());
    const after = beatsOf(graph).find((b) => b.id === 'cellar-after')!;
    expect(after.onEntry).toEqual([{ flag: 'cleared-cellar', value: true }]);
    // The junction's other exits live here, since an encounter beat has none.
    const targets = (after.options as Array<{ target: string }>).map((o) => o.target);
    expect(targets).toContain('corridor');
    expect(targets).toContain('exit');
  });

  it('routes a cleared room past its own fight with an edge', () => {
    const { graph } = mapModuleToGraph(dungeon());
    const edges = (graph as { edges: Array<{ from: string; to: string; when: unknown }> }).edges;
    expect(edges).toContainEqual(
      expect.objectContaining({
        from: 'cellar',
        to: 'cellar-after',
        when: { op: 'set', flag: 'cleared-cellar' },
      }),
    );
  });

  it('substitutes an unknown creature by type and challenge rating', () => {
    const { graph, report } = mapModuleToGraph(dungeon());
    const encounters = (graph as { encounters: Array<{ id: string; combatants: Array<{ statblock: string }> }> })
      .encounters;
    // Monstrosity has no SRD representative, so both fall back to beast — and
    // to the right challenge rating, rather than to one fixed statblock.
    const cellar = encounters.find((e) => e.id === 'enc-cellar')!.combatants[0]!.statblock;
    const vault = encounters.find((e) => e.id === 'enc-vault')!.combatants[0]!.statblock;
    expect(MONSTERS[cellar]!.cr).toBe(0.25);
    expect(MONSTERS[vault]!.cr).toBe(1);
    expect(MONSTERS[cellar]!.type).toBe('beast');
    expect(report.unmatchedCreatures).toHaveLength(2);
  });

  it('turns a stated prerequisite into a guard on the conclusion', () => {
    const { graph } = mapModuleToGraph(dungeon());
    const ending = beatsOf(graph).find((b) => b.id === 'exit')!;
    expect(ending.entryWhen).toEqual({ op: 'set', flag: 'cleared-vault' });
    expect(lintGraph(graph).ok).toBe(true);
  });
});
