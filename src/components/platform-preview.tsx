"use client";

import { Heart, MessageCircle, Repeat2, Send, Bookmark, ThumbsUp } from "lucide-react";
import { getPlatform } from "@/lib/platforms/registry";
import type { PlatformId } from "@/lib/platforms/types";
import { Avatar as Illustrated } from "@/components/marketing/avatar";
import { BrandLogo } from "@/components/marketing/brand-logos";

interface PreviewProps {
  platform: PlatformId;
  text: string;
  author: { name: string; handle: string; avatarUrl?: string | null };
  mediaUrls?: string[];
}

function Avatar({ name, url, rounded = "rounded-full" }: { name: string; url?: string | null; rounded?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={`size-10 shrink-0 object-cover ${rounded}`} />;
  }
  // No remote avatar: draw one rather than show a grey initials block.
  return <Illustrated seed={name} size={40} className={rounded === "rounded-lg" ? "!rounded-lg" : ""} />;
}

/** Renders the body the way each platform truncates and formats it. */
function Body({
  text,
  clampAt,
  platform,
}: {
  text: string;
  clampAt?: number;
  platform: PlatformId;
}) {
  const shown = clampAt && text.length > clampAt ? text.slice(0, clampAt) : text;
  const truncated = Boolean(clampAt && text.length > clampAt);
  const def = getPlatform(platform);
  const over = text.length > def.charLimit;

  return (
    <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
      {shown.split(/(#[\p{L}\d_]+|https?:\/\/\S+|@[\w.]+)/gu).map((part, i) =>
        /^#|^https?:\/\/|^@/.test(part) ? (
          <span key={i} className="text-clay-500">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
      {truncated ? (
        <span className="text-muted">
          …{" "}
          <button className="font-medium text-muted hover:underline" type="button">
            see more
          </button>
        </span>
      ) : null}
      {over ? (
        <p className="mt-2 rounded bg-red-500/10 px-2 py-1 text-xs text-red-500">
          {text.length - def.charLimit} characters over the {def.name} limit — this
          would be rejected.
        </p>
      ) : null}
    </div>
  );
}

export function PlatformPreview({ platform, text, author, mediaUrls = [] }: PreviewProps) {
  const body = text.trim() || "Your post will appear here…";
  const muted = !text.trim();

  if (platform === "x") {
    return (
      <div className="surface rounded-xl p-4">
        <div className="flex gap-3">
          <Avatar name={author.name} url={author.avatarUrl} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[15px]">
              <span className="font-semibold">{author.name}</span>
              <span className="text-muted">{author.handle} · 1m</span>
              <BrandLogo platform="x" className="ml-auto size-4 shrink-0" />
            </div>
            <div className={`mt-0.5 ${muted ? "text-muted" : ""}`}>
              <Body text={body} platform={platform} />
            </div>
            {mediaUrls[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrls[0]} alt="" className="mt-3 w-full rounded-xl border object-cover" />
            ) : null}
            <div className="mt-3 flex max-w-xs justify-between text-muted">
              <MessageCircle className="size-4" />
              <Repeat2 className="size-4" />
              <Heart className="size-4" />
              <Send className="size-4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (platform === "linkedin") {
    return (
      <div className="surface rounded-xl">
        <div className="flex gap-3 p-4 pb-2">
          <Avatar name={author.name} url={author.avatarUrl} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">{author.name}</p>
            <p className="truncate text-xs text-muted">{author.handle}</p>
            <p className="text-xs text-muted">now · 🌐</p>
          </div>
          <BrandLogo platform="linkedin" className="size-4 shrink-0" />
        </div>
        <div className={`px-4 pb-3 ${muted ? "text-muted" : ""}`}>
          {/* LinkedIn collapses at ~210 characters on desktop. */}
          <Body text={body} clampAt={210} platform={platform} />
        </div>
        {mediaUrls[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrls[0]} alt="" className="w-full border-y object-cover" />
        ) : null}
        <div className="flex justify-around border-t px-2 py-1.5 text-xs text-muted">
          {["Like", "Comment", "Repost", "Send"].map((a) => (
            <span key={a} className="flex items-center gap-1.5 px-2 py-1.5">
              <ThumbsUp className="size-3.5" /> {a}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (platform === "instagram") {
    return (
      <div className="surface overflow-hidden rounded-xl">
        <div className="flex items-center gap-3 p-3">
          <Avatar name={author.name} url={author.avatarUrl} />
          <span className="flex-1 text-sm font-semibold">{author.handle.replace(/^@/, "")}</span>
          <BrandLogo platform="instagram" className="size-4 shrink-0" />
        </div>
        {mediaUrls[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrls[0]} alt="" className="aspect-square w-full object-cover" />
        ) : (
          <div className="grid aspect-square w-full place-items-center border-y bg-[var(--bg-subtle)] text-center text-sm text-muted">
            <span className="max-w-[16rem] px-6">
              Instagram needs an image. Add one before scheduling.
            </span>
          </div>
        )}
        <div className="flex gap-4 px-3 pt-3 text-muted">
          <Heart className="size-5" />
          <MessageCircle className="size-5" />
          <Send className="size-5" />
          <Bookmark className="ml-auto size-5" />
        </div>
        <div className={`px-3 pb-4 pt-2 ${muted ? "text-muted" : ""}`}>
          <span className="mr-1.5 text-sm font-semibold">
            {author.handle.replace(/^@/, "")}
          </span>
          <Body text={body} clampAt={125} platform={platform} />
        </div>
      </div>
    );
  }

  // Facebook / Threads / Mastodon share a close-enough card.
  const def = getPlatform(platform);
  return (
    <div className="surface rounded-xl p-4">
      <div className="flex gap-3">
        <Avatar name={author.name} url={author.avatarUrl} rounded={platform === "mastodon" ? "rounded-lg" : "rounded-full"} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold">
            {author.name}
            <BrandLogo platform={platform} className="size-3.5 shrink-0" />
          </p>
          <p className="text-xs text-muted">{author.handle} · now · {def.name}</p>
          <div className={`mt-2 ${muted ? "text-muted" : ""}`}>
            <Body text={body} platform={platform} />
          </div>
          {mediaUrls[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrls[0]} alt="" className="mt-3 w-full rounded-lg border object-cover" />
          ) : null}
          <div className="mt-3 flex gap-5 text-muted">
            <Heart className="size-4" />
            <MessageCircle className="size-4" />
            <Repeat2 className="size-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
