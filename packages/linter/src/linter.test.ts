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
        options: [opt('fight', 'hall'), opt('sneak', 'hall', { visibleWhen: { op: 'unset', flag: 'gate-used' } }), opt('talk', 'hall', { visibleWhen: { op: 'set', flag: 'soaked' } })],
      },
      {
        id: 'hall',
        kind: 'decision',
        title: 'The Hall',
        prose: 'A choice.',
        art: 'art-hall',
        options: [opt('left', 'the-end'), opt('right', 'the-end', { effects: [{ flag: 'took-right', value: true }] }), opt('rest', 'retreat')],
      },
      {
        id: 'retreat',
        kind: 'ending',
        title: 'Retreat',
        prose: 'You withdraw.',
        art: 'art-retreat',
        terminal: true,
        entryWhen: { op: 'neq', flag: 'took-right', value: true },
        options: [opt('a', 'retreat'), opt('b', 'retreat'), opt('c', 'retreat')],
      },
      {
        id: 'the-end',
        kind: 'ending',
        title: 'The End',
        prose: 'It ends.',
        art: 'art-end',
        terminal: true,
        options: [opt('a', 'the-end'), opt('b', 'the-end'), opt('c', 'the-end')],
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
    // Sever the hall: nothing points to it anymore.
    g.beats[2]!.options = [opt('loop-a', 'moat'), opt('loop-b', 'arrival'), opt('loop-c', 'moat')];
    g.encounters[0]!.onVictory = 'arrival';
    // Note the option/encounter targets are all still *valid* ids — this is
    // purely a connectivity failure, not a dangling reference.

    const result = lintGraph(g);
    expect(result.ok).toBe(false);
    const unreachable = result.errors.filter((e) => e.code === 'beat-unreachable');
    // hall, retreat, and the-end are all cut off
    expect(unreachable.map((e) => e.at).sort()).toEqual(['hall', 'retreat', 'the-end']);
    expect(result.errors.some((e) => e.code === 'ending-unreachable')).toBe(true);
    // The message names the beat and the entry — Davis-usable text.
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

  it('rejects a beat with two options — the schema requires exactly three', () => {
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

  it('catches unknown monster statblocks with the available list', () => {
    const g = validGraph();
    g.encounters[0]!.combatants = [{ statblock: 'tarrasque', id: 't', count: 1 }];
    const result = lintGraph(g);
    const finding = result.errors.find((e) => e.code === 'monster-unknown');
    expect(finding).toBeDefined();
    expect(finding!.message).toContain('goblin'); // suggests what IS available
  });
});

describe('quality warnings', () => {
  it('flags a false choice without failing the graph', () => {
    const g = validGraph();
    g.beats[1]!.options = [opt('a', 'courtyard'), opt('b', 'courtyard'), opt('c', 'courtyard')];
    // The rewrite above removed the only writer of 'soaked'; drop its reader
    // too so this test isolates the false-choice warning.
    g.beats[2]!.options[2] = opt('talk', 'hall');
    const result = lintGraph(g);
    expect(result.ok).toBe(true); // warning, not error
    expect(result.warnings.some((w) => w.code === 'false-choice' && w.at === 'moat')).toBe(true);
  });

  it('does not flag options that differ by state effects', () => {
    const result = lintGraph(validGraph());
    expect(result.warnings.filter((w) => w.code === 'false-choice')).toEqual([]);
  });
});
