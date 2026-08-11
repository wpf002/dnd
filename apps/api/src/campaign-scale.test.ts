import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Resolution } from '@lantern/schema';
import {
  completeBook,
  createBookCampaign,
  endCampaignSession,
  startCampaignSession,
  type Campaign,
} from './services/campaign.js';
import {
  chooseOption,
  combatAttack,
  combatFlee,
  restParty,
  visibleOptions,
  type GameSession,
} from './services/game.js';

/**
 * Phase 6 exit criteria, checked literally:
 *
 *   1. one campaign of 3+ books runs end to end, party levelling across them
 *   2. a flag set in Book I visibly changes content in Book III
 *   3. the linter rejects a campaign whose level bands do not chain
 *      (packages/linter/src/campaign.test.ts)
 *   4. a 200-turn simulated run across books produces zero mechanical errors
 *
 * The run is driven by the real services — the same `startCampaignSession`,
 * `chooseOption`, and `endCampaignSession` the routes call. A test that
 * drove a private harness would prove nothing about what actually ships.
 */

const here = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(here, '..', '..', '..', 'content');

const readAdventure = (id: string) =>
  JSON.parse(readFileSync(join(CONTENT, 'adventures', `${id}.json`), 'utf8')) as unknown;
const readCampaign = (id: string) =>
  JSON.parse(readFileSync(join(CONTENT, 'campaigns', `${id}.json`), 'utf8')) as unknown;

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

/**
 * Every resolution a turn produces is schema-valid and internally consistent.
 * The same audit the Phase 1 combat simulation applies, applied to a campaign.
 */
function auditTurn(resolutions: readonly Resolution[]): void {
  for (const res of resolutions) {
    const parsed = Resolution.safeParse(res);
    expect(parsed.success, JSON.stringify(parsed.success ? '' : parsed.error.issues)).toBe(true);
    if (!res.roll) continue;

    const modSum = res.modifiers.reduce((s, m) => s + m.value, 0);
    expect(res.total).toBe(res.roll.natural + modSum);

    const target = res.dc ?? res.ac;
    if (target !== undefined && res.margin !== undefined) {
      expect(res.margin).toBe(res.total! - target);
    }
  }
}

/** Nobody is above their maximum, below zero, or holding negative hit dice. */
function auditParty(session: GameSession): void {
  for (const pc of session.party) {
    expect(pc.hp).toBeGreaterThanOrEqual(0);
    expect(pc.hp).toBeLessThanOrEqual(pc.hpMax);
    expect(pc.hitDiceRemaining).toBeGreaterThanOrEqual(0);
    expect(pc.hitDiceRemaining).toBeLessThanOrEqual(pc.level);
  }
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

interface PlayResult {
  /** Engine turns — recorded resolutions, not driver loop iterations. */
  turns: number;
  reachedEnding: boolean;
}

/**
 * Per-book limits. Generous on purpose: session seeds derive from a global
 * campaign counter, so the dice a book sees depend on how many campaigns the
 * suite created before it. A budget tuned to one lucky seed would pass alone
 * and fail in the suite, which is exactly what a tight budget did.
 */
const STEP_BUDGET = 400;
const REST_BUDGET = 25;

/**
 * Play a session to a terminal beat.
 *
 * The policy is a plausible player rather than an optimal one, because a
 * driver that plays nothing like a player proves nothing about play:
 *
 *  - explore: prefer the option leading somewhere least-visited. Always
 *    taking option 0 cycles between adjacent beats forever.
 *  - rest when hurt: without this the party accumulates damage across every
 *    encounter it re-enters and arrives at the finale on 1 HP, unable to win
 *    the fight that is the only route to an ending.
 *  - fight whoever is up: initiative order belongs to the engine.
 *
 * No randomness anywhere, so a failure replays identically.
 */
function playToEnding(session: GameSession, budget: number): PlayResult {
  const turnsAtStart = session.turns.length;
  let steps = 0;
  let rests = 0;
  const visits = new Map<string, number>();

  while (!session.ended && steps < budget) {
    steps++;

    if (session.combat) {
      // Initiative order is the engine's, not the driver's: act as whoever is
      // actually up. Monster turns resolve inside combatAttack.
      const upNext = session.combat.order[session.combat.turnIndex]!;
      const actor = session.party.find((p) => p.id === upNext && p.hp > 0);
      const target = session.combat.monsters.find((m) => m.hp > 0);
      // Nobody standing, or nothing left to hit: disengage rather than spin.
      const outcome =
        actor && target
          ? combatAttack(session, actor.id, target.combatantId)
          : combatFlee(session);
      auditTurn(outcome.resolutions);
      auditParty(session);
      continue;
    }

    if (rests < REST_BUDGET && session.party.some((p) => p.hp < p.hpMax / 2)) {
      restParty(session, 'long');
      rests++;
      auditParty(session);
      continue;
    }

    const options = visibleOptions(session);
    if (options.length === 0) break;
    visits.set(session.currentBeat, (visits.get(session.currentBeat) ?? 0) + 1);
    const pick = [...options].sort(
      (a, b) => (visits.get(a.target) ?? 0) - (visits.get(b.target) ?? 0),
    )[0]!;
    const outcome = chooseOption(session, pick.id);
    auditTurn(outcome.resolutions);
    auditParty(session);
  }

  return { turns: session.turns.length - turnsAtStart, reachedEnding: session.ended };
}

// ---------------------------------------------------------------------------

describe('the drowned lamp cycle — three books, levels 1 to 7', () => {
  function start(): Campaign {
    return createBookCampaign(readCampaign('the-drowned-lamp-cycle'), readAdventure);
  }

  it('opens at the first book, with a party levelled to its band', () => {
    const campaign = start();
    expect(campaign.progress!.bookIndex).toBe(0);
    expect(campaign.progress!.partyLevel).toBe(1);
    // The pregens are authored at 3; a campaign that opens at 1 opens at 1.
    expect(campaign.party!.every((c) => c.level === 1)).toBe(true);
    expect((campaign.graph as { id: string }).id).toBe('the-false-beacon-of-sablewrack-isle');
  });

  it('runs end to end, levelling the party across every book', async () => {
    const campaign = start();
    const levelsSeen: number[] = [];
    const booksPlayed: string[] = [];
    let totalTurns = 0;

    for (let book = 0; book < 10 && !campaign.completedAt; book++) {
      const current = campaign.book!.books[campaign.progress!.bookIndex]!;
      booksPlayed.push(current.id);
      levelsSeen.push(campaign.progress!.partyLevel);

      // The party enters each book at the level its band declares.
      expect(campaign.party!.every((c) => c.level === current.levelStart)).toBe(true);
      expect((campaign.graph as { id: string }).id).toBe(current.adventure);

      const session = startCampaignSession(campaign);
      const played = playToEnding(session, STEP_BUDGET);
      totalTurns += played.turns;
      expect(played.reachedEnding, `book ${current.id} did not reach an ending`).toBe(true);

      const result = await endCampaignSession(campaign, session, undefined, readAdventure);
      expect(result.transition?.completed.id).toBe(current.id);
      // Levelling on completion is the campaign's, not the session's.
      expect(result.transition!.partyLevel).toBe(current.levelEnd);
    }

    expect(booksPlayed).toEqual([
      'book-i-sablewrack',
      'book-ii-saltmire',
      'book-iii-cindergate',
    ]);
    expect(levelsSeen).toEqual([1, 3, 5]);
    expect(campaign.completedAt).toBeDefined();
    expect(campaign.progress!.completedBooks).toHaveLength(3);
    expect(campaign.party!.every((c) => c.level === 7)).toBe(true);

    // Exit criterion 4: 200+ audited turns across books. Every one of them
    // was checked by auditTurn as it happened; reaching this line means none
    // of them failed.
    expect(totalTurns).toBeGreaterThanOrEqual(200);
  });

  it('carries wounds and hit dice across the book boundary', async () => {
    const campaign = start();
    const session = startCampaignSession(campaign);
    playToEnding(session, STEP_BUDGET);

    const before = session.party.map((p) => ({ id: p.id, hp: p.hp }));
    await endCampaignSession(campaign, session, undefined, readAdventure);

    // Levelling raises the maximum. It does not close the wounds.
    for (const pc of campaign.party!) {
      expect(pc.hp).toBe(before.find((b) => b.id === pc.id)!.hp);
      expect(pc.level).toBe(3);
    }
  });
});

describe('a flag set in Book I changes what Book III offers', () => {
  /** Advance a campaign to its last book without playing, for a controlled comparison. */
  function skipToLastBook(campaign: Campaign, grantAlliance: boolean): Campaign {
    while (!campaign.completedAt && campaign.progress!.bookIndex < 2) {
      const book = campaign.book!.books[campaign.progress!.bookIndex]!;
      if (!grantAlliance) {
        // Drop the alliance from this book's outcome, keeping everything else.
        book.onComplete = book.onComplete.filter((m) => m.flag !== 'allied-wizards');
      }
      completeBook(campaign, readAdventure);
    }
    return campaign;
  }

  /** Every option the Cindergate graph gates on the Ashbound alliance. */
  const ALLIANCE_OPTIONS = ['hidden-trail', 'signal-watchtower', 'use-wizard-key'];

  function optionsAvailableIn(campaign: Campaign): Set<string> {
    const session = startCampaignSession(campaign);
    const seen = new Set<string>();
    // Walk every beat the graph has and ask what it would show, rather than
    // only what this particular path reaches.
    for (const beat of session.graph.beats) {
      session.currentBeat = beat.id;
      for (const opt of visibleOptions(session)) seen.add(opt.id);
    }
    return seen;
  }

  it('opens three otherwise-invisible options when the alliance was earned', () => {
    const withAlliance = optionsAvailableIn(
      skipToLastBook(
        createBookCampaign(readCampaign('the-drowned-lamp-cycle'), readAdventure),
        true,
      ),
    );
    const without = optionsAvailableIn(
      skipToLastBook(
        createBookCampaign(readCampaign('the-drowned-lamp-cycle'), readAdventure),
        false,
      ),
    );

    for (const id of ALLIANCE_OPTIONS) {
      expect(withAlliance.has(id), `'${id}' should be offered to an allied party`).toBe(true);
      expect(without.has(id), `'${id}' should be hidden from an unallied party`).toBe(false);
    }
  });
});

describe('book gates', () => {
  it('skips a book whose entry guard does not hold, rather than stalling', () => {
    const campaign = createBookCampaign(readCampaign('the-drowned-lamp-cycle'), readAdventure);
    // Book II is gated on 'sablewrack-resolved'. Withhold it.
    campaign.book!.books[0]!.onComplete = [];

    const transition = completeBook(campaign, readAdventure)!;
    expect(transition.skipped.map((b) => b.id)).toEqual(['book-ii-saltmire']);
    expect(transition.next?.id).toBe('book-iii-cindergate');
    // Skipped or not, the party still arrives at Book III's start level.
    expect(campaign.progress!.partyLevel).toBe(5);
    expect(campaign.party!.every((c) => c.level === 5)).toBe(true);
  });

  it('refuses to start a session once every book is played', () => {
    const campaign = createBookCampaign(readCampaign('the-drowned-lamp-cycle'), readAdventure);
    while (!campaign.completedAt) completeBook(campaign, readAdventure);
    expect(() => startCampaignSession(campaign)).toThrow(/complete/);
  });
});
