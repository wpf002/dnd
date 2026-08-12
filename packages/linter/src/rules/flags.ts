import type { BeatGraph, Guard } from '@lantern/schema';
import type { Finding } from '../errors.js';

/**
 * Orphaned flags: no state condition that nothing sets, and (as a warning)
 * no write that nothing ever reads.
 *
 * This is exactly why `Guard` is a tiny closed language rather than an
 * expression string — reads and writes can be enumerated statically.
 */

function collectGuardFlags(guard: Guard, into: Set<string>): void {
  switch (guard.op) {
    case 'always':
    case 'never':
      return;
    case 'and':
    case 'or':
      for (const clause of guard.clauses) collectGuardFlags(clause, into);
      return;
    case 'not':
      collectGuardFlags(guard.clause, into);
      return;
    default:
      into.add(guard.flag);
  }
}

export function checkFlags(graph: BeatGraph): Finding[] {
  const findings: Finding[] = [];

  const read = new Map<string, string[]>(); // flag -> where
  const written = new Map<string, string[]>();

  const addRead = (flag: string, at: string) => {
    if (!read.has(flag)) read.set(flag, []);
    read.get(flag)!.push(at);
  };
  const addWrite = (flag: string, at: string) => {
    if (!written.has(flag)) written.set(flag, []);
    written.get(flag)!.push(at);
  };

  for (const beat of graph.beats) {
    const guardFlags = new Set<string>();
    collectGuardFlags(beat.entryWhen, guardFlags);
    for (const f of guardFlags) addRead(f, `beat '${beat.id}' entryWhen`);

    // A hazard's `avoidedWhen` reads a flag like any other guard: it is how a
    // party that worked out the riddle crosses the trapped floor untouched.
    // Without this the flag the puzzle sets looks like it is never read.
    if (beat.hazard?.avoidedWhen) {
      const hazardFlags = new Set<string>();
      collectGuardFlags(beat.hazard.avoidedWhen, hazardFlags);
      for (const f of hazardFlags) addRead(f, `beat '${beat.id}' hazard avoidedWhen`);
    }

    for (const m of beat.onEntry) addWrite(m.flag, `beat '${beat.id}' onEntry`);
    for (const m of beat.onExit) addWrite(m.flag, `beat '${beat.id}' onExit`);

    for (const opt of beat.options) {
      if (opt.visibleWhen) {
        const optFlags = new Set<string>();
        collectGuardFlags(opt.visibleWhen, optFlags);
        for (const f of optFlags) addRead(f, `beat '${beat.id}' option '${opt.id}'`);
      }
      for (const m of opt.effects) addWrite(m.flag, `beat '${beat.id}' option '${opt.id}'`);
    }
  }

  for (const edge of graph.edges) {
    const edgeFlags = new Set<string>();
    collectGuardFlags(edge.when, edgeFlags);
    for (const f of edgeFlags) addRead(f, `edge ${edge.from} → ${edge.to}`);
  }

  for (const enc of graph.encounters) {
    if (enc.victory.kind === 'flag') addRead(enc.victory.flag, `encounter '${enc.id}' victory condition`);
  }

  // A read with no writer anywhere is a guard that can never pass (or a
  // condition that can never change) — an authoring error.
  for (const [flag, sites] of read) {
    if (!written.has(flag)) {
      findings.push({
        severity: 'error',
        code: 'flag-read-never-set',
        message: `flag '${flag}' is read at ${sites.join('; ')} but nothing in the graph ever sets it — add a mutation that sets '${flag}' or remove the condition`,
      });
    }
  }

  // A write nothing reads is dead weight — a warning, not an error, because
  // ledger-facing flags may be read outside the graph in Phase 4.
  for (const [flag, sites] of written) {
    if (!read.has(flag)) {
      findings.push({
        severity: 'warning',
        code: 'flag-set-never-read',
        message: `flag '${flag}' is set at ${sites.join('; ')} but nothing in the graph reads it — either wire it into a guard or drop it`,
      });
    }
  }

  return findings;
}
