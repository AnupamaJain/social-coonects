"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { BrandLogo } from "./brand-logos";

/**
 * Real screenshots of the running app, captured by scripts/capture-screenshots.mjs.
 * Not mockups — re-run that script whenever the UI changes and this section
 * can't drift away from the product.
 */
const SHOTS = [
  {
    key: "compose",
    tab: "Compose",
    title: "Write once. Scored as you type.",
    body: "Six signals, per platform, with the reason beside each one. The weak line is named before you publish, not after.",
    src: "/product/compose.png",
    w: 2880, h: 1960,
  },
  {
    key: "voice",
    tab: "Voice",
    title: "It measures how you actually write.",
    body: "Sentence rhythm, line cadence, the words you reach for. Every draft is graded against your fingerprint.",
    src: "/product/voice.png",
    w: 2880, h: 1800,
  },
  {
    key: "autopilot",
    tab: "Autopilot",
    title: "A week of drafts, waiting on you.",
    body: "One topic becomes seven posts with an arc, pre-scored and ranked. Nothing publishes without approval.",
    src: "/product/autopilot.png",
    w: 2880, h: 1800,
  },
  {
    key: "calendar",
    tab: "Calendar",
    title: "The queue fills itself.",
    body: "Set a cadence once. Approved posts take the next free slot, and the month shows every score at a glance.",
    src: "/product/calendar.png",
    w: 2880, h: 1800,
  },
  {
    key: "analytics",
    tab: "Analytics",
    title: "And it grades its own homework.",
    body: "Reach and engagement per channel, plus the chart that shows whether the score is really predicting your audience.",
    src: "/product/analytics.png",
    w: 2880, h: 1960,
  },
] as const;

const DWELL = 6000;

export function Showcase() {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);
  const started = useRef(0);

  // Only advance while it's actually on screen — a carousel that cycles in an
  // unseen part of the page is just wasted battery.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const stop = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);

  useEffect(() => {
    if (!playing || !visible) { stop(); return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    started.current = performance.now();
    const tick = (now: number) => {
      const t = (now - started.current) / DWELL;
      if (t >= 1) {
        setI((n) => (n + 1) % SHOTS.length);
        started.current = now;
        setProgress(0);
      } else {
        setProgress(t);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return stop;
  }, [playing, visible, i, stop]);

  // No timestamp here: `i` is a dependency of the effect above, so choosing a
  // tab restarts the dwell timer on its own.
  const select = (n: number) => { setI(n); setProgress(0); };
  const shot = SHOTS[i];

  return (
    <div ref={root}>
      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {SHOTS.map((s, n) => (
          <button
            key={s.key}
            type="button"
            onClick={() => select(n)}
            aria-current={n === i}
            className={`relative overflow-hidden rounded-lg border px-4 py-2 text-sm font-medium transition-all active:scale-[0.97] ${
              n === i
                ? "bg-[var(--panel)] shadow-sm"
                : "border-transparent text-muted hover:bg-[var(--panel)] hover:text-[var(--fg)]"
            }`}
          >
            {s.tab}
            {n === i ? (
              <span
                className="absolute inset-x-0 bottom-0 h-0.5 bg-clay-500"
                style={{ width: `${progress * 100}%`, transition: "width 120ms linear" }}
              />
            ) : null}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause the tour" : "Play the tour"}
          className="ml-1 grid size-8 place-items-center rounded-lg border text-muted transition-all hover:text-[var(--fg)] active:scale-90"
        >
          {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>
      </div>

      {/* Frame */}
      <div className="surface mt-8 overflow-hidden rounded-2xl shadow-2xl shadow-ink-900/10">
        <div className="flex items-center gap-2 border-b bg-[var(--bg-subtle)] px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-red-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 truncate font-mono text-[11px] text-muted">
            sixfold.app/app/{shot.key}
          </span>
          <span className="ml-auto hidden items-center gap-1.5 sm:flex">
            <BrandLogo platform="linkedin" className="size-3.5" />
            <BrandLogo platform="x" className="size-3.5" />
          </span>
        </div>

        <div className="relative aspect-[1440/900] bg-[var(--bg-subtle)]">
          {SHOTS.map((s, n) => (
            <Image
              key={s.key}
              src={s.src}
              alt={`${s.tab} — ${s.title}`}
              width={s.w}
              height={s.h}
              priority={n === 0}
              sizes="(max-width: 768px) 100vw, 1000px"
              className="absolute inset-0 size-full object-cover object-top transition-opacity duration-500"
              style={{ opacity: n === i ? 1 : 0 }}
            />
          ))}
        </div>
      </div>

      {/* Caption */}
      <div key={shot.key} className="mx-auto mt-7 max-w-xl text-center" style={{ animation: "countUp .45s ease-out both" }}>
        <h3 className="font-serif text-2xl font-semibold tracking-tight">{shot.title}</h3>
        <p className="mt-2 text-muted">{shot.body}</p>
      </div>
    </div>
  );
}
