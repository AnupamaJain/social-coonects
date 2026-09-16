import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { Logo } from "./logo";

export function MarketingNav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b bg-[var(--bg)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
          <a href="#voice" className="transition-colors hover:text-[var(--fg)]">Voice</a>
          <a href="#predict" className="transition-colors hover:text-[var(--fg)]">Predict</a>
          <a href="#autopilot" className="transition-colors hover:text-[var(--fg)]">Autopilot</a>
          <a href="#pricing" className="transition-colors hover:text-[var(--fg)]">Pricing</a>
        </nav>

        <div className="flex items-center gap-2">
          {signedIn ? (
            <ButtonLink href="/app" size="sm">Open app</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Log in
              </ButtonLink>
              <ButtonLink href="/signup" size="sm">Start free</ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
