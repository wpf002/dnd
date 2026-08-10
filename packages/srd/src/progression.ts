import type { DieSize } from '@lantern/schema';

/**
 * Class progression, levels 1–20 — SRD 5.1.
 *
 * The engine had no concept of levelling: four pregens frozen at level 3,
 * because the SRD subset was chosen to make one adventure work. A campaign
 * that runs 1→20 needs the whole table.
 *
 * This is inert data. All derivation — applying a level-up, computing HP,
 * resolving slots — lives in `@lantern/engine`'s `advancement/`, so the rules
 * authority stays in one place (ROADMAP invariant 1).
 */

// ---------------------------------------------------------------------------
// Level-derived values (class-independent)
// ---------------------------------------------------------------------------

/**
 * NOTE: proficiency bonus is deliberately NOT defined here. It is a rule, not
 * data, and `@lantern/engine`'s `checks/proficiencyBonus` already owns it.
 * Duplicating the formula into this table is how the two drift apart.
 */

/** Levels at which every class gains an Ability Score Improvement. */
export const UNIVERSAL_ASI_LEVELS = [4, 8, 12, 16, 19] as const;

// ---------------------------------------------------------------------------
// Spell slot tables
// ---------------------------------------------------------------------------

/**
 * Full-caster slots by class level. Index 0 of each row is unused (cantrips
 * are unlimited); indices 1–9 are slots of that spell level. Cleric and Wizard
 * both use this table.
 */
export const FULL_CASTER_SLOTS: readonly (readonly number[])[] = [
  /* 0  */ [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  /* 1  */ [0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
  /* 2  */ [0, 3, 0, 0, 0, 0, 0, 0, 0, 0],
  /* 3  */ [0, 4, 2, 0, 0, 0, 0, 0, 0, 0],
  /* 4  */ [0, 4, 3, 0, 0, 0, 0, 0, 0, 0],
  /* 5  */ [0, 4, 3, 2, 0, 0, 0, 0, 0, 0],
  /* 6  */ [0, 4, 3, 3, 0, 0, 0, 0, 0, 0],
  /* 7  */ [0, 4, 3, 3, 1, 0, 0, 0, 0, 0],
  /* 8  */ [0, 4, 3, 3, 2, 0, 0, 0, 0, 0],
  /* 9  */ [0, 4, 3, 3, 3, 1, 0, 0, 0, 0],
  /* 10 */ [0, 4, 3, 3, 3, 2, 0, 0, 0, 0],
  /* 11 */ [0, 4, 3, 3, 3, 2, 1, 0, 0, 0],
  /* 12 */ [0, 4, 3, 3, 3, 2, 1, 0, 0, 0],
  /* 13 */ [0, 4, 3, 3, 3, 2, 1, 1, 0, 0],
  /* 14 */ [0, 4, 3, 3, 3, 2, 1, 1, 0, 0],
  /* 15 */ [0, 4, 3, 3, 3, 2, 1, 1, 1, 0],
  /* 16 */ [0, 4, 3, 3, 3, 2, 1, 1, 1, 0],
  /* 17 */ [0, 4, 3, 3, 3, 2, 1, 1, 1, 1],
  /* 18 */ [0, 4, 3, 3, 3, 3, 1, 1, 1, 1],
  /* 19 */ [0, 4, 3, 3, 3, 3, 2, 1, 1, 1],
  /* 20 */ [0, 4, 3, 3, 3, 3, 2, 2, 1, 1],
] as const;

/** No slots at any level. Fighter and Rogue (base, non-subclass) use this. */
const NO_SLOTS: readonly (readonly number[])[] = Array.from({ length: 21 }, () =>
  Array.from({ length: 10 }, () => 0),
);

// ---------------------------------------------------------------------------
// Class progression
// ---------------------------------------------------------------------------

export interface LevelEntry {
  level: number;
  /** Features gained AT this level. Cumulative state is the engine's job. */
  features: readonly string[];
  /** True when this level grants an Ability Score Improvement. */
  asi: boolean;
}

export interface ClassProgression {
  id: string;
  name: string;
  hitDie: DieSize;
  /** Ability used for spell save DC and attack. Absent on non-casters. */
  spellcastingAbility?: 'int' | 'wis' | 'cha';
  slots: readonly (readonly number[])[];
  levels: readonly LevelEntry[];
}

/** Build a 20-row table from a sparse {level: features} map. */
function levels(
  featuresByLevel: Record<number, readonly string[]>,
  asiLevels: readonly number[],
): readonly LevelEntry[] {
  return Array.from({ length: 20 }, (_, i) => {
    const level = i + 1;
    return {
      level,
      features: featuresByLevel[level] ?? [],
      asi: asiLevels.includes(level),
    };
  });
}

export const FIGHTER: ClassProgression = {
  id: 'fighter',
  name: 'Fighter',
  hitDie: 10,
  slots: NO_SLOTS,
  levels: levels(
    {
      1: ['Fighting Style', 'Second Wind'],
      2: ['Action Surge (one use)'],
      3: ['Martial Archetype'],
      5: ['Extra Attack'],
      7: ['Martial Archetype feature'],
      9: ['Indomitable (one use)'],
      10: ['Martial Archetype feature'],
      11: ['Extra Attack (2)'],
      13: ['Indomitable (two uses)'],
      15: ['Martial Archetype feature'],
      17: ['Action Surge (two uses)', 'Indomitable (three uses)'],
      18: ['Martial Archetype feature'],
      20: ['Extra Attack (3)'],
    },
    // Fighter gets bonus ASIs at 6 and 14 on top of the universal levels.
    [...UNIVERSAL_ASI_LEVELS, 6, 14],
  ),
};

export const ROGUE: ClassProgression = {
  id: 'rogue',
  name: 'Rogue',
  hitDie: 8,
  slots: NO_SLOTS,
  levels: levels(
    {
      1: ['Expertise', 'Sneak Attack', "Thieves' Cant"],
      2: ['Cunning Action'],
      3: ['Roguish Archetype'],
      5: ['Uncanny Dodge'],
      6: ['Expertise'],
      7: ['Evasion'],
      9: ['Roguish Archetype feature'],
      11: ['Reliable Talent'],
      13: ['Roguish Archetype feature'],
      14: ['Blindsense'],
      15: ['Slippery Mind'],
      17: ['Roguish Archetype feature'],
      18: ['Elusive'],
      20: ['Stroke of Luck'],
    },
    // Rogue gets a bonus ASI at 10 on top of the universal levels.
    [...UNIVERSAL_ASI_LEVELS, 10],
  ),
};

export const CLERIC: ClassProgression = {
  id: 'cleric',
  name: 'Cleric',
  hitDie: 8,
  spellcastingAbility: 'wis',
  slots: FULL_CASTER_SLOTS,
  levels: levels(
    {
      1: ['Spellcasting', 'Divine Domain'],
      2: ['Channel Divinity (1/rest)', 'Divine Domain feature'],
      5: ['Destroy Undead (CR 1/2)'],
      6: ['Channel Divinity (2/rest)', 'Divine Domain feature'],
      8: ['Destroy Undead (CR 1)', 'Divine Domain feature'],
      10: ['Divine Intervention'],
      11: ['Destroy Undead (CR 2)'],
      14: ['Destroy Undead (CR 3)'],
      17: ['Destroy Undead (CR 4)', 'Divine Domain feature'],
      18: ['Channel Divinity (3/rest)'],
      20: ['Divine Intervention improvement'],
    },
    UNIVERSAL_ASI_LEVELS,
  ),
};

export const WIZARD: ClassProgression = {
  id: 'wizard',
  name: 'Wizard',
  hitDie: 6,
  spellcastingAbility: 'int',
  slots: FULL_CASTER_SLOTS,
  levels: levels(
    {
      1: ['Spellcasting', 'Arcane Recovery'],
      2: ['Arcane Tradition'],
      6: ['Arcane Tradition feature'],
      10: ['Arcane Tradition feature'],
      14: ['Arcane Tradition feature'],
      18: ['Spell Mastery'],
      20: ['Signature Spells'],
    },
    UNIVERSAL_ASI_LEVELS,
  ),
};

export const CLASS_PROGRESSION = {
  fighter: FIGHTER,
  rogue: ROGUE,
  cleric: CLERIC,
  wizard: WIZARD,
} as const satisfies Record<string, ClassProgression>;

export type ProgressionClassId = keyof typeof CLASS_PROGRESSION;

/**
 * Rogue Sneak Attack dice by rogue level: 1d6 at 1st, +1d6 every odd level.
 * Kept here rather than as a feature string because the engine rolls it.
 */
export function sneakAttackDice(level: number): number {
  if (level < 1 || level > 20) throw new RangeError(`level out of range: ${level}`);
  return Math.ceil(level / 2);
}
