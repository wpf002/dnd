import { describe, expect, it } from 'vitest';
import { Character } from '@lantern/schema';
import {
  CREATION_CLASSES,
  CreationError,
  backgrounds,
  createCharacter,
  lineages,
  rollAbilityScores,
  STANDARD_ARRAY,
} from './creation/index.js';
import { abilityModifier, proficiencyBonus } from './checks/index.js';
import { levelUp } from './advancement/index.js';

/**
 * Four pregens frozen at level 3 was the whole roster. With eighty-three
 * adventures and a campaign that runs to 20, playing someone who is not
 * Branka Ironvow is the difference between a demo and a game.
 */

const standard = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };

const base = {
  name: 'Wren Ashdown',
  lineage: 'human',
  characterClass: 'fighter' as const,
  background: 'soldier',
  abilities: standard,
};

describe('what a player can choose from', () => {
  it('offers the SRD species and backgrounds', () => {
    expect(lineages().map((l) => l.id)).toContain('dwarf');
    expect(lineages().map((l) => l.id)).toContain('tiefling');
    expect(backgrounds().map((b) => b.id)).toEqual(['acolyte', 'criminal', 'sage', 'soldier']);
  });

  it('offers every class the engine can actually level', () => {
    expect(CREATION_CLASSES).toEqual(['fighter', 'rogue', 'cleric', 'wizard']);
  });

  it('has a standard array, because a solo player cannot re-roll at a table', () => {
    expect([...STANDARD_ARRAY]).toEqual([15, 14, 13, 12, 10, 8]);
  });
});

describe('rolling', () => {
  it('keeps the best three of four dice and shows all four', () => {
    const rolled = rollAbilityScores('seed');
    expect(rolled).toHaveLength(6);
    for (const { dice, score } of rolled) {
      expect(dice).toHaveLength(4);
      const expected = dice.reduce((a, b) => a + b, 0) - Math.min(...dice);
      expect(score).toBe(expected);
      expect(score).toBeGreaterThanOrEqual(3);
      expect(score).toBeLessThanOrEqual(18);
    }
  });

  it('is reproducible', () => {
    expect(rollAbilityScores('same').map((r) => r.score)).toEqual(
      rollAbilityScores('same').map((r) => r.score),
    );
  });
});

describe('the sheet it produces', () => {
  it('is a legal level-1 character', () => {
    const pc = createCharacter(base);
    expect(Character.safeParse(pc).success).toBe(true);
    expect(pc.level).toBe(1);
    expect(pc.hitDiceRemaining).toBe(1);
  });

  it('takes hit points from the class die and Constitution', () => {
    // Soldier improves str/dex/con, so con 13 becomes 14 with the +1.
    const pc = createCharacter({
      ...base,
      improvements: { plusTwo: 'str', plusOne: 'con' },
    });
    expect(pc.abilities.con).toBe(14);
    expect(pc.hpMax).toBe(10 + abilityModifier(14));
  });

  it('takes speed from the species', () => {
    const pc = createCharacter(base);
    expect(pc.speed).toBe(lineages().find((l) => l.id === 'human')!.speed);
  });

  it('gives a caster the right slots and a real spell list', () => {
    const pc = createCharacter({ ...base, characterClass: 'wizard', background: 'sage' });
    expect(pc.spellcasting?.slotsMax[1]).toBe(2);
    expect(pc.spellcasting?.prepared).toContain('fire-bolt');
    expect(pc.spellcasting?.ability).toBe('int');
  });

  it('gives a non-caster no spellcasting at all', () => {
    expect(createCharacter(base).spellcasting).toBeUndefined();
  });

  it('carries the background and class proficiencies', () => {
    const pc = createCharacter({ ...base, skills: ['perception', 'survival'] });
    expect(pc.skillProficiencies).toEqual(expect.arrayContaining(['perception', 'survival']));
    expect(pc.saveProficiencies).toEqual(['str', 'con']);
  });

  it('is equipped well enough to fight', () => {
    const pc = createCharacter(base);
    expect(pc.inventory.some((i) => i.equipped)).toBe(true);
  });
});

describe('what it refuses', () => {
  it('refuses a class it cannot level', () => {
    expect(() => createCharacter({ ...base, characterClass: 'bard' as never })).toThrow(CreationError);
  });

  it('refuses a species or background that does not exist', () => {
    expect(() => createCharacter({ ...base, lineage: 'ent' })).toThrow(/no species/);
    expect(() => createCharacter({ ...base, background: 'astronaut' })).toThrow(/no background/);
  });

  it('refuses to improve an ability the background does not', () => {
    // Soldier improves str, dex, con — not charisma.
    expect(() =>
      createCharacter({ ...base, improvements: { plusTwo: 'cha', plusOne: 'str' } }),
    ).toThrow(/not cha/);
  });

  it('refuses to put both improvements on one ability', () => {
    expect(() =>
      createCharacter({ ...base, improvements: { plusTwo: 'str', plusOne: 'str' } }),
    ).toThrow(/different abilities/);
  });

  it('refuses a skill the class cannot take, and says what it can', () => {
    expect(() => createCharacter({ ...base, skills: ['arcana'] })).toThrow(/cannot choose arcana/);
  });

  it('refuses more skills than the class gets', () => {
    expect(() =>
      createCharacter({ ...base, skills: ['athletics', 'perception', 'survival'] }),
    ).toThrow(/chooses 2 skills/);
  });
});

describe('a created character is a real character', () => {
  it('levels to 20 like a pregen does', () => {
    const pc = createCharacter({ ...base, characterClass: 'cleric', background: 'acolyte' });
    const grown = levelUp(pc, 20).character;
    expect(grown.level).toBe(20);
    expect(grown.hpMax).toBeGreaterThan(pc.hpMax);
    expect(grown.spellcasting?.slotsMax[9]).toBe(1);
    expect(proficiencyBonus(grown.level)).toBe(6);
  });
});
