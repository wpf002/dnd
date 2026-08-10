import { describe, expect, it } from 'vitest';
import { lintCampaign } from './index.js';

/**
 * Phase 6: the campaign linter rejects the failures that only appear at
 * campaign scale — the ones a per-adventure lint pass is structurally unable
 * to see.
 */

const codes = (r: { errors: { code: string }[]; warnings: { code: string }[] }) => [
  ...r.errors.map((f) => f.code),
  ...r.warnings.map((f) => f.code),
];

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A minimal adventure that writes `flag` and is otherwise unremarkable. */
function adventure(id: string, flag?: string) {
  return {
    id,
    schemaVersion: 1,
    metadata: {
      title: id,
      premise: 'A premise with a central conflict.',
      tone: ['mystery'],
      partyLevel: 3,
      narrationVoice: 'Neutral.',
    },
    entry: 'start',
    beats: [
      {
        id: 'start',
        kind: 'threshold',
        title: 'Start',
        prose: 'It begins.',
        art: `art-${id}-start`,
        options: [
          { id: 'a', label: 'Go left', target: 'the-end' },
          { id: 'b', label: 'Go right', target: 'the-end' },
          {
            id: 'c',
            label: 'Go down',
            target: 'the-end',
            ...(flag ? { effects: [{ flag, value: true }] } : {}),
          },
        ],
      },
      {
        id: 'the-end',
        kind: 'ending',
        title: 'The End',
        prose: 'It ends.',
        art: `art-${id}-end`,
        terminal: true,
        options: [],
      },
    ],
    edges: [],
    encounters: [],
  };
}

function validCampaign() {
  return {
    id: 'test-campaign',
    schemaVersion: 1,
    metadata: {
      title: 'Test Campaign',
      premise: 'A premise spanning several books.',
      tone: ['mystery'],
      narrationVoice: 'Neutral.',
    },
    books: [
      {
        id: 'book-one',
        title: 'Book One',
        adventure: 'adv-one',
        levelStart: 1,
        levelEnd: 5,
        onComplete: [{ flag: 'saved-the-town', value: true }],
      },
      {
        id: 'book-two',
        title: 'Book Two',
        adventure: 'adv-two',
        levelStart: 5,
        levelEnd: 10,
        entryWhen: { op: 'set', flag: 'saved-the-town' },
      },
    ],
    carryFlags: ['saved-the-town'],
  };
}

const library = new Map<string, unknown>([
  ['adv-one', adventure('adv-one')],
  ['adv-two', adventure('adv-two')],
]);

// ---------------------------------------------------------------------------

describe('lintCampaign', () => {
  it('passes a well-formed campaign', () => {
    const result = lintCampaign(validCampaign(), library);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('reports schema findings only when the campaign does not parse', () => {
    const broken = { ...validCampaign(), books: [] };
    const result = lintCampaign(broken, library);
    expect(result.ok).toBe(false);
    expect(new Set(result.errors.map((f) => f.code))).toEqual(new Set(['schema-invalid']));
  });
});

describe('level bands', () => {
  it('catches a gap between consecutive books', () => {
    const c = validCampaign();
    c.books[1]!.levelStart = 7;
    const result = lintCampaign(c, library);
    expect(codes(result)).toContain('level-band-gap');
    expect(result.errors[0]!.message).toMatch(/over-levelled/);
    // The message must say what to change, not merely that something is wrong.
    expect(result.errors[0]!.message).toMatch(/levelStart to 5/);
  });

  it('catches an under-levelled hand-off', () => {
    const c = validCampaign();
    c.books[1]!.levelStart = 3;
    expect(lintCampaign(c, library).errors[0]!.message).toMatch(/under-levelled/);
  });

  it('catches a book that levels the party down', () => {
    const c = validCampaign();
    c.books[1]!.levelEnd = 4;
    expect(codes(lintCampaign(c, library))).toContain('level-band-inverted');
  });

  it('warns when a multi-book campaign never advances anyone', () => {
    const c = validCampaign();
    c.books[0]!.levelEnd = 1;
    c.books[1]!.levelStart = 1;
    c.books[1]!.levelEnd = 1;
    expect(codes(lintCampaign(c, library))).toContain('campaign-not-campaign-scale');
  });

  it('warns that a single-book campaign is really an adventure', () => {
    const c = validCampaign();
    c.books = [c.books[0]!];
    c.carryFlags = [];
    expect(codes(lintCampaign(c, library))).toContain('campaign-not-campaign-scale');
  });
});

describe('cross-book flag continuity', () => {
  it('rejects a gate on a flag no earlier book sets', () => {
    const c = validCampaign();
    c.books[1]!.entryWhen = { op: 'set', flag: 'found-the-crown' };
    c.carryFlags = [];
    const result = lintCampaign(c, library);
    expect(codes(result)).toContain('book-gate-unreachable');
    expect(result.errors[0]!.message).toContain('found-the-crown');
  });

  it('rejects a gate on a flag only a LATER book sets', () => {
    // Ordering is the whole point: book two cannot be gated on book two's own
    // outcome, even though the flag does exist somewhere in the campaign.
    const c = validCampaign();
    c.books[0]!.onComplete = [];
    c.books[1]!.onComplete = [{ flag: 'saved-the-town', value: true }];
    expect(codes(lintCampaign(c, library))).toContain('book-gate-unreachable');
  });

  it('accepts a gate satisfied by a flag the earlier book ADVENTURE writes', () => {
    const c = validCampaign();
    c.books[0]!.onComplete = [];
    c.books[1]!.entryWhen = { op: 'set', flag: 'opened-the-vault' };
    c.carryFlags = ['opened-the-vault'];
    const withFlag = new Map(library);
    withFlag.set('adv-one', adventure('adv-one', 'opened-the-vault'));

    expect(lintCampaign(c, withFlag).errors).toEqual([]);
    // ...and without the adventures resolved, the same campaign cannot be
    // proven — the finding says so rather than pretending to be sure.
    const unresolved = lintCampaign(c);
    expect(codes(unresolved)).toContain('book-gate-unreachable');
    expect(unresolved.errors.some((f) => /adventures were not resolved/.test(f.message))).toBe(
      true,
    );
  });

  it('rejects a carryFlag nothing writes', () => {
    const c = validCampaign();
    c.carryFlags = ['never-written'];
    expect(codes(lintCampaign(c, library))).toContain('carry-flag-never-set');
  });

  it('warns on a carryFlag nothing reads', () => {
    const c = validCampaign();
    c.books[1]!.entryWhen = { op: 'always' };
    expect(codes(lintCampaign(c, library))).toContain('carry-flag-never-read');
  });
});

describe('adventure resolution', () => {
  it('reports a book pointing at an adventure that does not exist', () => {
    const c = validCampaign();
    c.books[1]!.adventure = 'adv-missing';
    const result = lintCampaign(c, library);
    expect(codes(result)).toContain('book-adventure-missing');
    expect(result.errors.find((f) => f.code === 'book-adventure-missing')!.at).toBe('book-two');
  });

  it('rejects duplicate book ids', () => {
    const c = validCampaign();
    c.books[1]!.id = 'book-one';
    expect(codes(lintCampaign(c, library))).toContain('book-duplicate-id');
  });
});

describe('per-band solvability', () => {
  it('re-checks encounters at the level the book is played at', () => {
    // An encounter that a level-15 party handles easily is hopeless at 1.
    const deadly = adventure('adv-deadly') as ReturnType<typeof adventure> & {
      beats: { encounter?: string; kind: string; options: unknown[] }[];
      encounters: unknown[];
    };
    deadly.beats[0]!.kind = 'conflict';
    deadly.beats[0]!.encounter = 'swarm';
    deadly.beats[0]!.options = [];
    deadly.encounters = [
      {
        id: 'swarm',
        title: 'Overwhelming Swarm',
        combatants: [{ statblock: 'ogre', id: 'o1', count: 20 }],
        victory: { kind: 'defeat-all' },
        onVictory: 'the-end',
        onDefeat: 'the-end',
        onFlee: 'the-end',
      },
    ];

    const lowBand = validCampaign();
    lowBand.books[1]!.adventure = 'adv-deadly';
    const lib = new Map(library);
    lib.set('adv-deadly', deadly);

    const atLevel5 = lintCampaign(lowBand, lib);
    expect(codes(atLevel5)).toContain('encounter-unwinnable');
    expect(atLevel5.errors.find((f) => f.code === 'encounter-unwinnable')!.message).toMatch(
      /book 'book-two' \(levels 5–10\)/,
    );

    // The same content, entered at 17, is no longer hopeless.
    const highBand = validCampaign();
    highBand.books[0]!.levelEnd = 17;
    highBand.books[1]!.levelStart = 17;
    highBand.books[1]!.levelEnd = 20;
    highBand.books[1]!.adventure = 'adv-deadly';
    expect(codes(lintCampaign(highBand, lib))).not.toContain('encounter-unwinnable');
  });
});
