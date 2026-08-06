import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lintGraph } from './index.js';

/**
 * The Phase 2 content fixture. *The Bell at Saltmire* exists to pressure-test
 * the schema against real content — and it goes through the same gate as
 * everything else. Nothing bypasses the linter, including hand-authored
 * graphs (invariant 6).
 */

const here = dirname(fileURLToPath(import.meta.url));
const graphPath = join(here, '..', '..', '..', 'content', 'adventures', 'the-bell-at-saltmire.json');

describe('The Bell at Saltmire', () => {
  const raw = JSON.parse(readFileSync(graphPath, 'utf8'));

  it('passes the linter with zero errors', () => {
    const result = lintGraph(raw);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('passes with zero warnings — the fixture holds itself to the strictest bar', () => {
    const result = lintGraph(raw);
    expect(result.warnings).toEqual([]);
  });

  it('meets the Phase 2 content contract: ~14+ beats, 3 combats, 2 skill challenges, 3 endings', () => {
    expect(raw.beats.length).toBeGreaterThanOrEqual(14);
    expect(raw.encounters).toHaveLength(3);

    const endings = raw.beats.filter((b: { terminal?: boolean }) => b.terminal);
    expect(endings).toHaveLength(3);

    // A skill challenge is a hazard beat where at least two options carry checks.
    const skillChallenges = raw.beats.filter(
      (b: { kind: string; options: Array<{ requiresCheck?: unknown }> }) =>
        b.kind === 'hazard' && b.options.filter((o) => o.requiresCheck).length >= 2,
    );
    expect(skillChallenges.length).toBeGreaterThanOrEqual(2);
  });

  it('varies victory conditions beyond defeat-all', () => {
    const kinds = new Set(raw.encounters.map((e: { victory: { kind: string } }) => e.victory.kind));
    expect(kinds.size).toBeGreaterThan(1);
  });

  it('all three endings are distinct beats with distinct art', () => {
    const endings = raw.beats.filter((b: { terminal?: boolean }) => b.terminal);
    const arts = new Set(endings.map((b: { art: string }) => b.art));
    expect(arts.size).toBe(3);
  });
});
