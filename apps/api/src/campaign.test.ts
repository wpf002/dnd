import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { streamCall, ConsumerRegistry, Flint } from '@lantern/flint';
import type { ProviderAdapter, ProviderRequest, ProviderResponse } from '@lantern/flint';
import {
  buildRecap,
  clockFlags,
  createCampaign,
  endCampaignSession,
  mechanicalDelta,
  startCampaignSession,
  upsertEntry,
} from './services/campaign.js';
import { chooseOption, visibleOptions } from './services/game.js';

const here = dirname(fileURLToPath(import.meta.url));
const saltmire = JSON.parse(
  readFileSync(join(here, '..', '..', '..', 'content', 'adventures', 'the-bell-at-saltmire.json'), 'utf8'),
);

/**
 * Phase 4 exit criteria, headless:
 *  - a campaign survives three sessions with no continuity contradictions
 *  - faction clocks visibly change what's available
 *  - the recap is accurate and reads from the ledger, not a transcript
 */

/** A small graph whose content is gated on ledger-seeded flags. */
function clockGatedGraph() {
  return {
    id: 'return-to-saltmire',
    schemaVersion: 1,
    metadata: {
      title: 'Return to Saltmire',
      premise: 'The village remembers what you did last time.',
      tone: ['gothic-horror'],
      partyLevel: 3,
      narrationVoice: 'As before.',
    },
    entry: 'shore',
    beats: [
      {
        id: 'shore',
        kind: 'threshold',
        title: 'The Shore Again',
        prose: 'The tide knows you.',
        art: 'art-shore-again',
        options: [
          { id: 'walk-in', label: 'Walk in openly', target: 'the-end' },
          {
            id: 'sea-gate',
            label: 'Use the sea gate the cult has now opened',
            target: 'the-end',
            visibleWhen: { op: 'set', flag: 'clock-drowned-cult-filled' },
          },
          {
            id: 'recall-promise',
            label: 'Keep your promise to Old Wend first',
            target: 'the-end',
            visibleWhen: { op: 'set', flag: 'promised-wend' },
          },
        ],
      },
      {
        id: 'the-end',
        kind: 'ending',
        title: 'Ending',
        prose: 'It ends, again.',
        art: 'art-shore-end',
        terminal: true,
        options: [],
      },
    ],
    edges: [],
    encounters: [],
  };
}

describe('the ledger', () => {
  it('upserts by kind+key rather than appending duplicates', () => {
    let ledger = upsertEntry([], { kind: 'flag', flag: 'learned-name', value: true });
    ledger = upsertEntry(ledger, { kind: 'flag', flag: 'learned-name', value: false });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ value: false });

    ledger = upsertEntry(ledger, {
      kind: 'npc_disposition',
      npc: 'old-wend',
      axis: 'trust',
      value: 2,
    });
    ledger = upsertEntry(ledger, {
      kind: 'npc_disposition',
      npc: 'old-wend',
      axis: 'fear',
      value: 1,
    });
    // Same NPC, different axes — both kept. Per NPC per axis, as designed.
    expect(ledger.filter((e) => e.kind === 'npc_disposition')).toHaveLength(2);
  });

  it('derives clock flags including the -filled marker', () => {
    const flags = clockFlags([
      { kind: 'faction_clock', faction: 'drowned-cult', filled: 6, segments: 6, consequence: 'the sea gate opens' },
      { kind: 'faction_clock', faction: 'wend-estate', filled: 1, segments: 4, consequence: 'the chandlery is sold' },
    ]);
    expect(flags['clock-drowned-cult-filled']).toBe(true);
    expect(flags['clock-wend-estate-filled']).toBeUndefined();
    expect(flags['clock-wend-estate']).toBe(1);
  });
});

describe('a campaign across three sessions', () => {
  it('carries flags, advances clocks, and never contradicts itself', async () => {
    const campaign = createCampaign(saltmire, 'Saltmire, revisited');
    campaign.ledger = upsertEntry(campaign.ledger, {
      kind: 'faction_clock',
      faction: 'drowned-cult',
      filled: 0,
      segments: 3,
      consequence: 'the congregation walks at low tide',
    });

    // --- Session 1: learn the keeper's name, then leave.
    const s1 = startCampaignSession(campaign);
    chooseOption(s1, 'cross-now');
    chooseOption(s1, 'wade');
    chooseOption(s1, 'fisher-cottages'); // met-wend set
    chooseOption(s1, 'listen');
    await endCampaignSession(campaign, s1);

    expect(campaign.ledger.some((e) => e.kind === 'flag' && e.flag === 'met-wend')).toBe(true);
    const clock1 = campaign.ledger.find((e) => e.kind === 'faction_clock')!;
    expect(clock1.kind === 'faction_clock' && clock1.filled).toBe(1);

    // --- Session 2: the ledger seeds the flags — Wend is already met.
    const s2 = startCampaignSession(campaign);
    expect(s2.flags['met-wend']).toBe(true); // no continuity contradiction
    chooseOption(s2, 'cross-now');
    chooseOption(s2, 'wade');
    chooseOption(s2, 'graveyard-cut');
    // in combat; flee out to keep the session short
    const { combatFlee } = await import('./services/game.js');
    combatFlee(s2);
    await endCampaignSession(campaign, s2);
    const clock2 = campaign.ledger.find((e) => e.kind === 'faction_clock')!;
    expect(clock2.kind === 'faction_clock' && clock2.filled).toBe(2);

    // --- Session 3: still coherent.
    const s3 = startCampaignSession(campaign);
    expect(s3.flags['met-wend']).toBe(true);
    expect(s3.flags['soaked']).toBe(true); // wading in s2 persisted
    chooseOption(s3, 'cross-now');
    // soaked persisted, so Wend's fire option must be visible on arrival at harbor-row
    chooseOption(s3, 'wade');
    chooseOption(s3, 'fisher-cottages');
    expect(visibleOptions(s3).map((o) => o.id)).toContain('dry-off');
    await endCampaignSession(campaign, s3);

    const clock3 = campaign.ledger.find((e) => e.kind === 'faction_clock')!;
    expect(clock3.kind === 'faction_clock' && clock3.filled).toBe(3); // capped at segments
    expect(campaign.sessions.filter((s) => s.endedAt)).toHaveLength(3);
  });

  it('a filled clock visibly changes available content in the next session', async () => {
    const campaign = createCampaign(clockGatedGraph(), 'Return');
    campaign.ledger = upsertEntry(campaign.ledger, {
      kind: 'faction_clock',
      faction: 'drowned-cult',
      filled: 0,
      segments: 2,
      consequence: 'the sea gate opens',
    });

    // Before the clock fills: the sea gate option is hidden.
    const s1 = startCampaignSession(campaign);
    expect(visibleOptions(s1).map((o) => o.id)).not.toContain('sea-gate');
    chooseOption(s1, 'walk-in');
    await endCampaignSession(campaign, s1); // clock 1/2

    const s2 = startCampaignSession(campaign);
    expect(visibleOptions(s2).map((o) => o.id)).not.toContain('sea-gate');
    chooseOption(s2, 'walk-in');
    await endCampaignSession(campaign, s2); // clock 2/2 — filled

    const s3 = startCampaignSession(campaign);
    expect(visibleOptions(s3).map((o) => o.id)).toContain('sea-gate'); // the world moved
    chooseOption(s3, 'sea-gate');
    await endCampaignSession(campaign, s3);
  });
});

describe('the recap', () => {
  it('reads from the ledger and reports exactly what is there', async () => {
    const campaign = createCampaign(clockGatedGraph(), 'Return');
    campaign.ledger = [
      { kind: 'faction_clock', faction: 'drowned-cult', filled: 1, segments: 3, consequence: 'the sea gate opens' },
      { kind: 'npc_disposition', npc: 'old-wend', axis: 'trust', value: 2 },
      { kind: 'promise', to: 'old-wend', description: 'bring word of his brother', status: 'open' },
      { kind: 'promise', to: 'old-wend', description: 'a kept one', status: 'kept' },
      { kind: 'wound', character: 'pregen-fighter', description: 'crypt chill', severity: 'serious', healed: false },
      { kind: 'flag', flag: 'learned-name', value: true },
    ];
    const s = startCampaignSession(campaign);
    chooseOption(s, 'walk-in');
    await endCampaignSession(campaign, s);

    const recap = buildRecap(campaign);
    expect(recap.sessions).toBe(1);
    expect(recap.clocks[0]).toMatchObject({ faction: 'drowned-cult', filled: 2 }); // advanced on boundary
    expect(recap.dispositions).toEqual([{ npc: 'old-wend', axis: 'trust', value: 2 }]);
    expect(recap.promises).toHaveLength(1); // only open promises
    expect(recap.promises[0]!.description).toBe('bring word of his brother');
    expect(recap.wounds).toHaveLength(1);
    expect(recap.worldFlags.some((f) => f.flag === 'learned-name')).toBe(true);
  });

  it('mechanical compaction records wounds for a battered party', () => {
    const campaign = createCampaign(saltmire, 'x');
    const s = startCampaignSession(campaign);
    s.party = s.party.map((p, i) => (i === 0 ? { ...p, hp: 1 } : p));
    const delta = mechanicalDelta(s);
    const wound = delta.find((e) => e.kind === 'wound');
    expect(wound).toBeDefined();
    expect(wound!.kind === 'wound' && wound!.severity).toBe('serious');
  });
});

describe('flint v4 streaming', () => {
  class StreamingFake implements ProviderAdapter {
    readonly id = 'anthropic';
    hasCredential(): boolean {
      return true;
    }
    call(): Promise<ProviderResponse> {
      return Promise.resolve({ text: 'whole', usage: { inputTokens: 1, outputTokens: 1 }, stopReason: 'end' });
    }
    async *stream(request: ProviderRequest): AsyncIterable<string> {
      void request;
      yield 'The bell ';
      yield 'falls silent.';
    }
  }
  class PlainFake implements ProviderAdapter {
    readonly id = 'anthropic';
    hasCredential(): boolean {
      return true;
    }
    call(): Promise<ProviderResponse> {
      return Promise.resolve({ text: 'all at once', usage: { inputTokens: 1, outputTokens: 1 }, stopReason: 'end' });
    }
  }

  function flintWith(adapter: ProviderAdapter): Flint {
    const registry = new ConsumerRegistry();
    registry.register({ id: 'dm-narration', provider: 'anthropic', model: 'm', system: 'narrate' });
    return new Flint({ registry, adapters: [adapter] });
  }

  it('yields chunks then a done marker', async () => {
    const chunks: string[] = [];
    for await (const c of streamCall(flintWith(new StreamingFake()), 'dm-narration', { input: 'x' })) {
      if (!c.done) chunks.push(c.text);
    }
    expect(chunks.join('')).toBe('The bell falls silent.');
  });

  it('degrades to a single chunk when the adapter cannot stream', async () => {
    const chunks: string[] = [];
    for await (const c of streamCall(flintWith(new PlainFake()), 'dm-narration', { input: 'x' })) {
      if (!c.done) chunks.push(c.text);
    }
    expect(chunks).toEqual(['all at once']);
  });
});
