import { describe, expect, it } from 'vitest';
import { Character } from '@lantern/schema';
import { ARMOR, MONSTERS, PREGENS, SPELLS, WEAPONS } from './index.js';
import { Armor, Monster, Spell, Weapon } from './types.js';

/**
 * Content validation. Every record must conform to its schema — this is the
 * same bar generated content is held to, applied to hand-authored data.
 */

describe('weapons', () => {
  it('every weapon validates', () => {
    for (const [key, w] of Object.entries(WEAPONS)) {
      const parsed = Weapon.safeParse(w);
      expect(parsed.success, `weapon ${key}: ${JSON.stringify(parsed.success ? '' : parsed.error.issues)}`).toBe(true);
      expect(w.id).toBe(key);
    }
  });

  it('versatile damage appears exactly on versatile weapons', () => {
    for (const w of Object.values(WEAPONS)) {
      const isVersatile = (w.properties as readonly string[]).includes('versatile');
      expect(!!(w as { versatileDamage?: string }).versatileDamage).toBe(isVersatile);
    }
  });

  it('ranged and thrown weapons carry a range', () => {
    for (const w of Object.values(WEAPONS)) {
      const props = w.properties as readonly string[];
      if (w.category.includes('ranged') || props.includes('thrown')) {
        expect((w as { range?: unknown }).range, `${w.id} needs a range`).toBeDefined();
      }
    }
  });
});

describe('armor', () => {
  it('every armor validates and keys match ids', () => {
    for (const [key, a] of Object.entries(ARMOR)) {
      expect(Armor.safeParse(a).success).toBe(true);
      expect(a.id).toBe(key);
    }
  });

  it('dex caps follow category rules', () => {
    for (const a of Object.values(ARMOR)) {
      if (a.category === 'light') expect(a.maxDexBonus).toBeNull();
      if (a.category === 'medium') expect(a.maxDexBonus).toBe(2);
      if (a.category === 'heavy') expect(a.maxDexBonus).toBe(0);
    }
  });
});

describe('spells', () => {
  it('every spell validates and keys match ids', () => {
    for (const [key, s] of Object.entries(SPELLS)) {
      const parsed = Spell.safeParse(s);
      expect(parsed.success, `spell ${key}: ${JSON.stringify(parsed.success ? '' : parsed.error.issues)}`).toBe(true);
      expect(s.id).toBe(key);
    }
  });

  it('is a playable subset, not a full list', () => {
    const count = Object.keys(SPELLS).length;
    expect(count).toBeGreaterThanOrEqual(25);
    expect(count).toBeLessThan(50); // the full list is on the cut list
  });

  it('covers the roles one adventure needs', () => {
    const spells = Object.values(SPELLS);
    // attack cantrip, healing, save-or-suck, area damage, ritual utility
    expect(spells.some((s) => s.level === 0 && s.resolution.kind === 'attack')).toBe(true);
    expect(spells.some((s) => s.healing)).toBe(true);
    expect(spells.some((s) => s.appliesCondition === 'paralyzed')).toBe(true);
    expect(spells.some((s) => s.resolution.kind === 'save' && s.resolution.halfOnSave)).toBe(true);
    expect(spells.some((s) => s.ritual)).toBe(true);
  });

  it('every class referenced by a pregen has castable spells', () => {
    const clericSpells = Object.values(SPELLS).filter((s) => (s.classes as readonly string[]).includes('cleric'));
    const wizardSpells = Object.values(SPELLS).filter((s) => (s.classes as readonly string[]).includes('wizard'));
    expect(clericSpells.length).toBeGreaterThanOrEqual(8);
    expect(wizardSpells.length).toBeGreaterThanOrEqual(8);
  });
});

describe('monsters', () => {
  it('every monster validates and keys match ids', () => {
    for (const [key, m] of Object.entries(MONSTERS)) {
      const parsed = Monster.safeParse(m);
      expect(parsed.success, `monster ${key}: ${JSON.stringify(parsed.success ? '' : parsed.error.issues)}`).toBe(true);
      expect(m.id).toBe(key);
    }
  });

  it('spreads CR from fodder to boss for the solvability check', () => {
    const crs = Object.values(MONSTERS).map((m) => m.cr);
    expect(Math.min(...crs)).toBeLessThanOrEqual(0.25);
    expect(Math.max(...crs)).toBeGreaterThanOrEqual(2);
  });

  it('every monster can threaten the party', () => {
    for (const m of Object.values(MONSTERS)) {
      expect(m.attacks.length, `${m.id} has no attacks`).toBeGreaterThan(0);
    }
  });
});

describe('pregens', () => {
  it('all four parse against the Character schema', () => {
    expect(PREGENS).toHaveLength(4);
    for (const p of PREGENS) {
      expect(Character.safeParse(p).success).toBe(true);
      expect(p.level).toBe(3);
    }
  });

  it('covers the four core roles', () => {
    const classes = PREGENS.map((p) => p.characterClass).sort();
    expect(classes).toEqual(['cleric', 'fighter', 'rogue', 'wizard']);
  });

  it('every equipped item exists in the equipment tables', () => {
    const known = new Set([...Object.keys(WEAPONS), ...Object.keys(ARMOR)]);
    for (const p of PREGENS) {
      for (const entry of p.inventory) {
        expect(known.has(entry.item), `${p.id} carries unknown item ${entry.item}`).toBe(true);
      }
    }
  });

  it('every known spell exists in the spell table', () => {
    for (const p of PREGENS) {
      if (!p.spellcasting) continue;
      for (const id of p.spellcasting.known) {
        expect(SPELLS[id as keyof typeof SPELLS], `${p.id} knows unknown spell ${id}`).toBeDefined();
      }
      // Prepared ⊆ known
      for (const id of p.spellcasting.prepared) {
        expect(p.spellcasting.known).toContain(id);
      }
    }
  });

  it('casters have level-3 slot progression (4/2)', () => {
    for (const p of PREGENS) {
      if (!p.spellcasting) continue;
      expect(p.spellcasting.slotsMax[1]).toBe(4);
      expect(p.spellcasting.slotsMax[2]).toBe(2);
    }
  });

  it('stores no derived values', () => {
    for (const p of PREGENS) {
      expect(p).not.toHaveProperty('armorClass');
      expect(p).not.toHaveProperty('proficiencyBonus');
      expect(p).not.toHaveProperty('passivePerception');
      expect(p).not.toHaveProperty('spellSaveDc');
    }
  });
});
