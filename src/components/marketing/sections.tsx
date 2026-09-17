import Link from "next/link";
import { ArrowRight, Briefcase, PenLine, Star, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { getPlatform } from "@/lib/platforms/registry";
import type { PlatformId } from "@/lib/platforms/types";
import { Logo } from "./logo";
import { BrandChip, BrandLogo } from "./brand-logos";
import { Avatar } from "./avatar";
import { DoodleCta } from "./doodles";
import { Counter } from "./counter";

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

export function Section({
  id,
  children,
  tone = "plain",
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  tone?: "plain" | "subtle";
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-20 ${tone === "subtle" ? "border-y bg-[var(--bg-subtle)]" : ""} ${className}`}
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">{children}</div>
    </section>
  );
}

export function SectionTitle({
  children,
  sub,
  center,
}: {
  children: React.ReactNode;
  sub?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-[2.6rem]">
        {children}
      </h2>
      {sub ? <p className="mt-4 text-lg text-muted">{sub}</p> : null}
    </div>
  );
}

/** Infinite horizontal scroll. Content is duplicated for the seamless loop. */
export function Marquee({
  children,
  speed = 40,
  className = "",
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)] ${className}`}
    >
      <div className="marquee flex w-max gap-4" style={{ animationDuration: `${speed}s` }}>
        {children}
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

export function AnnouncementBar({
  label,
  text,
  href,
}: {
  label: string;
  text: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block bg-ink-900 text-center text-xs text-ink-50 transition-colors hover:bg-ink-800 dark:bg-ink-50 dark:text-ink-950 dark:hover:bg-white"
    >
      <span className="inline-flex items-center gap-2 px-4 py-2">
        <span className="rounded bg-clay-500 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white">
          {label}
        </span>
        {text}
        <ArrowRight className="size-3" />
      </span>
    </a>
  );
}

export function ChannelMarquee({ channels }: { channels: PlatformId[] }) {
  return (
    <Marquee speed={28}>
      {channels.map((id) => {
        const p = getPlatform(id);
        return (
          <span
            key={id}
            className="surface inline-flex shrink-0 items-center gap-2.5 rounded-full py-2 pl-3 pr-4 text-sm font-medium"
          >
            <BrandLogo platform={id} className="size-4" />
            {p.name}
          </span>
        );
      })}
    </Marquee>
  );
}

export function ProofStrip({ items }: { items: { big: string; small: string }[] }) {
  return (
    <Marquee speed={55}>
      {items.map((it, i) => (
        <div
          key={i}
          className="surface flex w-56 shrink-0 flex-col justify-between rounded-2xl p-5 lift"
        >
          <p className="font-serif text-3xl font-semibold tabular-nums tracking-tight">
            <Counter value={it.big} />
          </p>
          <p className="mt-3 text-sm text-muted">{it.small}</p>
        </div>
      ))}
    </Marquee>
  );
}

const AUDIENCE_ICONS = { briefcase: Briefcase, pen: PenLine, users: Users } as const;

export function AudienceGrid({
  items,
}: {
  items: { title: string; body: string; icon: keyof typeof AUDIENCE_ICONS }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {items.map((a) => {
        const Icon = AUDIENCE_ICONS[a.icon];
        return (
          <div
            key={a.title}
            className="surface group rounded-2xl p-7 lift"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-clay-500/10 text-clay-600 transition-colors group-hover:bg-clay-500 group-hover:text-white dark:text-clay-400">
              <Icon className="size-5" />
            </span>
            <h3 className="mt-5 font-serif text-xl font-semibold">{a.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{a.body}</p>
          </div>
        );
      })}
    </div>
  );
}

/** Demo video slot. With no URL it renders the interactive walkthrough instead. */
export function VideoFrame({
  url,
  fallback,
}: {
  url?: string;
  fallback: React.ReactNode;
}) {
  if (!url) return <>{fallback}</>;
  return (
    <div className="surface relative mx-auto aspect-video max-w-4xl overflow-hidden rounded-2xl shadow-2xl shadow-ink-900/10">
      <iframe
        src={url}
        title="Sixfold demo"
        className="absolute inset-0 size-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

export function HowItWorks({ steps }: { steps: { name: string; text: string }[] }) {
  return (
    <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((s, i) => (
        <li key={s.name} className="surface group relative rounded-2xl p-6 lift">
          <span className="font-serif text-3xl font-semibold text-clay-500 transition-transform duration-300 group-hover:-translate-y-0.5">
            0{i + 1}
          </span>
          <h3 className="mt-3 font-serif text-lg font-semibold">{s.name}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

export function AiGrid({ items }: { items: { title: string; body: string }[] }) {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border bg-[var(--border)] sm:grid-cols-2">
      {items.map((it, i) => (
        <div key={it.title} className="group bg-[var(--panel)] p-7 transition-colors duration-300 hover:bg-[var(--bg-subtle)]">
          <span className="inline-block font-serif text-sm font-semibold text-clay-500 transition-transform duration-300 group-hover:translate-x-1">
            0{i + 1}
          </span>
          <h3 className="mt-3 font-serif text-lg font-semibold">{it.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{it.body}</p>
        </div>
      ))}
    </div>
  );
}

export function ToolRow({
  kicker,
  title,
  body,
  graphic,
  flip,
}: {
  kicker: string;
  title: string;
  body: string;
  graphic: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
      <div className={flip ? "md:order-2" : ""}>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-clay-500">{kicker}</p>
        <h3 className="mt-3 font-serif text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
          {title}
        </h3>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">{body}</p>
      </div>
      <figure
        className={`surface rounded-2xl p-6 shadow-xl shadow-ink-900/5 lift ${flip ? "md:order-1" : ""}`}
      >
        {graphic}
      </figure>
    </div>
  );
}

export function ChannelGrid({ channels }: { channels: PlatformId[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {channels.map((id) => {
        const p = getPlatform(id);
        return (
          <div
            key={id}
            className="surface group flex flex-col items-center gap-3 rounded-2xl p-6 lift"
          >
            <BrandChip platform={id} className="group-hover:scale-110" />
            <span className="text-sm font-medium">{p.name}</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
              {p.charLimit.toLocaleString()} chars
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function WallOfLove({
  items,
}: {
  items: { quote: string; name: string; role: string; handle?: string | null; href?: string; rating?: number }[];
}) {
  if (!items.length) return null;
  return (
    <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5 [&>*]:break-inside-avoid">
      {items.map((t, i) => (
        <figure key={i} className="surface rounded-2xl p-6 lift">
          {t.rating ? (
            <p className="mb-3 flex gap-0.5" aria-label={`${t.rating} out of 5`}>
              {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`size-3.5 ${n <= (t.rating ?? 0) ? "fill-clay-500 text-clay-500" : "text-ink-300"}`} />)}
            </p>
          ) : null}
          <blockquote className="text-[15px] leading-relaxed">&ldquo;{t.quote}&rdquo;</blockquote>
          <figcaption className="mt-5 flex items-center gap-3">
            <Avatar seed={t.name} size={38} />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{t.name}</span>
              <span className="block text-xs text-muted">
                {t.role}{t.handle ? ` · ${t.handle}` : ""}
              </span>
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="mx-auto max-w-3xl divide-y rounded-2xl border">
      {items.map((it) => (
        <details key={it.q} className="group px-6 py-5 open:bg-[var(--bg-subtle)]">
          <summary className="-mx-6 flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-1 font-medium transition-colors hover:text-clay-600 dark:hover:text-clay-400 [&::-webkit-details-marker]:hidden">
            {it.q}
            <span className="shrink-0 font-serif text-xl leading-none text-clay-500 transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{it.a}</p>
        </details>
      ))}
    </div>
  );
}

export function CtaBlock({
  title,
  sub,
  doodle = true,
}: {
  title: string;
  sub?: string;
  doodle?: boolean;
}) {
  return (
    <div className="relative mx-auto max-w-3xl text-center">
      {doodle ? (
        <DoodleCta className="pointer-events-none absolute -right-8 -top-16 hidden w-44 lg:block" />
      ) : null}
      <h2 className="font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
        {title}
      </h2>
      {sub ? <p className="mx-auto mt-4 max-w-md text-lg text-muted">{sub}</p> : null}
      <ButtonLink href="/signup" size="lg" className="mt-9">
        Start for $0 <ArrowRight className="size-4" />
      </ButtonLink>
      <p className="mt-4 text-sm text-muted">No card. Two minutes.</p>
    </div>
  );
}

export function Footer({
  tagline,
  columns,
}: {
  tagline: string;
  columns: { heading: string; links: { label: string; href: string }[] }[];
}) {
  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted">{tagline}</p>
        </div>
        {columns.map((c) => (
          <div key={c.heading}>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              {c.heading}
            </p>
            <ul className="mt-4 space-y-2.5">
              {c.links.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith("http") ? (
                    <a href={l.href} target="_blank" rel="noreferrer noopener" className="text-sm hover:text-clay-500">
                      {l.label}
                    </a>
                  ) : (
                    <Link href={l.href} className="text-sm hover:text-clay-500">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted sm:px-6">
          © Sixfold, {new Date().getFullYear()}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
