import { createHash } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProviderAdapter, ProviderRequest, ProviderResponse } from './providers/types.js';

/**
 * `FLINT_REPLAY_MODE=record|replay` — deterministic tests without burning
 * calls.
 *
 * record: pass through to the wrapped adapter and write each response to the
 *         cassette directory, keyed by a hash of the request.
 * replay: serve responses from the cassette; a miss is an error, never a
 *         silent network call — replay must be hermetic.
 * off:    transparent pass-through.
 */

export type ReplayMode = 'off' | 'record' | 'replay';

export function replayModeFromEnv(): ReplayMode {
  const raw = process.env.FLINT_REPLAY_MODE;
  return raw === 'record' || raw === 'replay' ? raw : 'off';
}

function requestKey(request: ProviderRequest): string {
  const h = createHash('sha256');
  h.update(
    JSON.stringify({
      consumer: request.config.id,
      model: request.config.model,
      system: request.config.system,
      suffix: request.systemSuffix ?? '',
      input: request.input,
    }),
  );
  return h.digest('hex').slice(0, 32);
}

export class ReplayAdapter implements ProviderAdapter {
  readonly id: string;
  private readonly inner: ProviderAdapter;
  private readonly mode: ReplayMode;
  private readonly dir: string;

  constructor(inner: ProviderAdapter, options?: { mode?: ReplayMode; dir?: string }) {
    this.inner = inner;
    this.id = inner.id;
    this.mode = options?.mode ?? replayModeFromEnv();
    this.dir = options?.dir ?? join(process.cwd(), '.flint', 'cassettes');
  }

  hasCredential(): boolean {
    // In replay mode no credential is needed — that is the point.
    return this.mode === 'replay' ? true : this.inner.hasCredential();
  }

  async call(request: ProviderRequest): Promise<ProviderResponse> {
    const key = requestKey(request);
    const file = join(this.dir, `${this.id}-${key}.json`);

    if (this.mode === 'replay') {
      if (!existsSync(file)) {
        throw new Error(
          `replay miss for consumer '${request.config.id}' (${file}) — re-run with FLINT_REPLAY_MODE=record`,
        );
      }
      return JSON.parse(readFileSync(file, 'utf8')) as ProviderResponse;
    }

    const response = await this.inner.call(request);

    if (this.mode === 'record') {
      mkdirSync(this.dir, { recursive: true });
      writeFileSync(file, JSON.stringify(response, null, 2));
    }

    return response;
  }
}
