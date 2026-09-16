import { describe, expect, it } from "vitest";
import {
  PLATFORMS, PLATFORM_IDS, getPlatform, hasLiveCredentials, isPlatformId,
} from "@/lib/platforms/registry";

describe("platform registry", () => {
  it("exposes every platform the product advertises", () => {
    expect(PLATFORM_IDS).toEqual(
      expect.arrayContaining(["x", "linkedin", "instagram", "facebook", "threads", "mastodon"]),
    );
  });

  it("gives every platform a usable sweet spot inside its hard limit", () => {
    for (const p of Object.values(PLATFORMS)) {
      const [lo, hi] = p.sweetSpot;
      expect(lo, `${p.id} lower bound`).toBeGreaterThan(0);
      expect(hi, `${p.id} sweet spot ordering`).toBeGreaterThan(lo);
      expect(hi, `${p.id} sweet spot within limit`).toBeLessThanOrEqual(p.charLimit);
    }
  });

  it("configures OAuth for every platform, with PKCE only where required", () => {
    for (const p of Object.values(PLATFORMS)) {
      expect(p.oauth, `${p.id} oauth`).not.toBeNull();
      expect(p.oauth!.scopes.length, `${p.id} scopes`).toBeGreaterThan(0);
    }
    // X mandates PKCE; the others must not send a challenge they can't honour.
    expect(PLATFORMS.x.oauth!.usePkce).toBe(true);
    expect(PLATFORMS.linkedin.oauth!.usePkce).toBe(false);
  });

  it("marks Instagram as requiring media, since it rejects text-only posts", () => {
    expect(PLATFORMS.instagram.requiresMedia).toBe(true);
    expect(PLATFORMS.linkedin.requiresMedia).toBe(false);
  });

  it("reports sandbox mode when a platform has no credentials", () => {
    delete process.env.LINKEDIN_CLIENT_ID;
    delete process.env.LINKEDIN_CLIENT_SECRET;
    expect(hasLiveCredentials("linkedin")).toBe(false);

    process.env.LINKEDIN_CLIENT_ID = "id";
    process.env.LINKEDIN_CLIENT_SECRET = "secret";
    expect(hasLiveCredentials("linkedin")).toBe(true);
  });

  it("rejects unknown platform ids instead of guessing", () => {
    expect(isPlatformId("myspace")).toBe(false);
    expect(() => getPlatform("myspace")).toThrow(/Unknown platform/);
  });
});
