import { Game } from '../components/Game';

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--ember)' }}>
          Lantern
        </h1>
        <span className="text-xs text-[var(--muted)]">
          SRD 5.1 ·{' '}
          <a
            className="underline"
            href="https://creativecommons.org/licenses/by/4.0/legalcode"
            rel="noreferrer"
          >
            CC-BY-4.0
          </a>
        </span>
      </header>
      <Game />
    </main>
  );
}
