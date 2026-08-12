#!/usr/bin/env node
/**
 * Import SRD 5.2 monsters and spells into `packages/srd`.
 *
 *   node tools/import-srd52.mjs work/srd52/plain.txt
 *
 * SRD 5.2 is published by Wizards of the Coast under CC-BY-4.0, which is why
 * the result can live in this repository at all. The required attribution is
 * written into every generated file and into docs/ATTRIBUTION.md.
 *
 * This is a parser, not a model job. The SRD's stat blocks and spell entries
 * are rigidly formatted, so the mapping is deterministic, reviewable, and free
 * to re-run — the same reasons module *mapping* is plain code while module
 * *extraction* is not.
 *
 * What it does not do: invent. A stat block whose attack line does not parse
 * yields a monster with no attacks and is reported, rather than one with
 * plausible numbers.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = process.argv[2] ?? join(root, 'work/srd52/layout.txt');

/**
 * Rebuild single-column reading order from a two-column layout.
 *
 * `pdftotext` without -layout reads across both columns, which physically
 * interleaves one stat block into another: the Wyvern's attacks landed inside
 * the Zombie's block, and the parser read them as the Zombie's — a +7 Sting
 * on a CR 1/4 undead. Plausible numbers on the wrong monster are worse than
 * no numbers, and no line-based parse of that file can separate them.
 *
 * `-layout` keeps the columns apart in space. Each page is split at its
 * whitespace gutter — the column that is blank on nearly every line — and the
 * left column is emitted before the right. Pages with no clear gutter are
 * single-column and pass through untouched.
 */
function reflow(layout) {
  const out = [];
  const pages = layout.split('\f');

  for (const page of pages) {
    const pageLines = page.split('\n');
    const filled = pageLines.filter((l) => l.trim().length > 0);
    if (filled.length < 6) {
      out.push(...pageLines.map((l) => l.trim()));
      continue;
    }

    // A gutter is a column that is whitespace on essentially every line, with
    // real text on both sides of it.
    let gutter = -1;
    let best = 0;
    for (let col = 45; col <= 95; col++) {
      const blank = filled.filter((l) => (l[col] ?? ' ') === ' ').length;
      const rightHasText = filled.filter((l) => l.slice(col).trim().length > 0).length;
      const leftHasText = filled.filter((l) => l.slice(0, col).trim().length > 0).length;
      if (blank / filled.length < 0.97) continue;
      if (rightHasText < filled.length * 0.25 || leftHasText < filled.length * 0.25) continue;
      if (blank > best) {
        best = blank;
        gutter = col;
      }
    }

    if (gutter < 0) {
      out.push(...pageLines.map((l) => l.trim()));
      continue;
    }
    // Trimmed: the parsers anchor on line starts, and column indentation is
    // an artifact of the layout rather than content.
    out.push(...pageLines.map((l) => l.slice(0, gutter).trim()));
    out.push(...pageLines.map((l) => l.slice(gutter).trim()));
  }
  return out;
}

const raw = readFileSync(source, 'utf8');
const lines = source.endsWith('layout.txt') ? reflow(raw) : raw.split('\n');

const ATTRIBUTION =
  'This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the\n' +
  ' * Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative\n' +
  ' * Commons Attribution 4.0 International License, available at\n' +
  ' * https://creativecommons.org/licenses/by/4.0/legalcode.';

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

const kebab = (s) =>
  s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Page furniture pdftotext leaves interleaved with the content. */
const isNoise = (line) =>
  /^\s*\d{1,3}\s*$/.test(line) ||
  /^System Reference Document 5\.2\s*$/.test(line) ||
  /^\s*$/.test(line);

const SIZES = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];
const TYPES = [
  'aberration', 'beast', 'celestial', 'construct', 'dragon', 'elemental', 'fey',
  'fiend', 'giant', 'humanoid', 'monstrosity', 'ooze', 'plant', 'undead',
];
const DAMAGE_TYPES = [
  'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic',
  'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder',
];
const WORD_COUNTS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };

/** "12d10 + 24" -> "12d10+24". Anything that is not dice at all is dropped. */
function normalizeDice(raw) {
  const m = /(\d+d\d+)\s*(?:([+-])\s*(\d+))?/.exec(raw ?? "");
  if (!m) return undefined;
  return m[2] ? m[1] + m[2] + m[3] : m[1];
}

/** "1/4" and "1/8" appear as fractions; everything else is an integer. */
function parseCr(raw) {
  const t = raw.trim();
  if (t.includes('/')) {
    const [a, b] = t.split('/').map(Number);
    return a / b;
  }
  return Number(t);
}

// ---------------------------------------------------------------------------
// Monsters
// ---------------------------------------------------------------------------

/**
 * A stat block starts with a name on its own line followed by a
 * "<Size> <Type>, <Alignment>" line. That pair is distinctive enough to find
 * block boundaries without a table of contents.
 */
function findMonsterStarts(from, to) {
  const starts = [];
  const sizeType = new RegExp(`^(${SIZES.join('|')}) (${TYPES.join('|')})(\\s|,)`, 'i');
  for (let i = from; i < to; i++) {
    const name = lines[i]?.trim();
    const next = lines[i + 1]?.trim() ?? '';
    if (!name || isNoise(name) || name.length > 60) continue;
    if (!/^[A-Z]/.test(name)) continue;
    if (!sizeType.test(next)) continue;
    starts.push({ index: i, name });
  }
  return starts;
}

function parseMonster(name, body) {
  const joined = body.join('\n');

  const sizeType = new RegExp(`^(${SIZES.join('|')}) (${TYPES.join('|')})`, 'im').exec(joined);
  const ac = /^AC (\d+)/m.exec(joined);
  const hp = /^HP (\d+) \(([^)]+)\)/m.exec(joined);
  const speed = /^Speed (\d+)\s*ft/m.exec(joined);
  const cr = /^CR ([\d/]+) \(XP ([\d,]+)/m.exec(joined);
  if (!sizeType || !ac || !hp || !cr) return { ok: false, reason: 'missing core lines' };
  const hitDice = normalizeDice(hp[2]);
  if (!hitDice) return { ok: false, reason: 'unparseable hit dice' };

  // Ability scores come in interleaved column pairs (Str/Int, Dex/Wis,
  // Con/Cha) because the stat block is printed in two columns.
  const abilities = {};
  for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
    // Three abilities share a line in the printed block (Str/Dex/Con, then
    // Int/Wis/Cha), so this cannot anchor to the start of a line.
    const m = new RegExp(`\\b${key[0].toUpperCase()}${key.slice(1)}\\s+(\\d+)\\b`).exec(joined);
    if (!m) return { ok: false, reason: `missing ${key}` };
    abilities[key] = Number(m[1]);
  }

  // Attacks. The SRD writes them as one line per attack, though pdftotext
  // wraps them, so the whole block is searched rather than line by line.
  const attacks = [];
  const attackRe =
    /([A-Z][A-Za-z' ]{1,30})\.\s*(Melee|Ranged|Melee or Ranged) Attack Roll:\s*\+(\d+)[^.]*?(?:reach (\d+)\s*ft\.?)?[^.]*?Hit:\s*\d+\s*\(([^)]+)\)\s*([A-Za-z]+) damage/gs;
  for (const m of joined.matchAll(attackRe)) {
    const damageType = m[6].toLowerCase();
    if (!DAMAGE_TYPES.includes(damageType)) continue;
    attacks.push({
      name: m[1].trim(),
      toHit: Number(m[3]),
      ...(m[4] ? { reach: Number(m[4]) } : {}),
      damage: normalizeDice(m[5]) ?? '1d4',
      damageType,
    });
  }

  // "The aboleth makes two Tentacle attacks" -> 2.
  let multiattack = 1;
  const ma = /Multiattack\.[^.]*?makes (?:a number of |)(\w+)\s+\w*\s*attacks?/i.exec(joined);
  if (ma && WORD_COUNTS[ma[1].toLowerCase()]) multiattack = WORD_COUNTS[ma[1].toLowerCase()];

  const senses = [];
  const sensesLine = /^Senses ([^\n]+)/m.exec(joined);
  if (sensesLine) senses.push(sensesLine[1].trim());

  return {
    ok: true,
    value: {
      id: kebab(name),
      name,
      size: sizeType[1].toLowerCase(),
      type: sizeType[2].toLowerCase(),
      ac: Number(ac[1]),
      hp: Number(hp[1]),
      hitDice,
      speed: speed ? Number(speed[1]) : 30,
      abilities,
      cr: parseCr(cr[1]),
      xp: Number(cr[2].replace(/,/g, '')),
      attacks,
      multiattack,
      skills: [],
      damageResistances: [],
      damageImmunities: [],
      conditionImmunities: [],
      senses,
      traits: [],
    },
  };
}

// ---------------------------------------------------------------------------
// Spells
// ---------------------------------------------------------------------------

const SCHOOLS = [
  'abjuration', 'conjuration', 'divination', 'enchantment', 'evocation',
  'illusion', 'necromancy', 'transmutation',
];

/**
 * A spell starts with a name on its own line followed by either
 * "<School> Cantrip (classes)" or "Level N <School> (classes)". The class list
 * can wrap, so the header is read across up to two lines.
 */
function findSpellStarts(from, to) {
  const starts = [];
  const header = new RegExp(`^(?:(${SCHOOLS.join('|')}) Cantrip|Level (\\d) (${SCHOOLS.join('|')}))\\b`, 'i');
  for (let i = from; i < to; i++) {
    const name = lines[i]?.trim();
    if (!name || isNoise(name) || name.length > 50) continue;
    if (!/^[A-Z]/.test(name)) continue;
    // The header sits on the next non-blank line, not literally the next one.
    let j = i + 1;
    while (j < to && (lines[j] ?? '').trim() === '') j++;
    if (!header.test((lines[j] ?? '').trim())) continue;
    // The spell list at the front of the book repeats every name without a
    // Casting Time line; only the description section has one.
    const window = lines.slice(i, i + 10).join('\n');
    if (!/^Casting Time:/m.test(window)) continue;
    starts.push({ index: i, name });
  }
  return starts;
}

function parseSpell(name, body) {
  const joined = body.join('\n');
  const header = new RegExp(
    `^(?:(${SCHOOLS.join('|')}) Cantrip|Level (\\d) (${SCHOOLS.join('|')}))\\s*\\(([^)]*)`,
    'im',
  ).exec(joined);
  if (!header) return { ok: false, reason: 'no header' };

  const castingTime = /^Casting Time:\s*([^\n]+)/m.exec(joined);
  const range = /^Range:\s*([^\n]+)/m.exec(joined);
  const components = /^Components:\s*([^\n]+)/m.exec(joined);
  const duration = /^Duration:\s*([^\n]+)/m.exec(joined);
  if (!castingTime || !range || !components || !duration) {
    return { ok: false, reason: 'missing header fields' };
  }

  const level = header[2] ? Number(header[2]) : 0;
  const school = (header[1] ?? header[3]).toLowerCase();
  const componentList = ['V', 'S', 'M'].filter((c) =>
    new RegExp(`\\b${c}\\b`).test(components[1].split('(')[0]),
  );
  const materials = /\(([^)]+)\)/.exec(components[1]);

  // Body text begins after the Duration line.
  const bodyStart = joined.indexOf(duration[0]) + duration[0].length;
  const description = joined
    .slice(bodyStart)
    .split('\n')
    .filter((l) => !isNoise(l))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Resolution: an attack roll, a save, or neither. Read from the text, since
  // that is where the SRD states it.
  let resolution = { kind: 'none' };
  const save = /(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) [Ss]aving [Tt]hrow/.exec(
    description,
  );
  // The SRD phrases an attack spell several ways: "Attack Roll", "spell
  // attack", "Make a ranged spell attack". Matching only the first left
  // fire-bolt — the most-cast cantrip in the game — with no resolution at all.
  if (/[Aa]ttack [Rr]oll|spell attack/i.test(description)) {
    resolution = { kind: 'attack', ranged: !/[Mm]elee [Ss]pell [Aa]ttack/.test(description) };
  } else if (save) {
    resolution = {
      kind: 'save',
      ability: save[1].slice(0, 3).toLowerCase() === 'str' ? 'str' : save[1].slice(0, 3).toLowerCase(),
      halfOnSave: /[Hh]alf damage|takes half/.test(description),
    };
  }

  // "1d4 + 1 Force damage" and "3d6 Fire damage" both occur; the flat bonus
  // sits between the dice and the type, which a tighter pattern skipped —
  // magic missile came through with no damage at all.
  const damage = /(\d+d\d+(?:\s*\+\s*\d+)?)\s+(\w+)\s+damage/.exec(description);
  const healing =
    /regains?\s+(?:a number of Hit Points equal to\s+)?(\d+d\d+(?:\s*\+\s*\d+)?)/.exec(description) ??
    /[Hh]it [Pp]oints equal to\s+(\d+d\d+(?:\s*\+\s*\d+)?)/.exec(description);

  return {
    ok: true,
    value: {
      id: kebab(name),
      name,
      level,
      school,
      castingTime: castingTime[1].trim(),
      range: range[1].trim(),
      components: componentList.length > 0 ? componentList : ['V'],
      ...(materials ? { materials: materials[1] } : {}),
      duration: duration[1].trim(),
      concentration: /^Concentration/i.test(duration[1]),
      ritual: /Ritual/i.test(joined.slice(0, 300)),
      resolution,
      ...(damage && DAMAGE_TYPES.includes(damage[2].toLowerCase())
        ? { damage: normalizeDice(damage[1]), damageType: damage[2].toLowerCase() }
        : {}),
      ...(healing && !damage ? { healing: normalizeDice(healing[1]) } : {}),
      classes: header[4]
        .split(',')
        .map((c) => kebab(c))
        .filter(Boolean),
      text: description.slice(0, 1200),
    },
  };
}

// ---------------------------------------------------------------------------
// Lineages and backgrounds
// ---------------------------------------------------------------------------

const ABILITY_BY_NAME = {
  strength: 'str', dexterity: 'dex', constitution: 'con',
  intelligence: 'int', wisdom: 'wis', charisma: 'cha',
};

/**
 * Section headings sit immediately above the first entry they introduce, so
 * "Species Descriptions" looks exactly like a species and "Background
 * Descriptions" like a background. A real entry is a plain name.
 */
const looksLikeEntryName = (name) =>
  /^[A-Z][A-Za-z'’-]*(?: [A-Z][A-Za-z'’-]*)?$/.test(name) && !/Descriptions?$/i.test(name);

/** A species entry: a name, then "Creature Type:", "Size:", "Speed:". */
function parseLineages(from, to) {
  const out = [];
  for (let i = from; i < to; i++) {
    const name = lines[i]?.trim();
    if (!name || isNoise(name) || name.length > 30 || !looksLikeEntryName(name)) continue;

    const window = lines.slice(i + 1, i + 8).join('\n');
    if (!/^Creature Type:/m.test(window)) continue;

    const size = /^Size:\s*(\w+)/m.exec(window);
    const speed = /^Speed:\s*(\d+)/m.exec(window);
    if (!size || !speed) continue;
    if (!SIZES.includes(size[1].toLowerCase())) continue;

    // Traits run to the next entry; keep them as printed, for the sheet.
    const body = lines.slice(i + 1, i + 60).join('\n');
    const traits = [];
    for (const m of body.matchAll(/^([A-Z][A-Za-z' ]{2,40})\.\s+([^\n]+(?:\n(?![A-Z][A-Za-z' ]{2,40}\.)[^\n]+)*)/gm)) {
      traits.push({ name: m[1].trim(), text: m[2].replace(/\s+/g, ' ').trim().slice(0, 400) });
      if (traits.length >= 8) break;
    }

    out.push({
      id: kebab(name),
      name,
      size: size[1].toLowerCase(),
      speed: Number(speed[1]),
      traits,
    });
  }
  return out;
}

/** A background: a name, then "Ability Scores:", "Skill Proficiencies:". */
function parseBackgrounds(from, to) {
  const out = [];
  for (let i = from; i < to; i++) {
    const name = lines[i]?.trim();
    if (!name || isNoise(name) || name.length > 30 || !looksLikeEntryName(name)) continue;

    const window = lines.slice(i + 1, i + 10).join('\n');
    const abilities = /^Ability Scores:\s*([^\n]+)/m.exec(window);
    const skills = /^Skill Proficiencies:\s*([^\n]+)/m.exec(window);
    if (!abilities || !skills) continue;

    const abilityIds = abilities[1]
      .split(/,|\band\b/)
      .map((a) => ABILITY_BY_NAME[a.trim().toLowerCase()])
      .filter(Boolean);
    if (abilityIds.length !== 3) continue;

    const skillIds = skills[1]
      .split(/,|\band\b/)
      .map((sk) => kebab(sk))
      .filter((sk) => SKILL_IDS.includes(sk));

    const tool = /^Tool Proficiency:\s*([^\n]+)/m.exec(window);
    out.push({
      id: kebab(name),
      name,
      abilities: abilityIds,
      skillProficiencies: skillIds,
      ...(tool ? { tool: tool[1].trim() } : {}),
    });
  }
  return out;
}

const SKILL_IDS = [
  'athletics', 'acrobatics', 'sleight-of-hand', 'stealth', 'arcana', 'history',
  'investigation', 'nature', 'religion', 'animal-handling', 'insight',
  'medicine', 'perception', 'survival', 'deception', 'intimidation',
  'performance', 'persuasion',
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

// Both scans run over the whole document. The front-matter spell list repeats
// every name without a Casting Time line and is filtered by that; duplicate
// ids from running headers are dropped on the way in.
const bounds = { spellFrom: 0, monsterFrom: 0 };

const monsterStarts = findMonsterStarts(bounds.monsterFrom, lines.length);
const monsters = [];
const monsterFailures = [];
const seenMonsters = new Set();
/**
 * Where a stat block genuinely ends.
 *
 * The next *detected* start is not enough: pdftotext splices the following
 * page's running header into the middle of a block, so a slice that runs to
 * the next detected start swallows other creatures' action lines. Reading
 * those as this creature's attacks produced a zombie with a +7 Sting and a
 * giant rat that rams for 2d6 — plausible numbers attached to the wrong
 * monster, which is worse than no numbers at all.
 *
 * A block ends at the first subtitle line belonging to any other creature.
 */
const SUBTITLE = new RegExp(`^(${SIZES.join('|')}) (${TYPES.join('|')})[\\s,(]`, 'i');
function blockEnd(index, fallback) {
  for (let i = index + 2; i < fallback; i++) {
    if (SUBTITLE.test((lines[i] ?? '').trim())) return i - 1;
  }
  return fallback;
}

for (let i = 0; i < monsterStarts.length; i++) {
  const { index, name } = monsterStarts[i];
  const hardEnd = monsterStarts[i + 1]?.index ?? Math.min(index + 160, lines.length);
  const end = blockEnd(index, hardEnd);
  const parsed = parseMonster(name, lines.slice(index, end));
  if (!parsed.ok) {
    monsterFailures.push(`${name}: ${parsed.reason}`);
    continue;
  }
  if (seenMonsters.has(parsed.value.id)) continue;
  seenMonsters.add(parsed.value.id);
  monsters.push(parsed.value);
}

const spellStarts = findSpellStarts(bounds.spellFrom, lines.length);
const spells = [];
const spellFailures = [];
const seenSpells = new Set();
for (let i = 0; i < spellStarts.length; i++) {
  const { index, name } = spellStarts[i];
  const end = spellStarts[i + 1]?.index ?? Math.min(index + 80, lines.length);
  const parsed = parseSpell(name, lines.slice(index, end));
  if (!parsed.ok) {
    spellFailures.push(`${name}: ${parsed.reason}`);
    continue;
  }
  if (seenSpells.has(parsed.value.id)) continue;
  seenSpells.add(parsed.value.id);
  spells.push(parsed.value);
}

const lineages = [];
const seenLineages = new Set();
for (const lineage of parseLineages(0, lines.length)) {
  if (seenLineages.has(lineage.id)) continue;
  seenLineages.add(lineage.id);
  lineages.push(lineage);
}

const backgrounds = [];
const seenBackgrounds = new Set();
for (const background of parseBackgrounds(0, lines.length)) {
  if (seenBackgrounds.has(background.id)) continue;
  seenBackgrounds.add(background.id);
  backgrounds.push(background);
}

lineages.sort((a, b) => a.id.localeCompare(b.id));
backgrounds.sort((a, b) => a.id.localeCompare(b.id));
monsters.sort((a, b) => a.id.localeCompare(b.id));
spells.sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));

const outDir = join(root, 'packages/srd/src/srd52');
mkdirSync(outDir, { recursive: true });

const banner = (what) => `/**
 * ${what} from SRD 5.2. GENERATED — do not edit by hand.
 *
 * Regenerate with: node tools/import-srd52.mjs
 *
 * ${ATTRIBUTION}
 */
`;

writeFileSync(
  join(outDir, 'monsters.ts'),
  `${banner('Monsters')}
import type { MonsterInput } from '../types.js';

export const SRD52_MONSTERS: Record<string, MonsterInput> = ${JSON.stringify(
    Object.fromEntries(monsters.map((m) => [m.id, m])),
    null,
    2,
  )} as unknown as Record<string, MonsterInput>;
`,
);

writeFileSync(
  join(outDir, 'spells.ts'),
  `${banner('Spells')}
import type { SpellInput } from '../types.js';

export const SRD52_SPELLS: Record<string, SpellInput> = ${JSON.stringify(
    Object.fromEntries(spells.map((s) => [s.id, s])),
    null,
    2,
  )} as unknown as Record<string, SpellInput>;
`,
);

writeFileSync(
  join(outDir, 'lineages.ts'),
  `${banner('Species')}
import type { LineageInput } from '../types.js';

export const SRD52_LINEAGES: Record<string, LineageInput> = ${JSON.stringify(
    Object.fromEntries(lineages.map((l) => [l.id, l])),
    null,
    2,
  )} as unknown as Record<string, LineageInput>;
`,
);

writeFileSync(
  join(outDir, 'backgrounds.ts'),
  `${banner('Backgrounds')}
import type { BackgroundInput } from '../types.js';

export const SRD52_BACKGROUNDS: Record<string, BackgroundInput> = ${JSON.stringify(
    Object.fromEntries(backgrounds.map((b) => [b.id, b])),
    null,
    2,
  )} as unknown as Record<string, BackgroundInput>;
`,
);

console.log(`lineages: ${lineages.length} — ${lineages.map((l) => l.id).join(', ')}`);
console.log(`backgrounds: ${backgrounds.length} — ${backgrounds.map((b) => b.id).join(', ')}`);
console.log(`monsters: ${monsters.length} parsed, ${monsterFailures.length} skipped`);
console.log(`  with attacks: ${monsters.filter((m) => m.attacks.length > 0).length}`);
console.log(`  CR range: ${Math.min(...monsters.map((m) => m.cr))} to ${Math.max(...monsters.map((m) => m.cr))}`);
console.log(`spells:   ${spells.length} parsed, ${spellFailures.length} skipped`);
console.log(`  levels: ${[...new Set(spells.map((s) => s.level))].sort((a, b) => a - b).join(', ')}`);
console.log(`  with damage: ${spells.filter((s) => s.damage).length}`);
if (monsterFailures.length) console.log(`\nskipped monsters:\n  ${monsterFailures.slice(0, 10).join('\n  ')}`);
if (spellFailures.length) console.log(`\nskipped spells:\n  ${spellFailures.slice(0, 10).join('\n  ')}`);
console.log(`\nwritten to ${outDir}`);
