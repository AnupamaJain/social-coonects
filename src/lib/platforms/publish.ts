import crypto from "node:crypto";
import { readJson } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { PlatformId, PublishInput, PublishResult } from "./types";

interface AccountLike {
  id: string;
  platform: string;
  platformUserId: string;
  handle: string;
  accessToken: string | null;
  meta: string;
  isSandbox: boolean;
}

/**
 * Sandbox connector. Accounts connected without real OAuth credentials publish
 * here: nothing leaves the machine, but ids, URLs and (later) metrics behave
 * like the real thing so the whole product loop is testable offline.
 */
function sandboxPublish(account: AccountLike): PublishResult {
  const remoteId = crypto.randomBytes(8).toString("hex");
  return {
    remoteId,
    remoteUrl: `https://sandbox.local/${account.platform}/${slugify(account.handle)}/${remoteId}`,
  };
}

async function jsonOrThrow(res: Response, label: string) {
  const text = await res.text();
  if (!res.ok) throw new Error(`${label} failed (${res.status}): ${text}`);
  return text ? JSON.parse(text) : {};
}

export async function publishToPlatform(
  account: AccountLike,
  input: PublishInput,
): Promise<PublishResult> {
  if (account.isSandbox || !account.accessToken) return sandboxPublish(account);

  const platform = account.platform as PlatformId;
  const token = account.accessToken;
  const meta = readJson<Record<string, string>>(account.meta, {});
  const auth = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  switch (platform) {
    case "x": {
      const res = await fetch("https://api.x.com/2/tweets", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ text: input.text }),
      });
      const j = await jsonOrThrow(res, "X publish");
      const id = j.data?.id as string;
      return {
        remoteId: id,
        remoteUrl: `https://x.com/${account.handle.replace(/^@/, "")}/status/${id}`,
      };
    }

    case "linkedin": {
      // Ported from langchain-ai/social-media-agent's LinkedIn client: the
      // ugcPosts shape is still the most reliable text-share endpoint.
      const authorUrn = `urn:li:person:${meta.personUrn ?? account.platformUserId}`;
      const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: { ...auth, "X-Restli-Protocol-Version": "2.0.0" },
        body: JSON.stringify({
          author: authorUrn,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: input.text },
              shareMediaCategory: "NONE",
            },
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
          },
        }),
      });
      const id =
        res.headers.get("x-restli-id") ??
        ((await jsonOrThrow(res, "LinkedIn publish")).id as string);
      return {
        remoteId: id,
        remoteUrl: `https://www.linkedin.com/feed/update/${id}`,
      };
    }

    case "instagram": {
      if (!input.mediaUrls.length) {
        throw new Error("Instagram requires at least one image or video.");
      }
      const igToken = meta.pageAccessToken ?? token;
      const containerRes = await fetch(
        `https://graph.facebook.com/v21.0/${account.platformUserId}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: input.mediaUrls[0],
            caption: input.text,
            access_token: igToken,
          }),
        },
      );
      const container = await jsonOrThrow(containerRes, "Instagram container");
      const publishRes = await fetch(
        `https://graph.facebook.com/v21.0/${account.platformUserId}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: container.id,
            access_token: igToken,
          }),
        },
      );
      const published = await jsonOrThrow(publishRes, "Instagram publish");
      return {
        remoteId: published.id,
        remoteUrl: `https://www.instagram.com/p/${published.id}`,
      };
    }

    case "facebook": {
      const pageToken = meta.pageAccessToken ?? token;
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${account.platformUserId}/feed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: input.text,
            ...(input.mediaUrls[0] ? { link: input.mediaUrls[0] } : {}),
            access_token: pageToken,
          }),
        },
      );
      const j = await jsonOrThrow(res, "Facebook publish");
      return {
        remoteId: j.id,
        remoteUrl: `https://www.facebook.com/${j.id}`,
      };
    }

    case "threads": {
      const createRes = await fetch(
        `https://graph.threads.net/v1.0/${account.platformUserId}/threads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            media_type: input.mediaUrls.length ? "IMAGE" : "TEXT",
            ...(input.mediaUrls.length ? { image_url: input.mediaUrls[0] } : {}),
            text: input.text,
            access_token: token,
          }),
        },
      );
      const container = await jsonOrThrow(createRes, "Threads container");
      const publishRes = await fetch(
        `https://graph.threads.net/v1.0/${account.platformUserId}/threads_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: container.id,
            access_token: token,
          }),
        },
      );
      const j = await jsonOrThrow(publishRes, "Threads publish");
      return {
        remoteId: j.id,
        remoteUrl: `https://www.threads.net/${account.handle}/post/${j.id}`,
      };
    }

    case "mastodon": {
      const instance = meta.instance ?? "https://mastodon.social";
      const res = await fetch(`${instance}/api/v1/statuses`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ status: input.text }),
      });
      const j = await jsonOrThrow(res, "Mastodon publish");
      return { remoteId: j.id, remoteUrl: j.url ?? null };
    }

    default:
      return sandboxPublish(account);
  }
}
