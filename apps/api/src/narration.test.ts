import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { narrate, setNarrationFlint } from './services/narration.js';
import { createSession, freeTextConstraint, chooseOption } from './services/game.js';

/**
 * The narrator has to be told what the player did.
 *
 * A free-text turn resolves to `interact / automatic / no effects`. That is a
 * true statement about consequences and says nothing whatever about the
 * action, so a narrator handed only the resolution fills the gap with whatever
 * the scene suggests. Asking a cleric to shout across the water produced a
 * paragraph about the party walking out onto the causeway — an action nobody
 * took, in a scene the party had not left.
 */

const graph = JSON.parse(
  readFileSync(join(process.cwd(), '../../content/adventures/the-bell-at-saltmire.json'), 'utf8'),
);

/** Captures the prompt instead of calling a model. */
function spy() {
  const seen: string[] = [];
  setNarrationFlint({
    call: async (_id: string, input: { input: string }) => {
      seen.push(input.input);
      return { ok: true as const, value: 'narrated' };
    },
  } as never);
  return seen;
}

beforeEach(() => setNarrationFlint(undefined));
afterEach(() => setNarrationFlint(undefined));

describe('what the narrator is told', () => {
  it("includes the player's own words on a free-text turn", async () => {
    const seen = spy();
    const session = createSession(graph, 'narration-test');
    const outcome = freeTextConstraint(session, 'Sister Maren shouts across the water');

    await narrate(outcome);

    expect(seen[0]).toContain('Sister Maren shouts across the water');
  });

  it('tells it not to substitute a different action', async () => {
    const seen = spy();
    const session = createSession(graph, 'narration-test-2');

    await narrate(freeTextConstraint(session, 'I search the weeds'));

    expect(seen[0]).toMatch(/not substitute a different action/i);
  });

  it('says nothing about player words when there were none', async () => {
    const seen = spy();
    const session = createSession(graph, 'narration-test-3');
    // An option carrying a check, so the turn actually produces a resolution —
    // a turn with none never reaches the model at all.
    const entry = session.graph.beats.find((b) => b.id === session.graph.entry)!;
    const withCheck = entry.options.find((o) => o.requiresCheck)!;

    await narrate(chooseOption(session, withCheck.id));

    expect(seen[0]).toBeDefined();
    expect(seen[0]).not.toMatch(/in their own words/i);
  });

  it('still carries the scene and the outcomes', async () => {
    const seen = spy();
    const session = createSession(graph, 'narration-test-4');

    await narrate(freeTextConstraint(session, 'I listen to the bell'));

    expect(seen[0]).toContain('Scene:');
    expect(seen[0]).toContain('numbers are final');
  });
});
