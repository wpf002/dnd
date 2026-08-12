import { describe, expect, it } from 'vitest';
import { lintGraph } from './index.js';

/**
 * Phase 1 exit criterion: the linter rejects three deliberately broken graphs
 * for the right reasons — meaning the specific expected finding code appears,
 * anchored to the specific broken element, not merely "something failed".
 */

// ---------------------------------------------------------------------------
// A valid graph to break
// ---------------------------------------------------------------------------

const opt = (id: string, target: string, extra: object = {}) => ({
  id,
  label: `Take the ${id} path`,
  target,
  ...extra,
});

function validGraph() {
  return {
    id: 'test-adventure',
    schemaVersion: 1,
    metadata: {
      title: 'Test Adventure',
      premise: 'A test premise with a central conflict.',
      tone: ['mystery'],
      partyLevel: 3,
      narrationVoice: 'Neutral.',
    },
    entry: 'arrival',
    beats: [
      {
        id: 'arrival',
        kind: 'threshold',
        title: 'Arrival',
        prose: 'You arrive.',
        art: 'art-arrival',
        options: [
          opt('gate', 'courtyard', { effects: [{ flag: 'gate-used', value: true }] }),
          opt('wall', 'courtyard', {
            requiresCheck: { ability: 'str', skill: 'athletics', dc: 12, onFailure: 'moat' },
          }),
          opt('wait', 'moat'),
        ],
      },
      {
        id: 'moat',
        kind: 'hazard',
        title: 'The Moat',
        prose: 'Cold water.',
        art: 'art-moat',
        options: [opt('swim', 'courtyard'), opt('back', 'arrival'), opt('float', 'courtyard', { effects: [{ flag: 'soaked', value: true }] })],
      },
      {
        id: 'courtyard',
        kind: 'conflict',
        title: 'Courtyard',
        prose: 'Guards.',
        art: 'art-courtyard',
        encounter: 'guards',
        options: [],
      },
      {
        id: 'hall',
        kind: 'decision',
        title: 'The Hall',
        prose: 'A choice.',
        art: 'art-hall',
        options: [
          opt('left', 'the-end', { visibleWhen: { op: 'unset', flag: 'gate-used' } }),
          opt('right', 'the-end', { effects: [{ flag: 'took-right', value: true }] }),
          opt('rest', 'retreat', { visibleWhen: { op: 'set', flag: 'soaked' } }),
        ],
      },
      {
        id: 'retreat',
        kind: 'ending',
        title: 'Retreat',
        prose: 'You withdraw.',
        art: 'art-retreat',
        terminal: true,
        entryWhen: { op: 'neq', flag: 'took-right', value: true },
        options: [],
      },
      {
        id: 'the-end',
        kind: 'ending',
        title: 'The End',
        prose: 'It ends.',
        art: 'art-end',
        terminal: true,
        options: [],
      },
    ],
    edges: [],
    encounters: [
      {
        id: 'guards',
        title: 'Courtyard Guards',
        combatants: [{ statblock: 'goblin', id: 'g1', count: 3 }],
        victory: { kind: 'defeat-all' },
        onVictory: 'hall',
        onDefeat: 'moat',
        onFlee: 'arrival',
      },
    ],
  };
}

// ---------------------------------------------------------------------------

describe('a valid graph passes', () => {
  it('lints clean', () => {
    const result = lintGraph(validGraph());
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

describe('broken graph #1 — unreachable content', () => {
  it('is rejected because a beat and the only ending are orphaned', () => {
    const g = validGraph();
    // Sever the hall: the only route in is the encounter's victory transition.
    g.encounters[0]!.onVictory = 'arrival';
    // Note the option/encounter targets are all still *valid* ids — this is
    // purely a connectivity failure, not a dangling reference.

    const result = lintGraph(g);
    expect(result.ok).toBe(false);
    const unreachable = result.errors.filter((e) => e.code === 'beat-unreachable');
    // hall, retreat, and the-end are all cut off
    expect(unreachable.map((e) => e.at).sort()).toEqual(['hall', 'retreat', 'the-end']);
    expect(result.errors.some((e) => e.code === 'ending-unreachable')).toBe(true);
    // The message names the beat and the entry — Flint-usable text.
    expect(unreachable[0]!.message).toContain('unreachable from entry');
  });
});

describe('broken graph #2 — mathematically unwinnable encounter', () => {
  it('is rejected because the pregens cannot win', () => {
    const g = validGraph();
    g.encounters[0]!.combatants = [{ statblock: 'wight', id: 'w', count: 12 }];

    const result = lintGraph(g);
    expect(result.ok).toBe(false);
    const finding = result.errors.find((e) => e.code === 'encounter-unwinnable');
    expect(finding).toBeDefined();
    expect(finding!.at).toBe('guards');
    // Actionable: tells the author what to change.
    expect(finding!.message).toMatch(/Reduce combatant count|lower the CR|victory condition/);
  });

  it('the same horde passes when the victory condition is escape', () => {
    const g = validGraph();
    g.encounters[0]!.combatants = [{ statblock: 'wight', id: 'w', count: 12 }];
    g.encounters[0]!.victory = { kind: 'escape' };
    const result = lintGraph(g);
    expect(result.errors.filter((e) => e.code === 'encounter-unwinnable')).toEqual([]);
  });
});

describe('broken graph #3 — orphaned flag', () => {
  it('is rejected because a guard reads a flag nothing sets', () => {
    const g = validGraph();
    // retreat's entry guard reads 'took-right'; remove the only writer.
    g.beats[3]!.options[1] = opt('right', 'the-end');

    const result = lintGraph(g);
    expect(result.ok).toBe(false);
    const finding = result.errors.find((e) => e.code === 'flag-read-never-set');
    expect(finding).toBeDefined();
    expect(finding!.message).toContain(`'took-right'`);
    expect(finding!.message).toContain('nothing in the graph ever sets it');
  });
});

describe('schema failures produce legible messages, not zod issue dumps', () => {
  it('names the path and the problem', () => {
    const g = validGraph() as Record<string, unknown>;
    delete g.entry;
    const result = lintGraph(g);
    expect(result.ok).toBe(false);
    expect(result.errors[0]!.code).toBe('schema-invalid');
    expect(result.errors[0]!.message).toContain('entry');
  });

  it('rejects a non-terminal beat with two options — exactly three required', () => {
    const g = validGraph();
    g.beats[0]!.options = g.beats[0]!.options.slice(0, 2);
    const result = lintGraph(g);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'schema-invalid' && e.message.includes('options'))).toBe(true);
  });
});

describe('dangling references', () => {
  it('names the option and the missing target', () => {
    const g = validGraph();
    g.beats[0]!.options[0] = opt('gate', 'nonexistent-beat');
    const result = lintGraph(g);
    const finding = result.errors.find((e) => e.code === 'option-dangling');
    expect(finding).toBeDefined();
    expect(finding!.message).toContain('nonexistent-beat');
  });

  it('catches an unknown statblock and suggests near matches', () => {
    const g = validGraph();
    g.encounters[0]!.combatants = [{ statblock: 'goblin-chieftain', id: 't', count: 1 }];
    const result = lintGraph(g);
    const finding = result.errors.find((e) => e.code === 'monster-unknown');
    expect(finding).toBeDefined();
    // Listing all 230 ids helped nobody; near matches do.
    expect(finding!.message).toMatch(/Did you mean/);
    expect(finding!.message).toContain('goblin');
    expect(finding!.message.length).toBeLessThan(400);
  });

  it('says plainly when nothing resembles the name', () => {
    const g = validGraph();
    g.encounters[0]!.combatants = [{ statblock: 'xyzzy', id: 't', count: 1 }];
    const finding = lintGraph(g).errors.find((e) => e.code === 'monster-unknown');
    expect(finding!.message).toMatch(/none resemble that name/);
  });
});

describe('quality warnings', () => {
  it('flags a false choice without failing the graph', () => {
    const g = validGraph();
    g.beats[1]!.options = [opt('a', 'courtyard'), opt('b', 'courtyard'), opt('c', 'courtyard')];
    // The rewrite above removed the only writer of 'soaked'; drop its reader
    // (hall's 'rest' option guard) so this test isolates the false-choice warning.
    g.beats[3]!.options[2] = opt('rest', 'retreat');
    const result = lintGraph(g);
    expect(result.ok).toBe(true); // warning, not error
    expect(result.warnings.some((w) => w.code === 'false-choice' && w.at === 'moat')).toBe(true);
  });

  it('does not flag options that differ by state effects', () => {
    const result = lintGraph(validGraph());
    expect(result.warnings.filter((w) => w.code === 'false-choice')).toEqual([]);
  });
});

describe('an adventure that can be skipped entirely', () => {
  /** Eight beats; the entry opens straight onto an ending. */
  function shallow(extraEnding = false) {
    return {
      id: 'shallow',
      schemaVersion: 1,
      metadata: {
        title: 'Shallow',
        premise: 'A premise with a central conflict.',
        tone: ['mystery'],
        partyLevel: 3,
        narrationVoice: 'Neutral.',
      },
      entry: 'arrival',
      beats: [
        {
          id: 'arrival',
          kind: 'threshold',
          title: 'Arrival',
          prose: 'You arrive.',
          art: 'art-arrival',
          options: [opt('leave', 'the-end'), opt('in', 'hall'), opt('down', 'moat')],
        },
        {
          id: 'moat',
          kind: 'hazard',
          title: 'Moat',
          prose: 'Cold water.',
          art: 'art-moat',
          options: [opt('m1', 'hall'), opt('m2', 'arrival'), opt('m3', 'f0')],
        },
        {
          id: 'hall',
          kind: 'decision',
          title: 'Hall',
          prose: 'A hall.',
          art: 'art-hall',
          options: [opt('h1', 'f1'), opt('h2', 'f2'), opt('h3', 'f3')],
        },
        ...[0, 1, 2, 3].map((i) => ({
          id: `f${i}`,
          kind: 'discovery',
          title: `Filler ${i}`,
          prose: 'More of the place.',
          art: `art-f${i}`,
          options: [
            opt(`a${i}`, 'hall'),
            opt(`b${i}`, 'moat'),
            // The deep ending hangs off the far side of the graph, four beats
            // out, so it is genuinely further than the walk-away one.
            opt(`c${i}`, i === 3 && extraEnding ? 'deep-end' : 'arrival'),
          ],
        })),
        {
          id: 'the-end',
          kind: 'ending',
          title: 'The End',
          prose: 'It ends.',
          art: 'art-end',
          terminal: true,
          options: [],
        },
        ...(extraEnding
          ? [
              {
                id: 'deep-end',
                kind: 'ending',
                title: 'The Deep End',
                prose: 'It really ends.',
                art: 'art-deep-end',
                terminal: true,
                options: [],
              },
            ]
          : []),
      ],
      edges: [],
      encounters: [],
    };
  }

  it('warns when every ending is a step or two from the entry', () => {
    const result = lintGraph(shallow());
    expect(result.ok).toBe(true); // structurally fine, and hollow
    const warning = result.warnings.find((w) => w.code === 'ending-too-close');
    expect(warning?.message).toMatch(/almost all of it can be skipped/);
  });

  it('stays quiet when a further ending also exists', () => {
    // One early "walk away" ending among several is a real authored choice,
    // not a defect — flagging it fired on seven shipped adventures.
    const result = lintGraph(shallow(true));
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => w.code === 'ending-too-close')).toBe(false);
  });
});
