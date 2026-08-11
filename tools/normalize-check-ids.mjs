#!/usr/bin/env node
/**
 * Normalize `requiresCheck` ability and skill ids to their canonical schema
 * values.
 *
 * Why this exists: `requiresCheck.ability` and `.skill` were `z.string()`, so
 * a graph could name a skill the engine does not have. `skillModifier` looked
 * the name up in SKILL_ABILITY, got `undefined`, and produced a modifier with
 * `source: undefined` and `value: NaN` — a check that silently resolves to
 * nothing. 389 of 416 checks across the library were in that state, because
 * generated content writes display names ("Animal Handling", "Intelligence")
 * and the schema accepted them.
 *
 * The schema now uses the Ability and Skill enums, which makes the state
 * unreachable going forward. This migrates what already exists, and stays in
 * the tree because ingested modules (Phase 7) arrive with the same problem.
 *
 *   node tools/normalize-check-ids.mjs [--write] [dir...]
 *
 * Without --write it reports and changes nothing.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ABILITY = {
  strength: 'str',
  dexterity: 'dex',
  constitution: 'con',
  intelligence: 'int',
  wisdom: 'wis',
  charisma: 'cha',
};

const SKILLS = new Set([
  'athletics', 'acrobatics', 'sleight-of-hand', 'stealth', 'arcana', 'history',
  'investigation', 'nature', 'religion', 'animal-handling', 'insight',
  'medicine', 'perception', 'survival', 'deception', 'intimidation',
  'performance', 'persuasion',
]);

/** "Animal Handling" -> "animal-handling"; "Sleight of Hand" -> "sleight-of-hand". */
function slug(value) {
  return String(value).trim().toLowerCase().replace(/[\s_]+/g, '-');
}

function normalizeAbility(value) {
  const s = slug(value);
  if (ABILITY[s]) return ABILITY[s];
  if (Object.values(ABILITY).includes(s)) return s;
  return undefined;
}

/**
 * Returns the canonical skill, or null when the value is not a skill at all.
 *
 * Tool and vehicle proficiencies ("thieves' tools", "vehicles-water") and
 * saving throws written into the skill field are dropped rather than guessed
 * at: the engine has no tool proficiencies, so the honest result is a raw
 * ability check, not a silently invented skill bonus.
 */
function normalizeSkill(value) {
  const s = slug(value);
  if (SKILLS.has(s)) return s;
  const collapsed = s.replace(/[^a-z-]/g, '');
  if (SKILLS.has(collapsed)) return collapsed;
  return null;
}

const write = process.argv.includes('--write');
const dirs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const targets = dirs.length ? dirs : ['content/adventures'];

let files = 0;
let changedFiles = 0;
let fixedAbilities = 0;
let fixedSkills = 0;
let droppedSkills = 0;
const unresolved = new Set();

for (const dir of targets) {
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const path = join(dir, name);
    const graph = JSON.parse(readFileSync(path, 'utf8'));
    if (!Array.isArray(graph.beats)) continue;
    files++;
    let changed = false;

    for (const beat of graph.beats) {
      for (const option of beat.options ?? []) {
        const check = option.requiresCheck;
        if (!check) continue;

        const ability = normalizeAbility(check.ability);
        if (ability === undefined) {
          unresolved.add(`ability:${check.ability}`);
        } else if (ability !== check.ability) {
          check.ability = ability;
          fixedAbilities++;
          changed = true;
        }

        if (check.skill !== undefined) {
          const skill = normalizeSkill(check.skill);
          if (skill === null) {
            console.log(`  ${name}: dropping non-skill '${check.skill}' (kept ${check.ability} check)`);
            delete check.skill;
            droppedSkills++;
            changed = true;
          } else if (skill !== check.skill) {
            check.skill = skill;
            fixedSkills++;
            changed = true;
          }
        }
      }
    }

    if (changed) {
      changedFiles++;
      if (write) writeFileSync(path, `${JSON.stringify(graph, null, 2)}\n`);
    }
  }
}

console.log(
  `\n${write ? 'rewrote' : 'would rewrite'} ${changedFiles}/${files} files — ` +
    `${fixedAbilities} abilities, ${fixedSkills} skills, ${droppedSkills} non-skills dropped`,
);
if (unresolved.size) {
  console.error(`\nUNRESOLVED (fix by hand): ${[...unresolved].join(', ')}`);
  process.exit(1);
}
if (!write) console.log('dry run — pass --write to apply');
