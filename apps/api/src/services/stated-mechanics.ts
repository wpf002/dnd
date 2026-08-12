import type { Ability, Skill } from '@lantern/schema';

/**
 * Mechanics a module prints in its own prose.
 *
 * A published adventure states its rules in the room description — "a
 * character who searches the room and makes a DC 13 Wisdom (Perception) check
 * notices one book", "any creature standing on any other area must make a DC
 * 12 Dexterity saving throw, taking 5 (1d10) damage on a failure or half as
 * much on a success". The mapper carried all of that through as *text* and
 * none of it as *mechanics*: the room read correctly and did nothing. A trap
 * that cannot go off is scenery, and a search that rolls a DC the module never
 * printed is the app overruling the book it is supposed to be running.
 *
 * Read deterministically, with no model involved, because these are quotations
 * rather than judgements. Anything not matched confidently is left alone —
 * the mapper's contract is that it does not invent, and a half-read trap is an
 * invention.
 */

const ABILITIES: Record<string, Ability> = {
  strength: 'str',
  dexterity: 'dex',
  constitution: 'con',
  intelligence: 'int',
  wisdom: 'wis',
  charisma: 'cha',
};

const SKILLS: Record<string, Skill> = {
  acrobatics: 'acrobatics',
  'animal handling': 'animal-handling',
  arcana: 'arcana',
  athletics: 'athletics',
  deception: 'deception',
  history: 'history',
  insight: 'insight',
  intimidation: 'intimidation',
  investigation: 'investigation',
  medicine: 'medicine',
  nature: 'nature',
  perception: 'perception',
  performance: 'performance',
  persuasion: 'persuasion',
  religion: 'religion',
  'sleight of hand': 'sleight-of-hand',
  stealth: 'stealth',
  survival: 'survival',
};

/** Sentences, near enough — modules punctuate normally. */
function sentences(prose: string): string[] {
  return prose
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
}

export interface StatedCheck {
  ability: Ability;
  skill?: Skill;
  dc: number;
  /** The sentence it was read from, for the report. */
  source: string;
}

/**
 * A check the module prints for searching this area.
 *
 * Restricted to sentences that are about looking for something. A room can
 * state several DCs — a trap's save, a lock's Thieves' Tools check, a
 * Perception check to notice a book — and using the wrong one is worse than
 * using a sensible default.
 */
export function statedSearchCheck(prose: string): StatedCheck | undefined {
  const looking = /search|searches|searching|notice|notices|examin|investigat|inspect|study|studies/i;

  for (const sentence of sentences(prose)) {
    if (!looking.test(sentence)) continue;
    const match =
      /DC\s*(\d{1,2})\s+(strength|dexterity|constitution|intelligence|wisdom|charisma)\s*(?:\(([^)]+)\))?\s*(?:ability\s+)?check/i.exec(
        sentence,
      );
    if (!match) continue;

    const ability = ABILITIES[match[2]!.toLowerCase()];
    if (!ability) continue;
    const skill = match[3] ? SKILLS[match[3].trim().toLowerCase()] : undefined;

    return {
      ability,
      ...(skill ? { skill } : {}),
      dc: Number(match[1]),
      source: sentence.trim(),
    };
  }
  return undefined;
}

export interface StatedHazard {
  ability: Ability;
  dc: number;
  /** Dice, as the module prints them: "1d10", "2d6". */
  damage: string;
  /** Whether a success halves the damage, as most printed traps do. */
  halfOnSave: boolean;
  source: string;
}

/**
 * A trap the module prints for this area.
 *
 * Needs all three of a save, a DC, and damage. A saving throw with no stated
 * damage is usually a condition or an effect the engine cannot apply from
 * prose alone, and guessing at it would be inventing.
 */
export function statedHazard(prose: string): StatedHazard | undefined {
  for (const sentence of sentences(prose)) {
    const save =
      /DC\s*(\d{1,2})\s+(strength|dexterity|constitution|intelligence|wisdom|charisma)\s+saving\s+throw/i.exec(
        sentence,
      );
    if (!save) continue;

    const ability = ABILITIES[save[2]!.toLowerCase()];
    if (!ability) continue;

    // "taking 5 (1d10) damage", "takes 2d6 damage". The dice are what the
    // engine rolls; the average in parentheses is for a DM reading aloud.
    const dice = /(\d+d\d+(?:\s*\+\s*\d+)?)\s*\)?\s*(?:\w+\s+)?damage/i.exec(sentence);
    if (!dice) continue;

    return {
      ability,
      dc: Number(save[1]),
      damage: dice[1]!.replace(/\s+/g, ''),
      halfOnSave: /half\s+as\s+much|half\s+damage/i.test(sentence),
      source: sentence.trim(),
    };
  }
  return undefined;
}

/**
 * Does this area state a puzzle whose answer is in the room?
 *
 * A riddle-trap — verses on the wall, safe panels that match them — is a
 * hazard the party can *reason* past rather than merely survive. Detected so
 * the mapper can offer working it out as a real option, which is what the
 * module intends and what a table would actually do.
 */
export function statesAPuzzle(prose: string): boolean {
  const clue = /riddle|verse|inscription|engraved|script|rhyme|cipher|puzzle/i;
  const answer = /safe|correct|matching|corresponds?|relates? to|in the right|proper order/i;
  return clue.test(prose) && answer.test(prose);
}
