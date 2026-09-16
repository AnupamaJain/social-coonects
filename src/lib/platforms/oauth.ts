import crypto from "node:crypto";
import { getPlatform, hasLiveCredentials } from "./registry";
import type { PlatformId, RemoteProfile } from "./types";

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

const base64url = (buf: Buffer) => buf.toString("base64url");

export function createPkcePair() {
  const verifier = base64url(crypto.randomBytes(48));
  const challenge = base64url(
    crypto.createHash("sha256").update(verifier).digest(),
  );
  return { verifier, challenge };
}

export function appUrl(path = "") {
  const base =
    process.env.APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");
  return `${base.replace(/\/$/, "")}${path}`;
}

export const redirectUri = (platform: PlatformId) =>
  appUrl(`/api/oauth/${platform}/callback`);

function instanceRewrite(url: string, platform: PlatformId) {
  if (platform !== "mastodon") return url;
  const instance = (process.env.MASTODON_INSTANCE ?? "https://mastodon.social")
    .replace(/\/$/, "");
  return url.replace("https://mastodon.social", instance);
}

export function buildAuthorizeUrl(
  platform: PlatformId,
  state: string,
  codeChallenge?: string,
) {
  const def = getPlatform(platform);
  if (!def.oauth) throw new Error(`${platform} does not support OAuth`);
  const cfg = def.oauth;

  const url = new URL(instanceRewrite(cfg.authorizeUrl, platform));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env[cfg.clientIdEnv] ?? "");
  url.searchParams.set("redirect_uri", redirectUri(platform));
  url.searchParams.set("scope", cfg.scopes.join(" "));
  url.searchParams.set("state", state);
  if (cfg.usePkce && codeChallenge) {
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
  }
  for (const [k, v] of Object.entries(cfg.extraAuthParams ?? {})) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

export async function exchangeCodeForTokens(
  platform: PlatformId,
  code: string,
  codeVerifier?: string,
): Promise<OAuthTokens> {
  const def = getPlatform(platform);
  if (!def.oauth) throw new Error(`${platform} does not support OAuth`);
  const cfg = def.oauth;
  const clientId = process.env[cfg.clientIdEnv] ?? "";
  const clientSecret = process.env[cfg.clientSecretEnv] ?? "";

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(platform),
  });
  if (codeVerifier) body.set("code_verifier", codeVerifier);

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (cfg.credentialsIn === "basic") {
    headers.Authorization = `Basic ${Buffer.from(
      `${clientId}:${clientSecret}`,
    ).toString("base64")}`;
    // X still wants client_id in the body alongside Basic auth.
    body.set("client_id", clientId);
  } else {
    body.set("client_id", clientId);
    body.set("client_secret", clientSecret);
  }

  const res = await fetch(instanceRewrite(cfg.tokenUrl, platform), {
    method: "POST",
    headers,
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${platform} token exchange failed (${res.status}): ${text}`);
  }
  const json = JSON.parse(text) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: json.expires_in
      ? new Date(Date.now() + json.expires_in * 1000)
      : undefined,
    scope: json.scope,
  };
}

/** Fetches the connected identity so we can show a real handle and avatar. */
export async function fetchRemoteProfile(
  platform: PlatformId,
  tokens: OAuthTokens,
): Promise<RemoteProfile> {
  const auth = { Authorization: `Bearer ${tokens.accessToken}` };

  switch (platform) {
    case "x": {
      const r = await fetch(
        "https://api.x.com/2/users/me?user.fields=profile_image_url,username,name",
        { headers: auth },
      );
      const j = (await r.json()) as {
        data?: { id: string; username: string; name: string; profile_image_url?: string };
      };
      if (!j.data) throw new Error("X profile lookup failed");
      return {
        platformUserId: j.data.id,
        handle: `@${j.data.username}`,
        displayName: j.data.name,
        avatarUrl: j.data.profile_image_url,
      };
    }
    case "linkedin": {
      const r = await fetch("https://api.linkedin.com/v2/userinfo", { headers: auth });
      const j = (await r.json()) as {
        sub: string; name?: string; picture?: string; email?: string;
      };
      if (!j.sub) throw new Error("LinkedIn profile lookup failed");
      return {
        platformUserId: j.sub,
        handle: j.name ?? j.email ?? "LinkedIn member",
        displayName: j.name,
        avatarUrl: j.picture,
        // The publish call needs the person URN built from `sub`.
        meta: { personUrn: j.sub },
      };
    }
    case "instagram": {
      // Page -> connected IG business account is the only publishable path.
      const pagesRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,profile_picture_url}&access_token=${tokens.accessToken}`,
      );
      const pages = (await pagesRes.json()) as {
        data?: Array<{
          id: string; name: string; access_token: string;
          instagram_business_account?: { id: string; username: string; profile_picture_url?: string };
        }>;
      };
      const page = pages.data?.find((p) => p.instagram_business_account);
      if (!page?.instagram_business_account) {
        throw new Error(
          "No Instagram Business account is linked to your Facebook Pages.",
        );
      }
      const ig = page.instagram_business_account;
      return {
        platformUserId: ig.id,
        handle: `@${ig.username}`,
        displayName: ig.username,
        avatarUrl: ig.profile_picture_url,
        meta: { pageId: page.id, pageAccessToken: page.access_token },
      };
    }
    case "facebook": {
      const pagesRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,picture&access_token=${tokens.accessToken}`,
      );
      const pages = (await pagesRes.json()) as {
        data?: Array<{
          id: string; name: string; access_token: string;
          picture?: { data?: { url?: string } };
        }>;
      };
      const page = pages.data?.[0];
      if (!page) throw new Error("No manageable Facebook Page found.");
      return {
        platformUserId: page.id,
        handle: page.name,
        displayName: page.name,
        avatarUrl: page.picture?.data?.url,
        meta: { pageAccessToken: page.access_token },
      };
    }
    case "threads": {
      const r = await fetch(
        `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${tokens.accessToken}`,
      );
      const j = (await r.json()) as {
        id?: string; username?: string; threads_profile_picture_url?: string;
      };
      if (!j.id) throw new Error("Threads profile lookup failed");
      return {
        platformUserId: j.id,
        handle: `@${j.username ?? j.id}`,
        displayName: j.username,
        avatarUrl: j.threads_profile_picture_url,
      };
    }
    case "mastodon": {
      const instance = (process.env.MASTODON_INSTANCE ?? "https://mastodon.social")
        .replace(/\/$/, "");
      const r = await fetch(`${instance}/api/v1/accounts/verify_credentials`, {
        headers: auth,
      });
      const j = (await r.json()) as {
        id?: string; acct?: string; display_name?: string; avatar?: string;
      };
      if (!j.id) throw new Error("Mastodon profile lookup failed");
      return {
        platformUserId: j.id,
        handle: `@${j.acct}`,
        displayName: j.display_name,
        avatarUrl: j.avatar,
        meta: { instance },
      };
    }
  }
}

export { hasLiveCredentials };
