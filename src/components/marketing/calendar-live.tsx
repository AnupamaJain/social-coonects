"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { BrandLogo } from "./brand-logos";
import type { PlatformId } from "@/lib/platforms/types";

interface Slot { day: number; score: number; platform: PlatformId }

/** A fortnight of a real cadence: two weekday slots, filling in order. */
const SLOTS: Slot[] = [
  { day: 2, score: 84, platform: "linkedin" },
  { day: 4, score: 77, platform: "x" },
  { day: 9, score: 91, platform: "linkedin" },
  { day: 11, score: 68, platform: "x" },
  { day: 16, score: 88, platform: "linkedin" },
  { day: 18, score: 79, platform: "threads" },
  { day: 23, score: 82, platform: "linkedin" },
];

const STEP = 420;
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * The calendar fills itself. Runs once when it scrolls into view, and can be
 * replayed — the queue filling up is the idea the section is selling, and a
 * static grid doesn't show it.
 */
export function CalendarLive() {
  const ref = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Starts complete so the server renders a full calendar (crawlers and
  // reduced-motion users get the finished state). The observer empties it and
  // replays only when motion is allowed.
  const [placed, setPlaced] = useState(SLOTS.length);
  const [playing, setPlaying] = useState(false);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const run = useCallback(() => {
    clear();
    setPlaced(0);
    setPlaying(true);
    SLOTS.forEach((_, i) => {
      timers.current.push(setTimeout(() => setPlaced(i + 1), (i + 1) * STEP));
    });
    timers.current.push(setTimeout(() => setPlaying(false), (SLOTS.length + 1) * STEP));
  }, [clear]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { run(); io.disconnect(); } },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => { io.disconnect(); clear(); };
  }, [run, clear]);

  useEffect(() => clear, [clear]);

  const filled = SLOTS.slice(0, placed);
  const queued = filled.reduce((a, s) => a + s.score, 0);
  const avg = filled.length ? Math.round(queued / filled.length) : 0;

  return (
    <div ref={ref} className="group/cal relative">
      <div className="grid grid-cols-7 gap-1.5">
        {DAYS.map((d, i) => (
          <span key={`h${i}`} className="pb-1 text-center font-mono text-[9px] uppercase text-muted">
            {d}
          </span>
        ))}

        {Array.from({ length: 28 }, (_, i) => {
          const slot = SLOTS.find((s) => s.day === i);
          const index = slot ? SLOTS.indexOf(slot) : -1;
          const on = slot !== undefined && index < placed;
          return (
            <div
              key={i}
              className={`relative flex aspect-square items-end justify-end rounded-md p-1 transition-all duration-500 ${
                on
                  ? "bg-ink-900 text-ink-50 dark:bg-ink-100 dark:text-ink-950"
                  : "border bg-[var(--bg-subtle)]"
              }`}
              style={on ? { animation: "drop .45s cubic-bezier(0.22,1,0.36,1) both" } : undefined}
            >
              {on && slot ? (
                <>
                  <span className="absolute left-1 top-1">
                    <BrandLogo platform={slot.platform} tone="mono" className="size-2.5 opacity-70" />
                  </span>
                  <span className="font-mono text-[9px] font-semibold tabular-nums">{slot.score}</span>
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-t pt-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
          {placed} queued{avg ? ` · avg ${avg}` : ""}
        </p>
        <button
          type="button"
          onClick={run}
          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted opacity-0 transition-all hover:text-[var(--fg)] focus-visible:opacity-100 group-hover/cal:opacity-100 active:scale-95"
          aria-label="Replay the queue filling"
        >
          {playing ? <Play className="size-3" /> : <RotateCcw className="size-3" />}
          Replay
        </button>
      </div>
    </div>
  );
}
