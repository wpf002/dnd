import { BeatGraph } from '@lantern/schema';
import type { Finding, LintResult } from './errors.js';
import { toResult } from './errors.js';
import { checkReachability } from './rules/reachability.js';
import { checkFlags } from './rules/flags.js';
import { checkSolvability } from './rules/solvability.js';
import { checkQuality } from './rules/quality.js';

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
    ...checkSolvability(graph),
    ...checkQuality(graph),
  ];
  return toResult(findings);
}
