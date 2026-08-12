import { z } from 'zod';

/**
 * Per-consumer config registry.
 *
 * Each consumer owns its own system block, model choice, and parameters —
 * there is no shared global voice. This is Flint finding #1 made structural:
 * a horror one-shot and a comedy heist need opposite registers, and neither
 * is Flint's own assistant voice. The seam carries no voice of its own;
 * every word of persona lives in the consumer's `system` block.
 */

export const ProviderId = z.enum(['anthropic', 'openai']);
export type ProviderId = z.infer<typeof ProviderId>;

export const ConsumerConfig = z.object({
  /** Stable id: 'dm-narration', 'npc-dialogue', 'intent-parse', 'generator'. */
  id: z.string().min(1),
  provider: ProviderId,
  model: z.string().min(1),
  /** The consumer's entire persona. Nothing is prepended or appended. */
  system: z.string().min(1),
  maxTokens: z.number().int().min(1).max(64_000).default(1024),
  temperature: z.number().min(0).max(2).default(1),
});
export type ConsumerConfig = z.infer<typeof ConsumerConfig>;
export type ConsumerConfigInput = z.input<typeof ConsumerConfig>;

export class ConsumerRegistry {
  private readonly consumers = new Map<string, ConsumerConfig>();

  register(config: ConsumerConfigInput): void {
    const parsed = ConsumerConfig.parse(config);
    this.consumers.set(parsed.id, parsed);
  }

  get(id: string): ConsumerConfig | undefined {
    return this.consumers.get(id);
  }

  list(): ConsumerConfig[] {
    return [...this.consumers.values()];
  }
}

/**
 * The four Lantern consumers, registered with placeholder system blocks.
 * Real blocks are authored in Phase 2 — what is fixed now is the *shape*:
 * four isolated personas on one seam, no bleed between them.
 */
export function lanternDefaults(registry: ConsumerRegistry): void {
  registry.register({
    id: 'intent-parse',
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    system:
      'You convert a player\'s free-text intent into a structured Action object, or reject it. ' +
      'You never invent targets, items, or spells not present in the provided context. ' +
      'When uncertain, reject — a wrong action is worse than a refusal.',
    maxTokens: 512,
    temperature: 0,
  });
  registry.register({
    id: 'dm-narration',
    provider: 'anthropic',
    model: 'claude-sonnet-5',
    system:
      'You narrate the outcome of an already-computed game resolution. The numbers are final: ' +
      'you never change, add, or imply mechanical values beyond what the Resolution states. ' +
      'Voice and register are supplied per-adventure in the request.',
    maxTokens: 1024,
    temperature: 1,
  });
  registry.register({
    // The same job as dm-narration, sized and routed for the middle of a
    // fight. A player clicking through a dozen attacks is waiting on every
    // one of them, and a single exchange does not need the larger model — it
    // needs a sentence, quickly. Consumers own their model choice, so this is
    // a consumer rather than a per-call override.
    id: 'dm-narration-brief',
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    system:
      'You narrate one exchange in a fight, in a single sentence. The numbers are final: ' +
      'you never change, add, or imply mechanical values beyond what the Resolution states. ' +
      'Voice and register are supplied per-adventure in the request.',
    maxTokens: 160,
    temperature: 1,
  });
  registry.register({
    id: 'npc-dialogue',
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    system:
      'You speak as a single NPC, in character, using the NPC sheet provided in the request. ' +
      'You reveal information imperfectly: interrupt, deflect, lie, misremember, show bias.',
    maxTokens: 512,
    temperature: 1,
  });
  registry.register({
    id: 'ingest',
    provider: 'anthropic',
    model: 'claude-opus-5',
    system:
      'You extract the structure of a published tabletop adventure from its text: rooms, ' +
      'connections, encounters, NPCs, and read-aloud passages. You preserve read-aloud text ' +
      'verbatim. You never invent rooms or creatures that are not in the source.',
    maxTokens: 32_000,
    temperature: 0,
  });
  registry.register({
    id: 'ingest-fragment',
    provider: 'anthropic',
    model: 'claude-opus-5',
    system:
      'You extract the structure of ONE SECTION of a published tabletop adventure: rooms, ' +
      'connections, encounters, NPCs, and read-aloud passages. You preserve read-aloud text ' +
      'verbatim. You never invent rooms or creatures that are not in the section in front of ' +
      'you, and you reuse ids you are told already exist rather than creating near-duplicates.',
    // A section is not a module. The 32k on `ingest` is sized for a whole
    // document in one call; asking for it per chunk made every chunk stream
    // (the SDK's long-request guard trips above 8k) and turned a five-section
    // extraction into minutes of wall clock for no extra fidelity.
    maxTokens: 8_192,
    temperature: 0,
  });
  registry.register({
    id: 'compaction',
    provider: 'anthropic',
    model: 'claude-sonnet-5',
    system:
      'You summarize a play session into structured ledger entries. You record only what the ' +
      'provided turn log supports — no invention, no embellishment. Dispositions, promises, ' +
      'flags, and wounds; nothing else.',
    maxTokens: 4096,
    temperature: 0,
  });
  registry.register({
    id: 'generator',
    provider: 'anthropic',
    model: 'claude-sonnet-5',
    system:
      'You generate complete BeatGraph JSON for a solo tabletop adventure from a premise. ' +
      'Output must validate against the provided schema; linter errors from prior attempts, ' +
      'when present in the request, are the highest-priority instructions.',
    maxTokens: 32_000,
    temperature: 1,
  });
}
