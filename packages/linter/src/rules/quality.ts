import type { BeatGraph } from '@lantern/schema';
import type { Finding } from '../errors.js';

/**
 * Art coverage and choice quality.
 *
 * Art slot *presence* is enforced by the schema (`art` is required on every
 * beat); what the linter adds is duplicate detection — two beats sharing a
 * slot id is almost always a copy-paste error in generated content.
 *
 * False choices come from Vol II Part II §10: a choice is meaningful when
 * outcomes differ. Three options that all lead to the same beat with no state
 * changes and no checks are one option wearing three labels.
 */
export function checkQuality(graph: BeatGraph): Finding[] {
  const findings: Finding[] = [];

  // Duplicate art slots
  const artSeen = new Map<string, string>();
  for (const beat of graph.beats) {
    const prior = artSeen.get(beat.art);
    if (prior) {
      findings.push({
        severity: 'warning',
        code: 'art-slot-duplicate',
        message: `beats '${prior}' and '${beat.id}' share art slot '${beat.art}' — intended reuse is fine, but check this is not a copy-paste error`,
        at: beat.id,
      });
    } else {
      artSeen.set(beat.art, beat.id);
    }
  }

  // False choices
  for (const beat of graph.beats) {
    if (beat.terminal) continue;
    const targets = new Set(beat.options.map((o) => o.target));
    const anyConsequence = beat.options.some(
      (o) => o.effects.length > 0 || o.requiresCheck !== undefined || o.visibleWhen !== undefined,
    );
    if (targets.size === 1 && !anyConsequence) {
      findings.push({
        severity: 'warning',
        code: 'false-choice',
        message: `beat '${beat.id}': all three options lead to '${[...targets][0]}' with no state changes or checks — outcomes do not differ, so this is not a real choice. Differentiate targets, add effects, or gate an option`,
        at: beat.id,
      });
    }
  }

  return findings;
}

/**
 * An adventure where every ending sits a step or two from the entrance.
 *
 * Structurally fine — everything reachable, every beat used — and completely
 * hollow: the party can finish without seeing most of the content. An ingested
 * module hit this squarely, wiring its conclusion as just another exit from
 * the first room; the graph passed clean and a playthrough finished in zero
 * turns.
 *
 * The check deliberately requires EVERY ending to be both close and ungated.
 * A single early "walk away and refuse the job" ending alongside real endings
 * the party has to earn is a legitimate authored choice — the player who wants
 * the adventure simply does not take it — and flagging that fired on seven
 * shipped adventures doing nothing wrong.
 */
export function checkEndingDistance(graph: BeatGraph): Finding[] {
  const MIN_BEATS = 8;
  const TOO_CLOSE = 2;
  if (graph.beats.length < MIN_BEATS) return [];

  // Only transitions a party can take on arrival count. An option behind a
  // `visibleWhen`, or one leading to a beat with an `entryWhen`, represents
  // something that has to be earned first — a gated conclusion is not a
  // one-beat conclusion, and counting it as one made the check fire on a
  // graph that had just been repaired to gate it.
  const guarded = new Set(
    graph.beats.filter((b) => b.entryWhen.op !== 'always').map((b) => b.id),
  );
  const targets = new Map<string, string[]>();
  for (const beat of graph.beats) {
    const out = new Set<string>();
    for (const option of beat.options) {
      if (option.visibleWhen && option.visibleWhen.op !== 'always') continue;
      if (guarded.has(option.target)) continue;
      out.add(option.target);
    }
    for (const edge of graph.edges) {
      if (edge.from === beat.id && !guarded.has(edge.to)) out.add(edge.to);
    }
    for (const encounter of graph.encounters) {
      if (beat.encounter !== encounter.id) continue;
      for (const target of [encounter.onVictory, encounter.onDefeat, encounter.onFlee]) {
        if (target && !guarded.has(target)) out.add(target);
      }
    }
    targets.set(beat.id, [...out]);
  }

  const terminal = new Set(graph.beats.filter((b) => b.terminal).map((b) => b.id));
  if (terminal.size === 0) return [];

  const distance = new Map<string, number>([[graph.entry, 0]]);
  const queue = [graph.entry];
  const reached: Array<{ id: string; at: number }> = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const d = distance.get(id)!;
    if (terminal.has(id)) reached.push({ id, at: d });
    for (const next of targets.get(id) ?? []) {
      if (distance.has(next)) continue;
      distance.set(next, d + 1);
      queue.push(next);
    }
  }
  if (reached.length === 0) return []; // reachability rules own that failure

  // If any ending cannot be walked to without earning something, the
  // adventure has real progression and the early one is a genuine choice —
  // refusing the job, walking away. That pattern is authored deliberately and
  // flagging it fired on shipped content that was doing nothing wrong.
  if (reached.length < terminal.size) return [];

  const furthest = reached.reduce((a, b) => (b.at > a.at ? b : a));
  if (furthest.at > TOO_CLOSE) return [];

  return [
    {
      severity: 'warning',
      code: 'ending-too-close',
      message:
        `every ending is within ${furthest.at} beat${furthest.at === 1 ? '' : 's'} of the entry ` +
        `'${graph.entry}' (${reached.map((r) => `'${r.id}' at ${r.at}`).join(', ')}), but the ` +
        `adventure has ${graph.beats.length} beats — almost all of it can be skipped. Gate an ` +
        `ending behind something the party has to do first`,
      at: furthest.id,
    },
  ];
}
