"use client";

import { useEffect, useMemo, useState } from "react";
import { LogoMark } from "@/components/marketing/logo";
import { BrandLogo } from "@/components/marketing/brand-logos";
import { Avatar } from "@/components/marketing/avatar";
import { Dial } from "@/components/marketing/graphics";
import { scorePost } from "@/lib/scoring";
import { extractTraits } from "@/lib/voice-stats";
import {
  DEMO_AI_DRAFT, DEMO_DONT_LIST, DEMO_HUMAN_DRAFT, DEMO_VOICE_SAMPLES,
} from "@/content/demo-voice";

/**
 * A 1080×1920 stage, recorded by scripts/record-reels.mjs.
 *
 * Everything animates off one clock so a recording is repeatable, and every
 * number is the real scorer run against the real demo fingerprint — a
 * marketing video that overstates the product is worse than no video.
 */

import { SCENE_DURATIONS, type SceneId } from "./scenes";

const ease = (t: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function useClock(durationMs: number) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      setT(Math.min(1, (now - start) / durationMs));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationMs]);
  return t;
}

function Caption({ text }: { text: string }) {
  return (
    <div className="flex min-h-[150px] items-start justify-center px-14">
      <p
        key={text}
        className="text-center text-[46px] font-semibold leading-[1.15] tracking-tight"
        style={{ animation: "countUp 320ms ease-out both" }}
      >
        {text}
      </p>
    </div>
  );
}

function Stage({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative flex flex-col overflow-hidden bg-[var(--bg)]"
      style={{ width: 1080, height: 1920 }}
    >
      <div className="pt-20"><Caption text={caption} /></div>
      {/* The body centres in whatever is left, so short scenes don't leave a
          hole above the logo and tall ones don't crowd it. */}
      <div className="flex flex-1 flex-col justify-center gap-7 pb-32">{children}</div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 pb-14">
        <LogoMark size={36} />
        <span className="font-serif text-[32px] font-semibold tracking-tight">Sixfold</span>
      </div>
    </div>
  );
}

function SignalRow({ label, value }: { label: string; value: number }) {
  return (
    <li>
      <div className="flex justify-between text-[22px]">
        <span className="text-muted">{label}</span>
        <span className="font-mono font-semibold tabular-nums">{value}</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full border bg-[var(--panel)]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(2, value)}%`,
            background:
              value >= 80 ? "var(--color-signal-strong)"
              : value >= 65 ? "var(--color-signal-good)"
              : value >= 45 ? "var(--color-signal-fair)"
              : "var(--color-signal-weak)",
            transition: "width 260ms linear, background 260ms linear",
          }}
        />
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Scene 1 — AI slop scores low, your voice scores high                 */
/* ------------------------------------------------------------------ */

const T1 = { type: 0.22, chip: 0.44, morph: 0.68, holdGood: 0.9 };

function AiSlop({ t }: { t: number }) {
  const { bad, good } = useMemo(() => {
    const opts = { traits: extractTraits(DEMO_VOICE_SAMPLES), dontList: DEMO_DONT_LIST };
    return {
      bad: scorePost(DEMO_AI_DRAFT, "linkedin", opts),
      good: scorePost(DEMO_HUMAN_DRAFT, "linkedin", opts),
    };
  }, []);

  const typed = ease(t / T1.type);
  const morph = ease((t - T1.chip) / (T1.morph - T1.chip));
  const showGood = t >= T1.chip;

  const score = showGood
    ? Math.round(lerp(bad.predicted, good.predicted, morph))
    : Math.round(bad.predicted * ease((t - 0.05) / (T1.type - 0.05)));

  const caption =
    t < T1.type ? "I asked an AI for a LinkedIn post."
    : t < T1.chip ? `It scored ${bad.predicted} out of 100.`
    : t < T1.morph ? "So I trained it on ten posts I'd written."
    : t < T1.holdGood ? `Same idea. My words. ${good.predicted}.`
    : "Know before you post.";

  const signals = bad.signals.map((sb) => {
    const sg = good.signals.find((s) => s.label === sb.label) ?? sb;
    return {
      label: sb.label,
      value: Math.round(showGood ? lerp(sb.score, sg.score, morph) : sb.score * typed),
    };
  });

  return (
    <Stage caption={caption}>
      <div className="mx-14 rounded-[28px] border-2 bg-[var(--panel)] p-9 shadow-2xl">
        <div className="flex items-center gap-4 border-b pb-5">
          <Avatar seed="Maya Osei" size={56} />
          <div className="flex-1">
            <p className="text-[26px] font-semibold leading-tight">Maya Osei</p>
            <p className="text-[20px] text-muted">Founder, Northwind Studio</p>
          </div>
          <BrandLogo platform="linkedin" className="size-8" />
        </div>

        <div className="relative mt-6 h-[420px]">
          <p
            className="absolute inset-0 whitespace-pre-wrap text-[27px] leading-[1.5] text-muted"
            style={{ opacity: showGood ? 1 - morph : 1 }}
          >
            {DEMO_AI_DRAFT.slice(0, Math.round(DEMO_AI_DRAFT.length * typed))}
          </p>
          <p
            className="absolute inset-0 whitespace-pre-wrap text-[27px] leading-[1.5]"
            style={{ opacity: showGood ? morph : 0 }}
          >
            {DEMO_HUMAN_DRAFT}
          </p>
        </div>

        <div className="h-[86px]">
          {t >= T1.chip && t < T1.morph ? (
            <div
              className="inline-flex items-center gap-3 rounded-2xl border-2 border-clay-500 bg-clay-500/10 px-6 py-4 text-[24px] font-semibold"
              style={{ animation: "countUp 300ms ease-out both" }}
            >
              <span className="size-3.5 rounded-full bg-clay-500" />
              Make it sound like me
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-14 flex items-center gap-10 rounded-[28px] border-2 bg-[var(--bg-subtle)] px-10 py-8">
        <Dial score={score} size={200} />
        <ul className="flex-1 space-y-4">
          {signals.slice(0, 5).map((s) => (
            <SignalRow key={s.label} label={s.label} value={s.value} />
          ))}
        </ul>
      </div>
    </Stage>
  );
}

/* ------------------------------------------------------------------ */
/* Scene 2 — fix three faults, discover the real one                    */
/* ------------------------------------------------------------------ */

const FAULTS = [
  { fix: "Check out our blog to learn more! ", label: "A link in the post" },
  { fix: "Like and share! ", label: "Engagement bait" },
  { fix: "#marketing #growth #socialmedia #business #ai #content #b2b", label: "Hashtag soup" },
];

function ThreeFaults({ t }: { t: number }) {
  const opts = useMemo(
    () => ({ traits: extractTraits(DEMO_VOICE_SAMPLES), dontList: DEMO_DONT_LIST }),
    [],
  );

  const step = Math.min(FAULTS.length, Math.max(0, Math.floor((t - 0.14) / 0.15)));
  const text = useMemo(() => {
    let out = DEMO_AI_DRAFT;
    for (let i = 0; i < step; i++) out = out.replace(FAULTS[i].fix, "");
    return out.replace(/\n{3,}/g, "\n\n").trim();
  }, [step]);

  const score = useMemo(() => scorePost(text, "linkedin", opts), [text, opts]);
  const final = useMemo(() => scorePost(DEMO_HUMAN_DRAFT, "linkedin", opts), [opts]);
  const done = t >= 0.78;
  const shown = done ? final : score;

  const caption =
    t < 0.14 ? "Three things killing your reach."
    : step < FAULTS.length ? FAULTS[step].label
    : !done ? `All three fixed. Still only ${score.predicted}.`
    : "The first line was the problem.";

  return (
    <Stage caption={caption}>
      <div className="mx-14 flex items-center justify-center gap-14 rounded-[28px] border-2 bg-[var(--bg-subtle)] px-10 py-9">
        <Dial score={shown.predicted} size={230} />
        <div>
          <p className="font-mono text-[20px] uppercase tracking-widest text-muted">Hook</p>
          <p
            className="font-serif text-[92px] font-semibold leading-none tabular-nums"
            style={{
              color: shown.hook >= 65 ? "var(--color-signal-strong)" : "var(--color-signal-weak)",
            }}
          >
            {shown.hook}
          </p>
        </div>
      </div>

      <div className="mx-14 h-[520px] rounded-[28px] border-2 bg-[var(--panel)] p-10">
        <p className="whitespace-pre-wrap text-[28px] leading-[1.55]">
          {done ? DEMO_HUMAN_DRAFT : text}
        </p>
      </div>

      <ul className="mx-14 space-y-4">
        {FAULTS.map((f, i) => (
          <li
            key={f.label}
            className="flex items-center gap-4 text-[27px]"
            style={{ opacity: step > i ? 0.45 : 1, transition: "opacity 300ms" }}
          >
            <span
              className="grid size-10 place-items-center rounded-full border-2 text-[21px]"
              style={{
                borderColor: step > i ? "var(--color-signal-strong)" : "var(--border)",
                color: step > i ? "var(--color-signal-strong)" : "inherit",
              }}
            >
              {step > i ? "✓" : i + 1}
            </span>
            <span className={step > i ? "line-through" : ""}>{f.label}</span>
          </li>
        ))}
      </ul>
    </Stage>
  );
}

/* ------------------------------------------------------------------ */
/* Scene 3 — the queue fills itself                                     */
/* ------------------------------------------------------------------ */

const QUEUE = [
  { day: "Mon 09:15", title: "The 60% volume cut", score: 87 },
  { day: "Tue 16:30", title: "How the scoring works", score: 79 },
  { day: "Wed 09:15", title: "What we got wrong in Q1", score: 84 },
  { day: "Thu 16:30", title: "Against daily posting", score: 91 },
  { day: "Fri 09:15", title: "One line that changed it", score: 73 },
];

function Queue({ t }: { t: number }) {
  const placed = Math.min(QUEUE.length, Math.max(0, Math.floor((t - 0.14) / 0.14)));
  const caption =
    t < 0.14 ? "My content calendar was empty."
    : placed < QUEUE.length ? "One topic. A week of drafts."
    : "All scored. All in my voice.";

  return (
    <Stage caption={caption}>
      <div className="mx-14 space-y-6">
        {QUEUE.map((q, i) => (
          <div
            key={q.day}
            className="flex items-center gap-7 rounded-3xl border-2 bg-[var(--panel)] px-9 py-9"
            style={{
              opacity: i < placed ? 1 : 0.1,
              transform: i < placed ? "none" : "translateY(20px)",
              transition: "opacity 420ms ease-out, transform 420ms cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <span className="w-[200px] shrink-0 font-mono text-[25px] text-muted">{q.day}</span>
            <span className="flex-1 text-[31px] font-medium">{q.title}</span>
            <span
              className="font-serif text-[48px] font-semibold tabular-nums"
              style={{
                color: q.score >= 80 ? "var(--color-signal-strong)" : "var(--color-signal-good)",
              }}
            >
              {i < placed ? q.score : ""}
            </span>
          </div>
        ))}
      </div>
    </Stage>
  );
}

/* ------------------------------------------------------------------ */

export function ReelScene({ scene }: { scene: SceneId }) {
  const t = useClock(SCENE_DURATIONS[scene]);
  if (scene === "three-faults") return <ThreeFaults t={t} />;
  if (scene === "queue") return <Queue t={t} />;
  return <AiSlop t={t} />;
}
