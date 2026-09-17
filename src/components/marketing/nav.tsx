import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { Logo } from "./logo";

const LINKS = [
  { label: "Tour", href: "#tour" },
  { label: "Voice", href: "#voice" },
  { label: "Score", href: "#predict" },
  { label: "Autopilot", href: "#autopilot" },
  { label: "ROI", href: "#case" },
  { label: "Channels", href: "#channels" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function MarketingNav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b bg-[var(--bg)]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="ul-slide transition-colors hover:text-[var(--fg)]">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {signedIn ? (
            <ButtonLink href="/app" size="sm">Open app</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Log in
              </ButtonLink>
              <ButtonLink href="/signup" size="sm">Start for $0</ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
