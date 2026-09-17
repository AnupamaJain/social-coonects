import { ArrowRight, Check } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { MarketingNav } from "@/components/marketing/nav";
import { DoodleLeft, DoodleRight, Sparkle } from "@/components/marketing/doodles";
import {
  AnalyticsMini, CalendarMini, Dial, PostGrid, PreviewMini, SignalStack,
  Underline, VoiceWave, WeekStrip,
} from "@/components/marketing/graphics";
import {
  AiGrid, AnnouncementBar, AudienceGrid, ChannelGrid, ChannelMarquee, CtaBlock,
  Faq, Footer, ProofStrip, Section, SectionTitle, ToolRow, VideoFrame, WallOfLove,
} from "@/components/marketing/sections";
import { ButtonLink } from "@/components/ui";
import { LiveDemo } from "@/components/marketing/live-demo";
import { Reveal } from "@/components/marketing/reveal";
import { siteUrl } from "@/lib/site";
import { PLANS } from "@/lib/billing";
import {
  AI_FEATURES, ANNOUNCEMENT, AUDIENCES, CHANNELS, FAQ, FOOTER, HERO, PROOF,
  TESTIMONIALS, TOOLS,
} from "@/content/landing";

/** Set once you've recorded the demo (see marketing/RECORDING-SETUP.md). */
const DEMO_VIDEO_URL: string | undefined = undefined;

const TOOL_GRAPHICS: Record<string, React.ReactNode> = {
  schedule: <CalendarMini />,
  voice: (
    <div>
      <VoiceWave />
      <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-4 text-center">
        {[["13.4", "words / sentence"], ["38%", "short lines"], ["0.4", "emoji / post"]].map(([v, l]) => (
          <div key={l}>
            <p className="font-serif text-lg font-semibold tabular-nums">{v}</p>
            <p className="text-[10px] text-muted">{l}</p>
          </div>
        ))}
      </div>
    </div>
  ),
  score: (
    <div className="flex flex-col items-center gap-6">
      <Dial score={87} size={150} caption="Predicted" />
      <SignalStack
        signals={[
          { label: "Hook", value: 91 },
          { label: "Voice match", value: 89 },
          { label: "Length fit", value: 96 },
          { label: "Algorithm risk", value: 100 },
        ]}
      />
    </div>
  ),
  autopilot: (
    <div>
      <WeekStrip />
      <p className="mt-4 border-t pt-4 text-center font-mono text-[10px] uppercase tracking-wider text-muted">
        5 approved · 3 open · 0 published without you
      </p>
    </div>
  ),
  preview: <PreviewMini />,
  analytics: (
    <div>
      <AnalyticsMini />
      <div className="mt-3 flex justify-between border-t pt-3 font-mono text-[10px] uppercase tracking-wider text-muted">
        <span>reach · 10 weeks</span>
        <span className="text-clay-500">+410%</span>
      </div>
    </div>
  ),
};

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${siteUrl}/#faq`,
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-dvh">
      <AnnouncementBar {...ANNOUNCEMENT} />
      <MarketingNav signedIn={Boolean(user)} />

      {/* ============================================================== */}
      {/* Hero                                                            */}
      {/* ============================================================== */}
      <section className="relative overflow-hidden">
        <DoodleLeft className="pointer-events-none absolute left-2 top-24 hidden w-32 opacity-90 lg:block xl:left-16" />
        <DoodleRight className="pointer-events-none absolute right-2 top-16 hidden w-32 opacity-90 lg:block xl:right-16" />

        <div className="mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
          <p className="rise font-mono text-xs uppercase tracking-[0.22em] text-muted">
            {HERO.eyebrow}
          </p>

          <h1
            className="rise mt-6 font-serif text-[2.7rem] font-semibold leading-[1.02] tracking-tight sm:text-7xl"
            style={{ animationDelay: "60ms" }}
          >
            {HERO.headline[0]}
            <br />
            <span className="relative inline-block bg-gradient-to-r from-clay-600 via-clay-500 to-clay-400 bg-clip-text text-transparent">
              {HERO.headline[1]}
              <Underline />
            </span>
          </h1>

          <p
            className="rise mx-auto mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-muted sm:text-xl"
            style={{ animationDelay: "140ms" }}
          >
            {HERO.sub}
          </p>

          <p className="rise mt-6 text-sm text-muted" style={{ animationDelay: "200ms" }}>
            {HERO.modelsNote.split(",")[0]}:{" "}
            {HERO.models.map((m, i) => (
              <span key={m}>
                <span className="font-medium text-[var(--fg)]">{m}</span>
                {i < HERO.models.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>

          <div className="rise mt-10" style={{ animationDelay: "260ms" }}>
            <ChannelMarquee channels={CHANNELS} />
          </div>

          <div className="rise mt-10 flex flex-col items-center gap-4" style={{ animationDelay: "320ms" }}>
            <ButtonLink href="/signup" size="lg">
              Start for $0 <ArrowRight className="size-4" />
            </ButtonLink>

            <div className="mt-2 grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
              {HERO.paths.map((p) => (
                <a
                  key={p.href}
                  href={p.href}
                  className="surface group rounded-xl px-5 py-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ink-900/5"
                >
                  <span className="flex items-center justify-between font-medium">
                    {p.label}
                    <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-clay-500" />
                  </span>
                  <span className="mt-1 block text-xs text-muted">{p.sub}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* Proof strip                                                     */}
      {/* ============================================================== */}
      <section className="border-y bg-[var(--bg-subtle)] py-14">
        <p className="mb-8 text-center font-mono text-xs uppercase tracking-[0.22em] text-muted">
          What it does, in numbers
        </p>
        <ProofStrip items={PROOF} />
      </section>

      {/* ============================================================== */}
      {/* Live demo — the product, no account needed                      */}
      {/* ============================================================== */}
      <Section id="try">
        <Reveal>
          <SectionTitle center sub="Paste anything. It scores as you type, entirely in your browser.">
            Try it on a post right now
          </SectionTitle>
        </Reveal>
        <Reveal delay={120} className="mt-12">
          <LiveDemo />
        </Reveal>
      </Section>

      {/* ============================================================== */}
      {/* Story: 180 posts                                                */}
      {/* ============================================================== */}
      <Section>
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-[1fr_1.1fr]">
          <div>
            <SectionTitle sub="They found out which six afterwards. Sixfold tells you before.">
              Last year one team published 180 posts.{" "}
              <span className="relative inline-block">
                Six worked.
                <Underline />
              </span>
            </SectionTitle>
          </div>
          <Reveal delay={100}><PostGrid /></Reveal>
        </div>
      </Section>

      {/* ============================================================== */}
      {/* Who is it for                                                   */}
      {/* ============================================================== */}
      <Section tone="subtle">
        <SectionTitle center>Who is Sixfold for?</SectionTitle>
        <Reveal className="mt-12">
          <AudienceGrid items={AUDIENCES} />
        </Reveal>
      </Section>

      {/* ============================================================== */}
      {/* Video                                                           */}
      {/* ============================================================== */}
      <Section>
        <SectionTitle center sub="Ninety seconds: paste a post, watch the score, fix it, queue it.">
          See Sixfold in action
        </SectionTitle>
        <Reveal className="mt-12">
          <VideoFrame
            url={DEMO_VIDEO_URL}
            poster={
              <div className="flex items-center gap-10">
                <Dial score={28} size={120} caption="AI draft" />
                <ArrowRight className="size-8 text-muted" />
                <Dial score={87} size={120} caption="Your voice" />
              </div>
            }
          />
        </Reveal>
      </Section>

      {/* ============================================================== */}
      {/* AI                                                              */}
      {/* ============================================================== */}
      <Section id="voice" tone="subtle">
        <div className="flex items-start gap-3">
          <Sparkle className="mt-2 size-6 shrink-0" />
          <SectionTitle sub="It read you first. Everything it writes is conditioned on how you actually write.">
            Power your content with AI that sounds like you
          </SectionTitle>
        </div>
        <Reveal className="mt-12">
          <AiGrid items={AI_FEATURES} />
        </Reveal>
      </Section>

      {/* ============================================================== */}
      {/* Tools                                                           */}
      {/* ============================================================== */}
      <Section id="predict">
        <SectionTitle center>Every tool for social growth, in one place</SectionTitle>
        <div className="mt-20 space-y-24">
          {TOOLS.map((t, i) => (
            <Reveal key={t.key}>
              {t.key === "autopilot" ? <span id="autopilot" className="block scroll-mt-24" /> : null}
              <ToolRow
                kicker={t.kicker}
                title={t.title}
                body={t.body}
                graphic={TOOL_GRAPHICS[t.key]}
                flip={i % 2 === 1}
              />
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ============================================================== */}
      {/* Channels                                                        */}
      {/* ============================================================== */}
      <Section id="channels" tone="subtle">
        <SectionTitle center sub="One composer. Each channel gets its own version, its own preview, its own score.">
          Every channel that matters
        </SectionTitle>
        <Reveal className="mt-12">
          <ChannelGrid channels={CHANNELS} />
        </Reveal>
      </Section>

      {/* ============================================================== */}
      {/* Mid CTA                                                         */}
      {/* ============================================================== */}
      <Section>
        <CtaBlock
          title="Ready to get started?"
          sub="Train your fingerprint in five minutes. Score your next post before it goes out."
        />
      </Section>

      {/* ============================================================== */}
      {/* Wall of love — renders only with real quotes                    */}
      {/* ============================================================== */}
      {TESTIMONIALS.length > 0 ? (
        <Section tone="subtle">
          <SectionTitle center>Wall of love</SectionTitle>
          <div className="mt-12">
            <WallOfLove items={TESTIMONIALS} />
          </div>
        </Section>
      ) : null}

      {/* ============================================================== */}
      {/* Pricing                                                         */}
      {/* ============================================================== */}
      <Section id="pricing" tone="subtle">
        <SectionTitle center sub="Start free. Upgrade when the queue is paying for itself.">
          Two plans
        </SectionTitle>
        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-px overflow-hidden rounded-2xl border bg-[var(--border)] sm:grid-cols-2">
          {Object.values(PLANS).map((plan) => (
            <div key={plan.id} className="bg-[var(--panel)] p-8">
              <div className="flex items-baseline justify-between">
                <h3 className="font-serif text-xl font-semibold">{plan.name}</h3>
                <p className="font-serif text-4xl font-semibold tabular-nums">
                  ${plan.price}
                  <span className="ml-1 text-sm font-normal text-muted">/mo</span>
                </p>
              </div>
              <ul className="mt-7 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-clay-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <ButtonLink
                href="/signup"
                variant={plan.id === "pro" ? "primary" : "outline"}
                className="mt-8 w-full"
              >
                Start for $0
              </ButtonLink>
            </div>
          ))}
        </div>
      </Section>

      {/* ============================================================== */}
      {/* FAQ                                                             */}
      {/* ============================================================== */}
      <Section id="faq">
        <SectionTitle center>
          Frequently asked{" "}
          <span className="relative inline-block">
            questions
            <Underline />
          </span>
        </SectionTitle>
        <Reveal className="mt-12">
          <Faq items={FAQ} />
        </Reveal>
      </Section>

      {/* ============================================================== */}
      {/* Final CTA                                                       */}
      {/* ============================================================== */}
      <Section tone="subtle">
        <CtaBlock title="Find your six." sub="Post less. Land harder." doodle={false} />
      </Section>

      <Footer {...FOOTER} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}
