import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ConsumerRegistry, Flint, callStructured, extractJson } from './index.js';
import type { ProviderAdapter, ProviderRequest, ProviderResponse } from './index.js';

/** Adapter that replays a scripted sequence of responses. */
class ScriptedAdapter implements ProviderAdapter {
  readonly id = 'anthropic';
  calls: ProviderRequest[] = [];
  private readonly script: string[];

  constructor(script: string[]) {
    this.script = script;
  }

  hasCredential(): boolean {
    return true;
  }

  call(request: ProviderRequest): Promise<ProviderResponse> {
    this.calls.push(request);
    const text = this.script[Math.min(this.calls.length - 1, this.script.length - 1)]!;
    return Promise.resolve({ text, usage: { inputTokens: 1, outputTokens: 1 }, stopReason: 'end' });
  }
}

function makeFlint(adapter: ProviderAdapter): Flint {
  const registry = new ConsumerRegistry();
  registry.register({
    id: 'intent-parse',
    provider: 'anthropic',
    model: 'm',
    system: 'parse',
    temperature: 0,
  });
  registry.register({ id: 'dm-narration', provider: 'anthropic', model: 'm', system: 'narrate' });
  return new Flint({ registry, adapters: [adapter] });
}

const Actionish = z.object({
  type: z.literal('ability-check'),
  ability: z.enum(['str', 'dex', 'wis']),
  intent: z.string().min(1),
});

describe('extractJson', () => {
  it('reads bare JSON', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('reads fenced JSON', () => {
    expect(extractJson('Here you go:\n```json\n{"a":1}\n```\nDone!')).toEqual({ a: 1 });
  });

  it('trims leading and trailing prose around a balanced object', () => {
    expect(extractJson('Sure! {"a":{"b":[1,2]}} hope that helps')).toEqual({ a: { b: [1, 2] } });
  });

  it('handles braces inside strings', () => {
    expect(extractJson('{"a":"curly } brace"}')).toEqual({ a: 'curly } brace' });
  });

  it('returns undefined for no JSON at all', () => {
    expect(extractJson('I cannot answer that.')).toBeUndefined();
  });
});

describe('callStructured — fail closed', () => {
  it('returns a validated value on a clean first attempt', async () => {
    const adapter = new ScriptedAdapter([
      '{"type":"ability-check","ability":"wis","intent":"listen at the door"}',
    ]);
    const result = await callStructured(makeFlint(adapter), 'intent-parse', {
      schema: Actionish,
      schemaName: 'Action',
      maxRepairs: 0,
      input: { input: 'I listen at the door' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.ability).toBe('wis');
      expect(result.attempts).toBe(1);
    }
  });

  it('zero repairs = intent-parse policy: one bad output fails immediately', async () => {
    const adapter = new ScriptedAdapter([
      '{"type":"ability-check","ability":"luck","intent":"x"}', // invalid enum
      '{"type":"ability-check","ability":"wis","intent":"x"}', // never reached
    ]);
    const result = await callStructured(makeFlint(adapter), 'intent-parse', {
      schema: Actionish,
      schemaName: 'Action',
      maxRepairs: 0,
      input: { input: 'x' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe('validation-failed');
      expect(result.attempts).toBe(1); // exactly one call, no silent retry
      expect(result.issues.some((i) => i.includes('ability'))).toBe(true);
    }
    expect(adapter.calls).toHaveLength(1);
  });

  it('feeds validation errors back on repair attempts', async () => {
    const adapter = new ScriptedAdapter([
      '{"type":"ability-check"}', // missing fields
      '{"type":"ability-check","ability":"dex","intent":"pick the lock"}',
    ]);
    const result = await callStructured(makeFlint(adapter), 'dm-narration', {
      schema: Actionish,
      schemaName: 'Action',
      maxRepairs: 1,
      input: { input: 'x' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.attempts).toBe(2);
    // The second request carried the first attempt's validation errors.
    expect(adapter.calls[1]!.input).toContain('failed validation');
    expect(adapter.calls[1]!.input).toContain('intent');
  });

  it('non-JSON output fails with a legible issue, not a crash', async () => {
    const adapter = new ScriptedAdapter(['I refuse to produce JSON today.']);
    const result = await callStructured(makeFlint(adapter), 'intent-parse', {
      schema: Actionish,
      schemaName: 'Action',
      maxRepairs: 0,
      input: { input: 'x' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]).toContain('no parseable JSON');
  });

  it('there is no code path returning an unvalidated value', async () => {
    // Even valid JSON of the wrong shape must fail.
    const adapter = new ScriptedAdapter(['{"totally":"different"}']);
    const result = await callStructured(makeFlint(adapter), 'intent-parse', {
      schema: Actionish,
      schemaName: 'Action',
      maxRepairs: 0,
      input: { input: 'x' },
    });
    expect(result.ok).toBe(false);
  });

  it('the schema instruction reaches the provider as a system suffix', async () => {
    const adapter = new ScriptedAdapter([
      '{"type":"ability-check","ability":"str","intent":"push"}',
    ]);
    await callStructured(makeFlint(adapter), 'intent-parse', {
      schema: Actionish,
      schemaName: 'Action',
      maxRepairs: 0,
      input: { input: 'x', systemSuffix: 'Context: a stuck door.' },
    });
    const suffix = adapter.calls[0]!.systemSuffix!;
    expect(suffix).toContain('Context: a stuck door.');
    expect(suffix).toContain('"Action"');
    expect(suffix).toContain('Schema:');
  });
});
