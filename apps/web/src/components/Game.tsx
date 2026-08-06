'use client';

import { useCallback, useState } from 'react';
import type { Resolution } from '@lantern/schema';
import { api, type GenerateRequest, type SessionState, type TurnResponse } from '../lib/api';
import { BeatArt } from './BeatArt';
import { DiceTray } from './DiceTray';

/**
 * The play surface. Phone-first, one column. Renders state; computes nothing —
 * every number on screen was computed by the engine and persisted before the
 * client ever saw it.
 */

export function Game() {
  const [state, setState] = useState<SessionState | null>(null);
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

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const { state: fresh } = await api.start();
      setState(fresh);
      setNarration([]);
      setResolutions([]);
    } catch (err) {
      setError(
        `${(err as Error).message} — is the API running? Start it with: pnpm --filter @lantern/api dev`,
      );
    } finally {
      setBusy(false);
    }
  }, []);

  if (!state) {
    return (
      <StartScreen
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
          <button onClick={start} disabled={busy} className="mt-4 text-sm underline text-[var(--muted)]">
            Play again — different choices this time
          </button>
        </div>
      )}

      {error && <p className="text-sm" style={{ color: 'var(--blood)' }}>{error}</p>}

      {/* Party strip */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--ink-line)] bg-[var(--ink)] p-2">
        <div className="mx-auto flex max-w-2xl justify-between gap-2">
          {party.map((p) => (
            <div key={p.id} className="flex-1 rounded-md bg-[var(--ink-raised)] p-2">
              <div className="flex items-baseline justify-between">
                <span className="truncate text-xs font-semibold">{p.name.split(' ')[0]}</span>
                <span className="text-[10px] text-[var(--muted)]">AC {p.ac}</span>
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
  onGenerate,
}: {
  busy: boolean;
  error: string | null;
  onStart: () => void;
  onGenerate: (req: GenerateRequest) => void;
}) {
  const [premise, setPremise] = useState('');
  const [setting, setSetting] = useState('');
  const [tone, setTone] = useState('mystery');

  return (
    <div className="mt-8 space-y-8">
      <div className="text-center">
        <h2 className="text-xl" style={{ color: 'var(--ember)' }}>
          The Bell at Saltmire
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
          Forty years after the sea took Saltmire, its church bell has begun to ring again.
        </p>
        <button
          onClick={onStart}
          disabled={busy}
          className="mt-4 rounded-md px-6 py-3 font-semibold"
          style={{ background: 'var(--ember)', color: 'var(--ink)' }}
        >
          {busy ? 'Crossing…' : 'Begin'}
        </button>
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
