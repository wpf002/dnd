import { LEGACY_MONSTERS } from './monsters.js';
import { LEGACY_SPELLS } from './spells.js';
import { SRD52_MONSTERS } from './srd52/monsters.js';
import { SRD52_SPELLS } from './srd52/spells.js';
import type { MonsterInput, SpellInput } from './types.js';

/**
 * The creature and spell tables the engine resolves against.
 *
 * SRD 5.2 is authoritative. It is the published text, parsed from the PDF, and
 * it covers 222 creatures and 326 spells against the 16 and 32 that were
 * hand-authored here to make one adventure work. An ingested module's giant
 * centipede now finds a giant centipede rather than the nearest wolf.
 *
 * The hand-authored tables survive only where SRD 5.2 has no entry under the
 * same id — 5.2 renamed several creatures (Goblin became Goblin Warrior), and
 * seventy-nine shipped adventures reference the older ids. Dropping them would
 * break content that is already linted and playable, for no gain.
 *
 * Where both define an id, SRD 5.2 wins: published numbers beat numbers chosen
 * to make an encounter work.
 */

function merge<T>(authoritative: Record<string, T>, fallback: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = { ...authoritative };
  for (const [id, value] of Object.entries(fallback)) {
    if (!(id in out)) out[id] = value;
  }
  return out;
}

export const MONSTERS: Record<string, MonsterInput> = merge(
  SRD52_MONSTERS,
  LEGACY_MONSTERS as unknown as Record<string, MonsterInput>,
);

/**
 * Spells invert the precedence, and deliberately.
 *
 * A creature's stat block is a table of numbers that parses cleanly. A spell's
 * mechanics are stated in prose — "Make a ranged spell attack", "each creature
 * makes a Dexterity saving throw" — and deriving `resolution`, `damage`, and
 * `healing` from that prose is a heuristic. The thirty-two hand-authored
 * entries were written against the engine's own resolution model and are what
 * the pregens actually cast, so they win where they exist.
 *
 * The other ~300 arrive best-effort. That is safe rather than sloppy: the
 * engine refuses a spell whose resolution it cannot carry out, so a spell this
 * parser failed to understand cannot be cast, rather than being cast wrongly.
 */
export const SPELLS: Record<string, SpellInput> = merge(
  LEGACY_SPELLS as unknown as Record<string, SpellInput>,
  SRD52_SPELLS,
);

/** Any creature the engine can resolve. Ids are open — SRD 5.2 plus fallbacks. */
export type MonsterId = string;
/** Any spell the engine can resolve. */
export type SpellId = string;
