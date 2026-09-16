"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Loader2, MoreHorizontal, Send, Trash2, X } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { getPlatform } from "@/lib/platforms/registry";
import { bandColor } from "@/components/score";
import { approveAndQueue, deletePost, publishNow, unschedulePost } from "../actions";

export interface PostRowData {
  id: string;
  body: string;
  status: string;
  scheduledAt: string | null;
  score: number | null;
  platforms: string[];
}

export function PostRow({ post }: { post: PostRowData }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  const when = post.scheduledAt ? new Date(post.scheduledAt) : null;

  return (
    <li className="relative px-5 py-3.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {when ? (
              <span className="font-mono text-xs text-muted">
                {when.toLocaleDateString(undefined, { month: "short", day: "numeric" })}{" "}
                {when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </span>
            ) : null}
            {post.status === "needs_approval" ? (
              <Badge tone="brand">Needs approval</Badge>
            ) : null}
            {post.status === "failed" ? <Badge tone="danger">Failed</Badge> : null}
          </div>

          <Link
            href={`/app/compose?post=${post.id}`}
            className="mt-1 block text-sm leading-relaxed line-clamp-2 hover:underline"
          >
            {post.body}
          </Link>

          <div className="mt-1.5 flex items-center gap-2">
            {[...new Set(post.platforms)].map((p) => (
              <span
                key={p}
                title={getPlatform(p).name}
                className={`size-2 rounded-full ${getPlatform(p).accent}`}
              />
            ))}
            {post.score !== null ? (
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: bandColor(post.score) }}
              >
                {post.score}
              </span>
            ) : null}
          </div>

          {note ? <p className="mt-1.5 text-xs text-muted">{note}</p> : null}
        </div>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label="Post actions"
          onClick={() => setOpen((v) => !v)}
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <MoreHorizontal className="size-3.5" />}
        </Button>
      </div>

      {open ? (
        <div className="surface absolute right-4 top-12 z-30 w-48 rounded-lg p-1 shadow-xl">
          {post.status === "needs_approval" || post.status === "draft" ? (
            <MenuItem
              icon={Check}
              label="Approve and queue"
              onClick={() =>
                start(async () => {
                  const res = await approveAndQueue(post.id);
                  setNote(res?.error ?? null);
                  setOpen(false);
                })
              }
            />
          ) : null}

          {post.status === "scheduled" ? (
            <MenuItem
              icon={X}
              label="Move back to drafts"
              onClick={() =>
                start(async () => {
                  await unschedulePost(post.id);
                  setOpen(false);
                })
              }
            />
          ) : null}

          <MenuItem
            icon={Send}
            label="Publish now"
            onClick={() =>
              start(async () => {
                const res = await publishNow(post.id);
                setNote(res.ok ? "Published." : "Publishing failed — open the post for details.");
                setOpen(false);
              })
            }
          />

          <MenuItem
            icon={Trash2}
            label="Delete"
            danger
            onClick={() => {
              if (!confirm("Delete this post?")) return;
              start(async () => {
                await deletePost(post.id);
                setOpen(false);
              });
            }}
          />
        </div>
      ) : null}
    </li>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-[var(--bg-subtle)] ${
        danger ? "text-red-500 hover:bg-red-500/10" : ""
      }`}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}
