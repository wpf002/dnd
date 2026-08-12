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
  type PartyMemberView,
  type Recap,
  type SessionState,
  type TurnResponse,
} from '../lib/api';
import { clearRun, describeAge, loadRun, saveRun, type SavedRun } from '../lib/saved-run';
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
  // A run left unfinished last time. Null until the mount check has run, so
  // the start screen never flashes a resume card that turns out to be stale.
  const [saved, setSaved] = useState<SavedRun | null>(null);

  /**
   * Write down where we are, after every turn.
   *
   * A one-shot that has ended has nothing to resume, so it is forgotten. A
   * campaign is kept even when its session ends — the player is standing
   * between books, which is a place to come back to.
   */
  const remember = useCallback(
    (next: SessionState) => {
      if (next.ended && !campaignId) {
        clearRun();
        setSaved(null);
        return;
      }
      saveRun({
        sessionId: next.id,
        title: next.title,
        ...(campaignId ? { campaignId } : {}),
        ...(currentAdventure ? { adventureId: currentAdventure } : {}),
      });
    },
    [campaignId, currentAdventure],
  );

  const forget = useCallback(() => {
    clearRun();
    setSaved(null);
  }, []);

  const applyTurn = useCallback(
    (response: TurnResponse) => {
      setState(response.state);
      setNarration(response.narration);
      setResolutions(response.resolutions);
      remember(response.state);
    },
    [remember],
  );

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

  /**
   * `who` is passed rather than read from state on purpose.
   *
   * Finishing creation set the character and launched in the same tick, so
   * these callbacks still closed over the previous value — null — and every
   * character a player made was silently dropped on the way into the session.
   */
  const start = useCallback(async (adventure: string, who?: CreationChoices) => {
    setBusy(true);
    setError(null);
    try {
      const { state: fresh } = await api.start(adventure, who ?? character ?? undefined);
      setCurrentAdventure(adventure);
      setState(fresh);
      saveRun({ sessionId: fresh.id, title: fresh.title, adventureId: adventure });
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

  const startCampaign = useCallback(async (adventure: string, who?: CreationChoices) => {
    setBusy(true);
    setError(null);
    try {
      const { campaign } = await api.createCampaign(
        adventure,
        undefined,
        who ?? character ?? undefined,
      );
      setCurrentAdventure(adventure);
      setCampaignId(campaign.id);
      const { state: fresh } = await api.campaignSession(campaign.id);
      setState(fresh);
      saveRun({ sessionId: fresh.id, title: fresh.title, campaignId: campaign.id, adventureId: adventure });
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
  const startBookCampaign = useCallback(async (graphId: string, who?: CreationChoices) => {
    setBusy(true);
    setError(null);
    try {
      const { campaign } = await api.createBookCampaign(graphId, who ?? character ?? undefined);
      setCampaignId(campaign.id);
      setCurrentAdventure(null);
      const opened = await api.campaignSession(campaign.id);
      setState(opened.state);
      saveRun({ sessionId: opened.state.id, title: opened.state.title, campaignId: campaign.id });
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
      saveRun({ sessionId: opened.state.id, title: opened.state.title, campaignId });
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

  /**
   * Pick a run back up.
   *
   * The saved id is checked against the server before anything is shown. A
   * session the database no longer has — a reset, a different machine, an id
   * from an older schema — is forgotten rather than offered, because a resume
   * card that fails when tapped is worse than no card.
   */
  const resume = useCallback(async (target: SavedRun) => {
    setBusy(true);
    setError(null);
    try {
      const { state: fresh } = await api.session(target.sessionId);
      if (target.campaignId) {
        setCampaignId(target.campaignId);
        // Progress rides along with the recap route; a campaign that cannot
        // report it still plays, so this never blocks the resume.
        const where = await api.campaignRecap(target.campaignId).catch(() => null);
        if (where?.progress) setProgress(where.progress);
      }
      if (target.adventureId) setCurrentAdventure(target.adventureId);
      setState(fresh);
      setNarration([]);
      setResolutions([]);
      setSaved(null);
    } catch {
      setError('That session is gone — the server no longer has it. Starting fresh.');
      forget();
    } finally {
      setBusy(false);
    }
  }, [forget]);

  /**
   * On mount, look for a run and confirm the server still has it.
   *
   * Verifying before offering costs one request and means the resume card is
   * never a lie. An ended one-shot is dropped here too — it is a finished
   * game, not an unfinished one.
   */
  useEffect(() => {
    const target = loadRun();
    if (!target) return;
    let live = true;
    api
      .session(target.sessionId)
      .then(({ state: found }) => {
        if (!live) return;
        if (found.ended && !target.campaignId) {
          clearRun();
          return;
        }
        setSaved(target);
      })
      .catch(() => {
        if (live) clearRun();
      });
    return () => {
      live = false;
    };
  }, []);

  /** Launch whatever the player picked, with whatever character they have. */
  const launch = useCallback(
    (target: { kind: 'one-shot' | 'campaign' | 'book'; id: string }, who?: CreationChoices) => {
      if (target.kind === 'one-shot') return start(target.id, who);
      if (target.kind === 'campaign') return startCampaign(target.id, who);
      return startBookCampaign(target.id, who);
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
          if (pending) void launch(pending, choices);
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
        saved={saved}
        onResume={() => saved && void resume(saved)}
        onDiscard={forget}
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

      {/*
        Between fights.

        The spell panel below only ever appeared on a caster's combat turn, and
        nothing in this app ever called the rest endpoint — so a party that won
        a fight with two of its four at nought hit points could not heal them
        and could not camp. They walked into the next room bleeding out, for
        the rest of the adventure. Both had been sitting in the API the whole
        time.
      */}
      {!combat && !state.ended && <Recovery party={party} busy={busy} run={run} sessionId={state.id} />}

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
        <div
          className="rounded-lg border p-4 text-center"
          style={{ borderColor: party.every((p) => p.dead) ? 'var(--blood)' : 'var(--ember)' }}
        >
          {/*
            How it ended, not just where.

            A session that ends because everyone died ends on the beat of the
            fight that killed them, not on a terminal one — so this printed the
            name of the room, and a total party kill looked exactly like
            finishing the adventure.
          */}
          <p
            className="text-xs uppercase tracking-widest"
            style={{ color: party.every((p) => p.dead) ? 'var(--blood)' : 'var(--ember)' }}
          >
            {party.every((p) => p.dead) ? 'The party does not rise again' : beat.title}
          </p>
          {party.some((p) => p.dead) && !party.every((p) => p.dead) && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              {party.filter((p) => p.dead).map((p) => p.name.split(' ')[0]).join(', ')} did not
              make it out.
            </p>
          )}
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
                  {/* The number a campaign is about. It was levelled and
                      persisted correctly from book to book and never shown. */}
                  {!p.dead && <span className="ml-1 font-normal text-[var(--muted)]">L{p.level}</span>}
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
  saved,
  onResume,
  onDiscard,
}: {
  busy: boolean;
  error: string | null;
  onStart: (adventure: string) => void;
  onStartCampaign: (adventure: string) => void;
  onStartBookCampaign: (campaign: string) => void;
  onGenerate: (req: GenerateRequest) => void;
  character: CreationChoices | null;
  onCreateCharacter: (target: { kind: 'one-shot' | 'campaign' | 'book'; id: string }) => void;
  saved: SavedRun | null;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const [premise, setPremise] = useState('');
  const [setting, setSetting] = useState('');
  const [tone, setTone] = useState('mystery');
  const [adventures, setAdventures] = useState<AdventureSummary[] | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignGraphSummary[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

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

  // Eighty-three adventures in one scroll is a wall, not a library. Show a
  // handful, let the player search, and keep whatever they have picked
  // visible so the buttons below it always refer to something on screen.
  const needle = search.trim().toLowerCase();
  const matching = (adventures ?? []).filter(
    (a) =>
      !needle ||
      (a.title ?? a.id).toLowerCase().includes(needle) ||
      (a.premise ?? '').toLowerCase().includes(needle) ||
      (a.tone ?? []).some((t) => t.includes(needle)),
  );
  const visible = showAll || needle ? matching : matching.slice(0, 6);
  const hidden = matching.length - visible.length;

  return (
    <div className="mt-8 space-y-8">
      {/* An unfinished run comes first. It is the reason the app was opened. */}
      {saved && (
        <div
          className="rounded-lg border p-3"
          style={{ borderColor: 'var(--ember)', background: 'var(--ink-raised)' }}
        >
          <h2 className="text-xs uppercase tracking-widest text-[var(--muted)]">
            Where you left off
          </h2>
          <p className="mt-1 text-sm">
            <span style={{ color: 'var(--ember)' }}>{saved.title}</span>
            <span className="text-[var(--muted)]"> — {describeAge(saved.savedAt)}</span>
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={onResume}
              disabled={busy}
              className="flex-1 rounded-md p-2 text-sm font-semibold disabled:opacity-40"
              style={{ background: 'var(--ember)', color: 'var(--ink)' }}
            >
              {busy ? 'Opening…' : 'Carry on'}
            </button>
            <button onClick={onDiscard} className="text-sm underline text-[var(--muted)]">
              Start something else
            </button>
          </div>
        </div>
      )}

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

        {adventures && adventures.length > 6 && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${adventures.length} adventures…`}
            className="mt-3 w-full rounded-md border border-[var(--ink-line)] bg-[var(--ink)] p-3 text-sm outline-none focus:border-[var(--ember)]"
          />
        )}

        <ul className="mt-3 space-y-2">
          {visible.map((a) => (
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

        {needle && matching.length === 0 && (
          <p className="mt-3 text-sm text-[var(--muted)]">Nothing matches “{search}”.</p>
        )}

        {hidden > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="mt-3 w-full rounded-md border border-[var(--ink-line)] p-2 text-sm text-[var(--muted)]"
          >
            Show {hidden} more
          </button>
        )}

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
        {/* Who did not come back. Said plainly, because the party the player
            walks into the next book with is not the one they finished this
            one with, and finding that out silently is worse. */}
        {transition.fallen && transition.fallen.length > 0 && (
          <p className="mt-3 text-sm" style={{ color: 'var(--blood)' }}>
            {transition.fallen.join(', ')} did not come back from{' '}
            {finished?.title ?? 'the last book'}. Word travels, and someone else takes the
            place — at the level the rest of you have reached.
          </p>
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
 * Healing and rest, out of combat.
 *
 * The party's own casters, offered whenever someone is hurt — the API decides
 * what is castable and this only renders it. Rest is always offered, because
 * a party choosing to camp is a decision, not a repair.
 */
function Recovery({
  party,
  busy,
  run,
  sessionId,
}: {
  party: PartyMemberView[];
  busy: boolean;
  run: (fn: () => Promise<TurnResponse>) => void;
  sessionId: string;
}) {
  const dying = party.find((p) => p.hp === 0 && !p.dead);
  const hurt = [...party]
    .filter((p) => !p.dead && p.hp < p.hpMax)
    .sort((a, b) => a.hp / a.hpMax - b.hp / b.hpMax)[0];
  const wounded = dying ?? hurt;

  // Every heal any conscious caster can cast right now.
  const heals = party
    .filter((p) => p.hp > 0 && !p.dead)
    .flatMap((caster) =>
      (caster.castable ?? [])
        .filter((spell) => spell.kind === 'heal')
        .map((spell) => ({ caster, spell })),
    );

  // Nothing to gain, nothing on screen. A party at full health with every
  // slot unspent would only be looking at clutter on every beat of the
  // adventure; one that is hurt, or has spent something, has a decision.
  const spentSlots = party.some((p) =>
    (p.slots?.remaining ?? []).some((n, level) => n < (p.slots?.max?.[level] ?? 0)),
  );
  if (!wounded && !spentSlots) return null;

  return (
    <div className="space-y-2 rounded-lg border border-[var(--ink-line)] bg-[var(--ink-raised)] p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-widest text-[var(--muted)]">
          {dying ? 'Someone is bleeding out' : wounded ? 'Patching up' : 'Catching your breath'}
        </span>
        {wounded && (
          <span className="text-xs text-[var(--muted)]">
            {wounded.name} {wounded.hp}/{wounded.hpMax}
          </span>
        )}
      </div>

      {wounded && heals.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {heals.map(({ caster, spell }) => (
            <button
              key={`${caster.id}-${spell.id}`}
              disabled={busy}
              onClick={() =>
                run(() => api.cast(sessionId, caster.id, spell.id, wounded.id, spell.slot))
              }
              className="rounded-md border px-2 py-1 text-xs disabled:opacity-40"
              style={{ borderColor: 'var(--success)', color: 'var(--success)' }}
            >
              {caster.name.split(' ')[0]}: {spell.name} → {wounded.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={() => run(() => api.rest(sessionId, 'short'))}
          className="flex-1 rounded-md border border-[var(--ink-line)] p-2 text-xs text-[var(--muted)] disabled:opacity-40"
        >
          Short rest — spend hit dice
        </button>
        <button
          disabled={busy}
          onClick={() => run(() => api.rest(sessionId, 'long'))}
          className="flex-1 rounded-md border border-[var(--ink-line)] p-2 text-xs text-[var(--muted)] disabled:opacity-40"
        >
          Long rest — camp until morning
        </button>
      </div>
    </div>
  );
}

/**
 * A labelled field.
 *
 * Module scope, not inside CreateCharacter. Declared in the component body it
 * is a brand-new component type on every render, so React unmounts and
 * remounts its children each keystroke — the name field lost focus after one
 * letter and every character was called "Unnamed".
 */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-[var(--muted)]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
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
  // The six numbers being assigned, and where they came from. Rolling gives a
  // different set, so the pool is state rather than the standard array.
  const [pool, setPool] = useState<number[]>(options.standardArray);
  const [rolled, setRolled] = useState<{ dice: number[]; score: number }[] | null>(null);
  // Kept because the API re-rolls it to check the sheet: scores a player was
  // not actually dealt are refused, so the seed travels with them.
  const [rollSeed, setRollSeed] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);

  const chosenClass = options.classes.find((c) => c.id === characterClass);
  const chosenBackground = options.backgrounds.find((b) => b.id === background);

  /**
   * Assigning a score swaps it with whoever had it.
   *
   * Six independent dropdowns let a player give themselves 15 in everything,
   * which is not a character sheet. A swap makes the six numbers a permutation
   * of the array by construction, which is what assigning an array means.
   */
  const assign = (ability: string, score: number) => {
    setAssigned((current) => {
      const previous = current[ability]!;
      const holder = ABILITIES.find((a) => a !== ability && current[a] === score);
      const next = { ...current, [ability]: score };
      if (holder) next[holder] = previous;
      return next;
    });
  };
  const [plusTwo, setPlusTwo] = useState(chosenBackground?.abilities[0] ?? 'str');
  const [plusOne, setPlusOne] = useState(chosenBackground?.abilities[1] ?? 'dex');

  const choices: CreationChoices = {
    name: name.trim() || 'Unnamed',
    lineage,
    characterClass,
    background,
    abilities: assigned,
    improvements: { plusTwo, plusOne },
    ...(skills.length > 0 ? { skills } : {}),
    ...(rollSeed ? { rollSeed } : {}),
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
  }, [
    name,
    lineage,
    characterClass,
    background,
    JSON.stringify(assigned),
    plusTwo,
    plusOne,
    JSON.stringify(skills),
    rollSeed,
  ]);

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
            onChange={(e) => {
              setCharacterClass(e.target.value);
              setSkills([]); // A fighter's picks are not on a wizard's list.
            }}
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
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-widest text-[var(--muted)]">
            Ability scores
          </span>
          <div className="flex gap-3 text-xs">
            <button
              onClick={async () => {
                setRolling(true);
                try {
                  const { seed, scores } = await api.rollAbilities();
                  setRolled(scores);
                  setRollSeed(seed);
                  const next = scores.map((s) => s.score);
                  setPool(next);
                  setAssigned(
                    Object.fromEntries(ABILITIES.map((a, i) => [a, next[i] ?? 10])),
                  );
                } finally {
                  setRolling(false);
                }
              }}
              className="underline text-[var(--muted)]"
            >
              {rolling ? 'Rolling…' : 'Roll 4d6'}
            </button>
            {rolled && (
              <button
                onClick={() => {
                  setRolled(null);
                  setRollSeed(null);
                  setPool(options.standardArray);
                  setAssigned(
                    Object.fromEntries(
                      ABILITIES.map((a, i) => [a, options.standardArray[i] ?? 10]),
                    ),
                  );
                }}
                className="underline text-[var(--muted)]"
              >
                Standard array
              </button>
            )}
          </div>
        </div>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {ABILITIES.map((ability) => (
            <label key={ability} className="rounded-md border border-[var(--ink-line)] p-2">
              <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                {ability}
              </span>
              <select
                value={assigned[ability]}
                onChange={(e) => assign(ability, Number(e.target.value))}
                className="w-full bg-transparent text-lg"
              >
                {pool
                  .map((score, i) => ({ score, key: `${score}-${i}` }))
                  .sort((a, b) => b.score - a.score)
                  .map(({ score, key }) => (
                    <option key={key} value={score}>
                      {score}
                    </option>
                  ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      {rolled && (
        <p className="text-xs text-[var(--muted)]">
          {rolled
            .map((r) => `${r.score} (${[...r.dice].sort((a, b) => b - a).join(' ')})`)
            .join(' · ')}{' '}
          — lowest die dropped.
        </p>
      )}

      {chosenClass && chosenClass.skills.length > 0 && (
        <div>
          <span className="text-xs uppercase tracking-widest text-[var(--muted)]">
            Skills — choose {chosenClass.skillCount}
            {skills.length > 0 ? ` (${skills.length} chosen)` : ''}
          </span>
          <div className="mt-1 flex flex-wrap gap-2">
            {chosenClass.skills.map((skill) => {
              const chosen = skills.includes(skill);
              const full = skills.length >= chosenClass.skillCount;
              return (
                <button
                  key={skill}
                  disabled={!chosen && full}
                  onClick={() =>
                    // Functional form: two taps in the same frame both read
                    // the render's array otherwise, and the second is lost.
                    setSkills((current) =>
                      current.includes(skill)
                        ? current.filter((s) => s !== skill)
                        : [...current, skill],
                    )
                  }
                  className="rounded-md border px-2 py-1 text-xs disabled:opacity-30"
                  style={
                    chosen
                      ? { borderColor: 'var(--ember)', color: 'var(--ember)' }
                      : { borderColor: 'var(--ink-line)', color: 'var(--muted)' }
                  }
                >
                  {skill.replace(/-/g, ' ')}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Whatever you leave unchosen is filled from the top of the list, and your
            background&rsquo;s skills come free.
          </p>
        </div>
      )}

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
