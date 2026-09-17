import { Avatar } from "./avatar";
import { BrandLogo } from "./brand-logos";
import { getPlatform } from "@/lib/platforms/registry";
import type { PlatformId } from "@/lib/platforms/types";
/**
 * Landing-page graphics.
 *
 * All inline SVG, all driven by the theme tokens so they invert correctly in
 * dark mode. They carry the argument — the copy beside them stays short on
 * purpose.
 */

/** 180 posts. Six did the work. The whole pitch, before a word of copy. */
export function PostGrid({
  total = 180,
  winners = [14, 39, 62, 97, 128, 161],
}: {
  total?: number;
  winners?: number[];
}) {
  const cols = 20;
  const cell = 14;
  const gap = 4;
  const rows = Math.ceil(total / cols);
  const win = new Set(winners);

  return (
    <svg
      viewBox={`0 0 ${cols * (cell + gap)} ${rows * (cell + gap)}`}
      className="w-full"
      role="img"
      aria-label={`${total} posts, of which ${winners.length} drove almost all the results`}
    >
      {Array.from({ length: total }, (_, i) => {
        const x = (i % cols) * (cell + gap);
        const y = Math.floor(i / cols) * (cell + gap);
        const isWinner = win.has(i);
        return (
          <rect
            key={i}
            x={x} y={y} width={cell} height={cell} rx={3}
            className={
              isWinner
                ? "fill-clay-500"
                : "fill-ink-200 dark:fill-ink-800"
            }
            style={
              isWinner
                ? { animation: `countUp 0.5s ease-out ${0.5 + winners.indexOf(i) * 0.09}s both` }
                : undefined
            }
          />
        );
      })}
    </svg>
  );
}

/** The score dial. One number, drawn as an arc, no chrome. */
export function Dial({
  score,
  size = 180,
  caption,
}: {
  score: number;
  size?: number;
  caption?: string;
}) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  // Three-quarter arc, opening at the bottom — a gauge, not a pie chart.
  const sweep = 0.75;
  const circumference = 2 * Math.PI * r;
  const arc = circumference * sweep;
  const filled = arc * (Math.max(0, Math.min(100, score)) / 100);

  const color =
    score >= 80 ? "var(--color-signal-strong)"
    : score >= 65 ? "var(--color-signal-good)"
    : score >= 45 ? "var(--color-signal-fair)"
    : "var(--color-signal-weak)";

  return (
    <figure className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size} height={size}
          className="rotate-[135deg]"
          role="img" aria-label={`Score ${score} out of 100`}
        >
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="var(--border)" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
          />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            className="draw"
            style={{ ["--dash" as string]: filled }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-serif font-semibold tabular-nums leading-none"
            style={{ fontSize: size * 0.32 }}
          >
            {score}
          </span>
        </div>
      </div>
      {caption ? (
        <figcaption className="text-xs uppercase tracking-[0.18em] text-muted">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * Voice as a waveform. Each bar is a sentence, its height the word count —
 * which is literally what the fingerprint measures, not a decorative squiggle.
 */
export function VoiceWave({
  sentences = [6, 14, 4, 19, 8, 3, 12, 17, 5, 9, 22, 6, 11, 4, 15, 7],
  accentEvery = 3,
}: {
  sentences?: number[];
  accentEvery?: number;
}) {
  const max = Math.max(...sentences);
  return (
    <svg
      viewBox={`0 0 ${sentences.length * 12} 60`}
      className="w-full"
      role="img"
      aria-label="Sentence-length rhythm measured across the author's posts"
    >
      {sentences.map((n, i) => {
        const h = (n / max) * 48 + 4;
        return (
          <rect
            key={i}
            x={i * 12} y={60 - h} width={6} height={h} rx={3}
            className={
              i % accentEvery === 0
                ? "fill-clay-500"
                : "fill-ink-300 dark:fill-ink-700"
            }
          />
        );
      })}
    </svg>
  );
}

/** A week of slots, filling. Approved posts are solid; empty slots are dashed. */
export function WeekStrip({
  filled = [2, 2, 1, 2, 1],
  slotsPerDay = 2,
}: {
  filled?: number[];
  slotsPerDay?: number;
}) {
  const days = ["M", "T", "W", "T", "F"];
  return (
    <div className="flex gap-2">
      {days.map((d, i) => (
        <div key={i} className="flex-1 space-y-1.5">
          <p className="text-center font-mono text-[10px] uppercase text-muted">{d}</p>
          {Array.from({ length: slotsPerDay }, (_, s) => (
            <div
              key={s}
              className={
                s < (filled[i] ?? 0)
                  ? "h-9 rounded-md bg-ink-900 dark:bg-ink-100"
                  : "h-9 rounded-md border border-dashed"
              }
              style={
                s < (filled[i] ?? 0)
                  ? { animation: `countUp 0.4s ease-out ${i * 0.08 + s * 0.05}s both` }
                  : undefined
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Six signal bars — the anatomy of a score, at a glance. */
export function SignalStack({
  signals,
}: {
  signals: { label: string; value: number }[];
}) {
  return (
    <ul className="space-y-2.5">
      {signals.map((s) => {
        const color =
          s.value >= 80 ? "var(--color-signal-strong)"
          : s.value >= 65 ? "var(--color-signal-good)"
          : s.value >= 45 ? "var(--color-signal-fair)"
          : "var(--color-signal-weak)";
        return (
          <li key={s.label} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs text-muted">{s.label}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
              <span
                className="block h-full rounded-full"
                style={{ width: `${s.value}%`, background: color }}
              />
            </span>
            <span className="w-7 shrink-0 text-right font-mono text-xs tabular-nums">
              {s.value}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Hand-drawn-ish underline, for emphasising a single word in a headline. */
export function Underline({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 12"
      preserveAspectRatio="none"
      className={`absolute -bottom-1 left-0 h-2.5 w-full ${className}`}
      aria-hidden
    >
      <path
        d="M2 8c34-5 70-6 100-5s60 4 96 2"
        fill="none"
        className="stroke-clay-400"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Static month grid. The animated version lives in calendar-live.tsx. */
export function CalendarMini() {
  const posts: Record<number, number> = { 2: 84, 4: 77, 9: 91, 11: 68, 16: 88, 18: 79, 23: 82 };
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
        <span key={`h${i}`} className="text-center font-mono text-[9px] uppercase text-muted">{d}</span>
      ))}
      {Array.from({ length: 28 }, (_, i) => {
        const score = posts[i];
        return (
          <div
            key={i}
            className={`flex aspect-square items-end justify-end rounded-md p-1 ${
              score !== undefined
                ? "bg-ink-900 text-ink-50 dark:bg-ink-100 dark:text-ink-950"
                : "border bg-[var(--bg-subtle)]"
            }`}
          >
            {score !== undefined ? (
              <span className="font-mono text-[9px] font-semibold tabular-nums">{score}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** The same post, rendered the way two platforms would actually show it. */
export function PreviewMini() {
  const platforms: { id: PlatformId; clamp: boolean }[] = [
    { id: "linkedin", clamp: true },
    { id: "x", clamp: false },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {platforms.map((p) => (
        <div key={p.id} className="surface rounded-xl p-3">
          <div className="flex items-center gap-2">
            <Avatar seed="Maya Osei" size={26} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold leading-tight">Maya Osei</p>
              <p className="truncate text-[9px] text-muted">Founder, Northwind</p>
            </div>
            <BrandLogo platform={p.id} className="size-3.5" />
          </div>
          <p className="mt-3 text-[11px] leading-snug">
            We cut our posting volume by 60% and reach went up.
            {p.clamp ? (
              <span className="text-muted"> …<span className="font-medium">see more</span></span>
            ) : (
              <span className="text-muted"> Turns out the algorithm was never the problem.</span>
            )}
          </p>
          <p className="mt-3 font-mono text-[9px] uppercase tracking-wider text-muted">
            {getPlatform(p.id).name}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Reach over time plus the calibration idea, in one small frame. */
export function AnalyticsMini() {
  const pts = [18, 32, 22, 48, 40, 64, 52, 78, 70, 92];
  const w = 240, h = 80, pad = 6;
  const x = (i: number) => pad + (i / (pts.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - (v / 100) * (h - pad * 2);
  const d = pts.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Reach rising over ten weeks">
      {[0.25, 0.5, 0.75].map((t) => (
        <line key={t} x1={pad} x2={w - pad} y1={h * t} y2={h * t} stroke="var(--border)" strokeWidth="1" />
      ))}
      <path d={`${d} L${x(pts.length - 1)},${h - pad} L${x(0)},${h - pad} Z`} className="fill-clay-500/12" />
      <path d={d} fill="none" className="stroke-clay-500 draw" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ ["--dash" as string]: 400 }} />
      <circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1])} r="4" className="fill-clay-500" stroke="var(--panel)" strokeWidth="2" />
    </svg>
  );
}
