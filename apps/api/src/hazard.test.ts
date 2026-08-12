import { describe, expect, it } from 'vitest';
import { createSession, chooseOption } from './services/game.js';
import { remapModule } from './services/ingestion.js';

/**
 * A trap the module prints has to be able to go off.
 *
 * The mosaic corridor states its own: "any creature standing on any other area
 * must make a DC 12 Dexterity saving throw, taking 5 (1d10) damage on a
 * failure or half as much on a success". The mapper carried that through as
 * text and none of it as mechanics, so the room read correctly and did
 * nothing — which makes a trap into scenery.
 *
 * And a riddle whose answer is on the wall is a puzzle, not a toll. A party
 * that stops to read the verses crosses untouched, because that is what the
 * module says happens.
 */

const CORRIDOR =
  'A dusty stone corridor. Golden script engraved on the wall reads: "Dawn breaks with ' +
  'stirring air". In front of them is a section of floor covered in a mosaic in four panels, ' +
  'each showing the scene at a different time of day. The mosaic is a trap: standing on the ' +
  'wrong portions causes a large blade to slice at the trespasser. The safe areas relate to ' +
  'the element mentioned in the matching verse. Any creature standing on any other area must ' +
  'make a DC 30 Dexterity saving throw, taking 5 (1d10) damage on a failure or half as much ' +
  'on a success.';

/** Two rooms: a corridor with the trap, and somewhere to end up. */
function moduleWithATrap() {
  return {
    title: 'The Trapped Hall',
    summary: 'A corridor with a blade under it.',
    partyLevel: 3,
    rooms: [
      {
        id: 'entry-hall',
        name: 'Entry Hall',
        description: 'Where the party comes in. Nothing here but dust and a way onward.',
        connections: ['mosaic-corridor'],
        npcs: [],
        requires: [],
      },
      {
        id: 'mosaic-corridor',
        name: 'Mosaic Corridor',
        description: CORRIDOR,
        connections: ['far-door'],
        npcs: [],
        requires: [],
      },
      {
        id: 'far-door',
        name: 'The Far Door',
        description: 'The way out, past the mosaic.',
        connections: [],
        npcs: [],
        requires: [],
        isEnding: true,
      },
    ],
  };
}

const built = remapModule(moduleWithATrap());
const graph = built.graph as { beats: Array<{ id: string; hazard?: unknown; options: Array<{ id: string; label: string }> }> };

describe('a trap the module printed', () => {
  it('maps clean', () => {
    expect(built.lintErrors).toEqual([]);
  });

  it('is on the beat, with the module’s own numbers', () => {
    const corridor = graph.beats.find((b) => b.id === 'mosaic-corridor')!;
    expect(corridor.hazard).toMatchObject({ ability: 'dex', dc: 30, damage: '1d10', halfOnSave: true });
  });

  it('keeps the sentence it was read from', () => {
    const corridor = graph.beats.find((b) => b.id === 'mosaic-corridor')!;
    expect((corridor.hazard as { source: string }).source).toMatch(/DC 30 Dexterity saving throw/);
  });

  it('is reported, so a repair pass can see what was made real', () => {
    expect(built.report.statedHazards).toContainEqual({
      room: 'mosaic-corridor',
      dc: 30,
      damage: '1d10',
      puzzle: true,
    });
  });
});

/** Walk from the entry to the near side, then take one of its three options. */
function crossVia(label: RegExp, seed: string) {
  const session = createSession(built.graph, seed);
  const first = session.graph.beats.find((b) => b.id === session.currentBeat)!;
  chooseOption(session, first.options.find((o) => /Mosaic/i.test(o.label))!.id);

  const nearSide = session.graph.beats.find((b) => b.id === session.currentBeat)!;
  const before = session.party.map((p) => p.hp);
  const outcome = chooseOption(session, nearSide.options.find((o) => label.test(o.label))!.id);
  return { outcome, before, session };
}

describe('crossing it', () => {
  it('makes everyone save when the party walks on without reading', () => {
    const { outcome } = crossVia(/take your chances/, 'hazard-blind');
    const saves = outcome.resolutions.filter((r) => r.checkKind === 'saving-throw');
    expect(saves).toHaveLength(4);
  });

  it('costs hit points on a failure — the DC here is unbeatable', () => {
    const { before, session } = crossVia(/take your chances/, 'hazard-blind');
    const after = session.party.map((p) => p.hp);
    expect(after.some((hp, i) => hp < before[i]!)).toBe(true);
  });

  it('rolls nothing at all once the party has read the verses', () => {
    const { outcome } = crossVia(/Read it through/, 'hazard-read');
    expect(outcome.resolutions.filter((r) => r.checkKind === 'saving-throw')).toHaveLength(0);
  });

  it('leaves the party untouched when they have read the verses', () => {
    const { before, session } = crossVia(/Read it through/, 'hazard-read');
    expect(session.party.map((p) => p.hp)).toEqual(before);
  });

  it('offers reading, chancing it, and turning back — and no beat id in a label', () => {
    const session = createSession(built.graph, 'hazard-labels');
    const first = session.graph.beats.find((b) => b.id === session.currentBeat)!;
    chooseOption(session, first.options.find((o) => /Mosaic/i.test(o.label))!.id);
    const nearSide = session.graph.beats.find((b) => b.id === session.currentBeat)!;

    expect(nearSide.options).toHaveLength(3);
    for (const option of nearSide.options) expect(option.label).not.toMatch(/-approach|-ways-/);
  });
});
