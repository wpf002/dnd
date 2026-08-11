import { describe, expect, it } from 'vitest';
import { ConsumerRegistry, Flint, MemoryTelemetry } from '@lantern/flint';
import type { ProviderAdapter, ProviderRequest, ProviderResponse } from '@lantern/flint';
import { lintGraph } from '@lantern/linter';
import { ingestModule, mapModuleToGraph, matchStatblock } from './services/ingestion.js';
import { createSession, chooseOption, sessionView } from './services/game.js';

/**
 * Phase 5, research-grade: the mapper is deterministic and fully testable
 * without a model; the extraction stage is exercised with a scripted adapter.
 * The honest expectation from the roadmap — spatial modules railroad — is
 * asserted as a *reported* loss, not a silent one.
 */

/** A small linear module, the shape the roadmap says to start with. */
function linearModule() {
  return {
    title: 'The Salt Mine of Kettle Rock',
    summary: 'Miners broke into something old beneath Kettle Rock, and the mine went quiet.',
    rooms: [
      {
        id: 'mine-entrance',
        name: 'The Mine Entrance',
        readAloud: 'The winch house door stands open. The rope is cut.',
        description: 'Abandoned winch house over the main shaft. Tools scattered, no bodies.',
        connections: ['upper-gallery'],
      },
      {
        id: 'upper-gallery',
        name: 'Upper Gallery',
        description: 'Timbered tunnel with ore carts. Scratch marks on the walls, going down.',
        connections: ['flooded-junction', 'mine-entrance'],
        encounter: { creatures: [{ name: 'Giant Rat', count: 3 }] },
      },
      {
        id: 'flooded-junction',
        name: 'Flooded Junction',
        description: 'Waist-deep water where three tunnels meet. A miner\'s lamp still burns on a ledge.',
        connections: ['old-face', 'upper-gallery'],
        npcs: [{ name: 'Derben', role: 'trapped miner', wants: 'to be led out alive' }],
      },
      {
        id: 'old-face',
        name: 'The Old Face',
        readAloud: 'The rock here is carved, not cut. The carvings are older than the mine.',
        description: 'The wall the miners broke through. Something used the breach from the other side.',
        connections: ['the-hollow'],
        encounter: { creatures: [{ name: 'Skeletons', count: 4 }, { name: 'Barrow Wight', count: 1 }] },
      },
      {
        id: 'the-hollow',
        name: 'The Hollow',
        description: 'A burial hollow predating the kingdom. With the wight destroyed, the mine falls quiet.',
        connections: [],
        isEnding: true,
      },
    ],
  };
}

describe('statblock matching', () => {
  it('matches exact, containment, and plural forms', () => {
    expect(matchStatblock('Goblin')).toBe('goblin');
    expect(matchStatblock('giant rat')).toBe('giant-rat');
    expect(matchStatblock('Skeletons')).toBe('skeleton');
    expect(matchStatblock('Barrow Wight')).toBe('wight');
  });

  it('returns undefined for creatures outside the subset', () => {
    expect(matchStatblock('Beholder')).toBeUndefined();
  });
});

describe('the deterministic mapper', () => {
  it('maps a linear module to a graph that passes the linter', () => {
    const { graph, report } = mapModuleToGraph(linearModule());
    const lint = lintGraph(graph);
    expect(lint.errors).toEqual([]);
    expect(lint.ok).toBe(true);
    expect(report.unmatchedCreatures).toEqual([]);
  });

  it('the mapped graph is immediately playable', () => {
    const { graph } = mapModuleToGraph(linearModule());
    const s = createSession(graph, 'ingest-play');
    const view = sessionView(s);
    expect(view.beat.title).toBe('The Mine Entrance');
    expect(view.beat.readAloud).toContain('The rope is cut.');
    chooseOption(s, view.beat.options[0]!.id);
    // upper-gallery has an encounter: combat starts.
    expect(s.combat).not.toBeNull();
  });

  it('marks the mapped graph provenance as ingested', () => {
    const { graph } = mapModuleToGraph(linearModule());
    expect((graph as { metadata: { provenance: string } }).metadata.provenance).toBe('ingested');
  });

  it('substitutes unmatched creatures and REPORTS the substitution', () => {
    const module = linearModule();
    module.rooms[1]!.encounter = { creatures: [{ name: 'Gibbering Mouther', count: 1 }] };
    const { graph, report } = mapModuleToGraph(module);
    expect(report.unmatchedCreatures).toHaveLength(1);
    expect(report.unmatchedCreatures[0]).toMatchObject({
      room: 'upper-gallery',
      name: 'Gibbering Mouther',
      substituted: 'bandit',
    });
    expect(lintGraph(graph).ok).toBe(true); // substitution keeps it playable
  });

  it('keeps every exit of a hub, at the cost of an extra beat', () => {
    const module = linearModule();
    // Five distinct exits: more than three options hold, so the junction is
    // split rather than truncated. The old mapper kept the first three and
    // silently dropped the rest.
    module.rooms.push(
      { id: 'sump', name: 'The Sump', description: 'Black water.', connections: ['flooded-junction'] },
      { id: 'crawl', name: 'The Crawl', description: 'A tight squeeze.', connections: ['flooded-junction'] },
    );
    module.rooms[2]!.connections = ['old-face', 'upper-gallery', 'mine-entrance', 'sump', 'crawl'];

    const { graph, report } = mapModuleToGraph(module);
    expect(report.fannedOut).toContainEqual({ room: 'flooded-junction', exits: 5, extraBeats: 1 });
    expect(report.reshapedRooms).toContain('flooded-junction');

    // Every one of the five is still reachable from the junction.
    const junction = (graph as { beats: Array<{ id: string; options: Array<{ target: string }> }> })
      .beats.filter((b) => b.id.startsWith('flooded-junction'));
    const targets = new Set(junction.flatMap((b) => b.options.map((o) => o.target)));
    for (const exit of ['old-face', 'upper-gallery', 'mine-entrance', 'sump', 'crawl']) {
      expect(targets.has(exit), `exit '${exit}' was dropped`).toBe(true);
    }
    expect(lintGraph(graph).ok).toBe(true);
  });

  it('preserves a loop instead of straightening it into a chain', () => {
    // A ring: every room leads on, and the last leads back to the first. The
    // old mapper walked the array in order, so a ring came out as a line.
    const ring = {
      title: 'The Ring Barrow',
      summary: 'A circular barrow with a chamber at its heart.',
      rooms: [
        { id: 'north-door', name: 'North Door', description: 'A way in.', connections: ['east-arc', 'west-arc'] },
        { id: 'east-arc', name: 'East Arc', description: 'Curving passage.', connections: ['south-vault', 'north-door'] },
        { id: 'west-arc', name: 'West Arc', description: 'Curving passage.', connections: ['south-vault', 'north-door'] },
        { id: 'south-vault', name: 'South Vault', description: 'The heart.', connections: ['heart'] },
        { id: 'heart', name: 'The Heart', description: 'It ends here.', connections: [], isEnding: true },
      ],
    };

    const { graph } = mapModuleToGraph(ring);
    const beats = (graph as { beats: Array<{ id: string; options: Array<{ target: string }> }> }).beats;
    const targetsOf = (id: string) =>
      new Set(beats.find((b) => b.id === id)!.options.map((o) => o.target));

    // Both arcs are reachable from the door, and both lead back to it — the
    // ring is still a ring.
    expect(targetsOf('north-door').has('east-arc')).toBe(true);
    expect(targetsOf('north-door').has('west-arc')).toBe(true);
    expect(targetsOf('east-arc').has('north-door')).toBe(true);
    expect(targetsOf('west-arc').has('north-door')).toBe(true);
    expect(lintGraph(graph).ok).toBe(true);
  });

  it('never produces a beat whose three options are the same bare choice', () => {
    // The old padding repeated a target verbatim, which is a false choice by
    // the linter's own definition. Checked structurally rather than by
    // trusting the linter, because the linter only warns.
    for (const module of [linearModule(), { ...linearModule(), rooms: linearModule().rooms.slice(0, 3).concat([{ id: 'end', name: 'End', description: 'Done.', connections: [], isEnding: true }]) }]) {
      (module.rooms[2] as { connections: string[] }).connections = ['old-face'];
      const { graph } = mapModuleToGraph(module);
      for (const beat of (graph as { beats: Array<{ id: string; options: Array<{ target: string; effects?: unknown[]; requiresCheck?: unknown; visibleWhen?: unknown }> }> }).beats) {
        if (beat.options.length === 0) continue;
        const bare = beat.options.filter(
          (o) => (o.effects ?? []).length === 0 && !o.requiresCheck && !o.visibleWhen,
        );
        const bareTargets = new Set(bare.map((o) => o.target));
        expect(
          bare.length === bareTargets.size,
          `beat '${beat.id}' repeats a bare target: ${bare.map((o) => o.target).join(', ')}`,
        ).toBe(true);
      }
    }
  });

  it('pads a dead end to three options without inventing a destination', () => {
    const module = linearModule();
    module.rooms[3]!.connections = [];
    delete (module.rooms[3] as { encounter?: unknown }).encounter;

    const { graph, report } = mapModuleToGraph(module);
    expect(report.paddedRooms).toContain('old-face');

    const beat = (graph as { beats: Array<{ id: string; options: unknown[] }> }).beats.find(
      (b) => b.id === 'old-face',
    )!;
    expect(beat.options).toHaveLength(3);
  });
});

describe('the full pipeline with a scripted extractor', () => {
  class ScriptedAdapter implements ProviderAdapter {
    readonly id = 'anthropic';
    calls: ProviderRequest[] = [];
    private readonly payload: object;
    constructor(payload: object) {
      this.payload = payload;
    }
    hasCredential(): boolean {
      return true;
    }
    call(request: ProviderRequest): Promise<ProviderResponse> {
      this.calls.push(request);
      return Promise.resolve({
        text: JSON.stringify(this.payload),
        usage: { inputTokens: 1, outputTokens: 1 },
        stopReason: 'end',
      });
    }
  }

  function ingestFlint(adapter: ProviderAdapter): Flint {
    const registry = new ConsumerRegistry();
    registry.register({ id: 'ingest', provider: 'anthropic', model: 'm', system: 'extract', temperature: 0 });
    return new Flint({ registry, adapters: [adapter] });
  }

  it('module text in, linted playable graph out', async () => {
    const telemetry = new MemoryTelemetry();
    const result = await ingestModule(
      ingestFlint(new ScriptedAdapter(linearModule())),
      telemetry,
      'THE SALT MINE OF KETTLE ROCK — an adventure for levels 1-3 …',
    );
    expect(result.ok).toBe(true);
    expect(result.stage).toBe('done');
    expect(result.lintErrors).toEqual([]);
    const event = telemetry.events.find((e) => e.type === 'ingestion')!;
    expect(event.outcome).toBe('pass');
    expect(event.rooms).toBe(5);
  });

  it('a chaptered module comes out as a campaign, not one compressed graph', async () => {
    const chaptered = {
      title: 'The Sunless Compact',
      summary: 'A two-part descent under the salt flats.',
      rooms: [
        { id: 'camp', name: 'Surface Camp', description: 'Tents.', connections: ['shaft'] },
        { id: 'shaft', name: 'The Shaft', description: 'Down.', connections: ['ch1-end', 'camp'] },
        { id: 'ch1-end', name: 'The Sealed Door', description: 'It stops here.', connections: [], isEnding: true },
        { id: 'under-door', name: 'Beyond the Door', description: 'Through.', connections: ['ch2-end'] },
        { id: 'cistern', name: 'The Cistern', description: 'Water.', connections: ['ch2-end', 'under-door'] },
        { id: 'ch2-end', name: 'The Drowned Stair', description: 'The end.', connections: [], isEnding: true },
      ],
      chapters: [
        { id: 'ch1', title: 'Chapter 1', levelStart: 1, levelEnd: 3, rooms: ['camp', 'shaft', 'ch1-end'] },
        { id: 'ch2', title: 'Chapter 2', levelStart: 3, levelEnd: 5, rooms: ['under-door', 'cistern', 'ch2-end'] },
      ],
    };

    const telemetry = new MemoryTelemetry();
    const result = await ingestModule(ingestFlint(new ScriptedAdapter(chaptered)), telemetry, 'text');

    expect(result.ok).toBe(true);
    expect(result.campaign).toBeDefined();
    expect(result.adventures).toHaveLength(2);
    // No single graph, because there is no single graph a two-chapter
    // campaign honestly collapses into.
    expect(result.graph).toBeUndefined();
    expect(result.lintErrors).toEqual([]);

    const event = telemetry.events.find((e) => e.type === 'ingestion')!;
    expect(event.books).toBe(2);
  });

  it('a lint failure still hands the candidate graph to the human repair pass', async () => {
    const broken = linearModule();
    // Ending unreachable: sever the hollow.
    broken.rooms[3]!.connections = [];
    delete (broken.rooms[3] as { encounter?: unknown }).encounter;
    const telemetry = new MemoryTelemetry();
    const result = await ingestModule(ingestFlint(new ScriptedAdapter(broken)), telemetry, 'text');
    expect(result.ok).toBe(false);
    expect(result.stage).toBe('lint');
    expect(result.graph).toBeDefined(); // work is handed over, not discarded
    expect(result.lintErrors.some((e) => e.includes('the-hollow'))).toBe(true);
    // The report names the room to reconnect, so the repair pass does not
    // have to infer it from a lint message.
    expect(result.report!.unreachableRooms).toContain('the-hollow');
  });

  it('an extraction that fails schema twice fails at the extraction stage', async () => {
    const telemetry = new MemoryTelemetry();
    const result = await ingestModule(
      ingestFlint(new ScriptedAdapter({ nonsense: true })),
      telemetry,
      'text',
    );
    expect(result.ok).toBe(false);
    expect(result.stage).toBe('extraction');
  });
});
