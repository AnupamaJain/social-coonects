import type { Metadata } from "next";
import { Fingerprint } from "lucide-react";
import { requireWorkspace } from "@/lib/auth";
import { readJson } from "@/lib/db";
import { aiEnabled } from "@/lib/ai/model";
import { getVoiceProfile } from "@/lib/voice";
import { EMPTY_TRAITS, extractTraits, type VoiceTraits } from "@/lib/voice-stats";
import { PageBody, PageHeader } from "@/components/page-header";
import { Alert, Badge, Card } from "@/components/ui";
import { SampleManager, VoiceLists } from "./voice-client";

export const metadata: Metadata = { title: "Voice" };

export default async function VoicePage() {
  const { workspace } = await requireWorkspace();
  const profile = await getVoiceProfile(workspace.id);

  const samples = profile.samples;
  const stored = readJson<VoiceTraits>(profile.traits, EMPTY_TRAITS);
  const traits = stored.sampleCount ? stored : extractTraits(samples.map((s) => s.text));
  const doList = readJson<string[]>(profile.doList, []);
  const dontList = readJson<string[]>(profile.dontList, []);

  const trained = traits.sampleCount > 0;
  const strength = Math.min(100, Math.round((traits.sampleCount / 10) * 100));

  return (
    <>
      <PageHeader
        title="Voice Fingerprint"
        description="Paste posts you're proud of. Everything the AI writes gets conditioned on this, and every draft gets scored against it."
        action={
          <Badge tone={trained ? "success" : "warning"}>
            {trained ? `${traits.sampleCount} samples` : "Not trained"}
          </Badge>
        }
      />

      <PageBody>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-6">
            {!trained ? (
              <Alert tone="info">
                <Fingerprint className="mr-1.5 inline size-4" />
                Five samples gets you a usable fingerprint. Ten makes it good.
                Paste your best-performing posts, not your most recent ones.
              </Alert>
            ) : null}

            {!aiEnabled() ? (
              <Alert tone="warning">
                Offline mode: traits are measured from your samples, but the
                written voice summary needs an AI key. Scoring and Voice Match
                work regardless.
              </Alert>
            ) : null}

            <SampleManager
              samples={samples.map((s) => ({
                id: s.id,
                text: s.text,
                platform: s.platform,
              }))}
            />

            <VoiceLists
              summary={profile.summary}
              doList={doList}
              dontList={dontList}
            />
          </div>

          {/* Fingerprint readout */}
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <Card className="p-5">
              <h2 className="text-sm font-semibold">Fingerprint strength</h2>
              <div className="mt-3 h-2 overflow-hidden rounded-full border bg-[var(--bg-subtle)]">
                <div
                  className="h-full rounded-full bg-clay-500 transition-[width] duration-500"
                  style={{ width: `${Math.max(3, strength)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted">
                {traits.sampleCount >= 10
                  ? "Strong. Add more any time your style shifts."
                  : `${10 - traits.sampleCount} more samples for a strong fingerprint.`}
              </p>
            </Card>

            {trained ? (
              <Card className="p-5">
                <h2 className="text-sm font-semibold">What we measured</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <Metric
                    label="Sentence length"
                    value={`${traits.avgSentenceWords.toFixed(1)} words`}
                    hint={`±${traits.sentenceWordsSpread.toFixed(1)} variation`}
                  />
                  <Metric
                    label="Short lines"
                    value={`${Math.round(traits.shortLineRate * 100)}%`}
                    hint="six words or fewer"
                  />
                  <Metric label="Emoji per post" value={traits.emojiPerPost.toFixed(1)} />
                  <Metric label="Hashtags per post" value={traits.hashtagPerPost.toFixed(1)} />
                  <Metric label="Questions per post" value={traits.questionRate.toFixed(1)} />
                  <Metric
                    label="First person"
                    value={`${(traits.firstPersonRate * 100).toFixed(1)}%`}
                    hint="of all words"
                  />
                </dl>

                {traits.vocabulary.length ? (
                  <>
                    <p className="mt-5 text-xs font-medium uppercase tracking-wide text-muted">
                      Words you reach for
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {traits.vocabulary.slice(0, 24).map((w) => (
                        <span
                          key={w}
                          className="rounded-md border bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-xs"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  </>
                ) : null}
              </Card>
            ) : null}
          </div>
        </div>
      </PageBody>
    </>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">
        <span className="font-medium tabular-nums">{value}</span>
        {hint ? <span className="ml-1.5 text-xs text-muted">{hint}</span> : null}
      </dd>
    </div>
  );
}
