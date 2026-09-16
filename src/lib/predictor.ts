/**
 * Per-workspace refit of the pre-flight weight vector.
 *
 * We regress the six pre-flight signals against how each published post
 * actually performed (engagement rate, rank-normalised inside the workspace so
 * a viral outlier can't dominate). Ridge-pulled toward DEFAULT_WEIGHTS so a
 * workspace with 12 posts gets a gentle nudge, not a wild swing.
 */
import { db, readJson, writeJson } from "./db";
import { DEFAULT_WEIGHTS, scorePost, type ScoreWeights } from "./scoring";
import { extractTraits, type VoiceTraits } from "./voice-stats";
import type { PlatformId } from "./platforms/types";

export const MIN_SAMPLES = 8;

const FEATURES = ["hook", "readability", "cta", "lengthFit", "algoRisk", "voiceMatch"] as const;
type Feature = (typeof FEATURES)[number];

export async function getWeights(workspaceId: string): Promise<{
  weights: ScoreWeights;
  trained: boolean;
  samples: number;
  trainedAt: Date | null;
}> {
  const row = await db.predictorWeights.findUnique({ where: { workspaceId } });
  if (!row || row.samples < MIN_SAMPLES) {
    return {
      weights: DEFAULT_WEIGHTS,
      trained: false,
      samples: row?.samples ?? 0,
      trainedAt: row?.trainedAt ?? null,
    };
  }
  return {
    weights: { ...DEFAULT_WEIGHTS, ...readJson<Partial<ScoreWeights>>(row.weights, {}) },
    trained: true,
    samples: row.samples,
    trainedAt: row.trainedAt,
  };
}

/** Rank-normalise to 0..100 so outliers compress instead of exploding. */
function rankNormalise(values: number[]): number[] {
  const order = values
    .map((v, i) => ({ v, i }))
    .sort((a, b) => a.v - b.v);
  const out = new Array(values.length).fill(0);
  order.forEach((o, rank) => {
    out[o.i] = values.length > 1 ? (rank / (values.length - 1)) * 100 : 50;
  });
  return out;
}

export async function trainPredictor(workspaceId: string) {
  const targets = await db.postTarget.findMany({
    where: {
      status: "published",
      post: { workspaceId },
    },
    include: {
      post: true,
      account: true,
      metrics: { orderBy: { fetchedAt: "desc" }, take: 1 },
    },
  });

  const usable = targets.filter((t) => t.metrics[0] && t.metrics[0].impressions > 0);
  if (usable.length < MIN_SAMPLES) {
    await db.predictorWeights.upsert({
      where: { workspaceId },
      create: { workspaceId, weights: writeJson(DEFAULT_WEIGHTS), samples: usable.length },
      update: { samples: usable.length, trainedAt: new Date() },
    });
    return { trained: false, samples: usable.length };
  }

  const profile = await db.voiceProfile.findFirst({
    where: { workspaceId, isDefault: true },
    include: { samples: true },
  });
  const traits: VoiceTraits = extractTraits(profile?.samples.map((s) => s.text) ?? []);
  const dontList = readJson<string[]>(profile?.dontList, []);

  // Feature matrix, scaled to 0..1.
  const rows = usable.map((t) => {
    const text = t.override ?? t.post.body;
    const s = scorePost(text, t.account.platform as PlatformId, {
      traits,
      dontList,
      weights: DEFAULT_WEIGHTS,
    });
    return {
      x: {
        hook: s.hook / 100,
        readability: s.readability / 100,
        cta: s.cta / 100,
        lengthFit: s.lengthFit / 100,
        algoRisk: (100 - s.algoRisk) / 100,
        voiceMatch: s.voiceMatch / 100,
      } as Record<Feature, number>,
      engagement:
        (t.metrics[0].likes + t.metrics[0].comments * 3 + t.metrics[0].shares * 4) /
        Math.max(1, t.metrics[0].impressions),
    };
  });

  const y = rankNormalise(rows.map((r) => r.engagement)).map((v) => v / 100);

  // Ridge-regularised gradient descent toward the priors.
  const w: Record<Feature, number> = { ...DEFAULT_WEIGHTS } as Record<Feature, number>;
  let intercept = 0;
  const lr = 0.08;
  // Confidence grows with sample count: 8 posts nudge, 60 posts move properly.
  const ridge = Math.max(0.02, 1.2 / Math.sqrt(usable.length));

  for (let epoch = 0; epoch < 600; epoch++) {
    const grad: Record<Feature, number> = {
      hook: 0, readability: 0, cta: 0, lengthFit: 0, algoRisk: 0, voiceMatch: 0,
    };
    let gIntercept = 0;

    rows.forEach((row, i) => {
      const pred =
        FEATURES.reduce((acc, f) => acc + w[f] * row.x[f], 0) + intercept;
      const err = pred - y[i];
      for (const f of FEATURES) grad[f] += (err * row.x[f]) / rows.length;
      gIntercept += err / rows.length;
    });

    for (const f of FEATURES) {
      grad[f] += ridge * (w[f] - (DEFAULT_WEIGHTS[f] as number));
      w[f] = Math.max(0.01, w[f] - lr * grad[f]);
    }
    intercept -= lr * gIntercept;
  }

  // Renormalise to a weighted average. The gradient's own intercept did its
  // job during fitting (absorbing the mean offset so the weights aren't
  // distorted by it) and is deliberately discarded here: the score is an
  // absolute quality measure, and training is only allowed to change which
  // signals earn the weight. See the note in scoring.ts.
  const total = FEATURES.reduce((acc, f) => acc + w[f], 0) || 1;
  const weights = Object.fromEntries(
    FEATURES.map((f) => [f, w[f] / total]),
  ) as unknown as ScoreWeights;

  await db.predictorWeights.upsert({
    where: { workspaceId },
    create: { workspaceId, weights: writeJson(weights), samples: usable.length },
    update: { weights: writeJson(weights), samples: usable.length, trainedAt: new Date() },
  });

  return { trained: true, samples: usable.length, weights };
}

/** What the model has learned to care about, in plain English, for the UI. */
export function describeWeights(weights: ScoreWeights) {
  const labels: Record<Feature, string> = {
    hook: "Hook strength",
    readability: "Readability",
    cta: "Call to action",
    lengthFit: "Length fit",
    algoRisk: "Algorithm safety",
    voiceMatch: "Voice match",
  };
  return FEATURES.map((f) => ({
    key: f,
    label: labels[f],
    weight: weights[f],
    share: Math.round(weights[f] * 100),
    delta: Math.round((weights[f] - (DEFAULT_WEIGHTS[f] as number)) * 100),
  })).sort((a, b) => b.weight - a.weight);
}
