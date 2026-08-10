import type { BeatGraph, CampaignGraph, Guard } from '@lantern/schema';
import type { Finding } from '../errors.js';
import { checkSolvability } from './solvability.js';

/**
 * Campaign-scale rules — Phase 6.
 *
 * A campaign fails in ways a single adventure cannot. The failures are not
 * hypothetical; they are the specific ones that make a long game fall apart
 * twenty hours in, when it is far too late to fix:
 *
 *  - a level gap between books, so the party walks into Book IV's encounter
 *    math two levels under what it assumed
 *  - a Book VII gate reading a flag no earlier book ever writes, so the
 *    branch the whole campaign was building toward is dead on arrival
 *  - an encounter balanced for the wrong band, because the adventure was
 *    linted standalone against the level-3 pregens
 *
 * Every one of these is statically decidable, which is the entire reason
 * `Guard` is a closed language and books declare their level bands.
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

/** Every flag an adventure graph writes, anywhere. */
function graphWrites(graph: BeatGraph): Set<string> {
  const out = new Set<string>();
  for (const beat of graph.beats) {
    for (const m of beat.onEntry) out.add(m.flag);
    for (const m of beat.onExit) out.add(m.flag);
    for (const opt of beat.options) for (const m of opt.effects) out.add(m.flag);
  }
  return out;
}

/** Every flag an adventure graph reads, anywhere. */
function graphReads(graph: BeatGraph): Set<string> {
  const out = new Set<string>();
  for (const beat of graph.beats) {
    collectGuardFlags(beat.entryWhen, out);
    for (const opt of beat.options) if (opt.visibleWhen) collectGuardFlags(opt.visibleWhen, out);
  }
  for (const edge of graph.edges) collectGuardFlags(edge.when, out);
  for (const enc of graph.encounters) {
    if (enc.victory.kind === 'flag') out.add(enc.victory.flag);
  }
  return out;
}

export function checkCampaign(
  campaign: CampaignGraph,
  adventures?: ReadonlyMap<string, BeatGraph>,
): Finding[] {
  const findings: Finding[] = [];

  // -------------------------------------------------------------------------
  // Book identity
  // -------------------------------------------------------------------------

  const seen = new Set<string>();
  for (const book of campaign.books) {
    if (seen.has(book.id)) {
      findings.push({
        severity: 'error',
        code: 'book-duplicate-id',
        message: `book id '${book.id}' appears more than once — book ids key campaign progress, so a duplicate makes 'which book finished' unanswerable`,
        at: book.id,
      });
    }
    seen.add(book.id);
  }

  // -------------------------------------------------------------------------
  // Level bands
  // -------------------------------------------------------------------------

  for (const book of campaign.books) {
    if (book.levelEnd < book.levelStart) {
      findings.push({
        severity: 'error',
        code: 'level-band-inverted',
        message: `book '${book.id}' ends at level ${book.levelEnd} but starts at ${book.levelStart} — a book cannot level the party down`,
        at: book.id,
      });
    }
  }

  for (let i = 1; i < campaign.books.length; i++) {
    const prev = campaign.books[i - 1]!;
    const book = campaign.books[i]!;
    if (book.levelStart !== prev.levelEnd) {
      const direction = book.levelStart > prev.levelEnd ? 'over' : 'under';
      findings.push({
        severity: 'error',
        code: 'level-band-gap',
        message:
          `book '${book.id}' starts at level ${book.levelStart} but '${prev.id}' ends at ${prev.levelEnd} — ` +
          `the party would arrive ${direction}-levelled for encounter math that assumed otherwise. ` +
          `Set '${book.id}'.levelStart to ${prev.levelEnd}, or change '${prev.id}'.levelEnd to ${book.levelStart}`,
        at: book.id,
      });
    }
  }

  // A campaign whose books never advance anyone is a campaign in name only.
  const first = campaign.books[0]!;
  const last = campaign.books[campaign.books.length - 1]!;
  if (campaign.books.length === 1) {
    findings.push({
      severity: 'warning',
      code: 'campaign-not-campaign-scale',
      message: `campaign '${campaign.id}' has a single book — that is an adventure, not a campaign. Load it as a BeatGraph instead, or add the books that follow it`,
    });
  } else if (last.levelEnd === first.levelStart) {
    findings.push({
      severity: 'warning',
      code: 'campaign-not-campaign-scale',
      message: `campaign '${campaign.id}' begins and ends at level ${first.levelStart} across ${campaign.books.length} books — no advancement means no campaign arc`,
    });
  }

  // -------------------------------------------------------------------------
  // Cross-book flag continuity
  // -------------------------------------------------------------------------

  // Flags a book leaves behind: its own `onComplete`, plus everything its
  // adventure writes (when the adventure is resolvable). Accumulated in book
  // order, because a gate may only read what came *before* it.
  const writtenSoFar = new Set<string>();
  const everWritten = new Set<string>();
  const everRead = new Set<string>();

  for (const book of campaign.books) {
    const gateFlags = new Set<string>();
    collectGuardFlags(book.entryWhen, gateFlags);

    for (const flag of gateFlags) {
      everRead.add(flag);
      if (!writtenSoFar.has(flag)) {
        findings.push({
          severity: 'error',
          code: 'book-gate-unreachable',
          message:
            `book '${book.id}' is gated on flag '${flag}', which no earlier book sets — ` +
            `this book can never be entered. Write '${flag}' in an earlier book's onComplete, or relax the gate`,
          at: book.id,
        });
      }
    }

    // The book's own writes become visible to *later* books only.
    for (const m of book.onComplete) {
      writtenSoFar.add(m.flag);
      everWritten.add(m.flag);
    }
    const graph = adventures?.get(book.adventure);
    if (graph) {
      for (const f of graphWrites(graph)) {
        writtenSoFar.add(f);
        everWritten.add(f);
      }
      for (const f of graphReads(graph)) everRead.add(f);
    }
  }

  // -------------------------------------------------------------------------
  // Declared carry flags
  // -------------------------------------------------------------------------

  for (const flag of campaign.carryFlags) {
    if (!everWritten.has(flag)) {
      findings.push({
        severity: 'error',
        code: 'carry-flag-never-set',
        message:
          `carryFlags declares '${flag}', but no book writes it${adventures ? '' : ' (adventures were not resolved, so only book onComplete mutations were checked)'} — ` +
          `carrying a flag nothing sets means the guards that read it are permanently false`,
      });
    } else if (!everRead.has(flag)) {
      findings.push({
        severity: 'warning',
        code: 'carry-flag-never-read',
        message: `carryFlags declares '${flag}', but nothing reads it — carrying it across books costs ledger space for no effect`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Adventure resolution and per-band solvability
  // -------------------------------------------------------------------------

  if (adventures) {
    for (const book of campaign.books) {
      const graph = adventures.get(book.adventure);
      if (!graph) {
        findings.push({
          severity: 'error',
          code: 'book-adventure-missing',
          message: `book '${book.id}' references adventure '${book.adventure}', which does not exist — add the graph to content/adventures/ or correct the id`,
          at: book.id,
        });
        continue;
      }

      // Re-check the adventure's encounters against the band this book is
      // played at. An adventure that passed standalone against the level-3
      // pregens says nothing about how it plays at level 14 — in either
      // direction.
      for (const finding of checkSolvability(graph, book.levelStart)) {
        if (finding.code !== 'encounter-unwinnable') continue;
        findings.push({
          ...finding,
          message: `book '${book.id}' (levels ${book.levelStart}–${book.levelEnd}): ${finding.message}`,
        });
      }
    }
  }

  return findings;
}
