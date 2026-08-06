import Anthropic from '@anthropic-ai/sdk';
import type { ProviderAdapter, ProviderRequest, ProviderResponse } from './types.js';

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

  async call(request: ProviderRequest): Promise<ProviderResponse> {
    const client = new Anthropic(); // reads ANTHROPIC_API_KEY
    const system = request.systemSuffix
      ? `${request.config.system}\n\n${request.systemSuffix}`
      : request.config.system;

    const response = await client.messages.create({
      model: request.config.model,
      max_tokens: request.config.maxTokens,
      temperature: request.config.temperature,
      system,
      messages: [{ role: 'user', content: request.input }],
    });

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
