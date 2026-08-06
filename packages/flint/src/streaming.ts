import type { Flint, FlintCallInput } from './index.js';
import { FlintError } from './errors.js';

/**
 * Flint v4 — streaming.
 *
 * Latency *perception*, not throughput: the first sentence of narration on
 * screen while the rest is still being written. Adapters may implement
 * `stream`; when one does not (or has no credential), the caller receives the
 * whole non-streamed result as a single chunk — the interface degrades, the
 * contract does not.
 */

export interface StreamChunk {
  text: string;
  done: boolean;
}

export interface StreamingAdapter {
  stream?(request: {
    config: import('./config/index.js').ConsumerConfig;
    input: string;
    systemSuffix?: string;
  }): AsyncIterable<string>;
}

export async function* streamCall(
  flint: Flint,
  consumerId: string,
  input: FlintCallInput,
): AsyncGenerator<StreamChunk, void, undefined> {
  const config = flint.consumers.get(consumerId);
  const adapter = config ? flint.adapterFor(config.provider) : undefined;
  const streamer = adapter as (typeof adapter & StreamingAdapter) | undefined;

  if (config && adapter?.hasCredential() && streamer?.stream) {
    const started = Date.now();
    let emitted = false;
    try {
      for await (const text of streamer.stream({
        config,
        input: input.input,
        ...(input.systemSuffix !== undefined ? { systemSuffix: input.systemSuffix } : {}),
      })) {
        emitted = true;
        yield { text, done: false };
      }
      flint.telemetry.record({
        type: 'call',
        consumer: consumerId,
        provider: config.provider,
        model: config.model,
        latencyMs: Date.now() - started,
        outcome: 'ok',
      });
      yield { text: '', done: true };
      return;
    } catch (cause) {
      // A stream that dies mid-flight falls back to the plain call only if
      // nothing was emitted yet — replaying half a narration would duplicate.
      if (emitted) {
        yield { text: '', done: true };
        return;
      }
      void cause;
    }
  }

  // Degraded path: one chunk, same contract.
  const result = await flint.call(consumerId, input);
  if (result.ok) {
    yield { text: result.value, done: false };
    yield { text: '', done: true };
  } else {
    throw result.error instanceof FlintError ? result.error : new Error(String(result.error));
  }
}
