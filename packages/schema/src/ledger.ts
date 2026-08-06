import { z } from 'zod';
import { Id } from './primitives.js';

/**
 * The campaign state ledger — Phase 4.
 *
 * Structured and queryable, **not a transcript**. Between sessions a
 * summarization pass writes *to the ledger*, and the "Previously on…" recap
 * screen reads *from* it. That is what makes context compaction a structured
 * job with a schema rather than a text squeeze.
 *
 * The design source is Compendium Vol III Ch9 — §VI (Faction Turns) for clocks
 * and §IX (Reputation & Renown) for dispositions. Landing the shape now costs
 * nothing and means Phase 4 is a fill-in rather than a redesign.
 */

export const LedgerKind = z.enum([
  'npc_disposition',
  'faction_clock',
  'promise',
  'flag',
  'inventory',
  'wound',
]);
export type LedgerKind = z.infer<typeof LedgerKind>;

/**
 * Vol III Ch9 §IX reputation scale, −5 Hated to +5 Legendary. Per NPC, per
 * axis — an NPC can trust you and fear you at once, which a single scalar
 * cannot express. Seren Dorran's cracking faith in The Shattered Vale is the
 * motivating case: a slow drift along one axis while others hold steady.
 */
export const DispositionAxis = z.enum(['trust', 'fear', 'respect', 'affection', 'debt', 'faith']);
export type DispositionAxis = z.infer<typeof DispositionAxis>;

export const NpcDisposition = z.object({
  kind: z.literal('npc_disposition'),
  npc: Id,
  axis: DispositionAxis,
  value: z.number().int().min(-5).max(5),
});

/**
 * 4–6 per campaign. Advance on session boundaries and must *visibly* change
 * available content — a clock nothing reads is bookkeeping, and the linter
 * should say so.
 */
export const FactionClock = z.object({
  kind: z.literal('faction_clock'),
  faction: Id,
  /** Current / max segments. */
  filled: z.number().int().min(0),
  segments: z.number().int().min(2).max(12),
  /** What happens when it fills. */
  consequence: z.string().min(1),
});

/** Unresolved commitments the player made. The world remembers. */
export const Promise_ = z.object({
  kind: z.literal('promise'),
  to: Id,
  description: z.string().min(1),
  status: z.enum(['open', 'kept', 'broken', 'expired']).default('open'),
});

export const WorldFlag = z.object({
  kind: z.literal('flag'),
  flag: Id,
  value: z.union([z.boolean(), z.number(), z.string()]),
});

export const CarriedInventory = z.object({
  kind: z.literal('inventory'),
  item: Id,
  quantity: z.number().int().min(0),
});

/** Lasting harm that survives a long rest. */
export const Wound = z.object({
  kind: z.literal('wound'),
  character: Id,
  description: z.string().min(1),
  severity: z.enum(['minor', 'serious', 'grievous']),
  healed: z.boolean().default(false),
});

export const LedgerEntry = z.discriminatedUnion('kind', [
  NpcDisposition,
  FactionClock,
  Promise_,
  WorldFlag,
  CarriedInventory,
  Wound,
]);
export type LedgerEntry = z.infer<typeof LedgerEntry>;

/**
 * Vol III Ch10 §IX — one page, updated every session. This is the recap
 * screen's data source.
 */
export const CampaignDashboard = z.object({
  currentLevel: z.number().int().min(1).max(20),
  currentBeat: Id,
  currentArc: z.string().optional(),
  majorVillainStatus: z.string().optional(),
  openQuests: z.array(z.string()).default([]),
  knownSecrets: z.array(z.string()).default([]),
  recentEvents: z.array(z.string()).default([]),
  playerGoals: z.array(z.string()).default([]),
});
export type CampaignDashboard = z.infer<typeof CampaignDashboard>;
