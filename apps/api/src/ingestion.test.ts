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

  it('reports rooms whose spatial freedom was reshaped — the honest railroad', () => {
    const module = linearModule();
    // A junction with five exits: more spatial freedom than three options hold.
    module.rooms[2]!.connections = ['old-face', 'upper-gallery', 'mine-entrance', 'old-face', 'upper-gallery'];
    const { report } = mapModuleToGraph(module);
    expect(report.reshapedRooms).toContain('flooded-junction');
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
