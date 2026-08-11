import { BeatGraph } from '@lantern/schema';
import { IngestedModule } from '@lantern/schema';
import { lintGraph } from '@lantern/linter';
import { callStructured, type Flint, type Telemetry } from '@lantern/flint';
import { mapModuleToGraph, type MappingReport } from './module-mapper.js';

/**
 * Phase 5/7 — module ingestion. Research-grade, and honest about it.
 *
 * Pipeline: module text → IngestedModule (model extraction, `ingest`
 * consumer) → BeatGraph (deterministic mapping, `module-mapper.ts`, no
 * model) → linter (the same gate as everything else) → human-in-the-loop
 * repair (the API returns the candidate graph WITH its lint findings; fixes
 * are resubmitted through the ordinary linter).
 *
 * The mapper is deliberately plain code: when extraction mangles a room, the
 * mangling is visible in the IR and fixable by hand before mapping, which is
 * worth more than a cleverer opaque pipeline.
 */

export { mapModuleToGraph, matchStatblock, type MappingReport } from './module-mapper.js';

// ---------------------------------------------------------------------------
// The pipeline
// ---------------------------------------------------------------------------

export interface IngestResult {
  ok: boolean;
  /** Present even on lint failure — this is the human-in-the-loop handoff. */
  graph?: unknown;
  report?: MappingReport;
  lintErrors: string[];
  lintWarnings: string[];
  stage: 'extraction' | 'mapping' | 'lint' | 'done';
  detail?: string;
}

export async function ingestModule(
  flint: Flint,
  telemetry: Telemetry,
  moduleText: string,
): Promise<IngestResult> {
  const extraction = await callStructured(flint, 'ingest', {
    schema: IngestedModule,
    schemaName: 'IngestedModule',
    maxRepairs: 1,
    input: {
      input: [
        `Extract the structure of this adventure module. Preserve read-aloud text verbatim.`,
        `Room ids must be kebab-case. The first room is the entrance; mark plausible`,
        `conclusion rooms with isEnding. Module text:`,
        moduleText,
      ].join('\n'),
    },
  });

  if (!extraction.ok) {
    telemetry.record({ type: 'ingestion', stage: 'extraction', outcome: 'fail' });
    return {
      ok: false,
      lintErrors: [],
      lintWarnings: [],
      stage: 'extraction',
      detail:
        extraction.kind === 'call-failed'
          ? (extraction.error?.message ?? 'provider call failed')
          : extraction.issues.join('; '),
    };
  }

  const { graph, report } = mapModuleToGraph(extraction.value); // parses at its own boundary
  const lint = lintGraph(graph);

  telemetry.record({
    type: 'ingestion',
    stage: 'done',
    outcome: lint.ok ? 'pass' : 'lint-fail',
    rooms: (graph as { beats: unknown[] }).beats.length,
    unmatchedCreatures: report.unmatchedCreatures.length,
  });

  // The graph is returned in BOTH cases: a lint failure hands the candidate
  // plus its findings to the human repair pass rather than discarding work.
  return {
    ok: lint.ok,
    graph: lint.ok ? BeatGraph.parse(graph) : graph,
    report,
    lintErrors: lint.errors.map((e) => e.message),
    lintWarnings: lint.warnings.map((w) => w.message),
    stage: lint.ok ? 'done' : 'lint',
  };
}
