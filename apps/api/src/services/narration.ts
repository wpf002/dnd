import { createLanternFlint, type Flint } from '@lantern/flint';
import { templateNarration, type TurnOutcome } from './game.js';

/**
 * dm-narration policy: one attempt, one retry, then the templated fallback
 * from the Resolution. Never block a turn on narration.
 *
 * Without a credential the fallback fires immediately — the game plays
 * offline with mechanical prose, which is degraded but honest.
 */

let flintInstance: Flint | undefined;

function flint(): Flint {
  flintInstance ??= createLanternFlint();
  return flintInstance;
}

/** Test seam. */
export function setNarrationFlint(instance: Flint | undefined): void {
  flintInstance = instance;
}

export async function narrate(outcome: TurnOutcome): Promise<string[]> {
  const fallback = outcome.narration.length
    ? outcome.narration
    : outcome.resolutions.map(templateNarration);

  if (outcome.resolutions.length === 0) return fallback;

  const voice = outcome.session.graph.metadata.narrationVoice;
  const limits = outcome.session.graph.metadata.contentLimits;
  const beat = outcome.session.graph.beats.find((b) => b.id === outcome.session.currentBeat);

  const input = [
    `Scene: ${beat?.title ?? 'unknown'} — ${beat?.prose ?? ''}`,
    // Without this the narrator is guessing. A free-text turn resolves to
    // `interact / automatic / no effects`, which describes nothing, so the
    // model filled the gap with whatever the scene suggested and narrated an
    // action the player never took.
    ...(outcome.rawInput
      ? [
          `The player, in their own words: "${outcome.rawInput}"`,
          `Narrate what they attempted. Do not substitute a different action, and do not`,
          `move the party anywhere the outcomes below do not say they moved.`,
        ]
      : []),
    `Mechanical outcomes to narrate (numbers are final; do not alter or invent any):`,
    JSON.stringify(outcome.resolutions),
    `Respond with 1-3 short paragraphs of narration covering these outcomes in order.`,
  ].join('\n');

  const suffix = [
    `Narration voice for this adventure: ${voice}`,
    limits.exclude.length ? `Never depict: ${limits.exclude.join('; ')}.` : '',
    limits.note ?? '',
  ]
    .filter(Boolean)
    .join('\n');

  // One attempt + one retry, then fallback. The loop is the whole policy.
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await flint().call('dm-narration', { input, systemSuffix: suffix });
    if (result.ok && result.value.trim().length > 0) return [result.value.trim()];
    if (!result.ok && !result.error.retryable) break; // no key / rejected: fall back now
  }
  return fallback;
}
