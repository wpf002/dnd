import { BeatGraph, CampaignGraph } from '@lantern/schema';
import type { Finding, LintResult } from './errors.js';
import { toResult } from './errors.js';
import { checkReachability } from './rules/reachability.js';
import { checkFlags } from './rules/flags.js';
import { checkSolvability } from './rules/solvability.js';
import { checkEdges, checkEndingDistance, checkQuality } from './rules/quality.js';
import { checkCampaign } from './rules/campaign.js';

export * from './errors.js';

/**
 * `@lantern/linter` — the sole gate between generated content and playable
 * content. Nothing bypasses it, including hand-authored graphs (invariant 6).
 *
 * Rules:
 *  - schema conformance (zod, rewritten into human-legible messages)
 *  - reachability: every beat reachable, every ending reachable
 *  - solvability: no encounter the pregens mathematically cannot win
 *  - orphaned flags: no condition nothing sets
 *  - art coverage and choice quality
 *
 * The error text is the product surface here: in Phase 3 it becomes the
 * generator's retry context verbatim, and the Flint benchmark (first-attempt
 * pass rate) is measured against exactly this function.
 */
export function lintGraph(input: unknown): LintResult {
  // Schema first. A graph that does not parse gets schema findings only —
  // structural rules on a malformed object would produce noise, not signal.
  const parsed = BeatGraph.safeParse(input);
  if (!parsed.success) {
    const findings: Finding[] = parsed.error.issues.map((issue) => ({
      severity: 'error' as const,
      code: 'schema-invalid' as const,
      message: `schema: ${issue.path.length ? issue.path.join('.') : '(root)'} — ${issue.message}`,
    }));
    return toResult(findings);
  }

  const graph = parsed.data;
  const findings: Finding[] = [
    ...checkReachability(graph),
    ...checkFlags(graph),
    // The graph declares the level it is written for; using a fixed 3 reported
    // a level-1 chapter's encounter as unwinnable "for a level-3 party".
    ...checkSolvability(graph, graph.metadata.partyLevel),
    ...checkQuality(graph),
    ...checkEndingDistance(graph),
    ...checkEdges(graph),
  ];
  return toResult(findings);
}

/**
 * Lint a campaign — the multi-book container, not the adventures inside it.
 *
 * Book-level rules only. Each adventure is linted on its own by `lintGraph`;
 * duplicating that here would report every finding twice. What this adds is
 * the set of properties no single graph can see: level-band continuity across
 * books, cross-book flag continuity, and encounter solvability re-checked at
 * the band each book is actually played at.
 *
 * @param adventures The campaign's adventures by id. Optional, because the
 *   schema and level-band rules hold without them — but pass them when you
 *   can: unresolved adventures silently weaken the flag-continuity and
 *   solvability checks, and the findings say so when that happens.
 */
export function lintCampaign(
  input: unknown,
  adventures?: ReadonlyMap<string, unknown>,
  /**
   * Adventure ids the caller already knows are broken. Merged with the ones
   * that fail to parse here, so a book pointing at a graph that exists but
   * does not lint is told so, instead of being told the file is missing.
   */
  brokenAdventures?: ReadonlySet<string>,
): LintResult {
  const parsed = CampaignGraph.safeParse(input);
  if (!parsed.success) {
    const findings: Finding[] = parsed.error.issues.map((issue) => ({
      severity: 'error' as const,
      code: 'schema-invalid' as const,
      message: `schema: ${issue.path.length ? issue.path.join('.') : '(root)'} — ${issue.message}`,
    }));
    return toResult(findings);
  }

  // Only adventures that themselves parse are handed to the campaign rules.
  // A malformed graph is `lintGraph`'s finding to report, not this one's; here
  // it simply counts as unresolved.
  let resolved: Map<string, BeatGraph> | undefined;
  const unlinted = new Set<string>(brokenAdventures ?? []);
  if (adventures) {
    resolved = new Map();
    for (const [id, value] of adventures) {
      if (unlinted.has(id)) continue;
      const graph = BeatGraph.safeParse(value);
      if (graph.success) resolved.set(id, graph.data);
      else unlinted.add(id);
    }
  }

  return toResult(checkCampaign(parsed.data, resolved, unlinted));
}
