import Link from "next/link";
import {
  BarChart3, CalendarDays, Fingerprint, LayoutDashboard, Link2,
  PenLine, Settings, Sparkles,
} from "lucide-react";
import { requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { planFor } from "@/lib/billing";
import { Logo } from "@/components/marketing/logo";
import { Badge, ButtonLink } from "@/components/ui";
import { NavLink } from "./nav-link";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { UserMenu } from "./user-menu";

const NAV = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/app/compose", label: "Compose", icon: PenLine },
  { href: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/app/autopilot", label: "Autopilot", icon: Sparkles },
  { href: "/app/voice", label: "Voice", icon: Fingerprint },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/app/accounts", label: "Accounts", icon: Link2 },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, workspace, workspaces } = await requireWorkspace();
  const plan = planFor(user.plan);

  const [pendingCount, accountCount] = await Promise.all([
    db.post.count({ where: { workspaceId: workspace.id, status: "needs_approval" } }),
    db.socialAccount.count({ where: { workspaceId: workspace.id } }),
  ]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r bg-[var(--bg-subtle)] lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/app">
            <Logo />
          </Link>
        </div>

        <div className="px-3">
          <WorkspaceSwitcher current={workspace} workspaces={workspaces} canAdd={plan.autopilot} />
        </div>

        <nav className="mt-4 flex-1 space-y-0.5 px-3">
          {NAV.map((item) => (
            <NavLink key={item.href} href={item.href} exact={item.exact}>
              <item.icon className="size-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.href === "/app/autopilot" && pendingCount > 0 ? (
                <Badge tone="brand">{pendingCount}</Badge>
              ) : null}
              {item.href === "/app/accounts" && accountCount === 0 ? (
                <span className="size-1.5 rounded-full bg-clay-500" />
              ) : null}
            </NavLink>
          ))}
        </nav>

        {plan.id === "free" ? (
          <div className="m-3 rounded-xl border bg-[var(--panel)] p-4">
            <p className="text-sm font-medium">You&apos;re on {plan.name}</p>
            <p className="mt-1 text-xs text-muted">
              Autopilot and multi-brand are on Pro.
            </p>
            <ButtonLink href="/app/settings/billing" size="sm" className="mt-3 w-full">
              Upgrade
            </ButtonLink>
          </div>
        ) : null}

        <div className="border-t p-3">
          <UserMenu user={{ email: user.email, name: user.name }} plan={plan.name} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b bg-[var(--bg)]/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link href="/app">
          <Logo />
        </Link>
        <UserMenu user={{ email: user.email, name: user.name }} plan={plan.name} compact />
      </div>

      <div className="flex min-w-0 flex-col pb-20 lg:pb-0">
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-[var(--bg)]/95 backdrop-blur-xl lg:hidden">
        {NAV.filter((n) =>
          ["/app", "/app/compose", "/app/calendar", "/app/autopilot", "/app/analytics"].includes(n.href),
        ).map((item) => (
          <NavLink key={item.href} href={item.href} exact={item.exact} variant="tab">
            <item.icon className="size-5" />
            <span className="text-[10px]">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
