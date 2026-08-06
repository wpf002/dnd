import type { FastifyInstance } from 'fastify';
import { readFileSync, existsSync } from 'node:fs';
import { createLanternFlint, NdjsonTelemetry, type Flint, type Telemetry } from '@lantern/flint';
import { benchmarkFromEvents, generateAdventure } from '../services/generator.js';
import { createSession, sessionView, type GameSession } from '../services/game.js';

/**
 * Generation routes. Behind a loading screen — latency is free —
 * and a generated graph that passes the linter is immediately playable via
 * the same session machinery as authored content. Same linter, same loop,
 * no special cases: that is the entire point.
 */

const telemetry = new NdjsonTelemetry();
let flintInstance: Flint | undefined;

function flint(): Flint {
  flintInstance ??= createLanternFlint({ telemetry });
  return flintInstance;
}

/** Test seam. */
export function setGeneratorFlint(instance: Flint | undefined): void {
  flintInstance = instance;
}

export function registerGenerateRoutes(
  app: FastifyInstance,
  sessions: Map<string, GameSession>,
): void {
  app.post<{ Body: unknown }>('/generate', async (request, reply) => {
    try {
      const result = await generateAdventure(flint(), telemetry, request.body);
      if (!result.ok) {
        // Fail loudly: the errors are the response body, not a vague 500.
        return reply.code(422).send({
          error: 'generation failed the linter after 3 attempts',
          attempts: result.attempts,
          lintErrors: result.errors,
        });
      }
      // A passing graph becomes a playable session immediately.
      const session = createSession(result.graph);
      sessions.set(session.id, session);
      return {
        state: sessionView(session),
        generation: {
          attempts: result.attempts,
          firstAttemptPassed: result.firstAttemptPassed,
          warnings: result.warnings,
        },
      };
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  app.get('/benchmark', async () => {
    const events = readTelemetry(telemetry);
    return benchmarkFromEvents(events);
  });
}

function readTelemetry(t: NdjsonTelemetry): Array<Record<string, unknown>> {
  if (!existsSync(t.filePath)) return [];
  return readFileSync(t.filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as Record<string, unknown>;
      } catch {
        return {};
      }
    });
}

export type { Telemetry };
