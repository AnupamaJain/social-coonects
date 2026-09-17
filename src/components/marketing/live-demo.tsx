"use client";

import { useMemo, useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { ButtonLink, Textarea } from "@/components/ui";
import { scorePost } from "@/lib/scoring";
import { getPlatform, PLATFORMS } from "@/lib/platforms/registry";
import type { PlatformId } from "@/lib/platforms/types";
import { Dial, SignalStack } from "./graphics";
import { cn } from "@/lib/utils";

const SAMPLES = {
  ai: `In today's fast-paced world, it's no secret that social media is a game changer for businesses looking to unlock growth and supercharge results.

Check out our blog to learn more! Like and share!

#marketing #growth #socialmedia #business #ai #content #b2b`,
  human: `We cut our posting volume by 60% and reach went up.

Turns out the algorithm was never the problem. We were publishing four mediocre posts a week because the calendar said to.

Now we publish two. Both get scored before they go out.

What would you drop first?`,
};

const DEMO_PLATFORMS: PlatformId[] = ["linkedin", "x", "instagram", "threads"];

/**
 * The product, on the landing page, with no account. The scorer is pure
 * computation so this runs entirely in the browser — every keystroke
 * re-scores instantly, which is the whole demonstration.
 */
export function LiveDemo() {
  const [text, setText] = useState(SAMPLES.ai);
  const [platform, setPlatform] = useState<PlatformId>("linkedin");

  const result = useMemo(() => scorePost(text, platform), [text, platform]);
  const def = getPlatform(platform);
  const over = text.length > def.charLimit;

  return (
    <div className="surface grid grid-cols-1 overflow-hidden rounded-2xl shadow-2xl shadow-ink-900/10 lg:grid-cols-[1.25fr_1fr]">
      {/* Editor */}
      <div className="flex flex-col border-b p-5 sm:p-6 lg:border-b-0 lg:border-r">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg bg-[var(--bg-subtle)] p-1">
            {DEMO_PLATFORMS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setPlatform(id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  platform === id ? "bg-[var(--panel)] shadow-sm" : "text-muted hover:text-[var(--fg)]",
                )}
              >
                {PLATFORMS[id].name}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setText(SAMPLES.ai)}
              className="rounded-md border px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-[var(--fg)]"
            >
              AI draft
            </button>
            <button
              type="button"
              onClick={() => setText(SAMPLES.human)}
              className="rounded-md border px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-[var(--fg)]"
            >
              Human draft
            </button>
            <button
              type="button"
              onClick={() => setText("")}
              aria-label="Clear"
              className="rounded-md border px-2 py-1.5 text-xs text-muted transition-colors hover:text-[var(--fg)]"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={11}
          spellCheck={false}
          aria-label="Post to score"
          placeholder="Paste a post, or write one. It scores as you type."
          className="mt-4 flex-1 border-0 bg-transparent px-0 text-[15px] shadow-none focus:ring-0"
        />

        <div className="mt-3 flex items-center justify-between border-t pt-3 font-mono text-[11px] uppercase tracking-wider text-muted">
          <span className={over ? "text-signal-weak" : ""}>
            {text.length} / {def.charLimit}
          </span>
          <span>scored in your browser · nothing is sent anywhere</span>
        </div>
      </div>

      {/* Score */}
      <div className="flex flex-col gap-6 bg-[var(--bg-subtle)] p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <Dial score={result.predicted} size={112} caption={`Predicted · ${def.name}`} />
          <div className="text-right">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted">Verdict</p>
            <p
              className="mt-1 font-serif text-2xl font-semibold"
              style={{
                color:
                  result.predicted >= 80 ? "var(--color-signal-strong)"
                  : result.predicted >= 65 ? "var(--color-signal-good)"
                  : result.predicted >= 45 ? "var(--color-signal-fair)"
                  : "var(--color-signal-weak)",
              }}
            >
              {result.predicted >= 80 ? "Ship it" : result.predicted >= 65 ? "Nearly" : result.predicted >= 45 ? "Needs work" : "Don't"}
            </p>
          </div>
        </div>

        <SignalStack signals={result.signals.map((s) => ({ label: s.label, value: s.score }))} />

        <div className="flex-1">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
            {result.suggestions.length ? "Fix first" : "Nothing to fix"}
          </p>
          <ul className="mt-2 space-y-1.5">
            {result.suggestions.slice(0, 3).map((s) => (
              <li key={s} className="flex gap-2 text-sm leading-snug">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-clay-500" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t pt-4">
          <p className="text-xs text-muted">
            Voice Match is the sixth signal. It needs ten of your posts to train — that part happens after you sign up.
          </p>
          <ButtonLink href="/signup" size="sm" className="mt-3 w-full">
            Score your real posts <ArrowRight className="size-3.5" />
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
