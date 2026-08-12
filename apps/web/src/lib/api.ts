import type { Resolution } from '@lantern/schema';

/**
 * Thin API client. The web app renders state; it computes nothing.
 * All model calls and all rules live behind the API (invariant 4).
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface OptionView {
  id: string;
  label: string;
  check?: { ability: string; skill?: string; dc: number };
}

export interface PartyMemberView {
  id: string;
  name: string;
  class: string;
  hp: number;
  hpMax: number;
  /** Three failed death saves. Neither healing nor rest clears it. */
  dead: boolean;
  ac: number;
  passivePerception: number;
  conditions: string[];
  slots?: { remaining: number[]; max: number[] };
  /** Prepared spells, so the client can offer the ones it can actually cast. */
  prepared?: string[];
  /** What this character can cast right now — the API decides, not the client. */
  castable?: { id: string; name: string; level: number; slot: number; kind: 'heal' | 'attack' }[];
}

export interface CombatView {
  round: number;
  currentTurn: string | undefined;
  order: string[];
  monsters: { id: string; name: string; hp: number; hpMax: number }[];
}

export interface SessionState {
  id: string;
  title: string;
  ended: boolean;
  beat: {
    id: string;
    kind: string;
    title: string;
    prose: string;
    readAloud?: string;
    art: string;
    improvRemaining: number;
    options: OptionView[];
  };
  party: PartyMemberView[];
  combat: CombatView | null;
  lastTurns: { index: number; rawInput?: string; resolution: Resolution }[];
}

export interface TurnResponse {
  state: SessionState;
  resolutions: Resolution[];
  narration: string[];
  rejected?: { reason: string };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(detail.error ?? `${res.status}`);
  }
  return (await res.json()) as T;
}

async function post<T>(path: string, body?: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(detail.error ?? `${res.status}`);
  }
  return (await res.json()) as T;
}

export interface CreationOptions {
  classes: {
    id: string;
    name: string;
    hitDie: number;
    caster: boolean;
    skills: string[];
    skillCount: number;
  }[];
  lineages: { id: string; name: string; speed: number; size: string }[];
  backgrounds: { id: string; name: string; abilities: string[]; skills: string[] }[];
  standardArray: number[];
}

/** Everything a player picks. Sent to the API, which owns the rules. */
export interface CreationChoices {
  name: string;
  lineage: string;
  characterClass: string;
  background: string;
  abilities: Record<string, number>;
  improvements?: { plusTwo: string; plusOne: string };
  skills?: string[];
  rollSeed?: string;
}

export interface GenerateRequest {
  premise: string;
  setting: string;
  tone: string[];
  partyLevel?: number;
  contentLimits?: string[];
}

export interface Recap {
  title: string;
  sessions: number;
  lastPlayed?: string;
  dispositions: { npc: string; axis: string; value: number }[];
  clocks: { faction: string; filled: number; segments: number; consequence: string }[];
  promises: { to: string; description: string; status: string }[];
  wounds: { character: string; description: string; severity: string }[];
  worldFlags: { flag: string; value: boolean | number | string }[];
}

/** A multi-book campaign on disk, as the start screen lists it. */
export interface CampaignGraphSummary {
  id: string;
  playable: boolean;
  title?: string;
  premise?: string;
  tone?: string[];
  books?: number;
  levelStart?: number;
  levelEnd?: number;
  error?: string;
}

export interface BookView {
  id: string;
  title: string;
  levelStart: number;
  levelEnd: number;
  status: 'complete' | 'current' | 'locked';
}

/**
 * Where a party is in a campaign. Absent on a single-adventure campaign,
 * which is why every consumer treats it as optional rather than defaulting it.
 */
export interface CampaignProgressView {
  campaign: string;
  title: string;
  partyLevel: number;
  bookIndex: number;
  bookCount: number;
  completedBooks: string[];
  completedAt?: string;
  current?: { id: string; title: string; adventure: string; levelStart: number; levelEnd: number };
  books: BookView[];
  party: { id: string; name: string; characterClass: string; level: number; hp: number; hpMax: number }[];
}

/** What happened at a book boundary. Rendered as the between-books screen. */
export interface BookTransitionView {
  completed: string;
  next?: string;
  skipped: string[];
  partyLevel: number;
  featuresGained: string[];
}

export interface AdventureSummary {
  id: string;
  playable: boolean;
  title?: string;
  premise?: string;
  tone?: string[];
  tier?: string;
  /** 'authored', 'flint' (generated), or 'ingested' (a module you own). */
  provenance?: string;
  partyLevel?: number;
  beats?: number;
  encounters?: number;
  endings?: number;
  error?: string;
}

export const api = {
  adventures: () => get<{ adventures: AdventureSummary[] }>('/adventures'),
  creationOptions: () => get<CreationOptions>('/creation'),
  previewCharacter: (choices: CreationChoices) =>
    post<{ character: PartyMemberView & { hpMax: number } }>('/creation/preview', choices),
  rollAbilities: (seed?: string) =>
    post<{ seed: string; scores: { dice: number[]; score: number }[] }>('/creation/roll', { seed }),
  campaignGraphs: () => get<{ campaigns: CampaignGraphSummary[] }>('/campaign-graphs'),
  createCampaign: (adventure?: string, title?: string, character?: CreationChoices) =>
    post<{ campaign: { id: string; title: string } }>('/campaign', { adventure, title, character }),
  /** Multi-book: `campaign` is a campaign graph id, not an adventure id. */
  createBookCampaign: (campaign: string, character?: CreationChoices) =>
    post<{ campaign: { id: string; title: string }; progress: CampaignProgressView }>('/campaign', {
      campaign,
      character,
    }),
  campaignSession: (id: string) =>
    post<{ state: SessionState; progress?: CampaignProgressView }>(`/campaign/${id}/session`),
  endCampaignSession: (id: string) =>
    post<{
      recap: Recap;
      compaction: string;
      transition?: BookTransitionView;
      progress?: CampaignProgressView;
    }>(`/campaign/${id}/end-session`),
  /** An existing session, revived from the database if it is not in memory. */
  session: (id: string) => get<{ state: SessionState }>(`/session/${id}`),
  /** Where a campaign has got to. Used when resuming one mid-book. */
  campaignRecap: (id: string) =>
    get<{ recap: Recap; progress?: CampaignProgressView }>(`/campaign/${id}/recap`),
  start: (adventure?: string, character?: CreationChoices) =>
    post<{ state: SessionState }>('/session', { adventure, character }),
  generate: (req: GenerateRequest) =>
    post<{ state: SessionState; generation: { attempts: number; firstAttemptPassed: boolean } }>(
      '/generate',
      req,
    ),
  choose: (id: string, option: string) => post<TurnResponse>(`/session/${id}/choose`, { option }),
  freeText: (id: string, text: string) => post<TurnResponse>(`/session/${id}/free-text`, { text }),
  attack: (id: string, actor: string, target: string) =>
    post<TurnResponse>(`/session/${id}/attack`, { actor, target }),
  flee: (id: string) => post<TurnResponse>(`/session/${id}/flee`),
  /** Healing only — the API rejects any other spell. */
  cast: (id: string, caster: string, spell: string, target: string, slot?: number) =>
    post<TurnResponse>(`/session/${id}/cast`, { caster, spell, target, slot }),
  rest: (id: string, kind: 'short' | 'long') => post<TurnResponse>(`/session/${id}/rest`, { kind }),
};
