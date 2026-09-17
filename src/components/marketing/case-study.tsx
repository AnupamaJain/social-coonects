"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Info, RotateCcw } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import {
  ASSUMPTION_META, DEFAULT_ASSUMPTIONS, DEFAULT_INPUTS, INPUT_BOUNDS,
  computeRoi, hours, money,
  type RoiAssumptions, type RoiInputs,
} from "@/lib/roi";
import { Counter } from "./counter";

/** Fades an act in as it reaches the middle of the viewport. */
function useInView<T extends HTMLElement>(threshold = 0.35) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return;
    setSeen(true);
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setSeen(false); io.disconnect(); } },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, hidden: seen };
}

function Act({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  const { ref, hidden } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className="relative pl-10 sm:pl-14"
      style={{
        opacity: hidden ? 0 : 1,
        transform: hidden ? "translateY(26px)" : "none",
        transition: "opacity 700ms cubic-bezier(0.22,1,0.36,1), transform 700ms cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      {/* Spine */}
      <span className="absolute left-0 top-1 grid size-8 place-items-center rounded-full border bg-[var(--panel)] font-serif text-sm font-semibold text-clay-500 sm:size-10 sm:text-base">
        {n}
      </span>
      <span className="absolute bottom-0 left-4 top-11 w-px bg-[var(--border)] sm:left-5 sm:top-13" aria-hidden />
      <h3 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h3>
      <div className="mt-5 pb-14">{children}</div>
    </div>
  );
}

function Field({
  label,
  suffix,
  value,
  onChange,
  bounds,
}: {
  label: string;
  suffix: string;
  value: number;
  onChange: (n: number) => void;
  bounds: { min: number; max: number; step: number };
}) {
  const id = `roi-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-serif text-lg font-semibold tabular-nums">
          {value.toLocaleString()}
          <span className="ml-1 text-xs font-normal text-muted">{suffix}</span>
        </span>
      </label>
      <input
        id={id}
        type="range"
        min={bounds.min}
        max={bounds.max}
        step={bounds.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range mt-2 w-full"
      />
    </div>
  );
}

/** A bar whose width is a share of the largest value in the group. */
function CostBar({
  label,
  value,
  max,
  tone = "ink",
  note,
}: {
  label: string;
  value: number;
  max: number;
  tone?: "ink" | "clay" | "good";
  note?: string;
}) {
  const bg =
    tone === "clay" ? "var(--color-clay-500)"
    : tone === "good" ? "var(--color-signal-strong)"
    : "var(--fg)";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="font-serif font-semibold tabular-nums">{money(value)}</span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[var(--bg-subtle)] border">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(1.5, (value / (max || 1)) * 100)}%`,
            background: bg,
            transition: "width 700ms cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </div>
      {note ? <p className="mt-1 text-xs text-muted">{note}</p> : null}
    </div>
  );
}

export function CaseStudy() {
  const [inputs, setInputs] = useState<RoiInputs>(DEFAULT_INPUTS);
  const [assumptions, setAssumptions] = useState<RoiAssumptions>(DEFAULT_ASSUMPTIONS);
  const [showWorking, setShowWorking] = useState(false);

  const r = useMemo(() => computeRoi(inputs, assumptions), [inputs, assumptions]);
  const set = <K extends keyof RoiInputs>(k: K) => (v: number) =>
    setInputs((s) => ({ ...s, [k]: v }));

  const dirty =
    JSON.stringify(inputs) !== JSON.stringify(DEFAULT_INPUTS) ||
    JSON.stringify(assumptions) !== JSON.stringify(DEFAULT_ASSUMPTIONS);

  return (
    <div className="mx-auto max-w-3xl">
      {/* ---------------------------------------------------------------- */}
      <Act n="01" title="Where the year goes">
        <p className="max-w-xl text-lg leading-relaxed text-muted">
          Start with what&apos;s true for you today. Nothing here is our number.
        </p>

        <div className="surface mt-6 grid grid-cols-1 gap-5 rounded-2xl p-6 sm:grid-cols-2">
          <Field label="Posts a week" suffix="posts" value={inputs.postsPerWeek}
            onChange={set("postsPerWeek")} bounds={INPUT_BOUNDS.postsPerWeek} />
          <Field label="Minutes per post" suffix="min" value={inputs.minutesPerPost}
            onChange={set("minutesPerPost")} bounds={INPUT_BOUNDS.minutesPerPost} />
          <Field label="Channels per post" suffix="channels" value={inputs.channels}
            onChange={set("channels")} bounds={INPUT_BOUNDS.channels} />
          <Field label="Blended hourly cost" suffix="/hour" value={inputs.hourlyCost}
            onChange={set("hourlyCost")} bounds={INPUT_BOUNDS.hourlyCost} />
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          {[
            [r.annualPosts.toLocaleString(), "posts a year"],
            [hours(r.annualHours), "spent making them"],
            [money(r.annualCost), "that time costs"],
          ].map(([big, small]) => (
            <div key={small} className="surface rounded-xl p-4">
              <p className="font-serif text-2xl font-semibold tabular-nums sm:text-3xl">
                <Counter value={big} />
              </p>
              <p className="mt-1 text-xs leading-tight text-muted">{small}</p>
            </div>
          ))}
        </div>
      </Act>

      {/* ---------------------------------------------------------------- */}
      <Act n="02" title="What actually changes">
        <p className="max-w-xl text-lg leading-relaxed text-muted">
          Three mechanics, three lines of saving. Drag any of them to your own
          estimate — the case should survive your scepticism, not ours.
        </p>

        <div className="surface mt-6 space-y-6 rounded-2xl p-6">
          {(Object.keys(ASSUMPTION_META) as (keyof RoiAssumptions)[]).map((k) => {
            const meta = ASSUMPTION_META[k];
            return (
              <div key={k}>
                <label htmlFor={`a-${k}`} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{meta.label}</span>
                  <span className="font-serif text-lg font-semibold tabular-nums">
                    {Math.round(assumptions[k] * 100)}%
                  </span>
                </label>
                <input
                  id={`a-${k}`}
                  type="range" min={0} max={meta.max} step={0.05}
                  value={assumptions[k]}
                  onChange={(e) => setAssumptions((s) => ({ ...s, [k]: Number(e.target.value) }))}
                  className="range mt-2 w-full"
                />
                <p className="mt-2 flex gap-2 text-xs leading-relaxed text-muted">
                  <Info className="mt-0.5 size-3.5 shrink-0 text-clay-500" />
                  {meta.because}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowWorking((v) => !v)}
            className="font-mono text-[11px] uppercase tracking-wider text-muted underline-offset-4 hover:text-[var(--fg)] hover:underline"
          >
            {showWorking ? "Hide the working" : "Show the working"}
          </button>
          {showWorking ? (
            <div className="surface mt-3 space-y-2.5 rounded-xl p-5">
              {[
                ["Drafting", r.hoursSavedDrafting],
                ["Drafts stopped at the score", r.hoursSavedBelowBar],
                ["Per-channel adaptation", r.hoursSavedAdaptation],
              ].map(([label, v]) => (
                <div key={label as string} className="flex justify-between gap-3 text-sm">
                  <span className="text-muted">{label}</span>
                  <span className="font-mono tabular-nums">{hours(v as number)}</span>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t pt-2.5 text-sm font-medium">
                <span>Hours back</span>
                <span className="font-mono tabular-nums">{hours(r.hoursSaved)}</span>
              </div>
              <p className="pt-1 text-xs leading-relaxed text-muted">
                A draft stopped at the score has already cost you most of its
                drafting, so only the finishing third is counted as saved.
                Adaptation is charged at 40% of a fresh write.
              </p>
            </div>
          ) : null}
        </div>
      </Act>

      {/* ---------------------------------------------------------------- */}
      <Act n="03" title="What comes back">
        <div className="surface overflow-hidden rounded-2xl">
          <div className="space-y-5 p-6">
            <CostBar label="Today" value={r.annualCost} max={r.annualCost} note={`${hours(r.annualHours)} of work`} />
            <CostBar
              label="With Sixfold" tone="clay"
              value={r.newAnnualHours * inputs.hourlyCost} max={r.annualCost}
              note={`${hours(r.newAnnualHours)} of work, plus ${money(r.planCost)} for the plan`}
            />
            <CostBar label="What you keep" tone="good" value={Math.max(0, r.netSaving)} max={r.annualCost} />
          </div>

          <div className="grid grid-cols-2 divide-x border-t sm:grid-cols-4">
            {[
              [money(Math.max(0, r.netSaving)), "net, first year"],
              [`${r.roiMultiple.toFixed(1)}×`, "return on the plan"],
              [Number.isFinite(r.paybackDays) ? `${r.paybackDays} days` : "—", "to pay for itself"],
              [`${Math.round(r.daysReclaimed)} days`, "of work reclaimed"],
            ].map(([big, small]) => (
              <div key={small} className="p-5 text-center">
                <p className="font-serif text-xl font-semibold tabular-nums sm:text-2xl">
                  <Counter value={big} />
                </p>
                <p className="mt-1 text-[11px] leading-tight text-muted">{small}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <ButtonLink href="/signup" size="lg">
            Start for $0 <ArrowRight className="size-4" />
          </ButtonLink>
          {dirty ? (
            <button
              type="button"
              onClick={() => { setInputs(DEFAULT_INPUTS); setAssumptions(DEFAULT_ASSUMPTIONS); }}
              className="inline-flex h-11 items-center gap-2 rounded-lg border px-4 text-sm text-muted transition-all hover:-translate-y-px hover:text-[var(--fg)] active:translate-y-0 active:scale-[0.97]"
            >
              <RotateCcw className="size-3.5" /> Reset
            </button>
          ) : null}
        </div>

        <p className="mt-6 rounded-xl border border-dashed p-4 text-xs leading-relaxed text-muted">
          <strong className="font-medium text-[var(--fg)]">This is a model, not a customer result.</strong>{" "}
          Sixfold is new and has no case studies yet — when it does, they will
          have names on them. Act 01 is arithmetic on the numbers you entered.
          Act 02 is three assumptions you control, each tied to a feature that
          exists. Act 03 is arithmetic on those two. Nothing here is measured
          from anyone else&apos;s account.
        </p>
      </Act>
    </div>
  );
}
