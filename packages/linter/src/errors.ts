/**
 * Linter findings.
 *
 * The error output doubles as the generator's retry context in Phase 3: when
 * a generated graph fails, these messages are fed back to the model verbatim.
 * That is why every finding carries a human-legible `message` that names ids
 * and says what to change — "beat 'crypt-door' is unreachable from entry
 * 'arrival'" beats an issue code every time.
 */

export type Severity = 'error' | 'warning';

export type FindingCode =
  // Schema
  | 'schema-invalid'
  // Reachability
  | 'entry-missing'
  | 'beat-unreachable'
  | 'no-terminal-beat'
  | 'ending-unreachable'
  | 'edge-dangling'
  | 'option-dangling'
  // Flags
  | 'flag-read-never-set'
  | 'flag-set-never-read'
  // Encounters
  | 'encounter-missing'
  | 'encounter-unwinnable'
  | 'encounter-transition-dangling'
  | 'monster-unknown'
  | 'monster-cannot-act'
  // Art
  | 'art-slot-duplicate'
  // Choice quality (warnings)
  | 'false-choice'
  | 'all-encounters-defeat-all'
  | 'ending-too-close'
  | 'edge-always'
  | 'beat-can-strand'
  // Campaign scale (Phase 6)
  | 'book-duplicate-id'
  | 'book-adventure-missing'
  | 'book-gate-unreachable'
  | 'level-band-gap'
  | 'level-band-inverted'
  | 'carry-flag-never-set'
  | 'carry-flag-never-read'
  | 'campaign-not-campaign-scale';

export interface Finding {
  severity: Severity;
  code: FindingCode;
  /** Human-legible, id-bearing, actionable. This text is the generation retry context. */
  message: string;
  /** The beat / encounter / edge the finding is anchored to, when there is one. */
  at?: string;
}

export interface LintResult {
  ok: boolean;
  errors: Finding[];
  warnings: Finding[];
}

export function toResult(findings: Finding[]): LintResult {
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');
  return { ok: errors.length === 0, errors, warnings };
}
