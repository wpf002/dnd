import { describe, expect, it } from 'vitest';
import { ConsumerRegistry, Flint, FlintError, createLanternFlint } from './index.js';
import type { ProviderAdapter, ProviderRequest, ProviderResponse } from './index.js';

/**
 * All tests run credential-free and network-free — provider calls go through a
 * fake adapter. Real calls are exercised in Phase 2 behind FLINT_REPLAY_MODE.
 */

class FakeAdapter implements ProviderAdapter {
  readonly id = 'anthropic';
  calls: ProviderRequest[] = [];
  private readonly reply: (req: ProviderRequest) => ProviderResponse;
  private readonly credentialed: boolean;

  constructor(options?: { reply?: (req: ProviderRequest) => ProviderResponse; credentialed?: boolean }) {
    this.reply =
      options?.reply ??
      ((req) => ({
        text: `echo:${req.config.id}`,
        usage: { inputTokens: 10, outputTokens: 5 },
        stopReason: 'end',
      }));
    this.credentialed = options?.credentialed ?? true;
  }

  hasCredential(): boolean {
    return this.credentialed;
  }

  call(request: ProviderRequest): Promise<ProviderResponse> {
    this.calls.push(request);
    return Promise.resolve(this.reply(request));
  }
}

function flintWith(adapter: ProviderAdapter): Flint {
  const registry = new ConsumerRegistry();
  registry.register({
    id: 'intent-parse',
    provider: 'anthropic',
    model: 'test-model',
    system: 'Parse intents. Reject when uncertain.',
    temperature: 0,
  });
  registry.register({
    id: 'dm-narration',
    provider: 'anthropic',
    model: 'test-model',
    system: 'Narrate outcomes. Never invent numbers.',
  });
  return new Flint({ registry, adapters: [adapter] });
}

describe('typed call interface', () => {
  it('routes to the consumer config and returns the text', async () => {
    const adapter = new FakeAdapter();
    const flint = flintWith(adapter);
    const result = await flint.call('intent-parse', { input: 'I attack the goblin' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('echo:intent-parse');
      expect(result.usage.inputTokens).toBe(10);
    }
  });

  it('returns unknown-consumer with the known list, never throws', async () => {
    const flint = flintWith(new FakeAdapter());
    const result = await flint.call('nonexistent', { input: 'x' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(FlintError);
      expect(result.error.kind).toBe('unknown-consumer');
      expect(result.error.message).toContain('intent-parse');
    }
  });

  it('returns missing-credential when the adapter has no key', async () => {
    const flint = flintWith(new FakeAdapter({ credentialed: false }));
    const result = await flint.call('intent-parse', { input: 'x' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('missing-credential');
  });
});

describe('per-consumer config isolation', () => {
  it('each consumer carries its own system block — nothing shared, nothing bled', async () => {
    const adapter = new FakeAdapter();
    const flint = flintWith(adapter);

    await flint.call('intent-parse', { input: 'a' });
    await flint.call('dm-narration', { input: 'b' });

    const [parseCall, narrateCall] = adapter.calls;
    expect(parseCall!.config.system).toContain('Reject when uncertain');
    expect(narrateCall!.config.system).toContain('Never invent numbers');
    // Neither block contains the other's text — persona isolation.
    expect(parseCall!.config.system).not.toContain('Narrate');
    expect(narrateCall!.config.system).not.toContain('Parse intents');
  });

  it('per-call system suffix reaches the adapter without mutating the registry', async () => {
    const adapter = new FakeAdapter();
    const flint = flintWith(adapter);
    await flint.call('dm-narration', { input: 'x', systemSuffix: 'Voice: damp gothic dread.' });
    expect(adapter.calls[0]!.systemSuffix).toBe('Voice: damp gothic dread.');
    // Registry unchanged
    expect(flint.consumers.get('dm-narration')!.system).not.toContain('gothic');
  });

  it('intent-parse runs at temperature 0; narration does not', () => {
    const flint = flintWith(new FakeAdapter());
    expect(flint.consumers.get('intent-parse')!.temperature).toBe(0);
    expect(flint.consumers.get('dm-narration')!.temperature).toBe(1);
  });
});

describe('structured errors', () => {
  class ThrowingAdapter extends FakeAdapter {
    private readonly status: number | undefined;
    constructor(status?: number) {
      super();
      this.status = status;
    }
    override call(): Promise<ProviderResponse> {
      const err = new Error('boom') as Error & { status?: number };
      if (this.status !== undefined) err.status = this.status;
      return Promise.reject(err);
    }
  }

  it('classifies 429 as rate-limited and retryable', async () => {
    const result = await flintWith(new ThrowingAdapter(429)).call('intent-parse', { input: 'x' });
    if (!result.ok) {
      expect(result.error.kind).toBe('rate-limited');
      expect(result.error.retryable).toBe(true);
    }
    expect(result.ok).toBe(false);
  });

  it('classifies 400 as provider-rejected and not retryable', async () => {
    const result = await flintWith(new ThrowingAdapter(400)).call('intent-parse', { input: 'x' });
    if (!result.ok) {
      expect(result.error.kind).toBe('provider-rejected');
      expect(result.error.retryable).toBe(false);
    }
    expect(result.ok).toBe(false);
  });

  it('classifies network failure as provider-unavailable and retryable', async () => {
    const result = await flintWith(new ThrowingAdapter()).call('intent-parse', { input: 'x' });
    if (!result.ok) {
      expect(result.error.kind).toBe('provider-unavailable');
      expect(result.error.retryable).toBe(true);
    }
    expect(result.ok).toBe(false);
  });
});

describe('lantern defaults', () => {
  it('registers the eight consumers', () => {
    const flint = createLanternFlint();
    const ids = flint.consumers.list().map((c) => c.id).sort();
    expect(ids).toEqual([
      'compaction',
      'dm-narration',
      'dm-narration-brief',
      'generator',
      'ingest',
      'ingest-fragment',
      'intent-parse',
      'npc-dialogue',
    ]);
  });

  it('routes a fight to a faster model than a scene', () => {
    // A player clicking through a dozen attacks waits on every one of them.
    // Sized and routed for the scene, each swing took seven seconds.
    const flint = createLanternFlint();
    const scene = flint.consumers.get('dm-narration')!;
    const swing = flint.consumers.get('dm-narration-brief')!;
    expect(swing.maxTokens).toBeLessThan(scene.maxTokens);
    expect(swing.model).not.toBe(scene.model);
  });

  it('lets a call lower its own ceiling but never raise it', async () => {
    const adapter = new FakeAdapter();
    const flint = flintWith(adapter);
    const configured = flint.consumers.get('dm-narration')!.maxTokens;

    await flint.call('dm-narration', { input: 'x', maxTokens: 64 });
    expect(adapter.calls.at(-1)!.config.maxTokens).toBe(64);

    // The registry stays the authority on the ceiling.
    await flint.call('dm-narration', { input: 'x', maxTokens: configured * 10 });
    expect(adapter.calls.at(-1)!.config.maxTokens).toBe(configured);
  });

  it('sizes a section extraction well below a whole-module one', () => {
    // `ingest` is sized for a whole document in one call. Reusing it per chunk
    // made every chunk trip the SDK's long-request guard and stream.
    const flint = createLanternFlint();
    const whole = flint.consumers.get('ingest')!;
    const fragment = flint.consumers.get('ingest-fragment')!;
    expect(fragment.maxTokens).toBeLessThan(whole.maxTokens);
    expect(fragment.maxTokens).toBeLessThanOrEqual(8_192);
  });

  it('gives each consumer a distinct system block', () => {
    const flint = createLanternFlint();
    const systems = flint.consumers.list().map((c) => c.system);
    expect(new Set(systems).size).toBe(systems.length);
  });

  it('never calls a provider without a credential — safe to construct anywhere', async () => {
    // No ANTHROPIC_API_KEY in the test environment; the call must fail closed
    // at the credential gate rather than attempting a network request.
    const previous = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const flint = createLanternFlint();
      const result = await flint.call('intent-parse', { input: 'x' });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe('missing-credential');
    } finally {
      if (previous !== undefined) process.env.ANTHROPIC_API_KEY = previous;
    }
  });
});
