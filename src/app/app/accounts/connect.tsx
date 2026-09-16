"use client";

import { useState, useTransition } from "react";
import { Loader2, Plug, Trash2 } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { initials } from "@/lib/utils";
import { connectSandboxAccount, disconnectAccount } from "../actions";

export function ConnectCard({
  platform,
  atLimit,
}: {
  platform: { id: string; name: string; accent: string; live: boolean; connected: boolean };
  atLimit: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-center gap-2.5">
        <span className={`size-8 shrink-0 rounded-lg ${platform.accent}`} />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{platform.name}</p>
          <p className="text-xs text-muted">
            {platform.live ? "OAuth app ready" : "Sandbox only"}
          </p>
        </div>
        {platform.connected ? <Badge tone="success">Connected</Badge> : null}
      </div>

      {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}

      <div className="mt-4 flex gap-2">
        {platform.live ? (
          // A plain anchor, not a router push: this route 302s out to the
          // provider's consent screen, which the client router can't follow.
          <a
            href={atLimit ? undefined : `/api/oauth/${platform.id}/start`}
            aria-disabled={atLimit}
            className={`inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white transition-colors hover:bg-brand-500 ${
              atLimit ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <Plug className="size-3.5" /> Connect
          </a>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1"
            disabled={pending || atLimit}
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await connectSandboxAccount(platform.id);
                if (res?.error) setError(res.error);
              })
            }
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plug className="size-3.5" />}
            Connect sandbox
          </Button>
        )}
      </div>
    </Card>
  );
}

export function AccountCard({
  account,
}: {
  account: {
    id: string;
    platform: string;
    handle: string;
    displayName: string | null;
    avatarUrl: string | null;
    isSandbox: boolean;
    status: string;
  };
}) {
  const [pending, start] = useTransition();
  const name = account.displayName || account.handle;

  return (
    <Card className="flex items-center gap-3 p-4">
      {account.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={account.avatarUrl} alt="" className="size-10 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink-800 text-xs font-semibold text-white">
          {initials(name)}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted">{account.handle}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {account.isSandbox ? <Badge>Sandbox</Badge> : null}
        {account.status !== "active" ? <Badge tone="warning">{account.status}</Badge> : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label={`Disconnect ${name}`}
          disabled={pending}
          onClick={() => {
            if (!confirm(`Disconnect ${name}? Scheduled posts targeting it will be removed.`)) return;
            start(() => disconnectAccount(account.id));
          }}
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        </Button>
      </div>
    </Card>
  );
}
