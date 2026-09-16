"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { initials } from "@/lib/utils";

export function UserMenu({
  user,
  plan,
  compact,
}: {
  user: { email: string; name: string | null };
  plan: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const label = user.name || user.email;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--panel)]"
        aria-expanded={open}
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink-800 text-[11px] font-semibold text-white">
          {initials(label)}
        </span>
        {!compact ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{label}</span>
            <span className="block truncate text-xs text-muted">{plan}</span>
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="surface absolute bottom-full right-0 z-50 mb-1 w-52 rounded-lg p-1 shadow-xl">
          <p className="truncate px-2.5 py-1.5 text-xs text-muted">{user.email}</p>
          <Link
            href="/app/settings/billing"
            className="block rounded-md px-2.5 py-1.5 text-sm hover:bg-[var(--bg-subtle)]"
          >
            Billing
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-red-500 hover:bg-red-500/10"
            >
              <LogOut className="size-3.5" />
              Log out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
