import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { lintGraph } from '@lantern/linter';

/**
 * Corpus guard.
 *
 * Invariant 6 says the linter is the sole gate between generated content and
 * playable content, and that nothing bypasses it — *including hand-authored
 * graphs*. These tests apply that gate to every shipped adventure at build
 * time, so a broken graph fails CI rather than failing a session.
 *
 * The cross-adventure checks exist because art slots resolve to one flat
 * public directory: a duplicate slot silently overwrites another adventure's
 * frame, which is invisible in a per-graph lint.
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..');
const ADVENTURES = join(repoRoot, 'content', 'adventures');
const MANIFESTS = join(repoRoot, 'content', 'art', 'manifest');
const ART = join(repoRoot, 'apps', 'web', 'public', 'art');

type Graph = {
  id: string;
  entry: string;
  metadata: { title: string; premise: string; tone: string[]; partyLevel: number };
  beats: Array<{ id: string; art: string; terminal?: boolean; options: unknown[] }>;
  encounters: unknown[];
};

const ids = readdirSync(ADVENTURES)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''));

const graphs = new Map<string, Graph>(
  ids.map((id) => [id, JSON.parse(readFileSync(join(ADVENTURES, `${id}.json`), 'utf8')) as Graph]),
);

describe('shipped adventures', () => {
  it('ships more than one adventure', () => {
    // Regression guard: the corpus used to be Saltmire alone while three other
    // campaigns existed only as prose synopses.
    expect(ids.length).toBeGreaterThan(1);
  });

  /**
   * Warnings that describe authoring debt rather than a defect, and which
   * shipped content is allowed to carry.
   *
   * `flag-set-never-read` is here because it is genuinely advisory — the
   * ledger reads flags from outside the graph — and because giving every
   * stranding beat a default outcome deliberately removed guards that were
   * the only readers of a flag. That trade is worth making: a beat where a
   * party can arrive with nothing to click is a defect, and a flag nobody
   * reads is a tidiness problem.
   */
  const ADVISORY = new Set(['flag-set-never-read']);

  it.each(ids)('%s passes the linter with no errors and no substantive warnings', (id) => {
    const result = lintGraph(graphs.get(id));
    const substantive = result.warnings.filter((w) => !ADVISORY.has(w.code));
    expect({ id, errors: result.errors, warnings: substantive }).toEqual({
      id,
      errors: [],
      warnings: [],
    });
  });

  it.each(ids)('%s has a reachable entry and at least one ending', (id) => {
    const g = graphs.get(id)!;
    expect(g.beats.some((b) => b.id === g.entry)).toBe(true);
    expect(g.beats.filter((b) => b.terminal).length).toBeGreaterThan(0);
  });

  it.each(ids)('%s gives terminal and encounter beats no options', (id) => {
    // Those beats route through encounter transitions or end play; options
    // there would be unreachable UI.
    for (const beat of graphs.get(id)!.beats) {
      if (beat.terminal) expect({ beat: beat.id, options: beat.options.length }).toEqual({ beat: beat.id, options: 0 });
    }
  });
});

describe('art coverage', () => {
  it('every beat art slot appears in its adventure manifest', () => {
    for (const [id, g] of graphs) {
      const manifestPath = join(MANIFESTS, `${id}.json`);
      expect(existsSync(manifestPath), `missing manifest for ${id}`).toBe(true);
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
        slots: Array<{ slot: string }>;
      };
      const declared = new Set(manifest.slots.map((s) => s.slot));
      const used = [...new Set(g.beats.map((b) => b.art))];
      expect({ id, missing: used.filter((s) => !declared.has(s)) }).toEqual({ id, missing: [] });
    }
  });

  it('no art slot is claimed by two adventures', () => {
    // Slots resolve to one flat directory — a collision silently overwrites a
    // frame, and nothing in a per-graph lint would notice.
    const owner = new Map<string, string>();
    const collisions: Array<{ slot: string; adventures: string[] }> = [];
    for (const [id, g] of graphs) {
      for (const beat of g.beats) {
        const prior = owner.get(beat.art);
        if (prior && prior !== id) collisions.push({ slot: beat.art, adventures: [prior, id] });
        else owner.set(beat.art, id);
      }
    }
    expect(collisions).toEqual([]);
  });

  it('every art slot has a generated placeholder on disk', () => {
    const missing: string[] = [];
    for (const g of graphs.values()) {
      for (const beat of g.beats) {
        if (!existsSync(join(ART, `${beat.art}.svg`)) && !existsSync(join(ART, `${beat.art}.png`))) {
          missing.push(beat.art);
        }
      }
    }
    // Re-run: node tools/generate-placeholder-art.mjs
    expect(missing).toEqual([]);
  });
});

describe('the user\'s own campaigns are playable, not just documented', () => {
  it.each([
    ['emberfall-chronicles', 'The Emberfall Chronicles'],
    ['the-shattered-vale', 'The Shattered Vale'],
    ['the-shattered-meridian', 'The Shattered Meridian'],
  ])('%s exists as a beat-graph', (id, titleFragment) => {
    const g = graphs.get(id);
    expect(g, `${id} has no beat-graph — is it still only a prose synopsis?`).toBeDefined();
    expect(g!.metadata.title).toContain(titleFragment);
    expect(g!.beats.length).toBeGreaterThanOrEqual(12);
  });

  it('each offers three distinct endings, matching the source synopses', () => {
    for (const id of ['emberfall-chronicles', 'the-shattered-vale', 'the-shattered-meridian']) {
      const endings = graphs.get(id)!.beats.filter((b) => b.terminal);
      expect({ id, endings: endings.length }).toEqual({ id, endings: 3 });
      // Three *different* ends, not one end reached three ways.
      expect(new Set(endings.map((e) => e.id)).size).toBe(3);
    }
  });
});
