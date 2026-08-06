import type { DiceNotation, DieRoll, DieSize, RollMode, RollRecord, Seed } from '@lantern/schema';

/**
 * Seeded dice. The heart of determinism.
 *
 * Two properties matter and both are tested:
 *  1. Same seed → same faces, always. This is what makes the test suite
 *     deterministic and any session replayable for debugging.
 *  2. Every roll returns a complete `RollRecord` — faces, discards, notation,
 *     seed — because the record *is* the audit trail (invariant 5).
 *
 * Zero model calls, zero I/O, zero ambient state. `Math.random` does not
 * appear in this package.
 */

// ---------------------------------------------------------------------------
// RNG — mulberry32 over a string seed
// ---------------------------------------------------------------------------

/** FNV-1a, folds a string seed into a 32-bit state. */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Deterministic PRNG. Small, fast, and good enough for dice — this is not
 * cryptography, it is auditability.
 */
export function createRng(seed: Seed): () => number {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Roll one die of the given size using the provided rng. */
export function rollDie(rng: () => number, size: DieSize): DieRoll {
  return { size, face: Math.floor(rng() * size) + 1 };
}

// ---------------------------------------------------------------------------
// Notation
// ---------------------------------------------------------------------------

export interface ParsedNotation {
  count: number;
  size: DieSize;
  modifier: number;
}

const NOTATION_RE = /^\s*(\d+)d(4|6|8|10|12|20|100)\s*(?:([+-])\s*(\d+))?\s*$/i;

/**
 * Parse `2d6`, `1d20+5`, `4d8 + 4`, `3d6-1`.
 * Throws on malformed input — the schema validates shape upstream, so a throw
 * here indicates a programming error, not bad user input.
 */
export function parseNotation(notation: DiceNotation): ParsedNotation {
  const m = NOTATION_RE.exec(notation);
  if (!m) throw new Error(`invalid dice notation: ${notation}`);
  const count = Number(m[1]);
  const size = Number(m[2]) as DieSize;
  const modifier = m[3] ? (m[3] === '-' ? -1 : 1) * Number(m[4]) : 0;
  if (count < 1 || count > 100) throw new Error(`dice count out of range: ${notation}`);
  return { count, size, modifier };
}

// ---------------------------------------------------------------------------
// Rolling
// ---------------------------------------------------------------------------

/**
 * Roll dice notation. Returns the full record; `natural` is the kept-face sum
 * *without* the notation's own flat modifier — the modifier is reported to the
 * caller separately so the Resolution can attribute it by source.
 */
export function roll(seed: Seed, notation: DiceNotation): { record: RollRecord; modifier: number } {
  const { count, size, modifier } = parseNotation(notation);
  const rng = createRng(seed);
  const dice: DieRoll[] = [];
  for (let i = 0; i < count; i++) dice.push(rollDie(rng, size));
  return {
    record: {
      notation,
      seed,
      mode: 'normal',
      dice,
      discarded: [],
      natural: dice.reduce((sum, d) => sum + d.face, 0),
    },
    modifier,
  };
}

/**
 * The d20 test roll, with advantage/disadvantage.
 *
 * Both faces are always rolled and both are kept in the record — the discarded
 * die goes in `discarded`, not in the bin. A discarded 19 is part of the story
 * and the tray shows it.
 */
export function rollD20(seed: Seed, mode: RollMode = 'normal'): RollRecord {
  const rng = createRng(seed);
  const first = rollDie(rng, 20);

  if (mode === 'normal') {
    return { notation: '1d20', seed, mode, dice: [first], discarded: [], natural: first.face };
  }

  const second = rollDie(rng, 20);
  const keepHigher = mode === 'advantage';
  const kept =
    (first.face >= second.face) === keepHigher ? first : second;
  const dropped = kept === first ? second : first;

  return {
    notation: '1d20',
    seed,
    mode,
    dice: [kept],
    discarded: [dropped],
    natural: kept.face,
  };
}

/**
 * Damage roll with optional critical hit. A crit doubles the number of dice
 * rolled (not the total) per 5e rules; the flat modifier is not doubled.
 */
export function rollDamage(
  seed: Seed,
  notation: DiceNotation,
  critical = false,
): { record: RollRecord; modifier: number } {
  const { count, size, modifier } = parseNotation(notation);
  const rng = createRng(seed);
  const total = critical ? count * 2 : count;
  const dice: DieRoll[] = [];
  for (let i = 0; i < total; i++) dice.push(rollDie(rng, size));
  return {
    record: {
      notation,
      seed,
      mode: 'normal',
      dice,
      discarded: [],
      natural: dice.reduce((sum, d) => sum + d.face, 0),
    },
    modifier,
  };
}
