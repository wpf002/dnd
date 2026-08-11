'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Resolution } from '@lantern/schema';
import {
  api,
  type AdventureSummary,
  type BookTransitionView,
  type CampaignGraphSummary,
  type CampaignProgressView,
  type GenerateRequest,
  type Recap,
  type SessionState,
  type TurnResponse,
} from '../lib/api';
import { BeatArt } from './BeatArt';
import { DiceTray } from './DiceTray';

/**
 * The play surface. Phone-first, one column. Renders state; computes nothing —
 * every number on screen was computed by the engine and persisted before the
 * client ever saw it.
 */

export function Game() {
  const [state, setState] = useState<SessionState | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  // Which adventure this session came from, so 'play again' replays the right one.
  const [currentAdventure, setCurrentAdventure] = useState<string | null>(null);
  const [recap, setRecap] = useState<Recap | null>(null);
  // Multi-book state. Null for a one-shot or a single-adventure campaign.
  const [progress, setProgress] = useState<CampaignProgressView | null>(null);
  const [transition, setTransition] = useState<BookTransitionView | null>(null);
  const [narration, setNarration] = useState<string[]>([]);
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [freeText, setFreeText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyTurn = useCallback((response: TurnResponse) => {
    setState(response.state);
    setNarration(response.narration);
    setResolutions(response.resolutions);
  }, []);

  const run = useCallback(
    async (fn: () => Promise<TurnResponse>) => {
      setBusy(true);
      setError(null);
      try {
        applyTurn(await fn());
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [applyTurn],
  );

  const start = useCallback(async (adventure: string) => {
    setBusy(true);
    setError(null);
    try {
      const { state: fresh } = await api.start(adventure);
      setCurrentAdventure(adventure);
      setState(fresh);
      setNarration([]);
      setResolutions([]);
      setRecap(null);
    } catch (err) {
      setError(
        `${(err as Error).message} — is the API running? Start it with: pnpm --filter @lantern/api dev`,
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const startCampaign = useCallback(async (adventure: string) => {
    setBusy(true);
    setError(null);
    try {
      const { campaign } = await api.createCampaign(adventure);
      setCurrentAdventure(adventure);
      setCampaignId(campaign.id);
      const { state: fresh } = await api.campaignSession(campaign.id);
      setState(fresh);
      setNarration([]);
      setResolutions([]);
      setRecap(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  /** A multi-book campaign: many adventures, one party, levels 1 upward. */
  const startBookCampaign = useCallback(async (graphId: string) => {
    setBusy(true);
    setError(null);
    try {
      const { campaign } = await api.createBookCampaign(graphId);
      setCampaignId(campaign.id);
      setCurrentAdventure(null);
      const opened = await api.campaignSession(campaign.id);
      setState(opened.state);
      setProgress(opened.progress ?? null);
      setTransition(null);
      setNarration([]);
      setResolutions([]);
      setRecap(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  const endSession = useCallback(async () => {
    if (!campaignId) return;
    setBusy(true);
    try {
      const res = await api.endCampaignSession(campaignId);
      setProgress(res.progress ?? null);
      setState(null);
      // A book boundary gets its own screen. Without one, levelling and the
      // next book's title would flash past inside the recap.
      if (res.transition) {
        setTransition(res.transition);
        setRecap(null);
      } else {
        setRecap(res.recap);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [campaignId]);

  const nextSession = useCallback(async () => {
    if (!campaignId) return;
    setBusy(true);
    try {
      const opened = await api.campaignSession(campaignId);
      setState(opened.state);
      setProgress(opened.progress ?? progress);
      setRecap(null);
      setTransition(null);
      setNarration([]);
      setResolutions([]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [campaignId, progress]);

  if (!state && transition) {
    return (
      <BetweenBooks
        transition={transition}
        progress={progress}
        busy={busy}
        onContinue={nextSession}
      />
    );
  }

  if (!state && recap) {
    return <RecapScreen recap={recap} busy={busy} onNextSession={nextSession} />;
  }

  if (!state) {
    return (
      <StartScreen
        onStartCampaign={startCampaign}
        onStartBookCampaign={startBookCampaign}
        busy={busy}
        error={error}
        onStart={start}
        onGenerate={(req) =>
          run(async () => {
            const res = await api.generate(req);
            return { state: res.state, resolutions: [], narration: [] };
          })
        }
      />
    );
  }

  const { beat, party, combat } = state;
  const activePc = combat ? party.find((p) => p.id === combat.currentTurn) : undefined;

  return (
    <div className="space-y-4 pb-24">
      {progress && <BookStrip progress={progress} />}

      <BeatArt slot={beat.art} title={beat.title} />

      {/* Prose */}
      <div className="space-y-2">
        <p className="text-sm leading-relaxed">{beat.prose}</p>
        {beat.readAloud && (
          <p className="border-l-2 pl-3 text-sm italic leading-relaxed" style={{ borderColor: 'var(--ember)' }}>
            {beat.readAloud}
          </p>
        )}
      </div>

      {/* Narration of the last turn */}
      {narration.length > 0 && (
        <div className="space-y-1 rounded-md border border-[var(--ink-line)] bg-[var(--ink-raised)] p-3">
          {narration.map((line, i) => (
            <p key={i} className="text-sm leading-relaxed text-[var(--parchment)]">
              {line}
            </p>
          ))}
        </div>
      )}

      {/* The dice tray — every roll, always visible */}
      {resolutions
        .filter((r) => r.roll)
        .map((r, i) => (
          <DiceTray key={i} resolution={r} />
        ))}

      {/* Combat */}
      {combat && (
        <div className="space-y-3 rounded-lg border border-[var(--blood)] p-3">
          <div className="flex justify-between text-xs uppercase tracking-widest text-[var(--muted)]">
            <span>Round {combat.round}</span>
            <span>{activePc ? `${activePc.name}'s turn` : '…'}</span>
          </div>
          <ul className="space-y-1">
            {combat.monsters.map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-sm">
                <span className={m.hp === 0 ? 'line-through text-[var(--muted)]' : ''}>{m.name}</span>
                <HpBar hp={m.hp} hpMax={m.hpMax} />
                {activePc && m.hp > 0 && (
                  <button
                    disabled={busy}
                    onClick={() => run(() => api.attack(state.id, activePc.id, m.id))}
                    className="ml-auto rounded px-2 py-1 text-xs font-semibold"
                    style={{ background: 'var(--blood)', color: 'var(--parchment)' }}
                  >
                    Attack
                  </button>
                )}
              </li>
            ))}
          </ul>
          {/* Healing. Death is permanent, so picking a downed ally up is the
              single most consequential action available in a fight. */}
          {activePc &&
            (() => {
              const dying = party.find((p) => p.hp === 0 && !p.dead);
              const spell = ['healing-word', 'cure-wounds'].find((id) =>
                activePc.prepared?.includes(id),
              );
              const slot = activePc.slots?.remaining.findIndex((n, lvl) => lvl >= 1 && n > 0) ?? -1;
              if (!dying || !spell || slot < 1) return null;
              return (
                <button
                  disabled={busy}
                  onClick={() => run(() => api.cast(state.id, activePc.id, spell, dying.id, slot))}
                  className="w-full rounded-md border border-[var(--success)] p-2 text-sm font-semibold"
                  style={{ color: 'var(--success)' }}
                >
                  Cast {spell.replace(/-/g, ' ')} on {dying.name.split(' ')[0]} (level {slot} slot)
                </button>
              );
            })()}

          <button
            disabled={busy}
            onClick={() => run(() => api.flee(state.id))}
            className="text-xs text-[var(--muted)] underline"
          >
            Flee
          </button>
        </div>
      )}

      {/* Options */}
      {!combat && !state.ended && (
        <div className="space-y-2">
          {beat.options.map((o) => (
            <button
              key={o.id}
              disabled={busy}
              onClick={() => run(() => api.choose(state.id, o.id))}
              className="block w-full rounded-md border border-[var(--ink-line)] bg-[var(--ink-raised)] p-3 text-left text-sm hover:border-[var(--ember)]"
            >
              {o.label}
              {o.check && (
                <span className="ml-2 text-xs text-[var(--ember)]">
                  {o.check.skill ?? o.check.ability} DC {o.check.dc}
                </span>
              )}
            </button>
          ))}

          {/* Free text — the improv channel */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const text = freeText.trim();
              if (!text) return;
              setFreeText('');
              void run(() => api.freeText(state.id, text));
            }}
            className="flex gap-2"
          >
            <input
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Or do something else…"
              className="flex-1 rounded-md border border-[var(--ink-line)] bg-[var(--ink)] p-3 text-sm outline-none focus:border-[var(--ember)]"
            />
            <button
              disabled={busy || !freeText.trim()}
              className="rounded-md px-4 text-sm font-semibold"
              style={{ background: 'var(--ink-raised)', color: 'var(--ember)' }}
            >
              Act
            </button>
          </form>
        </div>
      )}

      {/* Ending */}
      {state.ended && (
        <div className="rounded-lg border border-[var(--ember)] p-4 text-center">
          <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--ember)' }}>
            {beat.title}
          </p>
          {campaignId ? (
            <button onClick={endSession} disabled={busy} className="mt-4 text-sm underline text-[var(--muted)]">
              Close the session — write it to the ledger
            </button>
          ) : (
            <button
              onClick={() => currentAdventure && void start(currentAdventure)}
              disabled={busy || !currentAdventure}
              className="mt-4 text-sm underline text-[var(--muted)]"
            >
              Play again — different choices this time
            </button>
          )}
        </div>
      )}

      {error && <p className="text-sm" style={{ color: 'var(--blood)' }}>{error}</p>}

      {/* Party strip */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--ink-line)] bg-[var(--ink)] p-2">
        <div className="mx-auto flex max-w-2xl justify-between gap-2">
          {party.map((p) => (
            <div key={p.id} className="flex-1 rounded-md bg-[var(--ink-raised)] p-2">
              <div className="flex items-baseline justify-between">
                <span
                  className={`truncate text-xs font-semibold ${p.dead ? 'line-through opacity-60' : ''}`}
                >
                  {p.name.split(' ')[0]}
                </span>
                <span className="text-[10px] text-[var(--muted)]">
                  {p.dead ? 'dead' : `AC ${p.ac}`}
                </span>
              </div>
              <HpBar hp={p.hp} hpMax={p.hpMax} />
              {p.conditions.length > 0 && (
                <span className="text-[10px]" style={{ color: 'var(--blood)' }}>
                  {p.conditions.join(', ')}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StartScreen({
  busy,
  error,
  onStart,
  onStartCampaign,
  onStartBookCampaign,
  onGenerate,
}: {
  busy: boolean;
  error: string | null;
  onStart: (adventure: string) => void;
  onStartCampaign: (adventure: string) => void;
  onStartBookCampaign: (campaign: string) => void;
  onGenerate: (req: GenerateRequest) => void;
}) {
  const [premise, setPremise] = useState('');
  const [setting, setSetting] = useState('');
  const [tone, setTone] = useState('mystery');
  const [adventures, setAdventures] = useState<AdventureSummary[] | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignGraphSummary[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  // Both libraries are whatever passes the linter on disk — there is no
  // hardcoded list to drift out of sync with content/.
  useEffect(() => {
    let live = true;
    api
      .adventures()
      .then((r) => {
        if (!live) return;
        setAdventures(r.adventures);
        setPicked(r.adventures.find((a) => a.playable)?.id ?? null);
      })
      .catch(() => live && setAdventures([]));
    api
      .campaignGraphs()
      .then((r) => live && setCampaigns(r.campaigns))
      .catch(() => live && setCampaigns([]));
    return () => {
      live = false;
    };
  }, []);

  const chosen = adventures?.find((a) => a.id === picked);

  return (
    <div className="mt-8 space-y-8">
      {/* Campaigns first: many books, one party, levels that actually climb. */}
      {campaigns && campaigns.length > 0 && (
        <div>
          <h2 className="text-xs uppercase tracking-widest text-[var(--muted)]">Campaigns</h2>
          <ul className="mt-3 space-y-2">
            {campaigns.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => c.playable && onStartBookCampaign(c.id)}
                  disabled={busy || !c.playable}
                  className="w-full rounded-lg border p-3 text-left transition-colors disabled:opacity-50"
                  style={{ borderColor: c.playable ? 'var(--ember)' : 'var(--ink-line)' }}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold" style={{ color: 'var(--ember)' }}>
                      {c.title ?? c.id}
                    </span>
                    {c.playable ? (
                      <span className="shrink-0 text-xs text-[var(--muted)]">
                        {c.books} books · levels {c.levelStart}–{c.levelEnd}
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs" style={{ color: 'var(--blood)' }}>
                        fails the linter
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">{c.premise ?? c.error}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="text-xs uppercase tracking-widest text-[var(--muted)]">Adventures</h2>

        {adventures === null && <p className="mt-3 text-sm text-[var(--muted)]">Loading…</p>}
        {adventures?.length === 0 && (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Could not reach the API. Start it with:{' '}
            <code className="text-[var(--parchment)]">pnpm --filter @lantern/api dev</code>
          </p>
        )}

        <ul className="mt-3 space-y-2">
          {adventures?.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => a.playable && setPicked(a.id)}
                disabled={!a.playable}
                className="w-full rounded-lg border p-3 text-left transition-colors disabled:opacity-50"
                style={{
                  borderColor: picked === a.id ? 'var(--ember)' : 'var(--ink-line)',
                  background: picked === a.id ? 'var(--ink-raised)' : 'transparent',
                }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold" style={{ color: 'var(--ember)' }}>
                    {a.title ?? a.id}
                  </span>
                  {a.playable ? (
                    <span className="shrink-0 text-xs text-[var(--muted)]">
                      lvl {a.partyLevel} · {a.beats} beats · {a.endings} endings
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs" style={{ color: 'var(--blood)' }}>
                      fails the linter
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">{a.premise ?? a.error}</p>
                {a.tone && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {a.tone.map((t) => (
                      <span
                        key={t}
                        className="rounded border border-[var(--ink-line)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--muted)]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-center gap-3">
          <button
            onClick={() => picked && onStart(picked)}
            disabled={busy || !chosen}
            className="rounded-md px-6 py-3 font-semibold disabled:opacity-40"
            style={{ background: 'var(--ember)', color: 'var(--ink)' }}
          >
            {busy ? 'Beginning…' : 'One-shot'}
          </button>
          <button
            onClick={() => picked && onStartCampaign(picked)}
            disabled={busy || !chosen}
            className="rounded-md border border-[var(--ember)] px-6 py-3 font-semibold disabled:opacity-40"
            style={{ color: 'var(--ember)' }}
          >
            Campaign
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--ink-line)] p-4">
        <h3 className="text-xs uppercase tracking-widest text-[var(--muted)]">
          Or let Flint write one
        </h3>
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (premise.trim().length < 10 || setting.trim().length < 3) return;
            onGenerate({ premise: premise.trim(), setting: setting.trim(), tone: [tone] });
          }}
        >
          <input
            value={premise}
            onChange={(e) => setPremise(e.target.value)}
            placeholder="Premise — one sentence of trouble"
            className="w-full rounded-md border border-[var(--ink-line)] bg-[var(--ink)] p-3 text-sm outline-none focus:border-[var(--ember)]"
          />
          <div className="flex gap-2">
            <input
              value={setting}
              onChange={(e) => setSetting(e.target.value)}
              placeholder="Setting"
              className="flex-1 rounded-md border border-[var(--ink-line)] bg-[var(--ink)] p-3 text-sm outline-none focus:border-[var(--ember)]"
            />
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="rounded-md border border-[var(--ink-line)] bg-[var(--ink)] p-3 text-sm"
            >
              {['mystery', 'gothic-horror', 'heist', 'high-adventure', 'whimsical-fey', 'political-fantasy', 'exploration', 'survival-horror'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <button
            disabled={busy || premise.trim().length < 10}
            className="w-full rounded-md border border-[var(--ember)] p-3 text-sm font-semibold"
            style={{ color: 'var(--ember)' }}
          >
            {busy ? 'Generating — the linter is watching…' : 'Generate & play'}
          </button>
        </form>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Generated adventures pass the same linter as authored ones. Requires a provider key on
          the API.
        </p>
      </div>

      {error && <p className="text-center text-sm" style={{ color: 'var(--blood)' }}>{error}</p>}
    </div>
  );
}

function RecapScreen({
  recap,
  busy,
  onNextSession,
}: {
  recap: Recap;
  busy: boolean;
  onNextSession: () => void;
}) {
  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-xs uppercase tracking-widest text-[var(--muted)]">Previously on…</h2>
      <h3 className="text-xl" style={{ color: 'var(--ember)' }}>
        {recap.title}
      </h3>
      <p className="text-xs text-[var(--muted)]">
        {recap.sessions} session{recap.sessions === 1 ? '' : 's'} played
      </p>

      {recap.clocks.length > 0 && (
        <section>
          <h4 className="mb-1 text-xs uppercase tracking-widest text-[var(--muted)]">The world moves</h4>
          {recap.clocks.map((c) => (
            <div key={c.faction} className="mb-1 text-sm">
              <span className="font-semibold">{c.faction}</span>{' '}
              <span className="text-[var(--ember)]">
                {'●'.repeat(c.filled)}
                {'○'.repeat(Math.max(0, c.segments - c.filled))}
              </span>
              <span className="ml-2 text-xs text-[var(--muted)]">
                {c.filled >= c.segments ? c.consequence : `when it fills: ${c.consequence}`}
              </span>
            </div>
          ))}
        </section>
      )}

      {recap.promises.length > 0 && (
        <section>
          <h4 className="mb-1 text-xs uppercase tracking-widest text-[var(--muted)]">Unkept promises</h4>
          {recap.promises.map((p, i) => (
            <p key={i} className="text-sm">
              To {p.to}: {p.description}
            </p>
          ))}
        </section>
      )}

      {recap.wounds.length > 0 && (
        <section>
          <h4 className="mb-1 text-xs uppercase tracking-widest text-[var(--muted)]">Wounds carried</h4>
          {recap.wounds.map((w, i) => (
            <p key={i} className="text-sm" style={{ color: 'var(--blood)' }}>
              {w.character}: {w.description} ({w.severity})
            </p>
          ))}
        </section>
      )}

      {recap.dispositions.length > 0 && (
        <section>
          <h4 className="mb-1 text-xs uppercase tracking-widest text-[var(--muted)]">Standing with the world</h4>
          {recap.dispositions.map((d, i) => (
            <p key={i} className="text-sm">
              {d.npc} — {d.axis} {d.value >= 0 ? '+' : ''}
              {d.value}
            </p>
          ))}
        </section>
      )}

      <button
        onClick={onNextSession}
        disabled={busy}
        className="w-full rounded-md p-3 font-semibold"
        style={{ background: 'var(--ember)', color: 'var(--ink)' }}
      >
        {busy ? 'The tide turns…' : 'Next session'}
      </button>
    </div>
  );
}

/**
 * Where the party is in the campaign, above the beat.
 *
 * Book N of M and the party level, because those are the two facts a
 * long-campaign player loses track of between sittings.
 */
function BookStrip({ progress }: { progress: CampaignProgressView }) {
  const current = progress.current;
  return (
    <div className="rounded-md border border-[var(--ink-line)] bg-[var(--ink-raised)] px-3 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-xs uppercase tracking-widest text-[var(--muted)]">
          {progress.title}
        </span>
        <span className="shrink-0 text-xs" style={{ color: 'var(--ember)' }}>
          Level {progress.partyLevel}
        </span>
      </div>
      {current && (
        <p className="mt-0.5 truncate text-sm" style={{ color: 'var(--parchment)' }}>
          {current.title}
        </p>
      )}
      <div className="mt-2 flex gap-1">
        {progress.books.map((b) => (
          <div
            key={b.id}
            title={`${b.title} — levels ${b.levelStart}–${b.levelEnd}`}
            className="h-1 flex-1 rounded"
            style={{
              background:
                b.status === 'complete'
                  ? 'var(--success)'
                  : b.status === 'current'
                    ? 'var(--ember)'
                    : 'var(--ink-line)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The book boundary.
 *
 * This screen exists because a level-up is the one moment in a campaign the
 * player most wants to see, and it happens exactly when a book closes. It
 * reports what the engine already did — the levelling is not pending here,
 * it has already been applied and persisted.
 */
function BetweenBooks({
  transition,
  progress,
  busy,
  onContinue,
}: {
  transition: BookTransitionView;
  progress: CampaignProgressView | null;
  busy: boolean;
  onContinue: () => void;
}) {
  const finished = progress?.books.find((b) => b.id === transition.completed);
  const next = progress?.books.find((b) => b.id === transition.next);
  const done = !transition.next;

  return (
    <div className="mt-6 space-y-5">
      <h2 className="text-xs uppercase tracking-widest text-[var(--muted)]">
        {done ? 'The campaign ends' : 'The book closes'}
      </h2>
      <h3 className="text-xl" style={{ color: 'var(--ember)' }}>
        {finished?.title ?? transition.completed}
      </h3>

      <div className="rounded-lg border border-[var(--ember)] p-4">
        <p className="text-sm">
          The party is now{' '}
          <span className="font-semibold" style={{ color: 'var(--ember)' }}>
            level {transition.partyLevel}
          </span>
          .
        </p>
        {transition.featuresGained.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {transition.featuresGained.map((f) => (
              <li key={f} className="text-sm text-[var(--muted)]">
                + {f}
              </li>
            ))}
          </ul>
        )}
        {progress && progress.party.length > 0 && (
          <div className="mt-3 flex gap-2">
            {progress.party.map((p) => (
              <div key={p.id} className="flex-1 rounded-md bg-[var(--ink-raised)] p-2">
                <div className="truncate text-xs font-semibold">{p.name.split(' ')[0]}</div>
                <div className="text-[10px] text-[var(--muted)]">
                  {p.characterClass} {p.level}
                </div>
                <HpBar hp={p.hp} hpMax={p.hpMax} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* A skipped book is a branch not taken, not an error. Say so plainly. */}
      {transition.skipped.length > 0 && (
        <p className="text-sm text-[var(--muted)]">
          Passed over: {transition.skipped.join(', ')} — the way in never opened.
        </p>
      )}

      {done ? (
        <p className="text-sm text-[var(--muted)]">
          Every book is played. The ledger keeps what happened.
        </p>
      ) : (
        <>
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--muted)]">Next</p>
            <p className="text-lg" style={{ color: 'var(--parchment)' }}>
              {next?.title ?? transition.next}
            </p>
            {next && (
              <p className="text-xs text-[var(--muted)]">
                levels {next.levelStart}–{next.levelEnd}
              </p>
            )}
          </div>
          <button
            onClick={onContinue}
            disabled={busy}
            className="w-full rounded-md p-3 font-semibold"
            style={{ background: 'var(--ember)', color: 'var(--ink)' }}
          >
            {busy ? 'The road goes on…' : 'Begin the next book'}
          </button>
        </>
      )}
    </div>
  );
}

function HpBar({ hp, hpMax }: { hp: number; hpMax: number }) {
  const pct = Math.max(0, Math.min(100, (hp / hpMax) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded bg-[var(--ink)]">
      <div
        className="h-full rounded"
        style={{
          width: `${pct}%`,
          background: pct > 50 ? 'var(--success)' : pct > 25 ? 'var(--ember)' : 'var(--blood)',
        }}
      />
    </div>
  );
}
