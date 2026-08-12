import { describe, expect, it } from 'vitest';
import {
  statedHazard,
  statedSearchCheck,
  statesAPuzzle,
} from './services/stated-mechanics.js';

/**
 * Read from the two modules actually ingested, verbatim. A parser for printed
 * mechanics is only worth anything against the sentences modules really print.
 */
const MOSAIC =
  "Golden script engraved on the wall shines slightly even in complete darkness; it is " +
  'written in Common and reads: "Dawn breaks with stirring air, / As sun shines down on new ' +
  'day fair". In front of them is a 20 ft. section of floor covered in a mosaic depicting a ' +
  "rural scene in four 5 ft. 'panels', each showing the scene at a different time of day. " +
  'The mosaic is a trap: standing on the wrong portions causes a large blade to slice at the ' +
  'trespasser. The safe areas relate to the element mentioned in the matching verse. Any ' +
  'creature standing on any other area must make a DC 12 Dexterity saving throw, taking 5 ' +
  '(1d10) damage on a failure or half as much on a success.';

const LAB =
  'A burned-out laboratory with a mouldering desk and back-to-back bookcases. Years of waste ' +
  "and the spider's flames have rendered most books unusable, but a character who searches " +
  'the room and makes a DC 13 Wisdom (Perception) check notices one book that seems strange.';

describe('a check the module prints', () => {
  it('reads the DC, ability, and skill the lab states', () => {
    expect(statedSearchCheck(LAB)).toMatchObject({
      ability: 'wis',
      skill: 'perception',
      dc: 13,
    });
  });

  it('quotes the sentence it read it from', () => {
    expect(statedSearchCheck(LAB)?.source).toMatch(/DC 13 Wisdom \(Perception\) check/);
  });

  it('ignores a DC in a sentence that is not about looking', () => {
    expect(statedSearchCheck(MOSAIC)).toBeUndefined();
  });

  it('takes a check with no skill named', () => {
    expect(
      statedSearchCheck('A character who examines the seal must make a DC 15 Intelligence check.'),
    ).toMatchObject({ ability: 'int', dc: 15 });
  });

  it('finds nothing rather than guessing', () => {
    expect(statedSearchCheck('The room is empty and smells of tar.')).toBeUndefined();
  });
});

describe('a trap the module prints', () => {
  it('reads the mosaic corridor exactly as written', () => {
    expect(statedHazard(MOSAIC)).toMatchObject({
      ability: 'dex',
      dc: 12,
      damage: '1d10',
      halfOnSave: true,
    });
  });

  it('takes damage written without an average', () => {
    expect(
      statedHazard('Each creature must make a DC 14 Constitution saving throw, taking 2d6 poison damage.'),
    ).toMatchObject({ ability: 'con', dc: 14, damage: '2d6', halfOnSave: false });
  });

  it('refuses a save with no damage stated, rather than inventing some', () => {
    expect(
      statedHazard('A creature must make a DC 13 Wisdom saving throw or be frightened.'),
    ).toBeUndefined();
  });

  it('does not read a skill check as a trap', () => {
    expect(statedHazard(LAB)).toBeUndefined();
  });
});

describe('a puzzle whose answer is in the room', () => {
  it('recognises the riddle and its matching panels', () => {
    expect(statesAPuzzle(MOSAIC)).toBe(true);
  });

  it('does not call an ordinary trap a puzzle', () => {
    expect(
      statesAPuzzle('A pressure plate. Any creature stepping on it must make a DC 12 Dexterity saving throw.'),
    ).toBe(false);
  });

  it('does not call ordinary decoration a puzzle', () => {
    expect(statesAPuzzle('An inscription over the door names the family that built the hall.')).toBe(
      false,
    );
  });
});
