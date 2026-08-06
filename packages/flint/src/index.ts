import { ConsumerRegistry, lanternDefaults } from './config/index.js';
import { FlintError, type FlintResult } from './errors.js';
import { AnthropicAdapter } from './providers/anthropic.js';
import { OpenAiAdapter } from './providers/openai.js';
import type { ProviderAdapter } from './providers/types.js';

export * from './errors.js';
export * from './config/index.js';
export type { ProviderAdapter, ProviderRequest, ProviderResponse } from './providers/types.js';
export { AnthropicAdapter } from './providers/anthropic.js';
export { OpenAiAdapter } from './providers/openai.js';

/**
 * `@lantern/flint` v1 — the AI seam, minimal.
 *
 * Boundary: text-in / structure-out and outcome-in / prose-out. This package
 * imports nothing app-side — not engine, linter, db, or srd — so extraction
 * to its own repo stays a `git mv` and a publish (invariant 3).
 *
 * v1 scope (per the roadmap): typed call interface, provider adapters
 * (Anthropic primary, OpenAI stubbed), per-consumer config registry,
 * structured error types. Schema-constrained output and retry policy are v2;
 * routing and telemetry are v3.
 */

export interface FlintCallInput {
  input: string;
  /** Per-call system suffix — e.g. the adventure's narration voice block. */
  systemSuffix?: string;
}

export class Flint {
  private readonly registry: ConsumerRegistry;
  private readonly adapters: Map<string, ProviderAdapter>;

  constructor(options?: { registry?: ConsumerRegistry; adapters?: ProviderAdapter[] }) {
    this.registry = options?.registry ?? new ConsumerRegistry();
    const adapters = options?.adapters ?? [new AnthropicAdapter(), new OpenAiAdapter()];
    this.adapters = new Map(adapters.map((a) => [a.id, a]));
  }

  /** The registry is exposed so the app can override consumer configs. */
  get consumers(): ConsumerRegistry {
    return this.registry;
  }

  /**
   * The typed call interface: `flint.call(consumerId, input) → Result`.
   * Expected failures come back as a result union, not a throw.
   */
  async call(consumerId: string, input: FlintCallInput): Promise<FlintResult<string>> {
    const config = this.registry.get(consumerId);
    if (!config) {
      return {
        ok: false,
        error: new FlintError({
          kind: 'unknown-consumer',
          consumerId,
          message: `no consumer '${consumerId}' registered — known: ${this.registry
            .list()
            .map((c) => c.id)
            .join(', ') || '(none)'}`,
        }),
      };
    }

    const adapter = this.adapters.get(config.provider);
    if (!adapter) {
      return {
        ok: false,
        error: new FlintError({
          kind: 'provider-unsupported',
          consumerId,
          provider: config.provider,
          message: `no adapter for provider '${config.provider}'`,
        }),
      };
    }

    if (!adapter.hasCredential()) {
      return {
        ok: false,
        error: new FlintError({
          kind: 'missing-credential',
          consumerId,
          provider: config.provider,
          message: `no credential configured for provider '${config.provider}' — set the provider API key server-side`,
        }),
      };
    }

    try {
      const response = await adapter.call({
        config,
        input: input.input,
        ...(input.systemSuffix !== undefined ? { systemSuffix: input.systemSuffix } : {}),
      });
      return { ok: true, value: response.text, usage: response.usage };
    } catch (cause) {
      return { ok: false, error: normalizeProviderError(consumerId, config.provider, cause) };
    }
  }
}

function normalizeProviderError(consumerId: string, provider: string, cause: unknown): FlintError {
  const status =
    typeof cause === 'object' && cause !== null && 'status' in cause
      ? Number((cause as { status: unknown }).status)
      : undefined;
  const message = cause instanceof Error ? cause.message : String(cause);

  if (status === 429) {
    return new FlintError({ kind: 'rate-limited', consumerId, provider, message, cause });
  }
  if (status !== undefined && status >= 400 && status < 500) {
    return new FlintError({ kind: 'provider-rejected', consumerId, provider, message, cause });
  }
  return new FlintError({ kind: 'provider-unavailable', consumerId, provider, message, cause });
}

/** A Flint instance pre-loaded with the four Lantern consumers. */
export function createLanternFlint(): Flint {
  const flint = new Flint();
  lanternDefaults(flint.consumers);
  return flint;
}
