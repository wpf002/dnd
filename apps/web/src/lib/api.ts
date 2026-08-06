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
  ac: number;
  passivePerception: number;
  conditions: string[];
  slots?: { remaining: number[]; max: number[] };
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

export const api = {
  createCampaign: (adventure?: string, title?: string) =>
    post<{ campaign: { id: string; title: string } }>('/campaign', { adventure, title }),
  campaignSession: (id: string) => post<{ state: SessionState }>(`/campaign/${id}/session`),
  endCampaignSession: (id: string) =>
    post<{ recap: Recap; compaction: string }>(`/campaign/${id}/end-session`),
  start: (adventure?: string) => post<{ state: SessionState }>('/session', { adventure }),
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
  rest: (id: string, kind: 'short' | 'long') => post<TurnResponse>(`/session/${id}/rest`, { kind }),
};
