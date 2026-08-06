/**
 * Art slot renderer. Frames are pre-generated offline and dropped into
 * /public/art/<slot>.png; until one exists the slot renders as a titled
 * gradient placeholder so missing art degrades gracefully instead of 404ing.
 */
export function BeatArt({ slot, title }: { slot: string; title: string }) {
  // A stable hue per slot id keeps placeholders visually distinct.
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/art/${slot}.png`}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <span className="absolute bottom-2 left-3 text-xs uppercase tracking-widest text-[var(--muted)]">
        {title}
      </span>
    </div>
  );
}
