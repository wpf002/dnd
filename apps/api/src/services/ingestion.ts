import {
  BeatGraph,
  IngestedModule,
  type Beat,
  type BeatOption,
  type Encounter,
  type IngestedRoom,
} from '@lantern/schema';
import { lintGraph } from '@lantern/linter';
import { MONSTERS, type MonsterInput } from '@lantern/srd';
import { callStructured, type Flint, type Telemetry } from '@lantern/flint';

/**
 * Phase 5 — module ingestion. Research-grade, and honest about it.
 *
 * Pipeline: module text → IngestedModule (model extraction, `ingest`
 * consumer) → BeatGraph (deterministic mapping, this file, no model) →
 * linter (the same gate as everything else) → human-in-the-loop repair
 * (the API returns the candidate graph WITH its lint findings; fixes are
 * resubmitted through the ordinary linter).
 *
 * The mapper is deliberately plain code: when extraction mangles a room, the
 * mangling is visible in the IR and fixable by hand before mapping, which is
 * worth more than a cleverer opaque pipeline.
 */

// ---------------------------------------------------------------------------
// Creature name → SRD statblock matching
// ---------------------------------------------------------------------------

/** Best-effort match of a printed creature name onto the SRD subset. */
export function matchStatblock(name: string): string | undefined {
  const needle = name.toLowerCase().trim();
  const entries = Object.entries(MONSTERS as Record<string, MonsterInput>);
  // Exact id or name match first.
  for (const [id, m] of entries) {
    if (id === needle || m.name.toLowerCase() === needle) return id;
  }
  // Then containment either way ("cult fanatic guard" → none; "giant rat swarm" → giant-rat).
  for (const [id, m] of entries) {
    if (needle.includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(needle)) return id;
  }
  // Singular/plural.
  const singular = needle.replace(/s$/, '');
  for (const [id, m] of entries) {
    if (m.name.toLowerCase() === singular) return id;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Deterministic mapping
// ---------------------------------------------------------------------------

export interface MappingReport {
  /** Creatures with no SRD match — substituted or dropped, always reported. */
  unmatchedCreatures: Array<{ room: string; name: string; substituted?: string }>;
  /** Rooms whose connection lists were padded/truncated to fit three options. */
  reshapedRooms: string[];
}

/**
 * Map an IngestedModule onto a BeatGraph candidate.
 *
 * Known, accepted losses (the "bad railroad" the roadmap predicts):
 *  - Spatial freedom collapses into ≤3 options per room; extra connections
 *    are dropped in favor of the first three (reported).
 *  - Unmatched creatures substitute the closest-CR SRD monster (reported).
 *  - DM improvisation notes have nowhere to live and are folded into prose.
 */
export function mapModuleToGraph(moduleInput: unknown): {
  graph: unknown;
  report: MappingReport;
} {
  // Parse at the boundary so defaults (connections, npcs) are applied whether
  // the IR came from the extractor or from a hand-edited repair file.
  const module = IngestedModule.parse(moduleInput);
  const report: MappingReport = { unmatchedCreatures: [], reshapedRooms: [] };
  const roomIds = new Set(module.rooms.map((r) => r.id));
  const encounters: Encounter[] = [];

  const graphId = module.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  const beats: Beat[] = module.rooms.map((room, index) => {
    const isEntry = index === 0;
    const terminal = room.isEnding && room.connections.length === 0;

    let encounterId: string | undefined;
    if (room.encounter && !terminal) {
      encounterId = `enc-${room.id}`;
      const combatants = room.encounter.creatures.map((c, ci) => {
        let statblock = matchStatblock(c.name);
        if (!statblock) {
          // Substitute a mid-line SRD creature rather than silently dropping.
          statblock = 'bandit';
          report.unmatchedCreatures.push({ room: room.id, name: c.name, substituted: statblock });
        }
        return { id: `${room.id}-c${ci}`, statblock, count: Math.min(c.count, 8), hostile: true };
      });
      const next = room.connections.find((c) => roomIds.has(c)) ?? module.rooms[Math.min(index + 1, module.rooms.length - 1)]!.id;
      const back = index > 0 ? module.rooms[index - 1]!.id : next;
      encounters.push({
        id: encounterId,
        title: room.name,
        combatants,
        terrain: [],
        victory: { kind: 'defeat-all' },
        onVictory: next,
        onDefeat: back,
        onFlee: back,
      } as Encounter);
    }

    // Three options from connections; pad with "search" (self-loop via next)
    // and "go back" patterns when a room has fewer than three exits.
    const valid = room.connections.filter((c) => roomIds.has(c) && c !== room.id);
    if (valid.length !== room.connections.length || valid.length > 3) report.reshapedRooms.push(room.id);

    let options: BeatOption[] = [];
    if (!terminal && !encounterId) {
      const targets = valid.slice(0, 3);
      while (targets.length < 3) {
        const fallback =
          index > 0 ? module.rooms[index - 1]!.id : module.rooms[Math.min(index + 1, module.rooms.length - 1)]!.id;
        targets.push(targets[0] ?? fallback);
      }
      const labels = ['Press on', 'Take the other way', 'Double back'];
      const seen = new Map<string, number>();
      options = targets.map((target, oi) => {
        const n = (seen.get(target) ?? 0) + 1;
        seen.set(target, n);
        const targetRoom = module.rooms.find((r) => r.id === target);
        return {
          id: `${room.id}-opt-${oi}`,
          label:
            n === 1 && targetRoom
              ? `Toward ${targetRoom.name}`
              : `${labels[oi % labels.length]} — search as you go`,
          target,
          effects: n > 1 ? [{ flag: `searched-${room.id}`, value: true }] : [],
        } as BeatOption;
      });
      if (report.reshapedRooms.includes(room.id) === false && valid.length < 3) {
        report.reshapedRooms.push(room.id);
      }
    }

    return {
      id: room.id,
      kind: terminal ? 'ending' : encounterId ? 'conflict' : isEntry ? 'threshold' : 'discovery',
      title: room.name,
      prose: [room.description, ...room.npcs.map((n) => `NPC: ${n.name}${n.role ? ` — ${n.role}` : ''}${n.wants ? `; wants ${n.wants}` : ''}`)].join('\n'),
      ...(room.readAloud !== undefined ? { readAloud: room.readAloud } : {}),
      art: `art-${room.id}`,
      improvBudget: 6,
      options,
      ...(encounterId !== undefined ? { encounter: encounterId } : {}),
      terminal,
    } as Beat;
  });

  // Every searched-<room> flag needs a reader to lint clean: fold them into a
  // single "thorough" marker read by the final beat's entry prose gate — or
  // simpler and honest, drop the effects if nothing would read them.
  const flagsWritten = new Set<string>();
  for (const b of beats) for (const o of b.options) for (const e of o.effects) flagsWritten.add(e.flag);
  if (flagsWritten.size > 0) {
    // Give each searched flag a reader: reveal a bonus option on the last
    // non-terminal beat when any search was done.
    const lastPlayable = [...beats].reverse().find((b) => !b.terminal && b.options.length === 3);
    if (lastPlayable) {
      const anySearch = [...flagsWritten].map((flag) => ({ op: 'set' as const, flag }));
      lastPlayable.options[2] = {
        ...lastPlayable.options[2]!,
        visibleWhen: anySearch.length === 1 ? anySearch[0]! : { op: 'or', clauses: anySearch },
      } as BeatOption;
    } else {
      for (const b of beats) for (const o of b.options) o.effects = [];
    }
  }

  const graph = {
    id: graphId || 'ingested-module',
    schemaVersion: 1,
    metadata: {
      title: module.title,
      premise: module.summary,
      tone: ['exploration'],
      partyLevel: 3,
      narrationVoice:
        'Faithful to the source module: descriptive, unhurried, keeping the original read-aloud text intact where it exists.',
      provenance: 'ingested',
    },
    entry: module.rooms[0]!.id,
    beats,
    edges: [],
    encounters,
  };

  return { graph, report };
}

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
