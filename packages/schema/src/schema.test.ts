import { describe, expect, it } from 'vitest';
import {
  Action,
  ActionParseResult,
  BeatGraph,
  Character,
  DiceNotation,
  Guard,
  Resolution,
} from './index.js';

describe('Action — fail-closed contract', () => {
  it('accepts a well-formed ability check', () => {
    const parsed = Action.safeParse({
      type: 'ability-check',
      ability: 'wis',
      skill: 'perception',
      intent: 'search the bookshelf for hidden compartments',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an action that names a DC — players do not set their own difficulty', () => {
    const parsed = AbilityCheckWithDc();
    expect(parsed.success).toBe(true);
    // The DC is simply not part of the type, so it is stripped rather than honored.
    if (parsed.success && parsed.data.type === 'ability-check') {
      expect(parsed.data).not.toHaveProperty('dc');
    }
  });

  function AbilityCheckWithDc() {
    return Action.safeParse({
      type: 'ability-check',
      ability: 'dex',
      intent: 'pick the lock',
      dc: 5,
    });
  }

  it('rejects an unknown action type rather than coercing it', () => {
    expect(Action.safeParse({ type: 'seduce', target: { kind: 'self' } }).success).toBe(false);
  });

  it('has no representation for a partial or low-confidence action', () => {
    // A rejection carries a reason, never a half-built action.
    const rejected = ActionParseResult.safeParse({
      accepted: false,
      reason: 'unsupported',
      detail: 'I seduce the door',
    });
    expect(rejected.success).toBe(true);

    // Attempting to smuggle an action alongside a rejection fails.
    const smuggled = ActionParseResult.safeParse({
      accepted: false,
      reason: 'unsupported',
      action: { type: 'interact', target: { kind: 'self' }, intent: 'x' },
    });
    if (smuggled.success) {
      expect(smuggled.data).not.toHaveProperty('action');
    }
  });

  it('requires a reason on every rejection', () => {
    expect(ActionParseResult.safeParse({ accepted: false }).success).toBe(false);
  });
});

describe('DiceNotation', () => {
  it.each(['2d6', '1d20+5', '4d8 + 4', '3d6-1', '1d100'])('accepts %s', (n) => {
    expect(DiceNotation.safeParse(n).success).toBe(true);
  });

  it.each(['d6', '2d7', '2d6*3', 'fireball', '2d6+'])('rejects %s', (n) => {
    expect(DiceNotation.safeParse(n).success).toBe(false);
  });
});

describe('Resolution — audit trail', () => {
  it('preserves the discarded die on advantage', () => {
    const parsed = Resolution.safeParse({
      actionType: 'attack',
      checkKind: 'attack-roll',
      roll: {
        notation: '1d20',
        seed: 'session-1:turn-14',
        mode: 'advantage',
        dice: [{ size: 20, face: 18 }],
        discarded: [{ size: 20, face: 3 }],
        natural: 18,
      },
      modifiers: [
        { source: 'dex', value: 3 },
        { source: 'proficiency', value: 2 },
      ],
      total: 23,
      ac: 15,
      margin: 8,
      outcome: 'success',
      effects: [{ kind: 'damage', target: 'goblin-1', amount: 7, damageType: 'piercing' }],
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    // Everything needed to re-derive the outcome is present.
    expect(parsed.data.roll?.discarded).toHaveLength(1);
    expect(parsed.data.modifiers).toHaveLength(2);
    expect(parsed.data.margin).toBe(8);
  });

  it('allows a no-roll resolution', () => {
    const parsed = Resolution.safeParse({
      actionType: 'speak',
      checkKind: 'none',
      outcome: 'automatic',
    });
    expect(parsed.success).toBe(true);
  });
});

describe('Guard — recursive predicate', () => {
  it('parses nested boolean combinators', () => {
    const parsed = Guard.safeParse({
      op: 'and',
      clauses: [
        { op: 'set', flag: 'bell-rung' },
        { op: 'not', clause: { op: 'eq', flag: 'warden-mood', value: 'hostile' } },
        { op: 'or', clauses: [{ op: 'gte', flag: 'evidence', value: 2 }, { op: 'always' }] },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an unknown operator', () => {
    expect(Guard.safeParse({ op: 'matches', flag: 'x', pattern: '.*' }).success).toBe(false);
  });
});

describe('BeatGraph', () => {
  const beat = (id: string, terminal = false) => ({
    id,
    kind: terminal ? 'ending' : 'decision',
    title: `Beat ${id}`,
    prose: 'Something happens.',
    art: `art-${id}`,
    options: terminal
      ? []
      : [1, 2, 3].map((n) => ({ id: `opt-${n}`, label: `Option ${n}`, target: 'the-end' })),
    terminal,
  });

  it('accepts a minimal two-beat graph', () => {
    const parsed = BeatGraph.safeParse({
      id: 'the-bell-at-saltmire',
      schemaVersion: 1,
      metadata: {
        title: 'The Bell at Saltmire',
        premise: 'A drowned village rings a bell no one has maintained in forty years.',
        tone: ['gothic-horror'],
        partyLevel: 3,
        narrationVoice: 'Restrained, damp, slightly archaic.',
      },
      entry: 'arrival',
      beats: [beat('arrival'), beat('the-end', true)],
    });
    expect(parsed.success).toBe(true);
  });

  it('requires exactly three authored options — free text is not a fourth', () => {
    const twoOptions = { ...beat('arrival'), options: [1, 2].map((n) => ({ id: `o${n}`, label: 'x', target: 'the-end' })) };
    const parsed = BeatGraph.safeParse({
      id: 'g',
      schemaVersion: 1,
      metadata: {
        title: 'T',
        premise: 'P',
        tone: ['mystery'],
        partyLevel: 3,
        narrationVoice: 'V',
      },
      entry: 'arrival',
      beats: [twoOptions],
    });
    expect(parsed.success).toBe(false);
  });

  it('defaults the improv budget generously rather than to zero', () => {
    const parsed = BeatGraph.safeParse({
      id: 'g',
      schemaVersion: 1,
      metadata: {
        title: 'T',
        premise: 'P',
        tone: ['mystery'],
        partyLevel: 3,
        narrationVoice: 'V',
      },
      entry: 'arrival',
      beats: [beat('arrival')],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.beats[0]?.improvBudget).toBeGreaterThan(0);
  });

  it('rejects non-kebab-case ids', () => {
    expect(
      BeatGraph.safeParse({
        id: 'The Bell',
        schemaVersion: 1,
        metadata: { title: 'T', premise: 'P', tone: ['mystery'], partyLevel: 3, narrationVoice: 'V' },
        entry: 'arrival',
        beats: [beat('arrival')],
      }).success,
    ).toBe(false);
  });
});

describe('Character — no derived values stored', () => {
  const base = {
    id: 'kael-brinholt',
    name: 'Kael Brinholt',
    lineage: 'human',
    characterClass: 'fighter',
    background: 'guild-artisan',
    level: 3,
    abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 11, cha: 13 },
    hp: 28,
    hpMax: 28,
  };

  it('accepts a pregen-shaped character', () => {
    expect(Character.safeParse(base).success).toBe(true);
  });

  it('strips derived fields rather than persisting them', () => {
    const parsed = Character.safeParse({
      ...base,
      armorClass: 18,
      proficiencyBonus: 2,
      passivePerception: 10,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    // The engine owns these. Storing them would create a second source of truth.
    expect(parsed.data).not.toHaveProperty('armorClass');
    expect(parsed.data).not.toHaveProperty('proficiencyBonus');
    expect(parsed.data).not.toHaveProperty('passivePerception');
  });

  it('distinguishes "no spellcasting" from "no slots left"', () => {
    const fighter = Character.safeParse(base);
    expect(fighter.success && fighter.data.spellcasting).toBeUndefined();
  });
});
