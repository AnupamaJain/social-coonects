import Link from "next/link";
import { Logo } from "@/components/marketing/logo";
import { PostGrid, Underline } from "@/components/marketing/graphics";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-8 sm:px-8">
        <Link href="/" className="inline-flex w-fit">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      <aside className="relative hidden overflow-hidden border-l bg-[var(--bg-subtle)] lg:block">
        <div className="relative flex h-full flex-col justify-center px-14">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted">
            Last year, one team
          </p>
          <p className="mt-4 max-w-sm font-serif text-4xl font-semibold leading-[1.05] tracking-tight">
            published 180 posts.
            <br />
            <span className="relative inline-block">
              Six of them worked.
              <Underline />
            </span>
          </p>

          <div className="mt-12 max-w-md">
            <PostGrid />
          </div>

          <p className="mt-10 max-w-xs text-sm text-muted">
            Sixfold scores a draft before it goes out, so you know which six in
            advance.
          </p>
        </div>
      </aside>
    </div>
  );
}
