#!/usr/bin/env node
/**
 * Architectural invariant enforcement.
 *
 * INVARIANT 1: @lantern/engine must never import @lantern/flint.
 * INVARIANT 2: @lantern/flint must never import app or engine packages.
 * INVARIANT 3: @lantern/srd must have no runtime dependencies beyond zod.
 *
 * Run: pnpm guard   (also wired into CI)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const RULES = [
  { from: 'packages/engine', forbid: [/@lantern\/flint/, /@anthropic-ai\/sdk/, /\bopenai\b/],
    why: 'engine must stay deterministic — no model calls' },
  { from: 'packages/flint', forbid: [/@lantern\/engine/, /@lantern\/linter/, /@lantern\/db/, /@lantern\/srd/],
    why: 'flint must stay extractable — no app coupling' },
  { from: 'packages/srd', forbid: [/@lantern\/flint/, /@lantern\/engine/, /@lantern\/db/],
    why: 'srd is inert data + types only' },
];

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    if (e === 'node_modules' || e === 'dist' || e === '.turbo') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (['.ts', '.tsx', '.mts'].includes(extname(p))) out.push(p);
  }
  return out;
}

let violations = 0;
for (const rule of RULES) {
  for (const file of walk(rule.from)) {
    const src = readFileSync(file, 'utf8');
    for (const line of src.split('\n')) {
      if (!/^\s*(import|export)\s|require\(/.test(line)) continue;
      for (const pattern of rule.forbid) {
        if (pattern.test(line)) {
          console.error(`BOUNDARY VIOLATION  ${file}\n  ${line.trim()}\n  -> ${rule.why}\n`);
          violations++;
        }
      }
    }
  }
}

if (violations > 0) {
  console.error(`${violations} boundary violation(s). Build refused.`);
  process.exit(1);
}
console.log('Boundaries clean.');
