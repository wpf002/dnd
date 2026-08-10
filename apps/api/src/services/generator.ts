import { BeatGraph, Tone } from '@lantern/schema';
import { lintGraph } from '@lantern/linter';
import { MONSTERS } from '@lantern/srd';
import { callValidated, type Flint, type Telemetry } from '@lantern/flint';
import { z } from 'zod';

/**
 * Adventure generation — the `generator` consumer on Flint. Not a system: a
 * prompt configuration plus an output schema, whose output passes through the
 * same linter a human author's does.
 *
 * All generic capability lives in Flint (`callValidated`: the structured
 * call, the schema/validator feedback loop, attempts accounting, telemetry).
 * What lives here is only what is genuinely Lantern's: the request shape,
 * the prompt text, the linter as the validator, and the domain benchmark
 * event derived from the run.
 */

export const GenerationRequest = z.object({
  premise: z.string().min(10).max(500),
  setting: z.string().min(3).max(200),
  tone: z.array(Tone).min(1).max(3),
  length: z.enum(['short', 'standard']).default('standard'),
  partyLevel: z.number().int().min(1).max(20).default(3),
  contentLimits: z.array(z.string()).default([]),
});
export type GenerationRequest = z.infer<typeof GenerationRequest>;

export interface GenerationSuccess {
  ok: true;
  graph: BeatGraph;
  attempts: number;
  firstAttemptPassed: boolean;
  warnings: string[];
}

export interface GenerationFailure {
  ok: false;
  attempts: number;
  /**
   * Why it failed. The distinction matters to the caller and to the
   * benchmark: `lint-failed` means the model produced a graph the linter
   * rejected — a real generation-quality datapoint. `call-failed` means we
   * never got a graph at all (transport, credentials, provider refusal), and
   * must NOT be scored as a generation miss.
   */
  kind: 'lint-failed' | 'call-failed';
  /** The last attempt's errors — the loud part of "fail loudly". */
  errors: string[];
}

export type GenerationResult = GenerationSuccess | GenerationFailure;

const MAX_ATTEMPTS = 3;

function buildPrompt(request: GenerationRequest): string {
  return [
    `Generate a complete BeatGraph JSON for a solo tabletop one-shot.`,
    ``,
    `Premise: ${request.premise}`,
    `Setting: ${request.setting}`,
    `Tone tags: ${request.tone.join(', ')}`,
    `Party level: ${request.partyLevel}`,
    `Length: ${request.length === 'short' ? '10-12 beats' : '12-16 beats'}`,
    request.contentLimits.length ? `Content limits (never depict): ${request.contentLimits.join('; ')}` : '',
    ``,
    `Hard requirements the linter WILL enforce:`,
    `- 10 to 16 beats; at least 2 terminal ending beats, each reachable from the entry.`,
    `- Non-terminal, non-encounter beats have EXACTLY three options. Terminal and encounter beats have NO options.`,
    `- The three options on a beat MUST genuinely differ. Options that all point at the same target with no "effects" and no "requiresCheck" are a false choice and WILL be rejected. Give at least two of the three a different target, a state change, or a check — a choice the player cannot lose or win differently is not a choice.`,
    `- Encounter beats set "encounter" to an id defined in "encounters"; every encounter's onVictory/onDefeat (and optional onFlee) name existing beats.`,
    `- Monster statblocks must come from this exact list: ${Object.keys(MONSTERS).join(', ')}.`,
    `- Encounters must be winnable by a level-${request.partyLevel} party of four; prefer 2-5 low-CR combatants over one huge one.`,
    `- Every flag read in any guard must be written somewhere (onEntry/onExit/option effects), and every written flag must be read somewhere.`,
    `- Every beat has a unique kebab-case "art" slot id.`,
    `- All ids are kebab-case. "schemaVersion" is 1. metadata.tone uses only the provided tone tags.`,
    `- Vary victory conditions: not every encounter should be defeat-all.`,
    `- Give each beat a generous "improvBudget" (5-10).`,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function generateAdventure(
  flint: Flint,
  telemetry: Telemetry,
  requestInput: unknown,
): Promise<GenerationResult> {
  const request = GenerationRequest.parse(requestInput);

  const result = await callValidated(flint, 'generator', {
    schema: BeatGraph,
    schemaName: 'BeatGraph',
    maxAttempts: MAX_ATTEMPTS,
    validate: (graph) => {
      const lint = lintGraph(graph);
      // Warnings fail the attempt, not just errors. A `false-choice` warning
      // means three options that all land in the same place with no state
      // change — a choice that isn't one, which is the single property a
      // beat-graph most needs to get right (Compendium Vol II Part II §10).
      // Feeding warnings back as retry context is exactly what the
      // validation-feedback loop is for; accepting them would ship the
      // linter's own definition of bad content.
      return {
        ok: lint.ok && lint.warnings.length === 0,
        errors: [
          ...lint.errors.map((e) => e.message),
          ...lint.warnings.map((w) => w.message),
        ],
        warnings: lint.warnings.map((w) => w.message),
      };
    },
    input: { input: buildPrompt(request) },
  });

  if (!result.ok) {
    telemetry.record({
      type: 'generation',
      outcome: result.kind === 'call-failed' ? 'call-failed' : 'fail',
      attempts: result.attempts,
      firstAttemptPassed: false,
      errors: result.errors.length,
    });
    return {
      ok: false,
      attempts: result.attempts,
      kind: result.kind === 'call-failed' ? 'call-failed' : 'lint-failed',
      errors: result.errors.length ? result.errors : [result.error?.message ?? 'generation failed'],
    };
  }

  telemetry.record({
    type: 'generation',
    outcome: 'pass',
    attempts: result.attempts,
    firstAttemptPassed: result.firstAttemptPassed,
    beats: result.value.beats.length,
    warnings: result.warnings.length,
  });
  return {
    ok: true,
    // Re-parse at the boundary: callValidated's generic can only promise the
    // schema's inferred input side; this pins the output type with defaults.
    graph: BeatGraph.parse(result.value),
    attempts: result.attempts,
    firstAttemptPassed: result.firstAttemptPassed,
    warnings: result.warnings,
  };
}

/**
 * The benchmark, computed from telemetry events. Binary and objective:
 * pass@1 = firstAttemptPassed / total; pass@3 = outcome 'pass' / total.
 */
export function benchmarkFromEvents(
  events: Array<Record<string, unknown>>,
): { total: number; passAt1: number; passAt3: number } {
  const runs = events.filter((e) => e.type === 'generation' && e.outcome !== 'call-failed');
  const total = runs.length;
  if (total === 0) return { total: 0, passAt1: 0, passAt3: 0 };
  const first = runs.filter((e) => e.firstAttemptPassed === true).length;
  const eventual = runs.filter((e) => e.outcome === 'pass').length;
  return { total, passAt1: first / total, passAt3: eventual / total };
}
