import { Resolution } from '@lantern/schema';
import { DiceTray } from '../components/DiceTray';

/**
 * Placeholder shell. Phase 2 replaces this with the beat view.
 *
 * It exists now for two reasons: `next build` (and therefore CI) needs a route,
 * and rendering a real `Resolution` through the real schema proves the contract
 * is usable from the app rather than only from tests.
 */

// Parsed, not cast — if the schema and the component disagree, this throws at
// build time rather than rendering something plausible and wrong.
const SAMPLE = Resolution.parse({
  actionType: 'attack',
  checkKind: 'attack-roll',
  roll: {
    notation: '1d20',
    seed: 'demo:turn-1',
    mode: 'advantage',
    dice: [{ size: 20, face: 18 }],
    discarded: [{ size: 20, face: 3 }],
    natural: 18,
  },
  modifiers: [
    { source: 'dex', value: 3 },
    { source: 'proficiency', value: 2 },
  ],
  total: 23,
  ac: 15,
  margin: 8,
  outcome: 'success',
  effects: [{ kind: 'damage', target: 'goblin-1', amount: 7, damageType: 'piercing' }],
});

const PHASES = [
  { n: 0, label: 'Fun test — play a one-shot by hand', state: 'Not started' },
  { n: 1, label: 'Contract + deterministic engine', state: 'In progress — schema landed' },
  { n: 2, label: 'First playable one-shot', state: 'Blocked on Phase 1' },
  { n: 3, label: 'Davis — campaign generator', state: 'Blocked on Phase 2' },
  { n: 4, label: 'State ledger + multi-session', state: 'Blocked on Phase 3' },
  { n: 5, label: 'Module ingestion', state: 'Research' },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <header>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--ember)' }}>
          Lantern
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          A rules-authoritative solo tabletop RPG engine. The dice are real, the math is
          deterministic, and the language model never touches a number.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="mb-3 text-xs uppercase tracking-widest text-[var(--muted)]">
          The dice tray
        </h2>
        <DiceTray resolution={SAMPLE} />
        <p className="mt-3 text-xs text-[var(--muted)]">
          Rendered from a persisted <code>Resolution</code>. The discarded die is shown because a
          discarded 19 is part of the story.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-xs uppercase tracking-widest text-[var(--muted)]">Phases</h2>
        <ul className="space-y-1">
          {PHASES.map((p) => (
            <li
              key={p.n}
              className="flex justify-between gap-4 border-b border-[var(--ink-line)] py-2 text-sm"
            >
              <span>
                <span className="text-[var(--muted)]">{p.n}.</span> {p.label}
              </span>
              <span className="shrink-0 text-[var(--muted)]">{p.state}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-10 text-xs text-[var(--muted)]">
        Mechanics derive from SRD 5.1, licensed{' '}
        <a
          className="underline"
          href="https://creativecommons.org/licenses/by/4.0/legalcode"
          rel="noreferrer"
        >
          CC-BY-4.0
        </a>
        . Unaffiliated with and unendorsed by Wizards of the Coast.
      </footer>
    </main>
  );
}
