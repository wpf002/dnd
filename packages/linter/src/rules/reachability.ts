import type { BeatGraph } from '@lantern/schema';
import type { Finding } from '../errors.js';

/**
 * Reachability: every beat reachable from entry, every ending reachable, no
 * transition pointing at a beat that does not exist.
 *
 * Guards are treated optimistically — a guarded edge counts as traversable.
 * Whether a guard can ever actually pass is the flag rules' concern; mixing
 * the two analyses would turn reachability into a solver.
 */
export function checkReachability(graph: BeatGraph): Finding[] {
  const findings: Finding[] = [];
  const beatIds = new Set(graph.beats.map((b) => b.id));

  if (!beatIds.has(graph.entry)) {
    findings.push({
      severity: 'error',
      code: 'entry-missing',
      message: `entry beat '${graph.entry}' does not exist in the graph — add it or change 'entry' to one of: ${[...beatIds].join(', ')}`,
    });
    return findings; // nothing else is meaningful without an entry
  }

  // Dangling targets first, so the traversal below can assume valid ids.
  for (const beat of graph.beats) {
    for (const opt of beat.options) {
      if (!beatIds.has(opt.target)) {
        findings.push({
          severity: 'error',
          code: 'option-dangling',
          message: `beat '${beat.id}' option '${opt.id}' targets '${opt.target}', which does not exist`,
          at: beat.id,
        });
      }
      if (opt.requiresCheck && !beatIds.has(opt.requiresCheck.onFailure)) {
        findings.push({
          severity: 'error',
          code: 'option-dangling',
          message: `beat '${beat.id}' option '${opt.id}' sends failures to '${opt.requiresCheck.onFailure}', which does not exist`,
          at: beat.id,
        });
      }
    }
  }
  for (const edge of graph.edges) {
    for (const end of [edge.from, edge.to]) {
      if (!beatIds.has(end)) {
        findings.push({
          severity: 'error',
          code: 'edge-dangling',
          message: `edge ${edge.from} → ${edge.to} references '${end}', which does not exist`,
          at: edge.from,
        });
      }
    }
  }
  const encounterById = new Map(graph.encounters.map((e) => [e.id, e]));
  for (const beat of graph.beats) {
    if (beat.encounter && !encounterById.has(beat.encounter)) {
      findings.push({
        severity: 'error',
        code: 'encounter-missing',
        message: `beat '${beat.id}' references encounter '${beat.encounter}', which is not defined`,
        at: beat.id,
      });
    }
  }
  for (const enc of graph.encounters) {
    for (const [label, target] of [
      ['onVictory', enc.onVictory],
      ['onDefeat', enc.onDefeat],
      ...(enc.onFlee ? ([['onFlee', enc.onFlee]] as const) : []),
    ] as const) {
      if (!beatIds.has(target)) {
        findings.push({
          severity: 'error',
          code: 'encounter-transition-dangling',
          message: `encounter '${enc.id}' ${label} targets '${target}', which does not exist`,
          at: enc.id,
        });
      }
    }
  }

  // BFS from entry over options, edges, and encounter outcomes.
  const adjacency = new Map<string, Set<string>>();
  const link = (from: string, to: string) => {
    if (!beatIds.has(from) || !beatIds.has(to)) return;
    if (!adjacency.has(from)) adjacency.set(from, new Set());
    adjacency.get(from)!.add(to);
  };
  for (const beat of graph.beats) {
    for (const opt of beat.options) {
      link(beat.id, opt.target);
      if (opt.requiresCheck) link(beat.id, opt.requiresCheck.onFailure);
    }
    if (beat.encounter) {
      const enc = encounterById.get(beat.encounter);
      if (enc) {
        link(beat.id, enc.onVictory);
        link(beat.id, enc.onDefeat);
        if (enc.onFlee) link(beat.id, enc.onFlee);
      }
    }
  }
  for (const edge of graph.edges) link(edge.from, edge.to);

  const reachable = new Set<string>([graph.entry]);
  const queue = [graph.entry];
  while (queue.length) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }

  for (const beat of graph.beats) {
    if (!reachable.has(beat.id)) {
      findings.push({
        severity: 'error',
        code: 'beat-unreachable',
        message: `beat '${beat.id}' is unreachable from entry '${graph.entry}' — connect it via an option, edge, or encounter outcome, or remove it`,
        at: beat.id,
      });
    }
  }

  const terminals = graph.beats.filter((b) => b.terminal);
  if (terminals.length === 0) {
    findings.push({
      severity: 'error',
      code: 'no-terminal-beat',
      message: `the graph has no terminal beat — mark at least one ending with "terminal": true`,
    });
  } else if (!terminals.some((t) => reachable.has(t.id))) {
    findings.push({
      severity: 'error',
      code: 'ending-unreachable',
      message: `no terminal beat is reachable from entry '${graph.entry}' — the adventure cannot end (terminals: ${terminals.map((t) => t.id).join(', ')})`,
    });
  }

  return findings;
}
