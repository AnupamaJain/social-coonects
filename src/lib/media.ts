/**
 * Post media: types, limits and validation.
 *
 * Pure — no network, no database — so the composer can validate an attachment
 * the moment it is picked, and the publisher can refuse a bad one before it
 * spends an API call finding out.
 *
 * Instagram fetches media by URL rather than accepting an upload, so anything
 * attached here has to be reachable on a public HTTPS address. That is the
 * whole reason uploads go to Blob storage instead of staying local.
 */
import type { PlatformId } from "./platforms/types";

export type MediaKind = "image" | "video";

export interface PostMedia {
  url: string;
  type: MediaKind;
  /** Poster frame for a video. Instagram calls this the cover. */
  thumbnailUrl?: string;
  durationSec?: number;
  width?: number;
  height?: number;
  bytes?: number;
}

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const VIDEO_TYPES = ["video/mp4", "video/quicktime"] as const;
export const ACCEPTED_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES];

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 300 * 1024 * 1024;

export const kindFromContentType = (t: string): MediaKind | null =>
  (IMAGE_TYPES as readonly string[]).includes(t) ? "image"
  : (VIDEO_TYPES as readonly string[]).includes(t) ? "video"
  : null;

/** Best-effort kind when all we have is a URL — pasted links have no MIME type. */
export function kindFromUrl(url: string): MediaKind {
  const path = url.split("?")[0].toLowerCase();
  return /\.(mp4|mov|m4v|webm)$/.test(path) ? "video" : "image";
}

/**
 * Per-platform video rules. Instagram's Reels limits are the tightest and the
 * only ones the API actually rejects on, so they're the ones worth enforcing
 * before we call it.
 */
export interface VideoRules {
  supported: boolean;
  minSeconds?: number;
  maxSeconds?: number;
  /** Allowed width/height range, as a ratio. */
  minAspect?: number;
  maxAspect?: number;
}

export const VIDEO_RULES: Record<PlatformId, VideoRules> = {
  // Reels: 3s–15min, from 0.01:1 to 10:1, though 9:16 is the only sane choice.
  instagram: { supported: true, minSeconds: 3, maxSeconds: 900, minAspect: 0.01, maxAspect: 10 },
  facebook: { supported: true, minSeconds: 1, maxSeconds: 7200 },
  threads: { supported: true, minSeconds: 1, maxSeconds: 300 },
  x: { supported: true, minSeconds: 0.5, maxSeconds: 140 },
  linkedin: { supported: false },
  mastodon: { supported: false },
};

export interface MediaProblem {
  platform: PlatformId;
  message: string;
}

/** Everything wrong with this attachment set, for these platforms. */
export function validateMedia(
  media: PostMedia[],
  platforms: PlatformId[],
  limits: Record<PlatformId, { requiresMedia: boolean; maxMedia: number; name: string }>,
): MediaProblem[] {
  const problems: MediaProblem[] = [];
  const videos = media.filter((m) => m.type === "video");

  for (const platform of platforms) {
    const limit = limits[platform];
    const rules = VIDEO_RULES[platform];

    if (limit.requiresMedia && media.length === 0) {
      problems.push({ platform, message: `${limit.name} cannot publish without an image or video.` });
    }
    if (media.length > limit.maxMedia) {
      problems.push({ platform, message: `${limit.name} accepts at most ${limit.maxMedia} attachments.` });
    }

    if (videos.length === 0) continue;

    if (!rules.supported) {
      problems.push({ platform, message: `${limit.name} can't publish video from Sixfold yet — remove it or untick ${limit.name}.` });
      continue;
    }
    if (videos.length > 1) {
      problems.push({ platform, message: `${limit.name} takes one video per post.` });
    }
    if (media.length > videos.length) {
      problems.push({ platform, message: `${limit.name} can't mix video and images in one post.` });
    }

    for (const v of videos) {
      if (v.durationSec === undefined) continue;
      if (rules.minSeconds !== undefined && v.durationSec < rules.minSeconds) {
        problems.push({ platform, message: `${limit.name} needs at least ${rules.minSeconds}s of video — this is ${v.durationSec.toFixed(1)}s.` });
      }
      if (rules.maxSeconds !== undefined && v.durationSec > rules.maxSeconds) {
        problems.push({ platform, message: `${limit.name} allows up to ${Math.round(rules.maxSeconds / 60)} minutes — this is ${Math.round(v.durationSec / 60)}.` });
      }
    }
  }
  return problems;
}

/** True when this post should publish as a Reel rather than a feed image. */
export const isReel = (media: PostMedia[]) =>
  media.length === 1 && media[0].type === "video";

/**
 * Media was originally stored as a bare string[] of URLs. Reads go through
 * here so old posts keep working without a data migration.
 */
export function normaliseMedia(value: unknown): PostMedia[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): PostMedia[] => {
    if (typeof entry === "string") {
      return entry ? [{ url: entry, type: kindFromUrl(entry) }] : [];
    }
    if (entry && typeof entry === "object" && typeof (entry as PostMedia).url === "string") {
      const e = entry as PostMedia;
      return [{ ...e, type: e.type ?? kindFromUrl(e.url) }];
    }
    return [];
  });
}

export function formatBytes(n: number) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

export function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return m ? `${m}:${String(rem).padStart(2, "0")}` : `${rem}s`;
}
