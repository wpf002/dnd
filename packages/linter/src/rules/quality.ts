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
