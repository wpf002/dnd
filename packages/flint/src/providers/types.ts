import type { ConsumerConfig } from '../config/index.js';
import type { TokenUsage } from '../errors.js';

/**
 * The adapter contract. One adapter per provider; the seam picks the adapter
 * from the consumer's config, never from a global default.
 */

export interface ProviderRequest {
  config: ConsumerConfig;
  /** The user-turn content. The system block comes from config. */
  input: string;
  /** Optional per-call system suffix (e.g. the adventure's narration voice). */
  systemSuffix?: string;
}

export interface ProviderResponse {
  text: string;
  usage: TokenUsage;
  /** Provider-reported stop reason, normalized. */
  stopReason: 'end' | 'max-tokens' | 'other';
}

export interface ProviderAdapter {
  readonly id: string;
  /** Whether a credential is available for this adapter. */
  hasCredential(): boolean;
  call(request: ProviderRequest): Promise<ProviderResponse>;
}
