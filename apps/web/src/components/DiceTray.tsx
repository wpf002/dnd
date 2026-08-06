import type { Resolution } from '@lantern/schema';

/**
 * The dice tray. Visible on every roll.
 *
 * This component computes nothing. Every value shown is read directly off a
 * persisted `Resolution`, so what the player sees is exactly what the engine
 * calculated and stored — the display has no independent source and therefore
 * cannot drift from the math. That property is the product.
 *
 * Note there is no animation that lands on a result: the face shown is the
 * face rolled.
 */
export function DiceTray({ resolution }: { resolution: Resolution }) {
  const { roll, modifiers, total, dc, ac, margin, outcome } = resolution;
  const target = dc ?? ac;
  const targetLabel = dc !== undefined ? 'DC' : 'AC';

  return (
    <div className="tray rounded-lg p-4 text-sm">
      <div className="flex items-baseline justify-between">
        <span className="uppercase tracking-widest text-[var(--muted)] text-xs">
          {resolution.checkKind.replace('-', ' ')}
        </span>
        <span
          className="uppercase tracking-widest text-xs"
          style={{
            color: outcome.includes('success') ? 'var(--success)' : 'var(--blood)',
          }}
        >
          {outcome.replace('-', ' ')}
        </span>
      </div>

      {roll ? (
        <>
          <div className="mt-3 flex items-center gap-3">
            {roll.dice.map((d, i) => (
              <span key={`kept-${i}`} className="d20 text-4xl font-bold">
                {d.face}
              </span>
            ))}
            {roll.discarded.map((d, i) => (
              <span key={`cut-${i}`} className="discarded text-2xl">
                {d.face}
              </span>
            ))}
            <span className="text-[var(--muted)] text-xs">
              {roll.notation}
              {roll.mode !== 'normal' ? ` · ${roll.mode}` : ''}
            </span>
          </div>

          {/* Modifiers are broken out, never pre-summed — the tray shows why
              the number is what it is. */}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[var(--muted)]">
            <span>natural {roll.natural}</span>
            {modifiers.map((m) => (
              <span key={m.source}>
                {m.value >= 0 ? '+' : ''}
                {m.value} {m.source}
              </span>
            ))}
          </div>

          <div className="mt-3 flex items-baseline gap-4 border-t border-[var(--ink-line)] pt-3">
            <span className="text-2xl font-semibold">{total}</span>
            {target !== undefined && (
              <span className="text-[var(--muted)]">
                vs {targetLabel} {target}
              </span>
            )}
            {margin !== undefined && (
              <span className="text-[var(--ember)]">
                {margin >= 0 ? `by +${margin}` : `short by ${Math.abs(margin)}`}
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="mt-3 text-[var(--muted)]">No roll required.</p>
      )}
    </div>
  );
}
