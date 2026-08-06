import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConsumerRegistry, Flint, MemoryTelemetry } from '@lantern/flint';
import type { ProviderAdapter, ProviderRequest, ProviderResponse } from '@lantern/flint';
import { benchmarkFromEvents, generateAdventure } from './services/generator.js';
import { createSession, chooseOption, sessionView } from './services/game.js';

/**
 * The generation pipeline, driven by scripted adapters. The live benchmark
 * (pass@1 >= 70% against a real model) runs when an API key exists; what is
 * verified here is the machinery: the linter-feedback retry loop, the
 * fail-loudly path, the telemetry events, and that a passing generation is
 * immediately playable.
 */

const here = dirname(fileURLToPath(import.meta.url));
const saltmire = JSON.parse(
  readFileSync(join(here, '..', '..', '..', 'content', 'adventures', 'the-bell-at-saltmire.json'), 'utf8'),
) as Record<string, unknown> & { beats: Array<Record<string, unknown>>; id: string };

/** A known-good graph to script "model output" with. */
function goodGraph(): typeof saltmire {
  return structuredClone(saltmire);
}

/** A graph with a dangling option target — schema-valid, linter-invalid. */
function brokenGraph(): typeof saltmire {
  const g = goodGraph();
  const arrival = g.beats.find((b) => b.id === 'arrival') as { options: Array<{ target: string }> };
  arrival.options[0]!.target = 'beat-that-does-not-exist';
  return g;
}

class ScriptedAdapter implements ProviderAdapter {
  readonly id = 'anthropic';
  calls: ProviderRequest[] = [];
  private readonly script: object[];

  constructor(script: object[]) {
    this.script = script;
  }
  hasCredential(): boolean {
    return true;
  }
  call(request: ProviderRequest): Promise<ProviderResponse> {
    this.calls.push(request);
    const payload = this.script[Math.min(this.calls.length - 1, this.script.length - 1)]!;
    return Promise.resolve({
      text: JSON.stringify(payload),
      usage: { inputTokens: 100, outputTokens: 2000 },
      stopReason: 'end',
    });
  }
}

function generatorFlint(adapter: ProviderAdapter, telemetry: MemoryTelemetry): Flint {
  const registry = new ConsumerRegistry();
  registry.register({
    id: 'generator',
    provider: 'anthropic',
    model: 'test-model',
    system: 'Generate BeatGraph JSON.',
    maxTokens: 32_000,
  });
  return new Flint({ registry, adapters: [adapter], telemetry });
}

const REQUEST = {
  premise: 'A lighthouse keeper has been signalling a ship that sank thirty years ago.',
  setting: 'A storm-bound cape village',
  tone: ['gothic-horror'],
  partyLevel: 3,
};

describe('generation happy path', () => {
  it('a first-attempt pass returns the graph and records pass@1', async () => {
    const telemetry = new MemoryTelemetry();
    const adapter = new ScriptedAdapter([goodGraph()]);
    const result = await generateAdventure(generatorFlint(adapter, telemetry), telemetry, REQUEST);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.attempts).toBe(1);
      expect(result.firstAttemptPassed).toBe(true);
    }
    const gen = telemetry.events.find((e) => e.type === 'generation')!;
    expect(gen.outcome).toBe('pass');
    expect(gen.firstAttemptPassed).toBe(true);
    // The flint call itself was also logged with tokens and latency.
    const call = telemetry.events.find((e) => e.type === 'call')!;
    expect(call.consumer).toBe('generator');
    expect(call.outputTokens).toBe(2000);
  });

  it('a generated graph is immediately playable through the same session machinery', async () => {
    const telemetry = new MemoryTelemetry();
    const adapter = new ScriptedAdapter([goodGraph()]);
    const result = await generateAdventure(generatorFlint(adapter, telemetry), telemetry, REQUEST);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const session = createSession(result.graph, 'generated-play-1');
    const view = sessionView(session);
    expect(view.beat.options.length).toBe(3);
    chooseOption(session, view.beat.options[0]!.id);
    expect(session.currentBeat).not.toBe('arrival');
  });
});

describe('the linter feedback loop', () => {
  it('feeds linter errors back and passes on the second attempt', async () => {
    const telemetry = new MemoryTelemetry();
    const adapter = new ScriptedAdapter([brokenGraph(), goodGraph()]);
    const result = await generateAdventure(generatorFlint(adapter, telemetry), telemetry, REQUEST);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.attempts).toBe(2);
      expect(result.firstAttemptPassed).toBe(false);
    }
    // The second call's input carried the first attempt's linter errors,
    // verbatim and human-legible — the whole reason the error text matters.
    // The framing line comes from Flint's generic validator loop; the error
    // detail comes from the linter.
    expect(adapter.calls[1]!.input).toContain('failed validation');
    expect(adapter.calls[1]!.input).toContain('beat-that-does-not-exist');
  });

  it('fails loudly after 3 attempts, with the errors in the failure', async () => {
    const telemetry = new MemoryTelemetry();
    const adapter = new ScriptedAdapter([brokenGraph(), brokenGraph(), brokenGraph()]);
    const result = await generateAdventure(generatorFlint(adapter, telemetry), telemetry, REQUEST);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.attempts).toBe(3);
      expect(result.errors.some((e) => e.includes('beat-that-does-not-exist'))).toBe(true);
    }
    expect(adapter.calls).toHaveLength(3);
    const gen = telemetry.events.find((e) => e.type === 'generation')!;
    expect(gen.outcome).toBe('fail');
  });

  it('schema-invalid output becomes feedback too, not a crash', async () => {
    const telemetry = new MemoryTelemetry();
    const adapter = new ScriptedAdapter([{ nonsense: true }, goodGraph()]);
    const result = await generateAdventure(generatorFlint(adapter, telemetry), telemetry, REQUEST);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.attempts).toBe(2);
    expect(adapter.calls[1]!.input).toContain('failed schema validation');
  });

  it('rejects a malformed request before any model call', async () => {
    const telemetry = new MemoryTelemetry();
    const adapter = new ScriptedAdapter([goodGraph()]);
    await expect(
      generateAdventure(generatorFlint(adapter, telemetry), telemetry, { premise: 'x' }),
    ).rejects.toThrow();
    expect(adapter.calls).toHaveLength(0);
  });
});

describe('the benchmark', () => {
  it('computes pass@1 and pass@3 from telemetry events', () => {
    const events = [
      { type: 'generation', outcome: 'pass', firstAttemptPassed: true },
      { type: 'generation', outcome: 'pass', firstAttemptPassed: true },
      { type: 'generation', outcome: 'pass', firstAttemptPassed: false },
      { type: 'generation', outcome: 'fail', firstAttemptPassed: false },
      { type: 'generation', outcome: 'call-failed', firstAttemptPassed: false }, // excluded
      { type: 'call', outcome: 'ok' }, // not a generation event
    ];
    const b = benchmarkFromEvents(events);
    expect(b.total).toBe(4);
    expect(b.passAt1).toBe(0.5);
    expect(b.passAt3).toBe(0.75);
  });

  it('handles an empty log', () => {
    expect(benchmarkFromEvents([])).toEqual({ total: 0, passAt1: 0, passAt3: 0 });
  });
});
