import type { ProviderAdapter, ProviderRequest, ProviderResponse } from './types.js';

/**
 * OpenAI adapter — stubbed, per the roadmap. The slot exists so the registry
 * and routing shapes are real from day one; the implementation waits for
 * Flint v3, when routing across providers actually matters.
 */
export class OpenAiAdapter implements ProviderAdapter {
  readonly id = 'openai';

  hasCredential(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  call(request: ProviderRequest): Promise<ProviderResponse> {
    void request;
    return Promise.reject(
      new Error('openai adapter is stubbed until Flint v3 routing — use provider "anthropic"'),
    );
  }
}
