/**
 * The mark is six cells with one lit: 180 posts, six worked, and this is the
 * one that did. Same idea as the hero graphic, at favicon scale.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  const cell = 7;
  const gap = 2.5;
  const w = cell * 3 + gap * 2;
  const h = cell * 2 + gap;
  const pad = (size - w) / 2;

  return (
    <svg
      width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      role="img" aria-label="Sixfold"
    >
      <rect width={size} height={size} rx={size * 0.25} className="fill-ink-900 dark:fill-ink-50" />
      {Array.from({ length: 6 }, (_, i) => {
        const x = pad + (i % 3) * (cell + gap);
        const y = (size - h) / 2 + Math.floor(i / 3) * (cell + gap);
        const lit = i === 4;
        return (
          <rect
            key={i}
            x={x} y={y} width={cell} height={cell} rx={1.6}
            className={lit ? "fill-clay-400" : "fill-ink-50/85 dark:fill-ink-900/85"}
          />
        );
      })}
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      {!compact && (
        <span className="font-serif text-[17px] font-semibold tracking-tight">
          Sixfold
        </span>
      )}
    </span>
  );
}
