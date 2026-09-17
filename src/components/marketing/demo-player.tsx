"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Pause, Play, RotateCcw } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { DEMO_AI_DRAFT, DEMO_HUMAN_DRAFT } from "@/content/demo-voice";
import { DEMO_SCORE_AI, DEMO_SCORE_HUMAN } from "@/content/demo-scores";
import { Dial, SignalStack } from "./graphics";
import { Avatar } from "./avatar";
import { BrandLogo } from "./brand-logos";

const DURATION = 16_000;

/** Scene boundaries as fractions of the timeline. */
const T = { typeA: 0.24, holdA: 0.36, morph: 0.62, holdB: 0.78, queue: 0.9 };

const captionsFor = (a: number, b: number): [number, string][] => [
  [0, "I asked an AI for a LinkedIn post."],
  [T.typeA, `It scored ${a}. Generic opener, seven hashtags, a link.`],
  [T.holdA, "So I trained it on ten posts I'd actually written."],
  [T.morph, `Same idea. My words. ${b}.`],
  [T.holdB, "Approved. It takes the next free slot."],
  [T.queue, ""],
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const ease = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

/**
 * An animated walkthrough that plays inside the video frame until a real
 * recording exists. The two endpoint scores are the actual scorer run against
 * the demo fingerprint; only the transition between them is animation.
 */
export function DemoPlayer() {
  const a = DEMO_SCORE_AI;
  const b = DEMO_SCORE_HUMAN;
  const captions = useMemo(() => captionsFor(a.predicted, b.predicted), [a.predicted, b.predicted]);

  const [t, setT] = useState(0);
  const [status, setStatus] = useState<"idle" | "playing" | "paused" | "done">("idle");
  const raf = useRef<number | null>(null);
  const startedAt = useRef(0);
  const offset = useRef(0);

  const stop = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);

  const play = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setT(1); setStatus("done"); return;
    }
    setStatus("playing");
    startedAt.current = performance.now() - offset.current;
    const tick = (now: number) => {
      const next = clamp01((now - startedAt.current) / DURATION);
      setT(next);
      if (next >= 1) { setStatus("done"); offset.current = 0; return; }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, []);

  const pause = useCallback(() => {
    stop();
    offset.current = t * DURATION;
    setStatus("paused");
  }, [stop, t]);

  const replay = useCallback(() => {
    stop(); offset.current = 0; setT(0); play();
  }, [stop, play]);

  useEffect(() => stop, [stop]);

  // --- derived scene state -------------------------------------------------
  const typeA = ease(t / T.typeA);
  const morph = ease((t - T.holdA) / (T.morph - T.holdA));
  const showQueue = t >= T.holdB;
  const queued = t >= T.queue;

  const textA = DEMO_AI_DRAFT.slice(0, Math.round(DEMO_AI_DRAFT.length * typeA));
  const textB = DEMO_HUMAN_DRAFT.slice(0, Math.round(DEMO_HUMAN_DRAFT.length * morph));
  const showB = t >= T.holdA;

  const dialA = Math.round(a.predicted * ease((t - 0.06) / (T.typeA - 0.06)));
  const score = showB ? Math.round(lerp(a.predicted, b.predicted, morph)) : dialA;

  const signals = a.signals.map((sa) => {
    const sb = b.signals.find((s) => s.label === sa.label) ?? sa;
    const va = sa.score * ease((t - 0.06) / (T.typeA - 0.06));
    return { label: sa.label, value: Math.round(showB ? lerp(sa.score, sb.score, morph) : va) };
  });

  const caption = [...captions].reverse().find(([at]) => t >= at)?.[1] ?? "";
  const active = status === "playing" || status === "paused";

  return (
    <div
      className="surface relative mx-auto aspect-video max-w-4xl overflow-hidden rounded-2xl shadow-2xl shadow-ink-900/10 select-none"
      onClick={() => (status === "playing" ? pause() : status === "paused" ? play() : undefined)}
      role="region"
      aria-label="Sixfold product walkthrough"
    >
      {/* Stage */}
      <div className="absolute inset-0 grid grid-cols-1 sm:grid-cols-[1.2fr_1fr]">
        <div className="relative border-b p-5 sm:border-b-0 sm:border-r sm:p-8">
          <div className="flex items-center gap-2.5">
            <Avatar seed="Maya Osei" size={30} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold leading-tight">Maya Osei</p>
              <p className="truncate text-[10px] text-muted">Founder, Northwind Studio</p>
            </div>
            <BrandLogo platform="linkedin" className="size-4 shrink-0" />
          </div>
          <div className="relative mt-4 h-[calc(100%-4rem)] font-sans text-[13px] leading-relaxed sm:text-[15px]">
            <p
              className="absolute inset-0 whitespace-pre-wrap text-muted transition-opacity duration-500"
              style={{ opacity: showB ? 1 - morph : 1 }}
            >
              {textA}
              {t < T.typeA && status === "playing" ? <span className="animate-pulse">▍</span> : null}
            </p>
            <p
              className="absolute inset-0 whitespace-pre-wrap transition-opacity duration-500"
              style={{ opacity: showB ? morph : 0 }}
            >
              {textB}
              {showB && morph < 1 && status === "playing" ? <span className="animate-pulse">▍</span> : null}
            </p>
          </div>

          {t >= T.typeA && t < T.morph ? (
            <span className="absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-lg border bg-[var(--panel)] px-3 py-1.5 text-xs font-medium shadow-lg sm:bottom-8 sm:left-8" style={{ animation: "countUp .4s ease-out both" }}>
              <span className="size-2 rounded-full bg-clay-500 animate-pulse" />
              Make it sound like me
            </span>
          ) : null}

          {showQueue ? (
            <span
              className={`absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium shadow-lg transition-colors duration-500 sm:bottom-8 sm:left-8 ${
                queued ? "bg-signal-strong text-white" : "bg-ink-900 text-ink-50 dark:bg-ink-50 dark:text-ink-950"
              }`}
              style={{ animation: "countUp .4s ease-out both" }}
            >
              {queued ? "Queued · Tue 09:15" : "Add to queue"}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col justify-between gap-4 bg-[var(--bg-subtle)] p-5 sm:p-8">
          <div className="flex items-start justify-between">
            <Dial score={active || status === "done" ? score : 0} size={96} caption="Predicted" />
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Voice match</p>
              <p className="mt-1 font-serif text-2xl font-semibold tabular-nums">
                {showB ? Math.round(lerp(a.voiceMatch, b.voiceMatch, morph)) : active ? Math.round(a.voiceMatch * typeA) : 0}%
              </p>
            </div>
          </div>
          <SignalStack signals={signals.slice(0, 5)} />
        </div>
      </div>

      {/* Caption track */}
      {active && caption ? (
        <p key={caption} className="pointer-events-none absolute inset-x-0 bottom-9 text-center" style={{ animation: "countUp .35s ease-out both" }}>
          <span className="inline-block rounded-md bg-ink-900/90 px-3 py-1.5 text-sm font-medium text-ink-50 backdrop-blur">
            {caption}
          </span>
        </p>
      ) : null}

      {/* Progress */}
      {status !== "idle" ? (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-ink-900/10">
          <div className="h-full bg-clay-500" style={{ width: `${t * 100}%` }} />
        </div>
      ) : null}

      {/* Poster */}
      {status === "idle" ? (
        <div className="absolute inset-0 grid place-items-center bg-[var(--bg)]/80 backdrop-blur-[2px]">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); play(); }}
            aria-label="Play the walkthrough"
            className="group relative grid size-20 place-items-center rounded-full bg-ink-900 text-ink-50 shadow-2xl transition-transform duration-300 hover:scale-110 active:scale-95 dark:bg-ink-50 dark:text-ink-950"
          >
            <span className="absolute inset-0 rounded-full bg-clay-500/40 animate-ping [animation-duration:2.2s]" aria-hidden />
            <Play className="relative ml-1 size-7" fill="currentColor" />
          </button>
          <p className="absolute bottom-6 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            16 seconds · no sound
          </p>
        </div>
      ) : null}

      {status === "paused" ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid size-16 place-items-center rounded-full bg-ink-900/80 text-ink-50 backdrop-blur">
            <Pause className="size-6" fill="currentColor" />
          </span>
        </div>
      ) : null}

      {/* End card */}
      {status === "done" ? (
        <div className="absolute inset-0 grid place-items-center bg-[var(--bg)]/92 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <div className="text-center" style={{ animation: "countUp .5s ease-out both" }}>
            <p className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Find your six.</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={replay}
                className="inline-flex h-11 items-center gap-2 rounded-lg border bg-[var(--panel)] px-4 text-sm font-medium transition-all hover:-translate-y-px hover:shadow-md active:scale-[0.97]"
              >
                <RotateCcw className="size-4" /> Replay
              </button>
              <ButtonLink href="/signup" size="lg">Start for $0 <ArrowRight className="size-4" /></ButtonLink>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
