import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { Flint, FlintCallInput } from '../index.js';
import { FlintError, type FlintResult } from '../errors.js';

/**
 * Flint v2 — schema-constrained output.
 *
 * Real schema enforcement is validate-then-repair, not `response_format:
 * json` (Flint finding #2). The model's text is extracted, parsed, and
 * validated against the caller's zod schema; on failure the caller decides —
 * via its consumer's retry policy — whether the validation errors go back to
 * the model as feedback or surface as a structured failure.
 *
 * Retry policy is per-consumer and lives with the *call site*, not the seam:
 *  - `intent-parse`: zero retries. A hallucinated valid action is worse than
 *    an error, and a silent retry burns seconds mid-turn to usually get the
 *    same garbage back. Failure surfaces as in-fiction refusal upstream.
 *  - `dm-narration`: one retry, then the caller falls back to templated
 *    prose from the Resolution. A turn is never blocked on narration.
 *  - `generator`: up to 3 attempts with validator errors as context —
 *    behind a loading screen, latency is free there.
 */

export interface StructuredCallOptions<T> {
  schema: z.ZodType<T>;
  /** Human-readable schema name injected into the instruction block. */
  schemaName: string;
  /**
   * Validation-failure feedback loop: how many times to re-ask with the
   * validation errors appended. 0 = fail closed on first invalid output.
   */
  maxRepairs: number;
  input: FlintCallInput;
}

export interface StructuredFailure {
  kind: 'validation-failed' | 'call-failed';
  attempts: number;
  /** Human-legible validation messages from the final attempt. */
  issues: string[];
  error?: FlintError;
}

export type StructuredResult<T> =
  | { ok: true; value: T; attempts: number }
  | ({ ok: false } & StructuredFailure);

/** Extract the first JSON object/array from model text, tolerating fences. */
export function extractJson(text: string): unknown | undefined {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const candidate = fenced ? fenced[1]! : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) return undefined;
  // Walk to the matching close bracket to trim trailing prose.
  const open = candidate[start]!;
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i]!;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') inString = !inString;
    if (inString) continue;
    if (ch === open) depth++;
    if (ch === close) depth--;
    if (depth === 0) {
      try {
        return JSON.parse(candidate.slice(start, i + 1));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function schemaInstruction<T>(schema: z.ZodType<T>, name: string): string {
  const json = JSON.stringify(zodToJsonSchema(schema, name));
  return (
    `Respond with a single JSON value conforming exactly to the "${name}" JSON schema below. ` +
    `No prose before or after the JSON.\n\nSchema:\n${json}`
  );
}

function issueMessages(error: z.ZodError): string[] {
  return error.issues.map(
    (i) => `${i.path.length ? i.path.join('.') : '(root)'} — ${i.message}`,
  );
}

/**
 * Call a consumer and validate its output against a zod schema, feeding
 * validation failures back up to `maxRepairs` times.
 *
 * Fails closed: there is no code path that returns an unvalidated value.
 */
export async function callStructured<T>(
  flint: Flint,
  consumerId: string,
  options: StructuredCallOptions<T>,
): Promise<StructuredResult<T>> {
  const instruction = schemaInstruction(options.schema, options.schemaName);
  let attempts = 0;
  let lastIssues: string[] = [];
  let feedback = '';

  while (attempts <= options.maxRepairs) {
    attempts++;
    const suffix = [options.input.systemSuffix, instruction].filter(Boolean).join('\n\n');
    const result: FlintResult<string> = await flint.call(consumerId, {
      input: feedback ? `${options.input.input}\n\n${feedback}` : options.input.input,
      systemSuffix: suffix,
    });

    if (!result.ok) {
      return { ok: false, kind: 'call-failed', attempts, issues: lastIssues, error: result.error };
    }

    const extracted = extractJson(result.value);
    if (extracted === undefined) {
      lastIssues = ['(root) — response contained no parseable JSON value'];
    } else {
      const parsed = options.schema.safeParse(extracted);
      if (parsed.success) {
        return { ok: true, value: parsed.data, attempts };
      }
      lastIssues = issueMessages(parsed.error);
    }

    // Validation-failure feedback: the errors become the next attempt's context.
    feedback =
      `Your previous response failed validation. Fix ALL of the following and respond again ` +
      `with only the corrected JSON:\n- ${lastIssues.join('\n- ')}`;
  }

  return { ok: false, kind: 'validation-failed', attempts, issues: lastIssues };
}


// ---------------------------------------------------------------------------
// External-validator loop — Flint v3
// ---------------------------------------------------------------------------

/**
 * A domain validator the caller supplies. Flint never imports the validator's
 * package (the linter lives app-side; invariant 3) — it receives the function
 * and the *capability* of running the repair loop lives here in the seam.
 */
export interface ExternalValidation {
  ok: boolean;
  /** Human-legible, actionable error text — fed back to the model verbatim. */
  errors: string[];
  /** Non-blocking findings, appended to feedback when present. */
  warnings?: string[];
}

export interface ValidatedCallOptions<T> {
  schema: z.ZodType<T>;
  schemaName: string;
  /** Total attempts including the first. The whole loop, not per-stage. */
  maxAttempts: number;
  validate: (value: T) => ExternalValidation;
  input: FlintCallInput;
}

export type ValidatedResult<T> =
  | { ok: true; value: T; attempts: number; firstAttemptPassed: boolean; warnings: string[] }
  | {
      ok: false;
      kind: 'validation-failed' | 'call-failed';
      attempts: number;
      errors: string[];
      error?: FlintError;
    };

/**
 * Structured call + external validation, with failure feedback on both
 * stages: a schema miss and a validator miss each become the next attempt's
 * context. Fails loudly after `maxAttempts` with the final errors attached.
 *
 * Telemetry: one `validated-call` event per run — consumer, attempts,
 * firstAttemptPassed, outcome — which is exactly the substrate a
 * first-attempt-pass-rate benchmark needs.
 */
export async function callValidated<T>(
  flint: Flint,
  consumerId: string,
  options: ValidatedCallOptions<T>,
): Promise<ValidatedResult<T>> {
  let feedback = '';
  let firstAttemptPassed = false;
  let lastErrors: string[] = [];

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    const structured = await callStructured(flint, consumerId, {
      schema: options.schema,
      schemaName: options.schemaName,
      maxRepairs: 0, // schema misses count as attempts of THIS loop
      input: {
        input: feedback ? `${options.input.input}\n\n${feedback}` : options.input.input,
        ...(options.input.systemSuffix !== undefined
          ? { systemSuffix: options.input.systemSuffix }
          : {}),
      },
    });

    if (!structured.ok) {
      if (structured.kind === 'call-failed') {
        flint.telemetry.record({
          type: 'validated-call',
          consumer: consumerId,
          outcome: 'call-failed',
          attempts: attempt,
          firstAttemptPassed: false,
        });
        return {
          ok: false,
          kind: 'call-failed',
          attempts: attempt,
          errors: lastErrors,
          ...(structured.error ? { error: structured.error } : {}),
        };
      }
      lastErrors = structured.issues;
      feedback = [
        `Your previous response failed schema validation. Fix every issue and respond again with the complete corrected JSON:`,
        ...structured.issues.map((i) => `- ${i}`),
      ].join('\n');
      continue;
    }

    const validation = options.validate(structured.value);
    if (validation.ok) {
      if (attempt === 1) firstAttemptPassed = true;
      flint.telemetry.record({
        type: 'validated-call',
        consumer: consumerId,
        outcome: 'pass',
        attempts: attempt,
        firstAttemptPassed,
        warnings: validation.warnings?.length ?? 0,
      });
      return {
        ok: true,
        value: structured.value,
        attempts: attempt,
        firstAttemptPassed,
        warnings: validation.warnings ?? [],
      };
    }

    lastErrors = validation.errors;
    feedback = [
      `Your previous response failed validation. Fix EVERY error below and respond again with the complete corrected JSON:`,
      ...validation.errors.map((e) => `- ${e}`),
      ...(validation.warnings?.length
        ? ['Also address these warnings where possible:', ...validation.warnings.map((w) => `- ${w}`)]
        : []),
    ].join('\n');
  }

  flint.telemetry.record({
    type: 'validated-call',
    consumer: consumerId,
    outcome: 'fail',
    attempts: options.maxAttempts,
    firstAttemptPassed: false,
  });
  return { ok: false, kind: 'validation-failed', attempts: options.maxAttempts, errors: lastErrors };
}
