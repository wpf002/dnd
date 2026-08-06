'use client';

import { useEffect, useState } from 'react';

/**
 * Art slot renderer with a three-step fallback chain:
 *
 *   1. /art/<slot>.png — the real frame, generated offline with the locked
 *      prompt prefix and seed. Wins whenever it exists.
 *   2. /art/<slot>.svg — the atmospheric placeholder produced by
 *      tools/generate-placeholder-art.mjs.
 *   3. A per-slot gradient, so a missing file never breaks the view.
 */
export function BeatArt({ slot, title }: { slot: string; title: string }) {
  const [source, setSource] = useState<'png' | 'svg' | 'gradient'>('png');

  // Reset the chain when the beat changes.
  useEffect(() => setSource('png'), [slot]);

  let hash = 0;
  for (const ch of slot) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const hue = ((hash % 360) + 360) % 360;

  return (
    <div
      className="relative h-48 w-full overflow-hidden rounded-lg border border-[var(--ink-line)]"
      style={{
        background: `linear-gradient(160deg, hsl(${hue} 18% 14%), hsl(${(hue + 40) % 360} 22% 8%))`,
      }}
    >
      {source !== 'gradient' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${slot}-${source}`}
          src={`/art/${slot}.${source}`}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setSource(source === 'png' ? 'svg' : 'gradient')}
        />
      )}
      <span className="absolute bottom-2 left-3 text-xs uppercase tracking-widest text-[var(--muted)]">
        {title}
      </span>
    </div>
  );
}
