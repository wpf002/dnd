import { Character } from '@lantern/schema';

/**
 * The four level-3 pregens: Fighter, Rogue, Cleric, Wizard.
 *
 * These are `Character.parse`d at module load, so a drift between srd content
 * and the schema contract fails at import time, not at play time. They double
 * as the linter's solvability baseline: "no encounter the pregens
 * mathematically cannot win."
 *
 * No derived values appear here — AC, proficiency bonus, save DCs, and passive
 * scores are all engine-computed. What is stored is exactly what a player
 * would have chosen: scores, proficiencies, gear, spells.
 */

export const PREGEN_FIGHTER = Character.parse({
  id: 'pregen-fighter',
  name: 'Branka Ironvow',
  lineage: 'dwarf',
  characterClass: 'fighter',
  subclass: 'champion',
  background: 'soldier',
  level: 3,
  abilities: { str: 16, dex: 12, con: 16, int: 10, wis: 12, cha: 8 },
  skillProficiencies: ['athletics', 'intimidation', 'perception', 'survival'],
  saveProficiencies: ['str', 'con'],
  hp: 31,
  hpMax: 31,
  hitDiceRemaining: 3,
  speed: 25,
  inventory: [
    { item: 'longsword', equipped: true },
    { item: 'handaxe', quantity: 2 },
    { item: 'chain-mail', equipped: true },
    { item: 'shield', equipped: true },
    { item: 'light-crossbow' },
  ],
  personality: {
    traits: ['Blunt to a fault', 'Counts exits on entering a room'],
    ideals: ['A wall holds because every stone holds'],
    bonds: ['Owes a life-debt to the company that dug her out at Redwater'],
    flaws: ['Cannot walk away from a surrendered enemy without checking twice'],
  },
  ties: { faction: 'the-old-company', quest: 'find-who-sold-out-redwater' },
});

export const PREGEN_ROGUE = Character.parse({
  id: 'pregen-rogue',
  name: 'Pip Fenwick',
  lineage: 'halfling',
  characterClass: 'rogue',
  subclass: 'thief',
  background: 'criminal',
  level: 3,
  abilities: { str: 8, dex: 17, con: 12, int: 13, wis: 12, cha: 14 },
  skillProficiencies: ['acrobatics', 'deception', 'perception', 'sleight-of-hand', 'stealth'],
  skillExpertise: ['stealth', 'sleight-of-hand'],
  saveProficiencies: ['dex', 'int'],
  hp: 21,
  hpMax: 21,
  hitDiceRemaining: 3,
  speed: 25,
  inventory: [
    { item: 'rapier', equipped: true },
    { item: 'shortbow' },
    { item: 'dagger', quantity: 2 },
    { item: 'leather', equipped: true },
  ],
  personality: {
    traits: ['Talks fastest when lying', 'Pockets small things without noticing'],
    ideals: ['Locks are opinions'],
    bonds: ['Sends coin home to a sister who thinks the money is honest'],
    flaws: ['Will take a bet, any bet'],
  },
  ties: { nemesis: 'the-fence-who-burned-him', quest: 'one-big-score-then-out' },
});

export const PREGEN_CLERIC = Character.parse({
  id: 'pregen-cleric',
  name: 'Sister Maren Hale',
  lineage: 'human',
  characterClass: 'cleric',
  subclass: 'life-domain',
  background: 'acolyte',
  level: 3,
  abilities: { str: 14, dex: 10, con: 14, int: 10, wis: 16, cha: 12 },
  skillProficiencies: ['insight', 'medicine', 'persuasion', 'religion'],
  saveProficiencies: ['wis', 'cha'],
  hp: 24,
  hpMax: 24,
  hitDiceRemaining: 3,
  speed: 30,
  inventory: [
    { item: 'mace', equipped: true },
    { item: 'chain-shirt', equipped: true },
    { item: 'shield', equipped: true },
  ],
  spellcasting: {
    source: 'divine',
    ability: 'wis',
    known: [
      'sacred-flame',
      'guidance',
      'thaumaturgy',
      'cure-wounds',
      'bless',
      'shield-of-faith',
      'command',
      'guiding-bolt',
      'healing-word',
      'hold-person',
      'spiritual-weapon',
      'lesser-restoration',
    ],
    prepared: [
      'cure-wounds',
      'bless',
      'command',
      'guiding-bolt',
      'healing-word',
      'hold-person',
      'spiritual-weapon',
    ],
    slotsMax: [0, 4, 2, 0, 0, 0, 0, 0, 0, 0],
    slotsRemaining: [0, 4, 2, 0, 0, 0, 0, 0, 0, 0],
  },
  personality: {
    traits: ['Writes the names of the dead in a small book', 'Laughs easily, surprising people'],
    ideals: ['Nobody dies alone if I can reach them'],
    bonds: ['The abbey that raised her stands on land a lord wants'],
    flaws: ['Trusts a confession more than evidence'],
  },
  ties: { deity: 'the-quiet-lamp', faction: 'lamplighter-abbey', quest: 'keep-the-abbey-standing' },
});

export const PREGEN_WIZARD = Character.parse({
  id: 'pregen-wizard',
  name: 'Edrin Vos',
  lineage: 'elf',
  characterClass: 'wizard',
  subclass: 'evocation',
  background: 'sage',
  level: 3,
  abilities: { str: 8, dex: 14, con: 13, int: 16, wis: 12, cha: 10 },
  skillProficiencies: ['arcana', 'history', 'insight', 'investigation'],
  saveProficiencies: ['int', 'wis'],
  hp: 17,
  hpMax: 17,
  hitDiceRemaining: 3,
  speed: 30,
  inventory: [{ item: 'quarterstaff', equipped: true }, { item: 'dagger' }],
  spellcasting: {
    source: 'arcane',
    ability: 'int',
    known: [
      'fire-bolt',
      'ray-of-frost',
      'light',
      'mage-hand',
      'prestidigitation',
      'magic-missile',
      'shield',
      'sleep',
      'burning-hands',
      'detect-magic',
      'feather-fall',
      'misty-step',
      'scorching-ray',
      'mirror-image',
      'hold-portal',
    ],
    prepared: [
      'fire-bolt',
      'ray-of-frost',
      'mage-hand',
      'magic-missile',
      'shield',
      'sleep',
      'burning-hands',
      'misty-step',
      'scorching-ray',
    ],
    slotsMax: [0, 4, 2, 0, 0, 0, 0, 0, 0, 0],
    slotsRemaining: [0, 4, 2, 0, 0, 0, 0, 0, 0, 0],
  },
  personality: {
    traits: ['Corrects people, then apologizes for it', 'Sketches ruins in the margins of everything'],
    ideals: ['A thing understood is a thing survived'],
    bonds: ['His mentor vanished mid-correspondence; the last letter is unfinished'],
    flaws: ['Will open the sealed door. Every time.'],
  },
  ties: { quest: 'finish-the-last-letter' },
});

export const PREGENS = [PREGEN_FIGHTER, PREGEN_ROGUE, PREGEN_CLERIC, PREGEN_WIZARD] as const;
