/**
 * Structured error types, not thrown strings.
 *
 * Callers branch on `kind` — the retry policies in v2 depend on being able to
 * distinguish "the provider timed out" from "the output failed validation"
 * without parsing prose.
 */

export type FlintErrorKind =
  /** Consumer id not present in the registry. */
  | 'unknown-consumer'
  /** No credential configured for the consumer's provider. */
  | 'missing-credential'
  /** The provider rejected the request (4xx other than rate limit). */
  | 'provider-rejected'
  /** Rate limited (429). Retryable with backoff — caller's decision. */
  | 'rate-limited'
  /** Network / 5xx / timeout. Retryable — caller's decision. */
  | 'provider-unavailable'
  /** The model responded, but the output failed the consumer's contract. */
  | 'invalid-output'
  /** Adapter for the consumer's provider is not implemented. */
  | 'provider-unsupported';

export class FlintError extends Error {
  readonly kind: FlintErrorKind;
  readonly consumerId: string;
  readonly provider: string | undefined;
  readonly retryable: boolean;
  override readonly cause: unknown;

  constructor(input: {
    kind: FlintErrorKind;
    consumerId: string;
    message: string;
    provider?: string;
    cause?: unknown;
  }) {
    super(input.message);
    this.name = 'FlintError';
    this.kind = input.kind;
    this.consumerId = input.consumerId;
    this.provider = input.provider;
    this.cause = input.cause;
    this.retryable = input.kind === 'rate-limited' || input.kind === 'provider-unavailable';
  }
}

/** Result union so callers are not forced into try/catch for expected failures. */
export type FlintResult<T> =
  | { ok: true; value: T; usage: TokenUsage }
  | { ok: false; error: FlintError };

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}
