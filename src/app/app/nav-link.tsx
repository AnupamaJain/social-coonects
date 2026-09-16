"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  exact,
  children,
  variant = "side",
}: {
  href: string;
  exact?: boolean;
  children: React.ReactNode;
  variant?: "side" | "tab";
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);

  if (variant === "tab") {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-col items-center justify-center gap-1 py-2.5 transition-colors",
          active ? "text-brand-500" : "text-muted",
        )}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-[var(--panel)] font-medium shadow-sm border"
          : "text-muted hover:bg-[var(--panel)]/60 hover:text-[var(--fg)]",
      )}
    >
      {children}
    </Link>
  );
}
