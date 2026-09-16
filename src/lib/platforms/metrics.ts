import crypto from "node:crypto";
import { readJson } from "@/lib/db";
import type { MetricsResult, PlatformId } from "./types";

interface TargetLike {
  id: string;
  remoteId: string | null;
  publishedAt: Date | null;
  account: {
    platform: string;
    platformUserId: string;
    accessToken: string | null;
    meta: string;
    isSandbox: boolean;
  };
}

/** Deterministic pseudo-random in [0,1) from a string — stable across refetches. */
function seeded(seed: string): number {
  const h = crypto.createHash("sha256").update(seed).digest();
  return h.readUInt32BE(0) / 0xffffffff;
}

/**
 * Sandbox analytics. Numbers grow with the age of the post and stay stable for
 * a given post id, so charts look plausible and the predictor has something
 * real-shaped to train against before live API access exists.
 */
function sandboxMetrics(target: TargetLike): MetricsResult {
  const seed = target.remoteId ?? target.id;
  const ageHours = target.publishedAt
    ? (Date.now() - target.publishedAt.getTime()) / 3_600_000
    : 0;
  // Engagement saturates: most reach lands in the first ~48h.
  const maturity = 1 - Math.exp(-Math.max(ageHours, 0) / 18);
  const base = 300 + seeded(seed) * 5200;
  const impressions = Math.round(base * maturity);
  const engagementRate = 0.012 + seeded(`${seed}:er`) * 0.055;
  const engaged = Math.round(impressions * engagementRate);

  return {
    impressions,
    likes: Math.round(engaged * 0.72),
    comments: Math.round(engaged * 0.14),
    shares: Math.round(engaged * 0.09),
    clicks: Math.round(engaged * 0.05),
  };
}

const zero: MetricsResult = {
  impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0,
};

export async function fetchMetrics(target: TargetLike): Promise<MetricsResult> {
  const { account } = target;
  if (account.isSandbox || !account.accessToken || !target.remoteId) {
    return sandboxMetrics(target);
  }

  const platform = account.platform as PlatformId;
  const token = account.accessToken;
  const meta = readJson<Record<string, string>>(account.meta, {});

  try {
    switch (platform) {
      case "x": {
        const r = await fetch(
          `https://api.x.com/2/tweets/${target.remoteId}?tweet.fields=public_metrics,non_public_metrics`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!r.ok) return zero;
        const j = await r.json();
        const pm = j.data?.public_metrics ?? {};
        const np = j.data?.non_public_metrics ?? {};
        return {
          impressions: np.impression_count ?? pm.impression_count ?? 0,
          likes: pm.like_count ?? 0,
          comments: pm.reply_count ?? 0,
          shares: (pm.retweet_count ?? 0) + (pm.quote_count ?? 0),
          clicks: np.url_link_clicks ?? 0,
        };
      }

      case "linkedin": {
        // socialActions gives likes/comments for a UGC post URN.
        const urn = encodeURIComponent(target.remoteId);
        const r = await fetch(
          `https://api.linkedin.com/v2/socialActions/${urn}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "X-Restli-Protocol-Version": "2.0.0",
            },
          },
        );
        if (!r.ok) return zero;
        const j = await r.json();
        return {
          impressions: 0, // requires the Marketing Developer Platform tier
          likes: j.likesSummary?.totalLikes ?? 0,
          comments: j.commentsSummary?.totalFirstLevelComments ?? 0,
          shares: 0,
          clicks: 0,
        };
      }

      case "instagram": {
        const igToken = meta.pageAccessToken ?? token;
        const r = await fetch(
          `https://graph.facebook.com/v21.0/${target.remoteId}/insights?metric=impressions,reach,likes,comments,shares,saved&access_token=${igToken}`,
        );
        if (!r.ok) return zero;
        const j = await r.json();
        const pick = (name: string) =>
          j.data?.find((d: { name: string }) => d.name === name)?.values?.[0]?.value ?? 0;
        return {
          impressions: pick("impressions") || pick("reach"),
          likes: pick("likes"),
          comments: pick("comments"),
          shares: pick("shares"),
          clicks: pick("saved"),
        };
      }

      case "facebook": {
        const pageToken = meta.pageAccessToken ?? token;
        const r = await fetch(
          `https://graph.facebook.com/v21.0/${target.remoteId}/insights?metric=post_impressions,post_clicks,post_reactions_by_type_total&access_token=${pageToken}`,
        );
        if (!r.ok) return zero;
        const j = await r.json();
        const pick = (name: string) =>
          j.data?.find((d: { name: string }) => d.name === name)?.values?.[0]?.value ?? 0;
        const reactions = pick("post_reactions_by_type_total");
        const likes =
          typeof reactions === "object"
            ? Object.values(reactions as Record<string, number>).reduce((a, b) => a + b, 0)
            : reactions;
        return {
          impressions: pick("post_impressions"),
          likes,
          comments: 0,
          shares: 0,
          clicks: pick("post_clicks"),
        };
      }

      case "threads": {
        const r = await fetch(
          `https://graph.threads.net/v1.0/${target.remoteId}/insights?metric=views,likes,replies,reposts,quotes&access_token=${token}`,
        );
        if (!r.ok) return zero;
        const j = await r.json();
        const pick = (name: string) =>
          j.data?.find((d: { name: string }) => d.name === name)?.values?.[0]?.value ?? 0;
        return {
          impressions: pick("views"),
          likes: pick("likes"),
          comments: pick("replies"),
          shares: pick("reposts") + pick("quotes"),
          clicks: 0,
        };
      }

      case "mastodon": {
        const instance = meta.instance ?? "https://mastodon.social";
        const r = await fetch(`${instance}/api/v1/statuses/${target.remoteId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return zero;
        const j = await r.json();
        return {
          impressions: 0,
          likes: j.favourites_count ?? 0,
          comments: j.replies_count ?? 0,
          shares: j.reblogs_count ?? 0,
          clicks: 0,
        };
      }

      default:
        return zero;
    }
  } catch {
    return zero;
  }
}
