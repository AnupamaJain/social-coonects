/**
 * Illustrated avatars, generated from a seed string.
 *
 * Deliberately drawn rather than photographic: these populate product mockups
 * so the UI looks lived-in, and an illustration can't be mistaken for a real
 * customer the way a stock or AI-generated face can. Same seed always produces
 * the same face, so a given author looks consistent across the page.
 */

const SKIN = ["#f2d3bb", "#e4b48c", "#c98a5f", "#a6673f", "#7d4a2b", "#5c3620"];
const HAIR = ["#2a2521", "#5c3620", "#8a5a2b", "#c9903f", "#7d7365", "#43312a"];
const SHIRT = ["#c85f2a", "#3f7a4f", "#42352a", "#7d7365", "#a84a1f", "#2a2521"];

/** Small deterministic hash — same name, same face, every render. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function Avatar({
  seed,
  size = 40,
  className = "",
  ring = false,
}: {
  seed: string;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  const h = hash(seed);
  const skin = SKIN[h % SKIN.length];
  const hair = HAIR[(h >> 3) % HAIR.length];
  const shirt = SHIRT[(h >> 6) % SHIRT.length];
  const style = (h >> 9) % 4;
  const bg = `color-mix(in srgb, ${shirt} 14%, var(--bg-subtle))`;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`shrink-0 rounded-full ${ring ? "ring-2 ring-[var(--panel)]" : ""} ${className}`}
      role="img"
      aria-label=""
      aria-hidden
    >
      <circle cx="32" cy="32" r="32" fill={bg} />
      {/* shoulders */}
      <path d="M10 64c0-12 10-19 22-19s22 7 22 19z" fill={shirt} />
      {/* neck */}
      <rect x="27" y="36" width="10" height="10" rx="5" fill={skin} />
      {/* head */}
      <ellipse cx="32" cy="27" rx="13" ry="14.5" fill={skin} />

      {/* hair: four cuts, chosen by seed */}
      {style === 0 && <path d="M19 26c0-9 6-14 13-14s13 5 13 14c0-5-4-7-13-7s-13 2-13 7z" fill={hair} />}
      {style === 1 && (
        <>
          <path d="M18 28c-1-11 6-17 14-17s15 6 14 17c-1-7-3-9-6-9-4 0-4 3-11 3s-10-2-11 6z" fill={hair} />
          <path d="M17 27c-2 6-1 12 1 15-3-2-5-9-1-15z" fill={hair} />
        </>
      )}
      {style === 2 && <path d="M20 24c2-8 7-12 12-12s10 4 12 12c-2-3-6-5-12-5s-10 2-12 5z" fill={hair} />}
      {style === 3 && (
        <>
          <ellipse cx="32" cy="18" rx="13" ry="8" fill={hair} />
          <circle cx="45" cy="26" r="4.5" fill={hair} />
          <circle cx="19" cy="26" r="4.5" fill={hair} />
        </>
      )}

      {/* features — minimal on purpose; more detail reads as clip art */}
      <circle cx="27" cy="27" r="1.6" fill="#2a2521" opacity="0.85" />
      <circle cx="37" cy="27" r="1.6" fill="#2a2521" opacity="0.85" />
      <path
        d="M28.5 33.5c1.6 1.4 5.4 1.4 7 0"
        stroke="#2a2521" strokeOpacity="0.55" strokeWidth="1.5"
        strokeLinecap="round" fill="none"
      />
    </svg>
  );
}

/** Overlapping row, for "used by" clusters. */
export function AvatarStack({
  seeds,
  size = 36,
}: {
  seeds: string[];
  size?: number;
}) {
  return (
    <div className="flex items-center">
      {seeds.map((s, i) => (
        <span key={s} style={{ marginLeft: i ? -size * 0.3 : 0, zIndex: seeds.length - i }}>
          <Avatar seed={s} size={size} ring />
        </span>
      ))}
    </div>
  );
}
