/**
 * `@lantern/engine` — the deterministic rules engine.
 *
 * Dice, initiative, HP, AC, DCs, saving throws, spell slots, conditions, and
 * death saves. Zero model calls — this package must never import
 * `@lantern/flint` or any provider SDK, and `pnpm guard` refuses the build if
 * it does.
 *
 * Everything is seeded and pure: same inputs, same outputs, every time. That
 * is what makes a 200-turn simulated combat auditable and any session
 * replayable.
 */

export * from './dice/index.js';
export * from './checks/index.js';
export * from './combat/index.js';
export * from './state/index.js';
export * from './guards/index.js';
export * from './advancement/index.js';
export * from './spells/index.js';
