/**
 * Real platform marks.
 *
 * Paths come from simple-icons (CC0) at build time, except LinkedIn — which
 * simple-icons removed after a trademark request, so that one is drawn here.
 * The marks are used nominatively, to say "we publish to this platform", which
 * is what every integration page does.
 */
import {
  siFacebook, siInstagram, siMastodon, siThreads, siX,
} from "simple-icons";
import type { PlatformId } from "@/lib/platforms/types";

const LINKEDIN_PATH =
  "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z";

export const BRAND: Record<PlatformId, { path: string; hex: string; title: string }> = {
  x: { path: siX.path, hex: "#000000", title: siX.title },
  linkedin: { path: LINKEDIN_PATH, hex: "#0A66C2", title: "LinkedIn" },
  instagram: { path: siInstagram.path, hex: "#E4405F", title: siInstagram.title },
  facebook: { path: siFacebook.path, hex: "#0866FF", title: siFacebook.title },
  threads: { path: siThreads.path, hex: "#000000", title: siThreads.title },
  mastodon: { path: siMastodon.path, hex: "#6364FF", title: siMastodon.title },
};

/**
 * `tone` decides who owns the colour: "brand" paints the official hex,
 * "mono" inherits currentColor so the mark sits inside our own palette.
 */
export function BrandLogo({
  platform,
  className = "size-5",
  tone = "brand",
}: {
  platform: PlatformId;
  className?: string;
  tone?: "brand" | "mono";
}) {
  const b = BRAND[platform];
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      // X and Threads are pure black, which disappears on a dark surface.
      style={tone === "brand" ? { color: b.hex } : undefined}
      fill="currentColor"
      role="img"
      aria-label={b.title}
    >
      <path d={b.path} />
    </svg>
  );
}

/** Logo in a tinted chip, for grids and pills. */
export function BrandChip({
  platform,
  size = 40,
  className = "",
}: {
  platform: PlatformId;
  size?: number;
  className?: string;
}) {
  const b = BRAND[platform];
  const dark = b.hex === "#000000";
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl transition-transform duration-300 ${className}`}
      style={{
        width: size,
        height: size,
        // Black marks get an ink chip; coloured marks get a tint of themselves.
        background: dark ? "var(--fg)" : `color-mix(in srgb, ${b.hex} 12%, transparent)`,
      }}
    >
      <BrandLogo
        platform={platform}
        tone={dark ? "mono" : "brand"}
        className={dark ? "text-[var(--bg)]" : ""}
      />
    </span>
  );
}
