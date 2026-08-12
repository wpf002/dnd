/**
 * The run in progress, remembered across reloads.
 *
 * The API has always persisted every session to the database and served
 * `GET /session/:id`. The client never kept the id, so closing the tab lost
 * the game — the state was sitting in the database the whole time with nothing
 * able to name it. For a solo game meant to be played in sittings that is the
 * difference between a toy and a thing you use.
 *
 * Only the id is kept. Everything else here is for the resume card — what to
 * call the run and when it was last touched — so the player is choosing
 * between recognisable things rather than a UUID. The state itself is never
 * mirrored into localStorage: the server owns it, and a stale copy that
 * disagreed with the server would be worse than no copy.
 */

const KEY = 'lantern.run.v1';

export interface SavedRun {
  sessionId: string;
  /** Set when the run is a campaign, so resuming re-enters the book flow. */
  campaignId?: string;
  /** For 'play again' after a one-shot ends. */
  adventureId?: string;
  /** What to call it on the resume card. */
  title: string;
  /** ISO timestamp of the last turn taken. */
  savedAt: string;
}

/** Reading is defensive: a shape from an older build must not break the app. */
export function loadRun(): SavedRun | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<SavedRun>;
    if (typeof value?.sessionId !== 'string' || typeof value.title !== 'string') return null;
    return {
      sessionId: value.sessionId,
      title: value.title,
      savedAt: typeof value.savedAt === 'string' ? value.savedAt : new Date(0).toISOString(),
      ...(typeof value.campaignId === 'string' ? { campaignId: value.campaignId } : {}),
      ...(typeof value.adventureId === 'string' ? { adventureId: value.adventureId } : {}),
    };
  } catch {
    return null;
  }
}

export function saveRun(run: Omit<SavedRun, 'savedAt'>, now = new Date()): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...run, savedAt: now.toISOString() }));
  } catch {
    // Private browsing, a full quota, a browser with storage disabled. Losing
    // resume is a worse session, not a broken one — never let it throw into
    // the middle of a turn.
  }
}

export function clearRun(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // As above.
  }
}

/** "3 minutes ago", for the resume card. */
export function describeAge(savedAt: string, now = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(savedAt).getTime()) / 1000));
  if (seconds < 90) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}
