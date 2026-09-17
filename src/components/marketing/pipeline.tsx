"use client";

import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "./brand-logos";
import { CHANNELS } from "@/content/landing";

const STAGES = [
  { key: "topic", label: "Your topic", sub: "one line" },
  { key: "voice", label: "Your voice", sub: "10 samples" },
  { key: "draft", label: "Drafts", sub: "written for you" },
  { key: "score", label: "Pre-flight", sub: "six signals" },
  { key: "approve", label: "You approve", sub: "always" },
  { key: "queue", label: "The queue", sub: "next free slot" },
] as const;

/**
 * The whole path a post takes, as a loop that runs itself. A pulse travels the
 * line and lights each stage in turn, ending at the channels.
 */
export function Pipeline() {
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(-1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !timer) {
        timer = setInterval(() => setAt((n) => (n + 1) % (STAGES.length + 2)), 900);
      } else if (!e.isIntersecting && timer) {
        clearInterval(timer);
        timer = null;
      }
    }, { threshold: 0.15, rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => { io.disconnect(); if (timer) clearInterval(timer); };
  }, []);

  return (
    <div ref={ref} className="relative">
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {STAGES.map((s, i) => {
          const lit = at === i;
          const done = at > i;
          return (
            <li
              key={s.key}
              className="surface relative overflow-hidden rounded-xl p-4 transition-all duration-500"
              style={{
                borderColor: lit ? "var(--color-clay-500)" : undefined,
                transform: lit ? "translateY(-4px)" : "none",
                boxShadow: lit ? "0 18px 32px -18px color-mix(in srgb, var(--color-clay-600) 60%, transparent)" : "none",
              }}
            >
              <span
                className="absolute inset-x-0 top-0 h-0.5 bg-clay-500 transition-all duration-500"
                style={{ width: lit || done ? "100%" : "0%" }}
              />
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted">0{i + 1}</p>
              <p className="mt-1.5 text-sm font-semibold leading-tight">{s.label}</p>
              <p className="mt-0.5 text-[11px] text-muted">{s.sub}</p>
            </li>
          );
        })}
      </ol>

      {/* Channels light up once the queue has fired. */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">published to</span>
        {CHANNELS.map((id, i) => (
          <span
            key={id}
            className="transition-all duration-500"
            style={{
              opacity: at >= STAGES.length ? 1 : 0.28,
              transform: at >= STAGES.length ? `translateY(-${2 + (i % 3)}px)` : "none",
            }}
          >
            <BrandLogo platform={id} className="size-5" />
          </span>
        ))}
      </div>
    </div>
  );
}
