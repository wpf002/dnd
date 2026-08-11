import { BeatGraph } from '@lantern/schema';
import { IngestedModule } from '@lantern/schema';
import { lintCampaign, lintGraph } from '@lantern/linter';
import { callStructured, type Flint, type Telemetry } from '@lantern/flint';
import {
  mapModuleToCampaign,
  mapModuleToGraph,
  type CampaignMappingReport,
  type MappingReport,
} from './module-mapper.js';

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

export {
  mapModuleToCampaign,
  mapModuleToGraph,
  matchStatblock,
  type CampaignMappingReport,
  type MappingReport,
} from './module-mapper.js';

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

  /**
   * Set when the source had chapters: a CampaignGraph and one adventure per
   * chapter, instead of a single graph. `graph` stays empty in that case —
   * there is no one graph a multi-chapter campaign collapses into, and
   * pretending otherwise is what the Phase 5 spike did.
   */
  campaign?: unknown;
  adventures?: Array<{ id: string; graph: unknown }>;
  campaignReport?: CampaignMappingReport;
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
        `conclusion rooms with isEnding.`,
        ``,
        `"connections" is the module's real map: list EVERY area a room leads to,`,
        `including ways back. Do not trim it to three and do not order it to suit a`,
        `linear reading — hubs, loops, and dead ends are all preserved downstream,`,
        `and a connection you leave out is a route the players lose.`,
        ``,
        `If the module is divided into chapters, acts, or parts, fill in "chapters":`,
        `one per part, in order, each listing its own room ids and the level band the`,
        `module prints for it. Every room should belong to exactly one chapter. Omit`,
        `"chapters" entirely for a single dungeon or one-shot.`,
        ``,
        `Module text:`,
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

  const extracted = extraction.value as { chapters?: unknown[] };

  // A chaptered module maps onto a campaign; a single dungeon maps onto one
  // graph. Which one is not a mode flag — it is what the source actually is.
  if (extracted.chapters && extracted.chapters.length > 0) {
    return ingestChaptered(extraction.value, telemetry);
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

/**
 * The multi-book path. Every chapter's graph is linted individually and the
 * campaign is linted with them resolved, so a level-band gap or a dead book
 * gate is caught here rather than twenty hours into play.
 *
 * Nothing is discarded on failure: the campaign, every adventure, and every
 * finding go to the repair pass together. A partially-good extraction of a
 * three-hundred-room campaign is worth far more than a clean error.
 */
function ingestChaptered(moduleValue: unknown, telemetry: Telemetry): IngestResult {
  const { campaign, adventures, report } = mapModuleToCampaign(moduleValue);

  const errors: string[] = [];
  const warnings: string[] = [];

  const resolved = new Map<string, unknown>();
  for (const adventure of adventures) {
    const lint = lintGraph(adventure.graph);
    if (lint.ok) resolved.set(adventure.id, adventure.graph);
    for (const finding of lint.errors) errors.push(`${adventure.id}: ${finding.message}`);
    for (const finding of lint.warnings) warnings.push(`${adventure.id}: ${finding.message}`);
  }

  const campaignLint = lintCampaign(campaign, resolved);
  for (const finding of campaignLint.errors) errors.push(`campaign: ${finding.message}`);
  for (const finding of campaignLint.warnings) warnings.push(`campaign: ${finding.message}`);

  const ok = errors.length === 0;
  telemetry.record({
    type: 'ingestion',
    stage: 'done',
    outcome: ok ? 'pass' : 'lint-fail',
    books: adventures.length,
    rooms: adventures.reduce((n, a) => n + (a.graph as { beats: unknown[] }).beats.length, 0),
    unmatchedCreatures: report.books.reduce((n, b) => n + b.report.unmatchedCreatures.length, 0),
  });

  return {
    ok,
    campaign,
    adventures,
    campaignReport: report,
    lintErrors: errors,
    lintWarnings: warnings,
    stage: ok ? 'done' : 'lint',
  };
}
