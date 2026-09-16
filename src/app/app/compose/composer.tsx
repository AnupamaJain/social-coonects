"use client";

import {
  useActionState, useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import {
  AlertTriangle, CalendarClock, Check, Fingerprint, Loader2, Send,
  Sparkles, Wand2,
} from "lucide-react";
import { PageBody, PageHeader } from "@/components/page-header";
import { PlatformPreview } from "@/components/platform-preview";
import { ScoreRing, SignalBar } from "@/components/score";
import {
  Alert, Badge, Button, Card, Input, Label, Textarea,
} from "@/components/ui";
import { getPlatform } from "@/lib/platforms/registry";
import type { PlatformId } from "@/lib/platforms/types";
import { cn } from "@/lib/utils";
import { savePost, type SaveState } from "../actions";

interface AccountLite {
  id: string;
  platform: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  isSandbox: boolean;
}

interface PostLite {
  id: string;
  body: string;
  status: string;
  scheduledAt: string | null;
  mediaUrls: string[];
  targets: { accountId: string; override: string | null }[];
}

interface Signal { label: string; score: number; detail: string }
interface PlatformScore {
  platform: PlatformId;
  predicted: number;
  voiceMatch: number;
  signals: Signal[];
  suggestions: string[];
}

export function Composer({
  accounts,
  workspaceName,
  voiceTrained,
  aiOnline,
  post,
}: {
  accounts: AccountLite[];
  workspaceName: string;
  voiceTrained: boolean;
  aiOnline: boolean;
  post: PostLite | null;
}) {
  const [body, setBody] = useState(post?.body ?? "");
  const [selected, setSelected] = useState<string[]>(
    post?.targets.map((t) => t.accountId) ?? accounts.slice(0, 1).map((a) => a.id),
  );
  const [overrides, setOverrides] = useState<Record<string, string>>(
    Object.fromEntries(
      (post?.targets ?? [])
        .filter((t) => t.override)
        .map((t) => [t.accountId, t.override!]),
    ),
  );
  const [activeId, setActiveId] = useState<string | null>(
    post?.targets[0]?.accountId ?? accounts[0]?.id ?? null,
  );
  const [scores, setScores] = useState<PlatformScore[]>([]);
  const [scoring, setScoring] = useState(false);
  const [brief, setBrief] = useState("");
  const [variations, setVariations] = useState<string[]>([]);
  const [angles, setAngles] = useState<string[]>([]);
  const [busy, setBusy] = useState<null | "variations" | "rewrite">(null);
  const [error, setError] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState(
    post?.scheduledAt ? post.scheduledAt.slice(0, 16) : "",
  );
  const [showSchedule, setShowSchedule] = useState(false);
  const [saveState, saveAction] = useActionState<SaveState, FormData>(savePost, {});

  const activeAccount = accounts.find((a) => a.id === activeId) ?? accounts[0] ?? null;
  const activePlatform = (activeAccount?.platform ?? "linkedin") as PlatformId;

  const selectedPlatforms = useMemo(
    () => [...new Set(accounts.filter((a) => selected.includes(a.id)).map((a) => a.platform))],
    [accounts, selected],
  );

  /** Text for a given account: its override if set, otherwise the shared body. */
  const textFor = useCallback(
    (accountId: string | null) =>
      (accountId && overrides[accountId]) || body,
    [overrides, body],
  );

  // --- live scoring, debounced -------------------------------------------
  const scoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (scoreTimer.current) clearTimeout(scoreTimer.current);
    scoreTimer.current = setTimeout(async () => {
      // Clearing happens here rather than in the effect body so no state is set
      // synchronously during the effect (which would cascade a second render).
      if (!body.trim()) {
        setScores([]);
        return;
      }
      setScoring(true);
      try {
        const platforms = selectedPlatforms.length ? selectedPlatforms : ["linkedin"];
        const res = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textFor(activeId), platforms }),
        });
        if (res.ok) {
          const data = await res.json();
          setScores(data.scores);
        }
      } finally {
        setScoring(false);
      }
    }, 420);

    return () => {
      if (scoreTimer.current) clearTimeout(scoreTimer.current);
    };
  }, [body, overrides, activeId, selectedPlatforms, textFor]);

  const activeScore =
    scores.find((s) => s.platform === activePlatform) ?? scores[0] ?? null;

  // --- AI actions ---------------------------------------------------------
  async function runVariations() {
    setError(null);
    setBusy("variations");
    try {
      const res = await fetch("/api/ai/variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: brief.trim() || undefined,
          draft: body.trim() || undefined,
          platform: activePlatform,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      setVariations(data.variations ?? []);
      setAngles(data.angles ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function runRewrite() {
    setError(null);
    setBusy("rewrite");
    try {
      const res = await fetch("/api/ai/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textFor(activeId),
          platform: activePlatform,
          weaknesses: activeScore?.suggestions ?? [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rewrite failed.");
      applyText(data.text);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  /** Writes into the override when one is active, otherwise the shared body. */
  function applyText(text: string) {
    if (activeId && overrides[activeId] !== undefined) {
      setOverrides((o) => ({ ...o, [activeId]: text }));
    } else {
      setBody(text);
    }
  }

  const overLimit = accounts
    .filter((a) => selected.includes(a.id))
    .filter((a) => textFor(a.id).length > getPlatform(a.platform).charLimit);

  const missingMedia = accounts
    .filter((a) => selected.includes(a.id))
    .filter((a) => getPlatform(a.platform).requiresMedia && !(post?.mediaUrls.length));

  return (
    <form action={saveAction}>
      <input type="hidden" name="postId" value={post?.id ?? ""} />
      <input type="hidden" name="overrides" value={JSON.stringify(overrides)} />
      <input type="hidden" name="body" value={body} />
      {selected.map((id) => (
        <input key={id} type="hidden" name="accountIds" value={id} />
      ))}

      <PageHeader
        title={post ? "Edit post" : "Compose"}
        description="One draft, every platform. Scored before it leaves."
        action={
          <>
            <Button type="submit" name="intent" value="draft" variant="outline">
              Save draft
            </Button>
            <Button type="submit" name="intent" value="queue" disabled={!selected.length}>
              <Sparkles className="size-4" /> Add to queue
            </Button>
          </>
        }
      />

      <PageBody>
        {accounts.length === 0 ? (
          <Alert tone="warning" className="mb-6">
            No accounts connected yet. You can still write and score drafts —{" "}
            <a href="/app/accounts" className="font-medium underline">
              connect an account
            </a>{" "}
            to schedule or publish.
          </Alert>
        ) : null}

        {error || saveState.error ? (
          <Alert tone="danger" className="mb-6">{error ?? saveState.error}</Alert>
        ) : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* ---------------------------------------------------------- */}
          {/* Editor column                                               */}
          {/* ---------------------------------------------------------- */}
          <div className="min-w-0 space-y-6">
            {/* Accounts */}
            {accounts.length > 0 ? (
              <Card className="p-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
                  Publishing to
                </p>
                <div className="flex flex-wrap gap-2">
                  {accounts.map((a) => {
                    const def = getPlatform(a.platform);
                    const on = selected.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setSelected((s) =>
                            s.includes(a.id) ? s.filter((x) => x !== a.id) : [...s, a.id],
                          );
                          setActiveId(a.id);
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all",
                          on
                            ? "border-brand-500/50 bg-brand-500/10 text-brand-600 dark:text-brand-300"
                            : "text-muted hover:bg-[var(--bg-subtle)]",
                        )}
                      >
                        <span className={cn("size-2 rounded-full", def.accent)} />
                        {def.name}
                        <span className="text-xs opacity-70">{a.handle}</span>
                        {on ? <Check className="size-3.5" /> : null}
                      </button>
                    );
                  })}
                </div>
              </Card>
            ) : null}

            {/* Editor */}
            <Card className="p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <Label htmlFor="editor" className="mb-0">
                  {activeId && overrides[activeId] !== undefined
                    ? `${getPlatform(activePlatform).name} version`
                    : "Your post"}
                </Label>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className="tabular-nums">
                    {textFor(activeId).length}
                    {activeAccount
                      ? ` / ${getPlatform(activePlatform).charLimit}`
                      : ""}
                  </span>
                  {scoring ? <Loader2 className="size-3 animate-spin" /> : null}
                </div>
              </div>

              <Textarea
                id="editor"
                rows={12}
                value={textFor(activeId)}
                onChange={(e) =>
                  activeId && overrides[activeId] !== undefined
                    ? setOverrides((o) => ({ ...o, [activeId]: e.target.value }))
                    : setBody(e.target.value)
                }
                placeholder="What do you want to say?&#10;&#10;Lead with the line that earns the second line."
                className="text-[15px]"
              />

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={runRewrite}
                  disabled={busy !== null || !body.trim() || !voiceTrained}
                  title={
                    voiceTrained
                      ? undefined
                      : "Train your Voice Fingerprint first"
                  }
                >
                  {busy === "rewrite" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Fingerprint className="size-4" />
                  )}
                  Make it sound like me
                </Button>

                {activeAccount && selected.length > 1 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setOverrides((o) => {
                        const next = { ...o };
                        if (next[activeAccount.id] !== undefined) {
                          delete next[activeAccount.id];
                        } else {
                          next[activeAccount.id] = body;
                        }
                        return next;
                      })
                    }
                  >
                    {overrides[activeAccount.id] !== undefined
                      ? "Use the shared version"
                      : `Customise for ${getPlatform(activePlatform).name}`}
                  </Button>
                ) : null}
              </div>
            </Card>

            {/* AI generation */}
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-brand-500" />
                <h2 className="text-sm font-semibold">Generate variations</h2>
                {!aiOnline ? (
                  <Badge tone="warning">Offline mode</Badge>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted">
                Each variation takes a different angle, written against your voice
                fingerprint.
              </p>

              <div className="mt-3 flex gap-2">
                <Input
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder={
                    body.trim()
                      ? "Optional: how should these differ from the draft?"
                      : "What's the post about?"
                  }
                />
                <Button
                  type="button"
                  onClick={runVariations}
                  disabled={busy !== null || (!brief.trim() && !body.trim())}
                >
                  {busy === "variations" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Wand2 className="size-4" />
                  )}
                  Generate
                </Button>
              </div>

              {variations.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {variations.map((v, i) => (
                    <div
                      key={i}
                      className="group rounded-lg border bg-[var(--bg-subtle)] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone="brand">{angles[i] ?? `Variation ${i + 1}`}</Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => applyText(v)}
                        >
                          Use this
                        </Button>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                        {v}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </Card>

            {/* Preview */}
            {accounts.length > 0 ? (
              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">Preview</h2>
                  <div className="flex flex-wrap gap-1">
                    {accounts
                      .filter((a) => selected.includes(a.id))
                      .map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setActiveId(a.id)}
                          className={cn(
                            "rounded-md px-2.5 py-1 text-xs transition-colors",
                            activeId === a.id
                              ? "bg-[var(--bg-subtle)] font-medium border"
                              : "text-muted hover:text-[var(--fg)]",
                          )}
                        >
                          {getPlatform(a.platform).name}
                        </button>
                      ))}
                  </div>
                </div>

                {activeAccount ? (
                  <PlatformPreview
                    platform={activePlatform}
                    text={textFor(activeAccount.id)}
                    mediaUrls={post?.mediaUrls ?? []}
                    author={{
                      name: activeAccount.displayName || workspaceName,
                      handle: activeAccount.handle,
                      avatarUrl: activeAccount.avatarUrl,
                    }}
                  />
                ) : null}
              </Card>
            ) : null}
          </div>

          {/* ---------------------------------------------------------- */}
          {/* Score column                                                */}
          {/* ---------------------------------------------------------- */}
          <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Pre-flight</h2>
                {activeAccount ? (
                  <Badge>{getPlatform(activePlatform).name}</Badge>
                ) : null}
              </div>

              {activeScore ? (
                <>
                  <div className="mt-4 flex justify-center">
                    <ScoreRing score={activeScore.predicted} size={104} />
                  </div>
                  <p className="mt-2 text-center text-xs text-muted">
                    Predicted performance
                  </p>

                  <div className="mt-5 space-y-3.5">
                    {activeScore.signals.map((s) => (
                      <SignalBar
                        key={s.label}
                        label={s.label}
                        score={s.score}
                        detail={s.detail}
                      />
                    ))}
                  </div>

                  {activeScore.suggestions.length > 0 ? (
                    <div className="mt-5 space-y-2 border-t pt-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted">
                        Fix these first
                      </p>
                      {activeScore.suggestions.map((s) => (
                        <p key={s} className="flex gap-2 text-xs text-muted">
                          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                          {s}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="mt-6 text-center text-sm text-muted">
                  Start writing and the score appears here.
                </p>
              )}
            </Card>

            {/* Blockers */}
            {overLimit.length > 0 || missingMedia.length > 0 ? (
              <Alert tone="danger">
                {overLimit.map((a) => (
                  <p key={a.id}>
                    Too long for {getPlatform(a.platform).name} ({textFor(a.id).length}/
                    {getPlatform(a.platform).charLimit}).
                  </p>
                ))}
                {missingMedia.map((a) => (
                  <p key={a.id}>
                    {getPlatform(a.platform).name} needs an image before it can publish.
                  </p>
                ))}
              </Alert>
            ) : null}

            {/* Scheduling */}
            <Card className="p-5">
              <h2 className="text-sm font-semibold">Publish</h2>

              <Button
                type="submit"
                name="intent"
                value="queue"
                className="mt-3 w-full"
                disabled={!selected.length}
              >
                <Sparkles className="size-4" /> Add to next queue slot
              </Button>

              <button
                type="button"
                onClick={() => setShowSchedule((v) => !v)}
                className="mt-3 flex w-full items-center justify-center gap-2 text-xs text-muted hover:text-[var(--fg)]"
              >
                <CalendarClock className="size-3.5" />
                {showSchedule ? "Hide" : "Pick an exact time instead"}
              </button>

              {showSchedule ? (
                <div className="mt-3 space-y-2">
                  <Input
                    type="datetime-local"
                    name="scheduledAt"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                  <Button
                    type="submit"
                    name="intent"
                    value="schedule"
                    variant="outline"
                    className="w-full"
                    disabled={!scheduledAt || !selected.length}
                  >
                    Schedule
                  </Button>
                </div>
              ) : null}

              <div className="my-4 border-t" />

              <Button
                type="submit"
                name="intent"
                value="publish"
                variant="secondary"
                className="w-full"
                disabled={!selected.length || overLimit.length > 0}
              >
                <Send className="size-4" /> Publish now
              </Button>

              {accounts.some((a) => selected.includes(a.id) && a.isSandbox) ? (
                <p className="mt-3 text-center text-xs text-muted">
                  Sandbox accounts don&apos;t post anywhere real.
                </p>
              ) : null}
            </Card>
          </div>
        </div>
      </PageBody>
    </form>
  );
}
