"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { scorePost } from "@/lib/scoring";
import { extractTraits } from "@/lib/voice-stats";
import {
  DEMO_AI_DRAFT, DEMO_DONT_LIST, DEMO_HUMAN_DRAFT, DEMO_VOICE_SAMPLES,
} from "@/content/demo-voice";
import { Dial } from "./graphics";

/**
 * Anatomy of a bad post.
 *
 * Each fault is a real pattern the scorer looks for, and hovering one lights up
 * the signal it damages. The scores either side are the live scorer, not props.
 */
const FAULTS = [
  { id: "opener", text: "In today's fast-paced world, it's no secret that", signal: "Hook", why: "A windup. Nobody reads past it, and every model writes it." },
  { id: "filler", text: "social media is a game changer for businesses looking to unlock growth and supercharge results.", signal: "Voice match", why: "Four banned phrases in one sentence. Your fingerprint contains none of them." },
  { id: "link", text: "Check out our blog to learn more!", signal: "Algorithm risk", why: "An outbound link in the body. LinkedIn suppresses reach — put it in the first comment." },
  { id: "bait", text: "Like and share!", signal: "Call to action", why: "Engagement bait. Platforms downrank it, and it asks for nothing a person wants to give." },
  { id: "tags", text: "#marketing #growth #socialmedia #business #ai #content #b2b", signal: "Algorithm risk", why: "Seven hashtags. LinkedIn wants at most three; the rest read as spam." },
] as const;

export function Anatomy() {
  const [active, setActive] = useState<string | null>(null);
  const [side, setSide] = useState<"bad" | "good">("bad");

  const { bad, good } = useMemo(() => {
    const traits = extractTraits(DEMO_VOICE_SAMPLES);
    const opts = { traits, dontList: DEMO_DONT_LIST };
    return {
      bad: scorePost(DEMO_AI_DRAFT, "linkedin", opts),
      good: scorePost(DEMO_HUMAN_DRAFT, "linkedin", opts),
    };
  }, []);

  const shown = side === "bad" ? bad : good;
  const activeFault = FAULTS.find((f) => f.id === active);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr]">
      {/* The post */}
      <div className="surface rounded-2xl p-6 sm:p-8">
        <div className="mb-5 flex gap-1 rounded-lg bg-[var(--bg-subtle)] p-1">
          {(["bad", "good"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setSide(s); setActive(null); }}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all active:scale-[0.98] ${
                side === s ? "bg-[var(--panel)] shadow-sm" : "text-muted hover:text-[var(--fg)]"
              }`}
            >
              {s === "bad" ? "Written by AI" : "Written in your voice"}
            </button>
          ))}
        </div>

        {side === "bad" ? (
          <p className="text-[15px] leading-loose">
            {FAULTS.map((f, i) => (
              <span key={f.id}>
                <mark
                  onMouseEnter={() => setActive(f.id)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(f.id)}
                  onBlur={() => setActive(null)}
                  tabIndex={0}
                  className={`cursor-help rounded px-0.5 transition-colors duration-200 ${
                    active === f.id
                      ? "bg-clay-500/30 text-[var(--fg)]"
                      : "bg-clay-500/10 text-muted decoration-clay-500/50 decoration-wavy underline underline-offset-4"
                  }`}
                >
                  {f.text}
                </mark>
                {i < FAULTS.length - 1 ? " " : ""}
              </span>
            ))}
          </p>
        ) : (
          <p className="whitespace-pre-wrap text-[15px] leading-loose">{DEMO_HUMAN_DRAFT}</p>
        )}

        <div className="mt-6 min-h-[4.5rem] rounded-xl border border-dashed p-4">
          {side === "bad" ? (
            activeFault ? (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-clay-500">
                  Hurts {activeFault.signal}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed">{activeFault.why}</p>
              </div>
            ) : (
              <p className="text-sm text-muted">
                Five faults are marked. Hover one to see which signal it damages.
              </p>
            )
          ) : (
            <p className="text-sm text-muted">
              Same idea, same author. One opener that earns the second line, no
              link, no bait, no hashtag soup.
            </p>
          )}
        </div>
      </div>

      {/* The score */}
      <div className="surface flex flex-col gap-6 rounded-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <Dial score={shown.predicted} size={104} caption="Predicted" />
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Voice match</p>
            <p className="mt-1 font-serif text-3xl font-semibold tabular-nums">{shown.voiceMatch}%</p>
          </div>
        </div>

        <ul className="space-y-3">
          {shown.signals.map((s) => {
            const lit = activeFault?.signal === s.label;
            return (
              <li key={s.label} className={`transition-opacity ${activeFault && !lit ? "opacity-40" : ""}`}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className={lit ? "font-semibold text-clay-600 dark:text-clay-400" : ""}>{s.label}</span>
                  <span className="font-mono tabular-nums">{s.score}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full border bg-[var(--bg-subtle)]">
                  <div
                    className="h-full rounded-full transition-[width,background] duration-500"
                    style={{
                      width: `${Math.max(2, s.score)}%`,
                      background: lit
                        ? "var(--color-clay-500)"
                        : s.score >= 80 ? "var(--color-signal-strong)"
                        : s.score >= 65 ? "var(--color-signal-good)"
                        : s.score >= 45 ? "var(--color-signal-fair)"
                        : "var(--color-signal-weak)",
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => { setSide(side === "bad" ? "good" : "bad"); setActive(null); }}
          className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-medium text-ink-50 transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0 active:scale-[0.97] dark:bg-ink-50 dark:text-ink-950"
        >
          {side === "bad" ? "Make it sound like me" : "Show the AI version"}
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
