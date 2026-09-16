"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Alert, Button, Card, Label, Textarea } from "@/components/ui";
import {
  addVoiceSamples, deleteVoiceSample, retrainVoiceAction, updateVoiceLists,
} from "../actions";

export function SampleManager({
  samples,
}: {
  samples: { id: string; text: string; platform: string | null }[];
}) {
  const [adding, setAdding] = useState(samples.length === 0);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold tracking-tight">Writing samples</h2>
          <p className="mt-1 text-sm text-muted">
            {samples.length
              ? `${samples.length} sample${samples.length === 1 ? "" : "s"} training your fingerprint.`
              : "Paste 5-10 posts. Separate them with a line containing ---."}
          </p>
        </div>
        <div className="flex gap-2">
          {samples.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await retrainVoiceAction();
                  setMessage({
                    tone: "success",
                    text: res.offline
                      ? "Retrained from measured traits (offline mode)."
                      : "Fingerprint retrained.",
                  });
                })
              }
            >
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              Retrain
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
            <Plus className="size-3.5" /> Add
          </Button>
        </div>
      </div>

      {message ? (
        <Alert tone={message.tone} className="mt-4">{message.text}</Alert>
      ) : null}

      {adding ? (
        <form
          className="mt-4"
          action={async (fd) => {
            const res = await addVoiceSamples(fd);
            if (res?.error) setMessage({ tone: "danger", text: res.error });
            else {
              setMessage({
                tone: "success",
                text: `Added ${res?.added} sample${res?.added === 1 ? "" : "s"} and retrained.`,
              });
              setAdding(false);
            }
          }}
        >
          <Label htmlFor="samples">Paste your posts</Label>
          <Textarea
            id="samples"
            name="samples"
            rows={10}
            required
            placeholder={`We cut our posting volume by 60% and reach went up.\n\nTurns out the algorithm was never the problem.\n\n---\n\nThe best hire I ever made failed the take-home.`}
            className="font-[15px]"
          />
          <div className="mt-3 flex gap-2">
            <SubmitButton />
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {samples.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {samples.map((s) => (
            <li
              key={s.id}
              className="group flex items-start gap-3 rounded-lg border bg-[var(--bg-subtle)] p-3"
            >
              <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-relaxed line-clamp-4">
                {s.text}
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label="Delete sample"
                disabled={pending}
                onClick={() => start(() => deleteVoiceSample(s.id))}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function SubmitButton() {
  return (
    <Button type="submit">
      Add and retrain
    </Button>
  );
}

export function VoiceLists({
  summary,
  doList,
  dontList,
}: {
  summary: string;
  doList: string[];
  dontList: string[];
}) {
  const [saved, setSaved] = useState(false);

  return (
    <Card className="p-5">
      <h2 className="font-semibold tracking-tight">Voice profile</h2>
      <p className="mt-1 text-sm text-muted">
        Generated from your samples. Edit anything that isn&apos;t right — this
        text goes into every generation.
      </p>

      <form
        className="mt-4 space-y-4"
        action={async (fd) => {
          await updateVoiceLists(fd);
          setSaved(true);
        }}
      >
        <div>
          <Label htmlFor="summary">How you write</Label>
          <Textarea id="summary" name="summary" rows={4} defaultValue={summary} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="doList">Always do (one per line)</Label>
            <Textarea
              id="doList" name="doList" rows={6}
              defaultValue={doList.join("\n")}
              placeholder={"Open with a concrete number\nEnd on a question"}
            />
          </div>
          <div>
            <Label htmlFor="dontList">Never say (one per line)</Label>
            <Textarea
              id="dontList" name="dontList" rows={6}
              defaultValue={dontList.join("\n")}
              placeholder={"delve\ngame changer\nunlock"}
            />
            <p className="mt-1.5 text-xs text-muted">
              These are enforced — a draft containing one loses Voice Match points.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" onClick={() => setSaved(false)}>Save profile</Button>
          {saved ? <span className="text-sm text-emerald-500">Saved</span> : null}
        </div>
      </form>
    </Card>
  );
}
