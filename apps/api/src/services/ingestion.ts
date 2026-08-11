import { BeatGraph } from '@lantern/schema';
import { IngestedFragment, IngestedModule } from '@lantern/schema';
import { lintCampaign, lintGraph } from '@lantern/linter';
import { callStructured, type Flint, type Telemetry } from '@lantern/flint';
import { extractLongModule, renderIndex, type LongExtractReport } from './long-extract.js';
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

  /** Set when the source was long enough to be extracted chunk by chunk. */
  extractionReport?: LongExtractReport;
}

/**
 * Above this, the module is extracted chunk by chunk instead of in one call.
 *
 * The limit is on the *output*, not the input: even with a million tokens of
 * context, three hundred rooms of read-aloud text will not come back complete
 * and correct from a single generation, and a failure leaves nothing to keep.
 */
const LONG_MODULE_CHARS = 24_000;

export async function ingestModule(
  flint: Flint,
  telemetry: Telemetry,
  moduleText: string,
): Promise<IngestResult> {
  if (moduleText.length > LONG_MODULE_CHARS) {
    return ingestLong(flint, telemetry, moduleText);
  }

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

/**
 * The long path: chunk the document, extract each piece with a running index
 * of everything already found, then map the assembled module as usual.
 *
 * The extraction report rides along with the result. A three-hundred-page
 * book will not extract cleanly, and which chunks failed, which rooms were
 * described twice, and which connections pointed at nothing are exactly what
 * the repair pass needs.
 */
async function ingestLong(
  flint: Flint,
  telemetry: Telemetry,
  moduleText: string,
): Promise<IngestResult> {
  const { module, report: extractionReport } = await extractLongModule(
    moduleText,
    'Untitled Module',
    'Extracted from a long source document.',
    async ({ chunk, index, total }) => {
      const result = await callStructured(flint, 'ingest', {
        schema: IngestedFragment,
        schemaName: 'IngestedFragment',
        maxRepairs: 1,
        input: {
          input: [
            `Extract the areas of ONE SECTION of an adventure module — section`,
            `${chunk.index + 1} of ${total}. Other sections are handled separately;`,
            `extract only what is in front of you, and do not invent areas to fill`,
            `gaps. A section with no areas at all (front matter, an appendix, a`,
            `random encounter table) should return no rooms rather than inventing any.`,
            ``,
            `Preserve read-aloud text verbatim. Room ids must be kebab-case.`,
            ``,
            `"connections" is the module's real map: list EVERY area a room leads to,`,
            `including ways back and areas named in an earlier section.`,
            ``,
            `If this section belongs to a chapter, act, or part, fill in "chapters"`,
            `with that one entry and the level band the module prints for it.`,
            ``,
            `Set "title" and "summary" only if this section is the module's title page.`,
            ``,
            renderIndex(index),
            ``,
            `Section text:`,
            chunk.text,
          ].join('\n'),
        },
      });

      if (!result.ok) {
        return {
          ok: false as const,
          detail:
            result.kind === 'call-failed'
              ? (result.error?.message ?? 'provider call failed')
              : result.issues.join('; '),
        };
      }
      return { ok: true as const, value: IngestedFragment.parse(result.value) };
    },
  );

  telemetry.record({
    type: 'ingestion',
    stage: 'extraction',
    outcome: extractionReport.failedChunks.length === 0 ? 'pass' : 'partial',
    chunks: extractionReport.chunks,
    failedChunks: extractionReport.failedChunks.length,
    rooms: extractionReport.rooms,
  });

  // Nothing usable came back. Say so rather than handing the mapper an empty
  // module and letting it fail somewhere less legible.
  const rooms = (module as { rooms: unknown[] }).rooms;
  if (rooms.length < 2) {
    return {
      ok: false,
      lintErrors: [],
      lintWarnings: [],
      stage: 'extraction',
      extractionReport,
      detail: `extracted ${rooms.length} areas from ${extractionReport.chunks} sections (${extractionReport.failedChunks.length} failed) — not enough to map`,
    };
  }

  const chaptered = ((module as { chapters?: unknown[] }).chapters ?? []).length > 0;
  const result = chaptered
    ? ingestChaptered(module, telemetry)
    : (() => {
        const { graph, report } = mapModuleToGraph(module);
        const lint = lintGraph(graph);
        return {
          ok: lint.ok,
          graph: lint.ok ? BeatGraph.parse(graph) : graph,
          report,
          lintErrors: lint.errors.map((e) => e.message),
          lintWarnings: lint.warnings.map((w) => w.message),
          stage: lint.ok ? ('done' as const) : ('lint' as const),
        };
      })();

  return { ...result, extractionReport };
}
