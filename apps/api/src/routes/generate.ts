import type { FastifyInstance } from 'fastify';
import { readFileSync, existsSync } from 'node:fs';
import { createLanternFlint, NdjsonTelemetry, type Flint, type Telemetry } from '@lantern/flint';
import { benchmarkFromEvents, generateAdventure } from '../services/generator.js';
import { ingestModule } from '../services/ingestion.js';
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
        // Fail loudly, and accurately. This message used to hardcode "failed
        // the linter after 3 attempts" regardless of what happened, which
        // misdiagnosed a provider refusal as a content-quality failure and
        // reported an attempt count that was never measured.
        const transport = result.kind === 'call-failed';
        return reply.code(transport ? 502 : 422).send({
          error: transport
            ? `provider call failed after ${result.attempts} attempt(s) — no graph was produced`
            : `generation failed the linter after ${result.attempts} attempt(s)`,
          kind: result.kind,
          attempts: result.attempts,
          // Only a lint failure has lint errors; a transport failure has a
          // provider message, and conflating them is what caused the
          // confusion in the first place.
          ...(transport ? { providerError: result.errors } : { lintErrors: result.errors }),
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

  app.post<{ Body: { text?: string } }>('/ingest', async (request, reply) => {
    const text = request.body?.text?.trim();
    if (!text || text.length < 100) {
      return reply.code(400).send({ error: 'provide the module text (>= 100 chars); PDF-to-text is a front-step outside this API' });
    }
    const result = await ingestModule(flint(), telemetry, text);

    // A chaptered source produces a campaign, not a session. It is not
    // playable from this endpoint: the books have to be written to
    // content/ and started as a campaign, which is a deliberate human step
    // for material the user owns.
    if (result.campaign) {
      return reply.code(result.ok ? 200 : 422).send({
        kind: 'campaign',
        ok: result.ok,
        stage: result.stage,
        campaign: result.campaign,
        adventures: result.adventures,
        report: result.campaignReport,
        lintErrors: result.lintErrors,
        lintWarnings: result.lintWarnings,
      });
    }

    if (result.ok) {
      const session = createSession(result.graph);
      sessions.set(session.id, session);
      return {
        kind: 'adventure',
        state: sessionView(session),
        report: result.report,
        warnings: result.lintWarnings,
      };
    }
    // Human-in-the-loop handoff: candidate graph + findings, 422.
    return reply.code(422).send({
      kind: 'adventure',
      stage: result.stage,
      graph: result.graph,
      report: result.report,
      lintErrors: result.lintErrors,
      detail: result.detail,
    });
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
