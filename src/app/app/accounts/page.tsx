import type { Metadata } from "next";
import { CheckCircle2, ExternalLink, Info } from "lucide-react";
import { requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { planFor } from "@/lib/billing";
import { PLATFORMS, hasLiveCredentials } from "@/lib/platforms/registry";
import type { PlatformId } from "@/lib/platforms/types";
import { PageBody, PageHeader } from "@/components/page-header";
import { Alert, Badge, Card } from "@/components/ui";
import { AccountCard, ConnectCard } from "./connect";

export const metadata: Metadata = { title: "Accounts" };

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const { error, connected } = await searchParams;
  const { workspace, user } = await requireWorkspace();
  const plan = planFor(user.plan);

  const accounts = await db.socialAccount.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
  });

  const platforms = Object.values(PLATFORMS).map((p) => ({
    id: p.id,
    name: p.name,
    accent: p.accent,
    docs: p.docs,
    live: hasLiveCredentials(p.id as PlatformId),
    connected: accounts.some((a) => a.platform === p.id),
  }));

  const anyLive = platforms.some((p) => p.live);

  return (
    <>
      <PageHeader
        title="Accounts"
        description="Connect the places you publish. Compose once, and every selected account gets the right version."
        action={
          <Badge tone={accounts.length >= plan.maxAccounts ? "warning" : "neutral"}>
            {accounts.length} / {plan.maxAccounts} connected
          </Badge>
        }
      />

      <PageBody>
        <div className="space-y-6">
          {error ? <Alert tone="danger">{decodeURIComponent(error)}</Alert> : null}
          {connected ? (
            <Alert tone="success">
              <CheckCircle2 className="mr-1.5 inline size-4" />
              {PLATFORMS[connected as PlatformId]?.name ?? connected} connected.
            </Alert>
          ) : null}

          {!anyLive ? (
            <Alert tone="info">
              <Info className="mr-1.5 inline size-4" />
              <strong>No OAuth apps configured.</strong> Connect sandbox accounts
              to use the whole product — composing, scheduling, publishing and
              analytics all work, nothing leaves your machine. Add real
              credentials to <code className="font-mono text-xs">.env.local</code>{" "}
              when you&apos;re ready to publish for real.
            </Alert>
          ) : null}

          {accounts.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-medium">Connected</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {accounts.map((a) => (
                  <AccountCard
                    key={a.id}
                    account={{
                      id: a.id,
                      platform: a.platform,
                      handle: a.handle,
                      displayName: a.displayName,
                      avatarUrl: a.avatarUrl,
                      isSandbox: a.isSandbox,
                      status: a.status,
                    }}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="mb-3 text-sm font-medium">Available</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {platforms.map((p) => (
                <ConnectCard
                  key={p.id}
                  platform={p}
                  atLimit={accounts.length >= plan.maxAccounts}
                />
              ))}
            </div>
          </section>

          <Card className="p-5">
            <h2 className="text-sm font-semibold">Going live</h2>
            <p className="mt-1 text-sm text-muted">
              Each platform needs its own developer app. Create one, add the
              redirect URL below, then drop the client id and secret into{" "}
              <code className="font-mono text-xs">.env.local</code>.
            </p>
            <div className="mt-4 space-y-2">
              {platforms.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border bg-[var(--bg-subtle)] px-3 py-2 text-sm"
                >
                  <span className={`size-2 shrink-0 rounded-full ${p.accent}`} />
                  <span className="w-20 shrink-0 font-medium">{p.name}</span>
                  <code className="min-w-0 flex-1 truncate font-mono text-xs text-muted">
                    /api/oauth/{p.id}/callback
                  </code>
                  {p.live ? (
                    <Badge tone="success">Configured</Badge>
                  ) : (
                    <a
                      href={p.docs}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-xs text-brand-500 hover:underline"
                    >
                      Create app <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
