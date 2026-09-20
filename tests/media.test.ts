import { describe, expect, it } from "vitest";
import {
  isReel, kindFromContentType, kindFromUrl, validateMedia, VIDEO_RULES,
  type PostMedia,
} from "@/lib/media";
import { PLATFORMS } from "@/lib/platforms/registry";
import type { PlatformId } from "@/lib/platforms/types";

const limits = Object.fromEntries(
  Object.values(PLATFORMS).map((p) => [
    p.id, { requiresMedia: p.requiresMedia, maxMedia: p.maxMedia, name: p.name },
  ]),
) as Record<PlatformId, { requiresMedia: boolean; maxMedia: number; name: string }>;

const video = (over: Partial<PostMedia> = {}): PostMedia =>
  ({ url: "https://x/v.mp4", type: "video", durationSec: 20, ...over });
const image = (): PostMedia => ({ url: "https://x/i.jpg", type: "image" });

describe("media kind", () => {
  it("reads the kind from a content type", () => {
    expect(kindFromContentType("video/mp4")).toBe("video");
    expect(kindFromContentType("image/png")).toBe("image");
    expect(kindFromContentType("application/pdf")).toBeNull();
  });

  it("falls back to the extension for pasted URLs, ignoring the query string", () => {
    expect(kindFromUrl("https://cdn.example/clip.MOV?token=abc")).toBe("video");
    expect(kindFromUrl("https://cdn.example/photo.jpg")).toBe("image");
  });
});

describe("reel detection", () => {
  it("is a reel only when the post is exactly one video", () => {
    expect(isReel([video()])).toBe(true);
    expect(isReel([image()])).toBe(false);
    expect(isReel([video(), video()])).toBe(false);
    expect(isReel([])).toBe(false);
  });
});

describe("validation", () => {
  it("blocks an Instagram post with no media at all", () => {
    const p = validateMedia([], ["instagram"], limits);
    expect(p).toHaveLength(1);
    expect(p[0].message).toMatch(/cannot publish without/);
  });

  it("passes a normal Reel", () => {
    expect(validateMedia([video()], ["instagram"], limits)).toHaveLength(0);
  });

  it("rejects a Reel that is too short or too long", () => {
    expect(validateMedia([video({ durationSec: 1 })], ["instagram"], limits)[0].message).toMatch(/at least 3s/);
    expect(validateMedia([video({ durationSec: 1200 })], ["instagram"], limits)[0].message).toMatch(/up to 15 minutes/);
  });

  it("refuses video on a platform that can't take it", () => {
    const p = validateMedia([video()], ["linkedin"], limits);
    expect(p[0].message).toMatch(/can't publish video/);
    expect(VIDEO_RULES.linkedin.supported).toBe(false);
  });

  it("refuses mixing video with images", () => {
    const p = validateMedia([video(), image()], ["instagram"], limits);
    expect(p.some((x) => /can't mix/.test(x.message))).toBe(true);
  });

  it("reports a problem per platform, not one for the post", () => {
    const p = validateMedia([video()], ["linkedin", "mastodon"], limits);
    expect(p.map((x) => x.platform).sort()).toEqual(["linkedin", "mastodon"]);
  });

  it("says nothing about duration when the duration is unknown", () => {
    expect(validateMedia([video({ durationSec: undefined })], ["instagram"], limits)).toHaveLength(0);
  });

  it("enforces each platform's attachment count", () => {
    const many = Array.from({ length: 5 }, image);
    expect(validateMedia(many, ["x"], limits)[0].message).toMatch(/at most 4/);
    expect(validateMedia(many, ["instagram"], limits)).toHaveLength(0);
  });
});
