#!/usr/bin/env node
/**
 * Ingest a module you own, from a text file.
 *
 *   node tools/ingest-module.mjs <file.txt> [--out work/<name>] [--map-only]
 *
 * Writes everything to a working directory rather than into content/:
 *
 *   ir.json          the extracted IngestedModule — edit THIS to repair
 *   campaign.json    the CampaignGraph, if the module had chapters
 *   books/*.json     one BeatGraph per chapter (or one adventure)
 *   report.json      what the mapper did to each room, plus lint findings
 *
 * Nothing lands in content/ automatically. Moving a book there is a deliberate
 * step, because these are the user's own materials and the repo does not
 * redistribute them — see Content and licensing in docs/ROADMAP.md.
 *
 * The repair loop:
 *   1. run this once (one model call per chunk — this is the part that costs)
 *   2. read report.json, edit ir.json by hand
 *   3. re-run with --map-only, which re-maps and re-lints for free
 *   4. repeat until the linter is clean
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const mapOnly = args.includes('--map-only');
const outFlag = args.indexOf('--out');
if (!file) {
  console.error('usage: node tools/ingest-module.mjs <file.txt> [--out dir] [--map-only]');
  process.exit(2);
}

const name = basename(file).replace(/\.[^.]+$/, '');
const outDir = outFlag >= 0 ? args[outFlag + 1] : join(root, 'work', name);
mkdirSync(join(outDir, 'books'), { recursive: true });

process.loadEnvFile?.(join(root, '.env'));

const { ingestModule, remapModule } = await import(
  join(root, 'apps/api/dist/services/ingestion.js')
);

function write(relative, value) {
  const path = join(outDir, relative);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  return path;
}

let result;

if (mapOnly) {
  const irPath = join(outDir, 'ir.json');
  if (!existsSync(irPath)) {
    console.error(`no ir.json in ${outDir} — run without --map-only first`);
    process.exit(1);
  }
  console.log(`re-mapping ${irPath} (no model calls)`);
  result = remapModule(JSON.parse(readFileSync(irPath, 'utf8')));
} else {
  const text = readFileSync(file, 'utf8');
  console.log(`${file}: ${text.length.toLocaleString()} characters`);

  const { createLanternFlint } = await import(join(root, 'packages/flint/dist/index.js'));
  const events = [];
  const telemetry = { record: (e) => events.push(e) };
  const flint = createLanternFlint({ telemetry });

  console.log('extracting — one model call per section, this is the part that costs');
  result = await ingestModule(flint, telemetry, text);

  if (result.extractionReport) {
    const r = result.extractionReport;
    console.log(
      `  ${r.chunks} sections, ${r.rooms} areas, ${r.chapters} chapters` +
        `${r.failedChunks.length ? `, ${r.failedChunks.length} FAILED` : ''}`,
    );
    for (const failed of r.failedChunks) console.log(`  ! section ${failed.index}: ${failed.detail}`);
  }
}

if (result.stage === 'extraction' && !result.campaign && !result.graph) {
  console.error(`\nextraction failed: ${result.detail ?? 'no detail'}`);
  if (result.extractionReport) write('report.json', result.extractionReport);
  process.exit(1);
}

// The IR is the repairable artifact, so write it even when everything worked.
if (!mapOnly && result.ir) write('ir.json', result.ir);

if (result.campaign) {
  write('campaign.json', result.campaign);
  for (const adventure of result.adventures ?? []) {
    write(join('books', `${adventure.id}.json`), adventure.graph);
  }
  console.log(`\n${result.adventures.length} books written to ${join(outDir, 'books')}`);
} else if (result.graph) {
  write(join('books', `${(result.graph.id ?? name)}.json`), result.graph);
  console.log(`\n1 adventure written to ${join(outDir, 'books')}`);
}

write('report.json', {
  ok: result.ok,
  stage: result.stage,
  extraction: result.extractionReport,
  mapping: result.report ?? result.campaignReport,
  lintErrors: result.lintErrors,
  lintWarnings: result.lintWarnings,
});

console.log(`\n${result.ok ? 'LINT CLEAN' : `${result.lintErrors.length} LINT ERRORS`}`);
for (const error of result.lintErrors.slice(0, 20)) console.log(`  - ${error}`);
if (result.lintErrors.length > 20) console.log(`  ... and ${result.lintErrors.length - 20} more`);
for (const warning of (result.lintWarnings ?? []).slice(0, 10)) console.log(`  ~ ${warning}`);

console.log(`\nreport: ${join(outDir, 'report.json')}`);
if (!result.ok) {
  console.log(`repair: edit ${join(outDir, 'ir.json')}, then re-run with --map-only (free)`);
}
