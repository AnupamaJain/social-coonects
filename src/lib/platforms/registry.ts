import type { PlatformDef, PlatformId } from "./types";

export const PLATFORMS: Record<PlatformId, PlatformDef> = {
  x: {
    id: "x",
    name: "X",
    accent: "bg-neutral-900 text-white",
    charLimit: 280,
    requiresMedia: false,
    maxMedia: 4,
    sweetSpot: [70, 220],
    penalisesLinks: true,
    idealHashtags: [0, 2],
    docs: "https://developer.x.com/en/portal/dashboard",
    oauth: {
      authorizeUrl: "https://x.com/i/oauth2/authorize",
      tokenUrl: "https://api.x.com/2/oauth2/token",
      scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
      usePkce: true,
      clientIdEnv: "X_CLIENT_ID",
      clientSecretEnv: "X_CLIENT_SECRET",
      credentialsIn: "basic",
    },
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    accent: "bg-[#0a66c2] text-white",
    charLimit: 3000,
    requiresMedia: false,
    maxMedia: 9,
    sweetSpot: [600, 1600],
    penalisesLinks: true,
    idealHashtags: [1, 3],
    docs: "https://www.linkedin.com/developers/apps",
    oauth: {
      authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
      tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
      scopes: ["openid", "profile", "email", "w_member_social"],
      usePkce: false,
      clientIdEnv: "LINKEDIN_CLIENT_ID",
      clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
      credentialsIn: "body",
    },
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    accent: "bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888] text-white",
    charLimit: 2200,
    requiresMedia: true,
    maxMedia: 10,
    sweetSpot: [120, 900],
    penalisesLinks: false,
    idealHashtags: [3, 10],
    docs: "https://developers.facebook.com/apps",
    oauth: {
      authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
      tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
      scopes: [
        "instagram_basic",
        "instagram_content_publish",
        "pages_show_list",
        "pages_read_engagement",
        "business_management",
      ],
      usePkce: false,
      clientIdEnv: "META_CLIENT_ID",
      clientSecretEnv: "META_CLIENT_SECRET",
      credentialsIn: "body",
    },
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    accent: "bg-[#1877f2] text-white",
    charLimit: 63206,
    requiresMedia: false,
    maxMedia: 10,
    sweetSpot: [100, 800],
    penalisesLinks: true,
    idealHashtags: [0, 3],
    docs: "https://developers.facebook.com/apps",
    oauth: {
      authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
      tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
      scopes: ["pages_show_list", "pages_manage_posts", "pages_read_engagement"],
      usePkce: false,
      clientIdEnv: "META_CLIENT_ID",
      clientSecretEnv: "META_CLIENT_SECRET",
      credentialsIn: "body",
    },
  },
  threads: {
    id: "threads",
    name: "Threads",
    accent: "bg-neutral-900 text-white",
    charLimit: 500,
    requiresMedia: false,
    maxMedia: 10,
    sweetSpot: [80, 400],
    penalisesLinks: false,
    idealHashtags: [0, 1],
    docs: "https://developers.facebook.com/docs/threads",
    oauth: {
      authorizeUrl: "https://threads.net/oauth/authorize",
      tokenUrl: "https://graph.threads.net/oauth/access_token",
      scopes: ["threads_basic", "threads_content_publish", "threads_manage_insights"],
      usePkce: false,
      clientIdEnv: "THREADS_CLIENT_ID",
      clientSecretEnv: "THREADS_CLIENT_SECRET",
      credentialsIn: "body",
    },
  },
  mastodon: {
    id: "mastodon",
    name: "Mastodon",
    accent: "bg-[#6364ff] text-white",
    charLimit: 500,
    requiresMedia: false,
    maxMedia: 4,
    sweetSpot: [80, 400],
    penalisesLinks: false,
    idealHashtags: [0, 3],
    docs: "https://docs.joinmastodon.org/client/token/",
    oauth: {
      // Mastodon is instance-hosted; MASTODON_INSTANCE rewrites these at runtime.
      authorizeUrl: "https://mastodon.social/oauth/authorize",
      tokenUrl: "https://mastodon.social/oauth/token",
      scopes: ["read", "write:statuses"],
      usePkce: false,
      clientIdEnv: "MASTODON_CLIENT_ID",
      clientSecretEnv: "MASTODON_CLIENT_SECRET",
      credentialsIn: "body",
    },
  },
};

export const PLATFORM_IDS = Object.keys(PLATFORMS) as PlatformId[];

export const isPlatformId = (v: string): v is PlatformId => v in PLATFORMS;

export function getPlatform(id: string): PlatformDef {
  const p = PLATFORMS[id as PlatformId];
  if (!p) throw new Error(`Unknown platform: ${id}`);
  return p;
}

/**
 * A platform is "live" when its OAuth app credentials are present. Everything
 * else falls back to the sandbox connector so the product is fully usable
 * before you have a single developer account approved.
 */
export function hasLiveCredentials(id: PlatformId): boolean {
  const cfg = PLATFORMS[id].oauth;
  if (!cfg) return false;
  return Boolean(process.env[cfg.clientIdEnv] && process.env[cfg.clientSecretEnv]);
}
