'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Resolution } from '@lantern/schema';
import {
  api,
  type AdventureSummary,
  type CreationChoices,
  type CreationOptions,
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
  // A character the player made. Null means the pregens.
  const [character, setCharacter] = useState<CreationChoices | null>(null);
  const [creationOptions, setCreationOptions] = useState<CreationOptions | null>(null);
  const [creating, setCreating] = useState(false);
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
      const { state: fresh } = await api.start(adventure, character ?? undefined);
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
      const { campaign } = await api.createCampaign(adventure, undefined, character ?? undefined);
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
      const { campaign } = await api.createBookCampaign(graphId, character ?? undefined);
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

  const [pending, setPending] = useState<null | { kind: 'one-shot' | 'campaign' | 'book'; id: string }>(
    null,
  );

  /** Launch whatever the player picked, with whatever character they have. */
  const launch = useCallback(
    (target: { kind: 'one-shot' | 'campaign' | 'book'; id: string }) => {
      if (target.kind === 'one-shot') return start(target.id);
      if (target.kind === 'campaign') return startCampaign(target.id);
      return startBookCampaign(target.id);
    },
    [start, startCampaign, startBookCampaign],
  );

  if (!state && creating && creationOptions) {
    return (
      <CreateCharacter
        options={creationOptions}
        busy={busy}
        onDone={(choices) => {
          setCharacter(choices);
          setCreating(false);
          if (pending) void launch(pending);
        }}
        onCancel={() => {
          setCreating(false);
          if (pending) void launch(pending);
        }}
      />
    );
  }

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
        onStartCampaign={(id) => {
          setPending({ kind: 'campaign', id });
          void startCampaign(id);
        }}
        onStartBookCampaign={(id) => {
          setPending({ kind: 'book', id });
          void startBookCampaign(id);
        }}
        busy={busy}
        error={error}
        character={character}
        onCreateCharacter={async (target) => {
          setPending(target);
          const options = creationOptions ?? (await api.creationOptions());
          setCreationOptions(options);
          setCreating(true);
        }}
        onStart={(id) => {
          setPending({ kind: 'one-shot', id });
          void start(id);
        }}
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
          {/* Spells. The API says what is castable; this only renders it and
              picks a sensible default target — the weakest living enemy for an
              attack, whoever is down for a heal. */}
          {activePc && (activePc.castable?.length ?? 0) > 0 && (
            <div className="space-y-1 border-t border-[var(--ink-line)] pt-2">
              {activePc.castable!.map((spell) => {
                const dying = party.find((p) => p.hp === 0 && !p.dead);
                const hurt = [...party]
                  .filter((p) => !p.dead && p.hp < p.hpMax)
                  .sort((a, b) => a.hp - b.hp)[0];
                const enemy = [...combat.monsters]
                  .filter((m) => m.hp > 0)
                  .sort((a, b) => a.hp - b.hp)[0];
                const target = spell.kind === 'heal' ? (dying ?? hurt) : enemy;
                if (!target) return null;
                return (
                  <button
                    key={spell.id}
                    disabled={busy}
                    onClick={() =>
                      run(() => api.cast(state.id, activePc.id, spell.id, target.id, spell.slot))
                    }
                    className="flex w-full items-baseline justify-between rounded-md border p-2 text-left text-sm"
                    style={{
                      borderColor: spell.kind === 'heal' ? 'var(--success)' : 'var(--ember)',
                      color: spell.kind === 'heal' ? 'var(--success)' : 'var(--ember)',
                    }}
                  >
                    <span>
                      {spell.name} <span className="opacity-60">on {target.name.split(' ')[0]}</span>
                    </span>
                    <span className="text-[10px] uppercase tracking-wider opacity-60">
                      {spell.level === 0 ? 'cantrip' : `level ${spell.slot} slot`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

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
  character,
  onCreateCharacter,
}: {
  busy: boolean;
  error: string | null;
  onStart: (adventure: string) => void;
  onStartCampaign: (adventure: string) => void;
  onStartBookCampaign: (campaign: string) => void;
  onGenerate: (req: GenerateRequest) => void;
  character: CreationChoices | null;
  onCreateCharacter: (target: { kind: 'one-shot' | 'campaign' | 'book'; id: string }) => void;
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
                      {a.provenance === 'ingested' && (
                        <span className="mr-2" style={{ color: 'var(--ember)' }}>
                          ingested
                        </span>
                      )}
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

        <div className="mt-4 rounded-lg border border-[var(--ink-line)] p-3 text-center">
          {character ? (
            <p className="text-sm">
              Playing as{' '}
              <span style={{ color: 'var(--ember)' }}>{character.name}</span>, a{' '}
              {character.lineage} {character.characterClass}.{' '}
              <button
                onClick={() => picked && onCreateCharacter({ kind: 'one-shot', id: picked })}
                className="underline text-[var(--muted)]"
              >
                change
              </button>
            </p>
          ) : (
            <button
              onClick={() => picked && onCreateCharacter({ kind: 'one-shot', id: picked })}
              disabled={!picked}
              className="text-sm underline text-[var(--muted)] disabled:opacity-40"
            >
              Make your own character, or play the four pregens
            </button>
          )}
        </div>

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

/**
 * Character creation.
 *
 * The API owns every rule here — which abilities a background improves, which
 * skills a class may take, what the sheet comes out as. This screen collects
 * choices and shows what they produce, and the preview it displays is the
 * same object the session will be built from.
 */
function CreateCharacter({
  options,
  busy,
  onDone,
  onCancel,
}: {
  options: CreationOptions;
  busy: boolean;
  onDone: (choices: CreationChoices) => void;
  onCancel: () => void;
}) {
  const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
  const [name, setName] = useState('');
  const [lineage, setLineage] = useState(options.lineages[0]?.id ?? '');
  const [characterClass, setCharacterClass] = useState(options.classes[0]?.id ?? '');
  const [background, setBackground] = useState(options.backgrounds[0]?.id ?? '');
  const [assigned, setAssigned] = useState<Record<string, number>>(
    Object.fromEntries(ABILITIES.map((a, i) => [a, options.standardArray[i] ?? 10])),
  );
  const [preview, setPreview] = useState<{ hpMax: number; name: string } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const chosenBackground = options.backgrounds.find((b) => b.id === background);
  const [plusTwo, setPlusTwo] = useState(chosenBackground?.abilities[0] ?? 'str');
  const [plusOne, setPlusOne] = useState(chosenBackground?.abilities[1] ?? 'dex');

  const choices: CreationChoices = {
    name: name.trim() || 'Unnamed',
    lineage,
    characterClass,
    background,
    abilities: assigned,
    improvements: { plusTwo, plusOne },
  };

  // Show what the choices produce before committing twenty levels to them.
  useEffect(() => {
    let live = true;
    api
      .previewCharacter(choices)
      .then((r) => {
        if (!live) return;
        setPreview(r.character);
        setProblem(null);
      })
      .catch((err) => live && setProblem((err as Error).message));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, lineage, characterClass, background, JSON.stringify(assigned), plusTwo, plusOne]);

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-[var(--muted)]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );

  const select = 'w-full rounded-md border border-[var(--ink-line)] bg-[var(--ink)] p-3 text-sm';

  return (
    <div className="mt-6 space-y-4 pb-24">
      <h2 className="text-xs uppercase tracking-widest text-[var(--muted)]">Make a character</h2>

      <Row label="Name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Who are you?"
          className={select}
        />
      </Row>

      <div className="grid grid-cols-2 gap-3">
        <Row label="Species">
          <select value={lineage} onChange={(e) => setLineage(e.target.value)} className={select}>
            {options.lineages.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Class">
          <select
            value={characterClass}
            onChange={(e) => setCharacterClass(e.target.value)}
            className={select}
          >
            {options.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (d{c.hitDie})
              </option>
            ))}
          </select>
        </Row>
      </div>

      <Row label="Background">
        <select
          value={background}
          onChange={(e) => {
            const next = options.backgrounds.find((b) => b.id === e.target.value);
            setBackground(e.target.value);
            // The improvements must belong to the new background.
            if (next) {
              setPlusTwo(next.abilities[0]!);
              setPlusOne(next.abilities[1]!);
            }
          }}
          className={select}
        >
          {options.backgrounds.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} — {b.skills.join(', ')}
            </option>
          ))}
        </select>
      </Row>

      <div>
        <span className="text-xs uppercase tracking-widest text-[var(--muted)]">Ability scores</span>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {ABILITIES.map((ability) => (
            <label key={ability} className="rounded-md border border-[var(--ink-line)] p-2">
              <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                {ability}
              </span>
              <select
                value={assigned[ability]}
                onChange={(e) =>
                  setAssigned({ ...assigned, [ability]: Number(e.target.value) })
                }
                className="w-full bg-transparent text-lg"
              >
                {[...new Set([...options.standardArray, assigned[ability]!])]
                  .sort((a, b) => b - a)
                  .map((score) => (
                    <option key={score} value={score}>
                      {score}
                    </option>
                  ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      {chosenBackground && (
        <div className="grid grid-cols-2 gap-3">
          <Row label="+2 to">
            <select value={plusTwo} onChange={(e) => setPlusTwo(e.target.value)} className={select}>
              {chosenBackground.abilities.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Row>
          <Row label="+1 to">
            <select value={plusOne} onChange={(e) => setPlusOne(e.target.value)} className={select}>
              {chosenBackground.abilities.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Row>
        </div>
      )}

      {problem && (
        <p className="rounded-md border p-2 text-sm" style={{ borderColor: 'var(--blood)', color: 'var(--blood)' }}>
          {problem}
        </p>
      )}

      {preview && !problem && (
        <p className="rounded-md border border-[var(--ink-line)] bg-[var(--ink-raised)] p-3 text-sm">
          <span style={{ color: 'var(--ember)' }}>{preview.name}</span> — {preview.hpMax} hit points
          at level 1.
        </p>
      )}

      <div className="flex gap-3">
        <button
          disabled={busy || Boolean(problem)}
          onClick={() => onDone(choices)}
          className="flex-1 rounded-md p-3 font-semibold disabled:opacity-40"
          style={{ background: 'var(--ember)', color: 'var(--ink)' }}
        >
          {busy ? 'Beginning…' : 'Play as this character'}
        </button>
        <button onClick={onCancel} className="text-sm text-[var(--muted)] underline">
          Use the pregens
        </button>
      </div>
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
