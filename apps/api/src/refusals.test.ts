import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createSession, freeTextConstraint } from './services/game.js';

/**
 * Shared lines have to work in every adventure.
 *
 * The refusal lines were written when Saltmire was the only adventure — a
 * drowned village on a tidal causeway — and then eighty-two more arrived and
 * kept using them. Being told that "the salt air swallows half-made plans"
 * while standing in the basement of a wizard's tower is a worse immersion
 * break than a plain refusal, because it is confidently about somewhere else.
 */

const SALTMIRE_WORDS = /salt|tide|causeway|village|marsh|gull|sea|harbou?r|bell/i;

const graph = JSON.parse(
  readFileSync(join(process.cwd(), '../../content/adventures/the-bell-at-saltmire.json'), 'utf8'),
);

/** Every line this app can say without an adventure choosing the words. */
function sharedLines(): string[] {
  const routes = readFileSync(join(process.cwd(), 'src/routes/session.ts'), 'utf8');
  const body = routes.slice(routes.indexOf('function refusalLine'));
  const lines = [...body.matchAll(/return\s+'([^']+)'/g)].map((m) => m[1]!);
  expect(lines.length).toBeGreaterThanOrEqual(4);
  return lines;
}

describe('lines every adventure has to live with', () => {
  it('name no place, weather, or landscape', () => {
    for (const line of sharedLines()) {
      expect(line, `refusal line is about somewhere specific: "${line}"`).not.toMatch(
        SALTMIRE_WORDS,
      );
    }
  });

  it('still refuses in fiction rather than as an error', () => {
    for (const line of sharedLines()) {
      expect(line).not.toMatch(/error|invalid|failed|cannot parse|unsupported/i);
      expect(line.length).toBeGreaterThan(30);
    }
  });

  it('does not put Saltmire in the budget-exhausted refusal either', () => {
    const session = createSession(graph, 'refusal-test');
    const beat = session.graph.beats.find((b) => b.id === session.currentBeat)!;
    // Spend the beat's whole improv budget, then ask for one more.
    for (let i = 0; i < beat.improvBudget; i++) freeTextConstraint(session, 'I look around');
    const spent = freeTextConstraint(session, 'I look around again');

    expect(spent.accepted).toBe(false);
    expect(spent.refusal!).not.toMatch(SALTMIRE_WORDS);
    expect(spent.refusal!.length).toBeGreaterThan(30);
  });
});
