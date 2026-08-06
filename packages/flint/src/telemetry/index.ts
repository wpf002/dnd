import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Flint v3 telemetry — an ndjson call log.
 *
 * One line per event, append-only, no rotation (n=1 tool; delete the file
 * when it bores you). This log is the substrate of the generation benchmark:
 * first-attempt linter pass rate is computed by reading it back, which is
 * exactly why events carry enough to recompute every metric offline —
 * latency, tokens, provider, consumer, outcome.
 */

export interface CallEvent {
  type: 'call';
  at: string;
  consumer: string;
  provider: string;
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  outcome: 'ok' | string; // FlintErrorKind on failure
}

/** App-defined events share the stream — e.g. generation outcomes. */
export interface DomainEvent {
  type: string;
  at: string;
  [key: string]: unknown;
}

export type TelemetryEvent = CallEvent | DomainEvent;

export interface Telemetry {
  record(event: Omit<CallEvent, 'at'> | Omit<DomainEvent, 'at'>): void;
}

export class NdjsonTelemetry implements Telemetry {
  private readonly file: string;
  private prepared = false;

  constructor(options?: { path?: string; filename?: string }) {
    const dir = options?.path ?? process.env.FLINT_TELEMETRY_PATH ?? './telemetry';
    this.file = join(dir, options?.filename ?? 'flint.ndjson');
  }

  get filePath(): string {
    return this.file;
  }

  record(event: Omit<TelemetryEvent, 'at'>): void {
    if (!this.prepared) {
      mkdirSync(dirname(this.file), { recursive: true });
      this.prepared = true;
    }
    const line = JSON.stringify({ ...event, at: new Date().toISOString() });
    appendFileSync(this.file, line + '\n');
  }
}

/** No-op sink for tests and for FLINT_LOG_LEVEL=silent. */
export class NullTelemetry implements Telemetry {
  record(): void {}
}

/** In-memory sink for asserting on events in tests. */
export class MemoryTelemetry implements Telemetry {
  readonly events: TelemetryEvent[] = [];
  record(event: Omit<TelemetryEvent, 'at'>): void {
    this.events.push({ ...event, at: new Date().toISOString() } as TelemetryEvent);
  }
}
