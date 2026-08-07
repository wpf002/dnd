import Anthropic from '@anthropic-ai/sdk';
import type { ProviderAdapter, ProviderRequest, ProviderResponse } from './types.js';

/**
 * Above this max_tokens, the SDK requires streaming for a single request.
 * Kept well under the SDK's own limit so a config bump doesn't silently
 * reintroduce the failure.
 */
const LONG_REQUEST_TOKEN_THRESHOLD = 8192;

/**
 * Anthropic adapter — the primary provider.
 *
 * The credential comes from the environment at call time, server-side only.
 * This package is never bundled into `apps/web` (invariant 4), and it holds
 * no client instance at module scope so tests can run credential-free.
 */
export class AnthropicAdapter implements ProviderAdapter {
  readonly id = 'anthropic';

  hasCredential(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  /** Flint v4 streaming: yields text deltas as they arrive. */
  async *stream(request: ProviderRequest): AsyncIterable<string> {
    const client = new Anthropic();
    const system: Anthropic.TextBlockParam[] = [
      { type: 'text', text: request.config.system, cache_control: { type: 'ephemeral' } },
      ...(request.systemSuffix ? [{ type: 'text' as const, text: request.systemSuffix }] : []),
    ];
    const stream = client.messages.stream({
      model: request.config.model,
      max_tokens: request.config.maxTokens,
      temperature: request.config.temperature,
      system,
      messages: [{ role: 'user', content: request.input }],
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  async call(request: ProviderRequest): Promise<ProviderResponse> {
    const client = new Anthropic(); // reads ANTHROPIC_API_KEY
    // Flint v3 prompt caching: the consumer's stable system block is marked
    // cacheable; the volatile per-call suffix (voice, scene context, schema
    // instruction) rides in a second, uncached block so it never fragments
    // the cache for the stable prefix.
    const system: Anthropic.TextBlockParam[] = [
      {
        type: 'text',
        text: request.config.system,
        cache_control: { type: 'ephemeral' },
      },
      ...(request.systemSuffix
        ? [{ type: 'text' as const, text: request.systemSuffix }]
        : []),
    ];

    const params = {
      model: request.config.model,
      max_tokens: request.config.maxTokens,
      temperature: request.config.temperature,
      system,
      messages: [{ role: 'user', content: request.input }],
    } satisfies Anthropic.MessageCreateParamsNonStreaming;

    // The SDK refuses a non-streaming request whose max_tokens implies a
    // possible runtime over ten minutes — which the `generator` and `ingest`
    // consumers hit at 32k. Stream those and await the assembled message:
    // the caller's contract is unchanged (one complete response), and the
    // long-request guard is satisfied. Below the threshold, the plain call
    // stays — it is one less moving part on the hot path.
    const response =
      request.config.maxTokens > LONG_REQUEST_TOKEN_THRESHOLD
        ? await client.messages.stream(params).finalMessage()
        : await client.messages.create(params);

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return {
      text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      stopReason:
        response.stop_reason === 'end_turn'
          ? 'end'
          : response.stop_reason === 'max_tokens'
            ? 'max-tokens'
            : 'other',
    };
  }
}
