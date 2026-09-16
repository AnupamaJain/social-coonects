import Link from "next/link";
import {
  ArrowRight, Check, Fingerprint, Gauge, Repeat, Sparkles, Shield, Zap,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { MarketingNav } from "@/components/marketing/nav";
import { Logo } from "@/components/marketing/logo";
import { ButtonLink, Card, Badge } from "@/components/ui";
import { ScoreRing, SignalBar } from "@/components/score";
import { PLANS } from "@/lib/billing";
import { PLATFORMS } from "@/lib/platforms/registry";

const PILLARS = [
  {
    id: "voice",
    icon: Fingerprint,
    kicker: "Voice Fingerprint",
    title: "It writes like you, because it read you first.",
    body:
      "Paste in ten posts you're proud of. Postwave measures how you actually write — sentence rhythm, line breaks, the words you reach for, the ones you never use — and conditions every draft on that fingerprint. Then it grades the result and tells you exactly which dial is off.",
    points: [
      "Voice Match % on every draft, with a per-signal breakdown",
      "One click to rewrite a draft in your register",
      "A banned-phrase list that actually gets enforced",
    ],
  },
  {
    id: "predict",
    icon: Gauge,
    kicker: "Pre-flight Predictor",
    title: "Know how a post will land before you publish it.",
    body:
      "Six signals — hook, readability, call to action, length fit, algorithm risk, voice match — scored per platform in real time. Then the part nobody else does: as your real analytics come in, the weights are refit against your own audience. After a few weeks the score isn't a generic rubric. It's yours.",
    points: [
      "Per-platform scoring, not one number for everything",
      "Flags reach-suppressing patterns before you post",
      "Retrains on your engagement data automatically",
    ],
  },
  {
    id: "autopilot",
    icon: Repeat,
    kicker: "Autopilot Queue",
    title: "Your queue is never empty.",
    body:
      "Give it a topic and it plans a week with an arc — the opinionated opener, the how-it-works piece, the story, the contrarian take, the short quotable close. Every draft arrives voice-matched and pre-scored. You approve, and it slots into the cadence you already set.",
    points: [
      "A week of content from a single topic",
      "Approve-and-queue: never pick a datetime again",
      "Drafts land pre-scored, so approval takes seconds",
    ],
  },
];

const COMPARISON = [
  ["Compose once, publish everywhere", true, true],
  ["Calendar and queue scheduling", true, true],
  ["AI post generation", true, true],
  ["Trained on how you specifically write", true, false],
  ["Performance score before you publish", true, false],
  ["Predictor that learns from your analytics", true, false],
  ["Autopilot that keeps the queue full", true, false],
] as const;

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-dvh">
      <MarketingNav signedIn={Boolean(user)} />

      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden />
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-brand-500/15 blur-[120px]" aria-hidden />

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="rise">
              <Badge tone="brand" className="mb-6">
                <Sparkles className="size-3" />
                Voice Fingerprint · Pre-flight scoring · Autopilot
              </Badge>
            </div>

            <h1
              className="rise text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl"
              style={{ animationDelay: "60ms" }}
            >
              Every scheduler helps you post more.
              <br />
              <span className="bg-gradient-to-br from-brand-500 to-brand-700 bg-clip-text text-transparent">
                This one tells you what to post.
              </span>
            </h1>

            <p
              className="rise mx-auto mt-6 max-w-xl text-pretty text-lg text-muted"
              style={{ animationDelay: "140ms" }}
            >
              Postwave learns how you actually write, scores every draft against
              your own audience data before you publish, and keeps a week of
              approved content sitting in the queue.
            </p>

            <div
              className="rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
              style={{ animationDelay: "220ms" }}
            >
              <ButtonLink href="/signup" size="lg" className="w-full sm:w-auto">
                Start free <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink href="/login" variant="outline" size="lg" className="w-full sm:w-auto">
                Log in
              </ButtonLink>
            </div>

            <p className="rise mt-4 text-sm text-muted" style={{ animationDelay: "300ms" }}>
              No card required · Works offline in sandbox mode · Set up in 2 minutes
            </p>
          </div>

          {/* Product proof: the score panel, which is the actual differentiator */}
          <div className="rise mt-16" style={{ animationDelay: "380ms" }}>
            <Card className="mx-auto max-w-4xl overflow-hidden p-0 shadow-2xl shadow-brand-950/5">
              <div className="flex items-center gap-2 border-b bg-[var(--bg-subtle)] px-4 py-2.5">
                <span className="size-2.5 rounded-full bg-red-400" />
                <span className="size-2.5 rounded-full bg-amber-400" />
                <span className="size-2.5 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs text-muted">Composer · LinkedIn</span>
              </div>

              <div className="grid grid-cols-1 gap-0 md:grid-cols-[1.35fr_1fr]">
                <div className="border-b p-6 md:border-b-0 md:border-r">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="grid size-6 place-items-center rounded bg-[#0a66c2] text-[10px] font-bold text-white">in</span>
                    Draft
                  </div>
                  <div className="mt-4 space-y-3 text-[15px] leading-relaxed">
                    <p className="font-medium">
                      We cut our posting volume by 60% and reach went up.
                    </p>
                    <p className="text-muted">
                      Turns out the algorithm was never the problem. We were
                      publishing four mediocre posts a week because the calendar
                      said to.
                    </p>
                    <p className="text-muted">
                      Now we publish two. Both get scored before they go out.
                    </p>
                    <p className="text-muted">What would you drop first?</p>
                  </div>
                </div>

                <div className="space-y-4 bg-[var(--bg-subtle)] p-6">
                  <div className="flex items-center justify-between">
                    <ScoreRing score={87} size={72} label="Predicted" sublabel="Strong for LinkedIn" />
                    <Badge tone="success">Ready</Badge>
                  </div>
                  <div className="space-y-3">
                    <SignalBar label="Hook" score={91} />
                    <SignalBar label="Voice match" score={84} />
                    <SignalBar label="Length fit" score={96} />
                    <SignalBar label="Algorithm risk" score={100} detail="No reach-suppressing patterns" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Platforms                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-y bg-[var(--bg-subtle)] py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-center text-xs font-medium uppercase tracking-widest text-muted">
            Compose once. Publish everywhere.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {Object.values(PLATFORMS).map((p) => (
              <span
                key={p.id}
                className="surface inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
              >
                <span className={`size-2.5 rounded-full ${p.accent}`} />
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Three pillars                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Three things no other scheduler does together
          </h2>
          <p className="mt-4 text-muted">
            Buffer, Hootsuite and the rest are distribution. Postwave is
            judgement — what to say, in whose voice, and whether it will work.
          </p>
        </div>

        <div className="mt-16 space-y-20">
          {PILLARS.map((pillar, i) => (
            <div
              key={pillar.id}
              id={pillar.id}
              className="grid grid-cols-1 scroll-mt-24 items-center gap-10 md:grid-cols-2"
            >
              <div className={i % 2 ? "md:order-2" : ""}>
                <div className="inline-flex items-center gap-2 rounded-full border bg-brand-500/8 px-3 py-1 text-xs font-medium text-brand-500">
                  <pillar.icon className="size-3.5" />
                  {pillar.kicker}
                </div>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {pillar.title}
                </h3>
                <p className="mt-4 text-pretty text-muted">{pillar.body}</p>
                <ul className="mt-6 space-y-2.5">
                  {pillar.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-brand-500" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={i % 2 ? "md:order-1" : ""}>
                <PillarVisual id={pillar.id} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Comparison                                                        */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-y bg-[var(--bg-subtle)] py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            Where the difference actually is
          </h2>
          <Card className="mt-10 overflow-hidden p-0">
            <div className="grid grid-cols-[1fr_88px_88px] items-center gap-2 border-b px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted">
              <span />
              <span className="text-center">Postwave</span>
              <span className="text-center">Typical</span>
            </div>
            {COMPARISON.map(([label, mine, theirs]) => (
              <div
                key={label}
                className="grid grid-cols-[1fr_88px_88px] items-center gap-2 border-b px-5 py-3.5 text-sm last:border-b-0"
              >
                <span>{label}</span>
                <span className="flex justify-center">
                  {mine ? (
                    <Check className="size-4 text-emerald-500" />
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </span>
                <span className="flex justify-center">
                  {theirs ? (
                    <Check className="size-4 text-ink-400" />
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </span>
              </div>
            ))}
          </Card>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Pricing                                                           */}
      {/* ---------------------------------------------------------------- */}
      <section id="pricing" className="mx-auto max-w-5xl scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple pricing
          </h2>
          <p className="mt-4 text-muted">
            Start free. Upgrade when the queue is paying for itself.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {Object.values(PLANS).map((plan) => {
            const isPro = plan.id === "pro";
            return (
              <Card
                key={plan.id}
                className={`relative p-7 ${isPro ? "border-brand-500/40 shadow-lg shadow-brand-600/10" : ""}`}
              >
                {isPro ? (
                  <Badge tone="brand" className="absolute -top-2.5 right-6">
                    Most popular
                  </Badge>
                ) : null}
                <h3 className="font-semibold">{plan.name}</h3>
                <p className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight">${plan.price}</span>
                  <span className="text-sm text-muted">/month</span>
                </p>
                <ButtonLink
                  href="/signup"
                  variant={isPro ? "primary" : "outline"}
                  className="mt-6 w-full"
                >
                  {isPro ? "Start free, upgrade anytime" : "Start free"}
                </ButtonLink>
                <ul className="mt-7 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-brand-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted">
          <span className="inline-flex items-center gap-2">
            <Shield className="size-4" /> Your tokens stay in your database
          </span>
          <span className="inline-flex items-center gap-2">
            <Zap className="size-4" /> Cancel in one click
          </span>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* CTA + footer                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-t bg-[var(--bg-subtle)]">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Stop guessing what to post.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted">
            Train your fingerprint in five minutes. Score your next post before
            it goes out.
          </p>
          <ButtonLink href="/signup" size="lg" className="mt-8">
            Start free <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6">
          <Logo />
          <p>© {new Date().getFullYear()} Postwave</p>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-[var(--fg)]">Log in</Link>
            <Link href="/signup" className="hover:text-[var(--fg)]">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Small illustrative panels for each pillar — real component, fake data. */
function PillarVisual({ id }: { id: string }) {
  if (id === "voice") {
    return (
      <Card className="p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Voice fingerprint
        </p>
        <div className="mt-4 flex items-center gap-4">
          <ScoreRing score={84} size={80} label="Voice match" sublabel="Sounds like you" />
        </div>
        <div className="mt-5 space-y-3">
          <SignalBar label="Sentence rhythm" score={92} detail="13.1 words/sentence vs your 13.4" />
          <SignalBar label="Vocabulary" score={71} detail="24% of content words are ones you use" />
          <SignalBar label="Banned phrases" score={100} detail="Clean" />
        </div>
      </Card>
    );
  }

  if (id === "predict") {
    return (
      <Card className="p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          What your audience rewards
        </p>
        <p className="mt-1 text-sm text-muted">Refit from 43 published posts</p>
        <div className="mt-5 space-y-3.5">
          {[
            ["Hook strength", 38, "+8"],
            ["Length fit", 22, "+6"],
            ["Voice match", 18, "+6"],
            ["Call to action", 11, "-1"],
            ["Readability", 7, "-7"],
            ["Algorithm safety", 4, "-12"],
          ].map(([label, share, delta]) => (
            <div key={label as string} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-sm">{label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-subtle)] border">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${(share as number) * 2.4}%` }}
                />
              </div>
              <span
                className={`w-10 text-right text-xs tabular-nums ${
                  (delta as string).startsWith("+") ? "text-emerald-500" : "text-muted"
                }`}
              >
                {delta}
              </span>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        This week&apos;s queue
      </p>
      <div className="mt-4 space-y-2.5">
        {[
          ["Mon 9:15", "The 60% volume cut", 87, "approved"],
          ["Tue 16:30", "How the scoring actually works", 79, "approved"],
          ["Wed 9:15", "What we got wrong in Q1", 84, "pending"],
          ["Thu 16:30", "Against the daily-posting advice", 91, "pending"],
          ["Fri 9:15", "One line that changed the funnel", 73, "pending"],
        ].map(([slot, title, score, state]) => (
          <div
            key={slot as string}
            className="flex items-center gap-3 rounded-lg border bg-[var(--bg-subtle)] px-3 py-2.5"
          >
            <span className="w-16 shrink-0 font-mono text-xs text-muted">{slot}</span>
            <span className="min-w-0 flex-1 truncate text-sm">{title}</span>
            <span
              className="shrink-0 text-xs font-semibold tabular-nums"
              style={{
                color:
                  (score as number) >= 80
                    ? "var(--color-signal-strong)"
                    : "var(--color-signal-good)",
              }}
            >
              {score}
            </span>
            {state === "approved" ? (
              <Check className="size-3.5 shrink-0 text-emerald-500" />
            ) : (
              <span className="size-3.5 shrink-0 rounded-full border-2 border-dashed" />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
