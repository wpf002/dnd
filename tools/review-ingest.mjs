#!/usr/bin/env node
/**
 * Build a review page for an ingested module — Phase 7 item 4.
 *
 *   node tools/review-ingest.mjs work/<name>
 *
 * Writes `review.html` into the same directory. Open it in a browser.
 *
 * The point is to put the three views side by side, per area: what the module
 * says, what extraction understood, and what the mapper built. Every finding
 * is attached to the area it concerns rather than listed separately, because
 * "Giant Centipede became a wolf" is only actionable next to the paragraph
 * that describes the centipedes.
 *
 * The page stays on disk. It embeds the user's own module text, so it is not
 * published anywhere, and neither is the working directory it lives in.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node tools/review-ingest.mjs <workdir>');
  process.exit(2);
}

const read = (name) => JSON.parse(readFileSync(join(dir, name), 'utf8'));
const ir = read('ir.json');
const report = read('report.json');
const source = existsSync(join(dir, 'source.txt'))
  ? readFileSync(join(dir, 'source.txt'), 'utf8')
  : '';
const books = readdirSync(join(dir, 'books'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(dir, 'books', f), 'utf8')));

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * The stretch of source text an area came from.
 *
 * Located by the area's own name, since that is what the module prints as a
 * heading. Approximate on purpose — this is a reading aid for a human
 * comparing two things, not a claim about provenance.
 */
function sourceFor(room) {
  if (!source) return '';
  const name = room.name.replace(/^\d+\.\s*/, '').trim();
  let at = source.search(new RegExp(`^.{0,8}${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'im'));

  // Not every area's name is printed as a heading. Read-aloud text is copied
  // verbatim, so it anchors exactly where the name does not.
  if (at < 0 && room.readAloud) {
    const anchor = room.readAloud.slice(0, 40).trim();
    if (anchor) at = source.indexOf(anchor);
  }
  if (at < 0) return '';
  const rest = source.slice(at);
  const nextHeading = rest.slice(1).search(/\n\d+\.\s+\S/);
  return nextHeading > 0 ? rest.slice(0, nextHeading + 1) : rest.slice(0, 2500);
}

const mapping = report.mapping ?? {};
/** Findings that concern a given area, in plain language. */
function findingsFor(id) {
  const out = [];
  for (const c of mapping.unmatchedCreatures ?? []) {
    if (c.room === id) {
      out.push({
        level: 'warn',
        text: `“${c.name}” has no SRD statblock — substituted <code>${c.substituted}</code>`,
      });
    }
  }
  if ((mapping.fannedOut ?? []).some((f) => f.room === id)) {
    const f = mapping.fannedOut.find((x) => x.room === id);
    out.push({ level: 'info', text: `${f.exits} exits — split across ${f.extraBeats} extra beat(s) so none were dropped` });
  }
  if ((mapping.paddedRooms ?? []).includes(id)) {
    out.push({ level: 'info', text: 'fewer than three exits — padded with search / double-back options' });
  }
  if ((mapping.endingsWithExits ?? []).includes(id)) {
    out.push({ level: 'warn', text: 'marked as an ending but also had onward exits — the exits were dropped' });
  }
  if ((mapping.unreachableRooms ?? []).includes(id)) {
    out.push({ level: 'error', text: 'no path from the entrance reaches this area' });
  }
  for (const d of mapping.danglingConnections ?? []) {
    if (d.room === id) out.push({ level: 'error', text: `connects to “${d.target}”, which was never extracted` });
  }
  return out;
}

/** Beats the mapper produced from a given area. */
function beatsFor(id) {
  const out = [];
  for (const book of books) {
    for (const beat of book.beats) {
      if (beat.id === id || beat.id.startsWith(`${id}-`)) out.push({ book: book.id, beat });
    }
  }
  return out;
}

const rows = ir.rooms
  .map((room) => {
    const findings = findingsFor(room.id);
    const beats = beatsFor(room.id);
    const src = sourceFor(room);

    return `
<section class="area" id="${esc(room.id)}">
  <h2>${esc(room.name)} <code>${esc(room.id)}</code></h2>
  ${findings
    .map((f) => `<p class="finding ${f.level}">${f.text}</p>`)
    .join('')}
  <div class="cols">
    <div class="col">
      <h3>The module says</h3>
      ${src ? `<pre>${esc(src)}</pre>` : '<p class="none">no matching passage found</p>'}
    </div>
    <div class="col">
      <h3>Extracted</h3>
      <dl>
        <dt>connections</dt><dd>${room.connections.length ? room.connections.map((c) => `<code>${esc(c)}</code>`).join(' ') : '<span class="none">none</span>'}</dd>
        ${room.requires?.length ? `<dt>requires</dt><dd>${room.requires.map((c) => `<code>${esc(c)}</code>`).join(' ')}</dd>` : ''}
        ${room.isEnding ? '<dt>ending</dt><dd>yes</dd>' : ''}
        ${room.encounter ? `<dt>encounter</dt><dd>${room.encounter.creatures.map((c) => `${esc(c.name)} ×${c.count}${c.cr !== undefined ? ` (CR ${c.cr}${c.type ? `, ${esc(c.type)}` : ''})` : ''}`).join('<br>')}</dd>` : ''}
        ${room.npcs?.length ? `<dt>NPCs</dt><dd>${room.npcs.map((n) => esc(n.name)).join(', ')}</dd>` : ''}
        ${room.readAloud ? `<dt>read-aloud</dt><dd class="quote">${esc(room.readAloud.slice(0, 400))}</dd>` : '<dt>read-aloud</dt><dd class="none">none captured</dd>'}
      </dl>
    </div>
    <div class="col">
      <h3>Built</h3>
      ${beats
        .map(
          ({ beat }) => `
        <div class="beat">
          <strong>${esc(beat.title)}</strong> <code>${esc(beat.id)}</code>
          <span class="kind">${esc(beat.kind)}${beat.terminal ? ' · terminal' : ''}</span>
          ${beat.entryWhen ? `<div class="guard">enterable when <code>${esc(JSON.stringify(beat.entryWhen))}</code></div>` : ''}
          ${beat.encounter ? '<div class="guard">runs a fight on entry</div>' : ''}
          <ul>${(beat.options ?? []).map((o) => `<li>${esc(o.label)} → <code>${esc(o.target)}</code>${o.visibleWhen ? ' <em>(conditional)</em>' : ''}${o.requiresCheck ? ` <em>(${esc(o.requiresCheck.skill ?? o.requiresCheck.ability)} DC ${o.requiresCheck.dc})</em>` : ''}</li>`).join('')}</ul>
        </div>`,
        )
        .join('') || '<p class="none">no beats</p>'}
    </div>
  </div>
</section>`;
  })
  .join('');

const lintErrors = report.lintErrors ?? [];
const lintWarnings = report.lintWarnings ?? [];

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Ingest review — ${esc(ir.title)}</title>
<style>
:root { color-scheme: light dark; --line:#8883; --warn:#b8860b; --err:#b00020; --ok:#2e7d32; }
body { font: 15px/1.55 ui-sans-serif, system-ui, sans-serif; margin: 0 auto; padding: 2rem 1.5rem 6rem; max-width: 1500px; }
h1 { margin: 0 0 .25rem; } .sub { opacity: .7; margin: 0 0 2rem; }
.summary { border: 1px solid var(--line); border-radius: 8px; padding: 1rem; margin-bottom: 2rem; }
.summary ul { margin: .5rem 0 0; padding-left: 1.2rem; }
.area { border-top: 1px solid var(--line); padding: 1.5rem 0; }
h2 { margin: 0 0 .5rem; font-size: 1.15rem; }
h3 { font-size: .75rem; text-transform: uppercase; letter-spacing: .08em; opacity: .6; margin: 0 0 .5rem; }
.cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem; }
pre { white-space: pre-wrap; font: 12.5px/1.5 ui-monospace, monospace; background: #8881; padding: .75rem; border-radius: 6px; max-height: 460px; overflow: auto; margin: 0; }
code { font: 12.5px ui-monospace, monospace; background: #8881; padding: .1rem .3rem; border-radius: 3px; }
dl { margin: 0; } dt { font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; opacity: .55; margin-top: .6rem; }
dd { margin: .15rem 0 0; }
.quote { font-style: italic; opacity: .85; }
.beat { border: 1px solid var(--line); border-radius: 6px; padding: .6rem .7rem; margin-bottom: .5rem; }
.beat ul { margin: .4rem 0 0; padding-left: 1.1rem; font-size: .9em; }
.kind { float: right; font-size: .7rem; text-transform: uppercase; letter-spacing: .06em; opacity: .5; }
.guard { font-size: .8em; opacity: .75; margin-top: .3rem; }
.finding { margin: .25rem 0; padding: .4rem .6rem; border-left: 3px solid var(--line); font-size: .9em; }
.finding.warn { border-color: var(--warn); } .finding.error { border-color: var(--err); } .finding.info { opacity: .75; }
.none { opacity: .45; }
</style></head><body>
<h1>${esc(ir.title)}</h1>
<p class="sub">Ingest review — the module, what was understood, and what was built. This page contains your source text; it stays on disk.</p>

<div class="summary">
  <strong style="color:${lintErrors.length ? 'var(--err)' : 'var(--ok)'}">
    ${lintErrors.length ? `${lintErrors.length} lint error(s)` : 'Lint clean'}
  </strong>
  — ${ir.rooms.length} areas, ${books.length} book(s), ${books.reduce((n, b) => n + b.beats.length, 0)} beats
  ${lintErrors.length ? `<ul>${lintErrors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}
  ${lintWarnings.length ? `<ul>${lintWarnings.map((w) => `<li class="none">${esc(w)}</li>`).join('')}</ul>` : ''}
  ${(mapping.unmatchedCreatures ?? []).length ? `<p style="margin:.6rem 0 0" class="finding warn">${mapping.unmatchedCreatures.length} creature(s) had no SRD statblock and were substituted — check each below.</p>` : ''}
</div>

${rows}
</body></html>`;

const out = join(dir, 'review.html');
writeFileSync(out, html);
console.log(`review written: ${out}`);
console.log(`  ${ir.rooms.length} areas · ${books.reduce((n, b) => n + b.beats.length, 0)} beats · ${lintErrors.length} errors · ${lintWarnings.length} warnings`);
