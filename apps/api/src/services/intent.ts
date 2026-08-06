import { Action, ActionParseResult, type RejectionReason } from '@lantern/schema';
import { callStructured, createLanternFlint, type Flint } from '@lantern/flint';
import type { GameSession } from './game.js';
import { visibleOptions } from './game.js';

/**
 * Free-text → Action, through Flint's `intent-parse` consumer.
 *
 * Retry policy: zero. One call; a bad output surfaces as an explicit
 * rejection, which the game layer renders as in-fiction refusal. Without a
 * provider credential the same rejection path fires — the game is fully
 * playable offline via the three authored options.
 */

let flintInstance: Flint | undefined;

function flint(): Flint {
  flintInstance ??= createLanternFlint();
  return flintInstance;
}

/** Test seam. */
export function setFlint(instance: Flint | undefined): void {
  flintInstance = instance;
}

export async function parseIntent(
  session: GameSession,
  rawInput: string,
): Promise<ActionParseResult> {
  const beat = session.graph.beats.find((b) => b.id === session.currentBeat)!;
  const context = [
    `Current scene: ${beat.title} — ${beat.prose}`,
    `Visible options: ${visibleOptions(session)
      .map((o) => o.label)
      .join(' | ')}`,
    `Party: ${session.party.map((p) => `${p.name} (${p.characterClass}, ${p.hp}/${p.hpMax} HP)`).join(', ')}`,
  ].join('\n');

  const result = await callStructured(flint(), 'intent-parse', {
    schema: ActionParseResult,
    schemaName: 'ActionParseResult',
    maxRepairs: 0, // intent-parse: zero retries, always
    input: {
      input: `Player free-text action: "${rawInput}"`,
      systemSuffix: context,
    },
  });

  if (!result.ok) {
    // Call failed or output invalid → fail closed with a structured rejection.
    const reason: RejectionReason = result.kind === 'call-failed' ? 'unsupported' : 'unintelligible';
    return {
      accepted: false,
      reason,
      detail:
        result.kind === 'call-failed'
          ? `flint: ${result.error?.kind ?? 'unknown'}`
          : `validation: ${result.issues.join('; ')}`,
    };
  }

  // The model's own rejection passes through untouched; an accepted action is
  // re-validated once more at the boundary (defense in depth — Action.parse
  // throws only on a programming error, since callStructured already parsed).
  if (!result.value.accepted) return result.value;
  return { accepted: true, action: Action.parse(result.value.action) };
}
