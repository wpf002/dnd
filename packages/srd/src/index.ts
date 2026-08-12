/**
 * `@lantern/srd` — SRD content as inert data. Zero logic.
 *
 * Attribution: this package includes material from the System Reference
 * Document 5.1 and the System Reference Document 5.2 by Wizards of the Coast
 * LLC, both licensed under CC-BY-4.0. See ATTRIBUTION.md, and surface it
 * in-app.
 */

export * from './types.js';
export * from './equipment.js';
export * from './spells.js';
export * from './monsters.js';
export * from './srd52/monsters.js';
export * from './srd52/spells.js';
// MONSTERS and SPELLS are the merged tables; the two above are their sources.
export * from './content.js';
export * from './pregens.js';
export * from './progression.js';
