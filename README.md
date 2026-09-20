# Sixfold

A social media scheduler that knows what you should post.

Connect X, LinkedIn, Instagram, Facebook, Threads and Mastodon. Write once,
publish everywhere, on a calendar and a queue. That part is table stakes — every
scheduler does it.

The part that isn't:

| | What it does |
|---|---|
| **Voice Fingerprint** | Measures how you actually write from your own posts — sentence rhythm, line cadence, vocabulary, emoji habits — and conditions every generated draft on it. Scores each draft with a **Voice Match %** and a per-signal breakdown. |
| **Pre-flight Predictor** | Scores every draft per platform across six signals before you publish, then **refits those weights against your own engagement data**. After ~8 published posts the score reflects your audience, not a generic rubric. |
| **Autopilot Queue** | Turns one topic into a week of posts with an arc, each voice-matched and pre-scored, waiting on a one-click approval that drops it into your existing cadence. |

Built on ideas from [langchain-ai/social-media-agent](https://github.com/langchain-ai/social-media-agent)
— its LinkedIn and X publishing logic is the basis of the connectors here,
rebuilt as a product rather than a LangGraph CLI.

**Docs:** [Architecture](docs/ARCHITECTURE.md) · [Deployment](docs/DEPLOYMENT.md) ·
[Security](docs/SECURITY.md) · [Operations](docs/OPERATIONS.md)

---

## Quick start

```bash
npm install
cp .env.example .env.local
npm run db:migrate    # creates prisma/dev.db
npm run db:seed       # demo account with 40 days of history
npm run dev
```

Open http://localhost:3000 and log in:

```
demo@sixfold.app
sixfold-demo-2026
```

In a second terminal, run the scheduler so queued posts actually go out:

```bash
npm run worker
```

**No API keys are needed to run any of this.** Platforms without OAuth
credentials connect as *sandbox* accounts: publishing, analytics and the whole
scoring loop work end to end, and nothing leaves your machine. Add real
credentials when you're ready to publish for real.

---

## The product, in one pass

1. **Accounts** — connect a platform (or a sandbox account).
2. **Voice** — paste 5–10 posts you're proud of. Traits are measured
   immediately; the written summary needs an AI key.
3. **Compose** — write. The pre-flight panel scores it live, per platform, and
   tells you which signal is weak. "Make it sound like me" rewrites it against
   your fingerprint.
4. **Queue** — approve, and it lands in the next free slot from your cadence.
5. **Analytics** — real numbers per platform, plus a calibration chart showing
   whether the score is actually predicting your engagement, and what the
   predictor has learned to weight.

---

## Architecture at a glance

```
src/
  app/
    page.tsx                 landing page
    (auth)/                  email + password, DB-backed sessions
    app/                     the product (dashboard, compose, calendar, …)
    api/
      health/                liveness + which subsystems are configured
      score/                 live pre-flight scoring (no model call)
      ai/                    variations, rewrite-in-voice
      oauth/[platform]/      generic OAuth2 start + callback
      stripe/                checkout, portal, webhook
      cron/                  publish due posts, refresh metrics, retrain
  lib/
    voice-stats.ts           trait extraction + Voice Match  (pure, no AI)
    scoring.ts               the six pre-flight signals       (pure, no AI)
    predictor.ts             per-workspace weight refitting
    platforms/               registry, OAuth, publish, metrics per platform
    accounts.ts              the only door in/out of stored OAuth tokens
    crypto.ts                AES-256-GCM for data at rest
    rate-limit.ts            DB-backed fixed-window limiter
    ai/                      prompts + generation, with an offline fallback
```

Three decisions worth knowing — the reasoning is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md):

**Scoring is deterministic.** `voice-stats.ts` and `scoring.ts` are pure string
math. They run on every keystroke in the composer, cost nothing, and keep
working with no AI key. The model is only used for *writing*.

**The score stays absolute.** Training changes which signals carry weight
(`hook` might rise to 34% while `lengthFit` falls to 7%), never the overall
level — so 80 means a strong post for everyone, and improving your writing
actually moves the number up.

**Sandbox is a first-class mode, not a mock.** Sandbox accounts run the real
publish and analytics code paths; only the final HTTP call is swapped. That's
why the whole loop is testable before a single developer app is approved.

---

## Environment variables

Everything except `DATABASE_URL` is optional in development. Three are required
in production. See `.env.example` for the full annotated list.

| Variable | Required | Without it |
|---|---|---|
| `DATABASE_URL` | yes | Defaults to `file:./dev.db` |
| `ENCRYPTION_KEY` | **production** | Dev uses a fixed development key. **The app throws in production if unset** |
| `CRON_SECRET` | **production** | Cron routes are open in development and **refuse everything in production** |
| `APP_URL` | production | Inferred from `VERCEL_PROJECT_PRODUCTION_URL` on Vercel |
| `AI_GATEWAY_API_KEY` *or* `ANTHROPIC_API_KEY` | no | Generation falls back to a template writer. Scoring and Voice Match are unaffected |
| `AI_MODEL` | no | Defaults to `anthropic/claude-sonnet-5` |
| `ADMIN_EMAIL` | no | Nobody can approve testimonials; nothing submitted shows publicly |
| `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION` | no | No verification meta tags |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` | no | Billing page explains what's missing; everyone stays on the free plan |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | no | X connects as a sandbox account |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | no | LinkedIn connects as a sandbox account |
| `META_CLIENT_ID` / `META_CLIENT_SECRET` | no | Instagram + Facebook connect as sandbox accounts |
| `THREADS_CLIENT_ID` / `THREADS_CLIENT_SECRET` | no | Threads connects as a sandbox account |
| `MASTODON_INSTANCE` / `MASTODON_CLIENT_ID` / `MASTODON_CLIENT_SECRET` | no | Mastodon connects as a sandbox account |

Generate the two production secrets:

```bash
openssl rand -base64 32   # ENCRYPTION_KEY
openssl rand -hex 32      # CRON_SECRET
```

### Connecting a real platform

Each platform needs its own developer app. Create one, register the redirect
URL, then put the credentials in `.env.local`.

| Platform | Where | Redirect URL | Notes |
|---|---|---|---|
| X | [developer.x.com](https://developer.x.com/en/portal/dashboard) | `{APP_URL}/api/oauth/x/callback` | OAuth 2.0 with PKCE. Needs `tweet.write` |
| LinkedIn | [linkedin.com/developers](https://www.linkedin.com/developers/apps) | `{APP_URL}/api/oauth/linkedin/callback` | Add both "Share on LinkedIn" and "Sign In with LinkedIn using OpenID Connect" |
| Instagram | [developers.facebook.com](https://developers.facebook.com/apps) | `{APP_URL}/api/oauth/instagram/callback` | Requires a Business account linked to a Facebook Page. **Instagram will not accept a post without an image** |
| Facebook | same Meta app | `{APP_URL}/api/oauth/facebook/callback` | Publishes to a Page, not a personal profile |
| Threads | [Threads API](https://developers.facebook.com/docs/threads) | `{APP_URL}/api/oauth/threads/callback` | |
| Mastodon | your instance → Preferences → Development | `{APP_URL}/api/oauth/mastodon/callback` | Set `MASTODON_INSTANCE` to your server |

The Accounts page lists each redirect URL and shows which platforms are
configured, so you don't have to come back here.

### Stripe in test mode

```bash
# 1. Create a recurring price in the Stripe dashboard (test mode), copy its ID
# 2. Put the secret key and price ID in .env.local
# 3. Forward webhooks locally:
stripe listen --forward-to localhost:3000/api/stripe/webhook
#    Copy the whsec_... it prints into STRIPE_WEBHOOK_SECRET, then restart dev
```

Test card `4242 4242 4242 4242`, any future expiry, any CVC.

The webhook verifies signatures, deduplicates by event id, and handles
`checkout.session.completed` plus the three `customer.subscription.*` events —
so upgrades, cancellations and failed renewals all move the user between plans.

---

## Scheduling

Two authenticated endpoints do the work:

- `GET /api/cron/publish` — publishes posts whose scheduled time has passed
- `GET /api/cron/metrics` — pulls analytics per platform, then refits every
  workspace's predictor

Locally, `npm run worker` polls them (publish every 30s, metrics every 5min).

In production, **Vercel Cron** runs them. Vercel's Hobby plan caps cron at one
run per day — and rejects a deploy asking for more — so the defaults in
`vercel.ts` are daily.

> **A post queued for 16:30 goes out at the next daily run, not at 16:30.**
> On Vercel Pro, set `CRON_FREQUENT=1` for 5-minute publishing. Or publish
> immediately from the composer with **Publish now** — the cron only exists for
> things you scheduled and walked away from.

Any scheduler can drive the two endpoints instead; see
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Deploying

Short version:

```bash
vercel link
vercel integration add neon          # sets DATABASE_URL
vercel env add ENCRYPTION_KEY production
vercel env add CRON_SECRET production
vercel env add APP_URL production
vercel --prod
```

The full checklist, including the post-deploy steps that are easy to forget
(Stripe webhook endpoint, OAuth redirect URLs, verifying cron registration), is
in **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

---

## Scripts

| | |
|---|---|
| `npm run dev` | Development server |
| `npm run worker` | Local scheduler (publish + metrics) |
| `npm run check` | Typecheck, lint and tests — run this before pushing |
| `npm test` | Unit tests (vitest) |
| `npm run build` | Production build (switches provider, applies migrations) |
| `npm run build:local` | Build without touching the database |
| `npm run db:migrate` | Create/apply a SQLite migration (local) |
| `npm run db:migrate:pg -- <name>` | Write an incremental Postgres migration from the committed schema to your working copy |
| `npm run db:seed` | Demo account with 40 days of history |
| `npm run db:reset` | Wipe and reseed |
| `npm run db:studio` | Prisma Studio |
| `npm run screenshots` | Recapture the landing-page product shots from the running app |
| `npx tsx scripts/cleanup-test-users.ts` | Removes smoke-test accounts (needs a direct `DATABASE_URL`) |

> After editing `prisma/schema.prisma`, run **both** `npm run db:migrate` and
> `npm run db:migrate:pg -- <name>` *before committing*. SQLite and Postgres
> keep separate migration histories — see
> [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#two-databases-one-schema).

---

## Known limits

Worth knowing before you charge anyone for this:

- **No media uploads yet.** `Post.mediaUrls` is wired through the whole
  publishing path, but there's no upload UI — so Instagram, which requires an
  image, can only publish via sandbox for now.
- **LinkedIn impressions need a higher API tier.** The Marketing Developer
  Platform gates impression data; likes and comments come through on the
  standard tier. Reach will read 0 for LinkedIn until you have it.
- **No token refresh loop.** Access tokens are stored with their expiry but
  aren't refreshed in the background; a user reconnects when one lapses.
- **Single owner per workspace.** No team invite flow — an agency runs multiple
  brands under one login.
