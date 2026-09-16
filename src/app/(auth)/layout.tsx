import Link from "next/link";
import { Logo } from "@/components/marketing/logo";

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
        <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden />
        <div className="pointer-events-none absolute right-0 top-1/4 size-[420px] translate-x-1/3 rounded-full bg-brand-500/15 blur-[110px]" aria-hidden />
        <div className="relative flex h-full flex-col justify-center px-12">
          <blockquote className="max-w-md text-2xl font-medium leading-snug tracking-tight">
            &ldquo;We cut posting volume by 60% and reach went up. The score told
            us which two posts were worth keeping.&rdquo;
          </blockquote>
          <p className="mt-6 text-sm text-muted">
            The workflow Postwave is built around.
          </p>

          <div className="mt-12 space-y-4 text-sm">
            {[
              "Train your voice from 10 posts",
              "Score every draft before it ships",
              "Let the queue fill itself",
            ].map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                  {i + 1}
                </span>
                {step}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
