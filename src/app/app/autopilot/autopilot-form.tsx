"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Sparkles } from "lucide-react";
import { Alert, Button, Card, Label, Select, Textarea } from "@/components/ui";
import { getPlatform } from "@/lib/platforms/registry";
import { cn } from "@/lib/utils";
import { runAutopilot } from "../actions";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
      {pending ? "Writing your week…" : "Generate the week"}
    </Button>
  );
}

export function AutopilotForm({
  accounts,
  maxCount,
  planName,
  canRunFullWeek,
}: {
  accounts: { id: string; platform: string; handle: string }[];
  maxCount: number;
  planName: string;
  canRunFullWeek: boolean;
}) {
  const [selected, setSelected] = useState<string[]>(
    accounts.slice(0, 1).map((a) => a.id),
  );
  const [message, setMessage] = useState<
    { tone: "success" | "danger"; text: string } | null
  >(null);

  const platforms = [...new Set(accounts.filter((a) => selected.includes(a.id)).map((a) => a.platform))];

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-clay-500" />
        <h2 className="font-semibold tracking-tight">Run Autopilot</h2>
      </div>

      {message ? (
        <Alert tone={message.tone} className="mt-4">{message.text}</Alert>
      ) : null}

      <form
        className="mt-4 space-y-4"
        action={async (fd) => {
          setMessage(null);
          const res = await runAutopilot(fd);
          if (res?.error) setMessage({ tone: "danger", text: res.error });
          else
            setMessage({
              tone: "success",
              text: `${res?.created} drafts written and scored${res?.offline ? " (offline mode)" : ""}. Review them below.`,
            });
        }}
      >
        {selected.map((id) => (
          <input key={id} type="hidden" name="accountIds" value={id} />
        ))}
        {platforms.map((p) => (
          <input key={p} type="hidden" name="platforms" value={p} />
        ))}

        <div>
          <Label htmlFor="topic">What should the week be about?</Label>
          <Textarea
            id="topic"
            name="topic"
            rows={3}
            required
            placeholder="Why most B2B content teams measure the wrong thing, and what we changed after our Q1 audit."
          />
          <p className="mt-1.5 text-xs text-muted">
            Specific beats broad. A real opinion or a real project gives it
            something to work with.
          </p>
        </div>

        {accounts.length > 0 ? (
          <div>
            <Label>Target accounts</Label>
            <div className="flex flex-wrap gap-2">
              {accounts.map((a) => {
                const def = getPlatform(a.platform);
                const on = selected.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() =>
                      setSelected((s) =>
                        s.includes(a.id) ? s.filter((x) => x !== a.id) : [...s, a.id],
                      )
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all",
                      on
                        ? "border-clay-500/50 bg-clay-500/10 text-clay-600 dark:text-clay-300"
                        : "text-muted hover:bg-[var(--bg-subtle)]",
                    )}
                  >
                    <span className={cn("size-2 rounded-full", def.accent)} />
                    {def.name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <Alert tone="warning">
            No accounts connected. Drafts will still be written and scored, but
            you&apos;ll need an account before they can be queued.
          </Alert>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-32">
            <Label htmlFor="count">Posts</Label>
            <Select id="count" name="count" defaultValue={String(Math.min(5, maxCount))}>
              {Array.from({ length: maxCount }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
          </div>
          <SubmitButton disabled={false} />
        </div>

        {!canRunFullWeek ? (
          <p className="text-xs text-muted">
            The {planName} plan generates up to {maxCount} at a time.{" "}
            <a href="/app/settings/billing" className="text-clay-500 hover:underline">
              Upgrade
            </a>{" "}
            for a full week.
          </p>
        ) : null}
      </form>
    </Card>
  );
}
