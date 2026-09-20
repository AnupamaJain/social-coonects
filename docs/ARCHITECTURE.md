# Architecture

Why the system is shaped the way it is. For how to run it, see the
[README](../README.md); for how to ship it, [DEPLOYMENT.md](DEPLOYMENT.md).

---

## The thesis

Every scheduler solves distribution. Sixfold is betting that distribution is
commoditised and *judgement* is not — what to say, in whose voice, and whether
it will work. That bet shapes three subsystems, and everything else is
plumbing around them.

---

## 1. Voice Fingerprint

`src/lib/voice-stats.ts`

Takes a set of the user's real posts and produces a `VoiceTraits` record:
average sentence length and its spread, the proportion of lines under seven
words, emoji and hashtag rates, question and exclamation rates, first-person
density, and a distinctive-vocabulary list.

Two properties matter:

**It's pure string math.** No model call. That's what lets the Voice Match
score run on every debounced keystroke in the composer for free, and keep
working when no AI key is configured.

**Distinctive vocabulary requires document frequency ≥ 2.** A word has to
appear in more than one sample to count. Otherwise the fingerprint learns the
*topic* of a single post rather than the writer's habits.

`voiceMatch()` scores a draft against the traits on six independent dimensions —
rhythm, cadence, vocabulary, punctuation, point of view, banned phrases — so the
UI can say *which* dial is off, not merely that something is.

The model is used for exactly one thing here: turning measured traits into a
readable summary and do/don't lists (`distillVoice`). Those feed back into the
writer prompt. Statistics steer a model harder than adjectives do, so the prompt
carries the numbers alongside the prose.

---

## 2. Pre-flight Predictor

`src/lib/scoring.ts`, `src/lib/predictor.ts`

Six signals, each a plain heuristic with a stated rationale:

| Signal | What it rewards |
|---|---|
| Hook | Short first line, a number, tension, a question. Penalises known AI openers |
| Readability | ~14 words/sentence, real paragraph breaks, no wall of text |
| Call to action | A closing question or explicit ask. Penalises engagement bait |
| Length fit | Distance from the platform's measured sweet spot |
| Algorithm risk | Outbound links on link-penalising platforms, hashtag overload, bait, over-tagging |
| Voice match | The fingerprint score above |

These combine as a **weighted average**, and `trainPredictor()` refits the
weights per workspace by regressing the six signals against rank-normalised
engagement from that workspace's own published posts. Ridge-pulled toward the
defaults, with the pull decaying as `1/√n`, so eight posts nudge and sixty move
it properly.

### Why the score stays absolute

The first version of this carried the regression's intercept through to the
final score. It pinned to its clamp immediately and deflated every trained
score by the maximum allowed amount.

The cause was a scale mismatch: the regression fits against rank-normalised
engagement, whose mean is 0.5 *by construction*, while the weighted signal
average sits wherever that workspace's writing actually sits. Carrying the
intercept across that change of scale silently converts the score from "how
good is this post" into "how does this compare to your median" — a percentile
wearing a score's clothes.

The fix was to decide what the number means and hold to it. **The score is
absolute.** 80 is a strong post for everybody. Training is only allowed to
change *which signals earn the weight*, never the level — so a workspace whose
writing genuinely improves sees its scores rise, which a self-recentring metric
could never show.

The intercept still exists during fitting, where it does real work absorbing the
mean offset so the weights aren't distorted by it. It's discarded on the way
out.

### Holding it to account

The analytics page plots predicted score against actual engagement percentile,
with a perfect-calibration reference line. If the predictor is not working, that
chart says so. Shipping the thing that can falsify your own feature is the point.

---

## 3. Autopilot

`runAutopilot` in `src/app/app/actions.ts`, `generateWeek` in `src/lib/ai/generate.ts`

One topic becomes a week with a deliberate arc — the opinionated opener, the
how-it-works piece, the story, the contrarian take, the short quotable close —
each conditioned on the voice fingerprint and scored on arrival.

Drafts land in `needs_approval`, never `scheduled`. **Nothing publishes without
a human.** That is a product guarantee, not an oversight; an agency cannot sell
a tool that might post something unreviewed to a client's account.

Approval drops a post into the next free `QueueSlot`, so scheduling is a
cadence decision made once rather than a datetime picked every time.

---

## Platform layer

`src/lib/platforms/`

- **`registry.ts`** — per-platform metadata: character limits, sweet spots,
  hashtag tolerance, whether outbound links suppress reach, whether media is
  required. The scorer reads from here, so adding a platform teaches the scorer
  about it automatically.
- **`oauth.ts`** — one OAuth2 implementation with per-provider configuration
  (PKCE for X, Basic vs body credentials, instance rewriting for Mastodon),
  plus the profile lookups, which differ enough per platform to be explicit.
- **`publish.ts` / `metrics.ts`** — the actual API calls, and the sandbox
  fallback.

### Media is fetched, not uploaded

Instagram and Threads do not accept a file. You hand them a public URL and they
fetch it, which is why `src/lib/media.ts` insists on `https://` and why uploads
go to Blob storage rather than staying on the server.

That also makes Blob optional: pasting a public URL reaches exactly the same
code path, so the feature works on a free plan with nothing provisioned.

A lone video publishes as a Reel (`media_type=REELS`). Reels and Threads video
are transcoded after the container is created and reject a publish until that
finishes, so `waitForContainer` polls `status_code` and surfaces `ERROR` or
`EXPIRED` with Meta's own message instead of letting the publish fail with
something vaguer.

Stored media was originally a bare `string[]` of URLs. `normaliseMedia` reads
both that and the current typed shape, so no data migration was needed.

### Sandbox is a mode, not a mock

An account without OAuth credentials is `isSandbox`. It flows through the same
`publishPost` → `PostTarget` → `PostMetric` path as a live account; only the
outbound HTTP call is swapped for a deterministic stand-in.

Sandbox metrics are seeded from the post id and grow with the post's age on a
saturating curve, so they're stable across refetches and shaped like real
engagement. That's deliberate: it gives the predictor something real-shaped to
train against before anyone has live API access, and it makes the entire
product demonstrable offline.

---

## Data model

`prisma/schema.prisma`

`User → Workspace → { SocialAccount, Post, VoiceProfile, QueueSlot }`, with
`Post → PostTarget → PostMetric` carrying the per-platform fan-out.

A **Workspace** is a brand. Agencies run several; solo users have one. It's the
tenancy boundary — every query in `src/app/app/` is scoped to the workspace
returned by `requireWorkspace()`.

Enum-like columns and JSON blobs are stored as `String`. That isn't laziness:
it's what lets the identical schema run on SQLite and Postgres. `readJson` and
`writeJson` in `src/lib/db.ts` are the accessors.

### Two databases, one schema

Local development runs SQLite (zero setup); production runs Postgres. Two
mechanisms keep that honest:

1. `scripts/db-provider.mjs` rewrites the `provider` line from `DATABASE_URL`
   before generate and build.
2. `src/lib/db.ts` picks the matching Prisma driver adapter at runtime.

Migrations can't be shared — the SQL genuinely differs — so there are two
histories, and `prisma.config.ts` selects between them by URL:

```
prisma/migrations            SQLite,   npm run db:migrate
prisma/migrations-postgres   Postgres, prisma migrate deploy (runs in the build)
```

**After changing the schema, run both `npm run db:migrate` and
`npm run db:migrate:pg -- <name>`, before committing.** The Postgres side is a
frozen baseline (`0_init`) plus incremental migrations. `scripts/pg-migration.mjs`
produces each increment by diffing the schema at git `HEAD` against the working
copy with the provider forced to `postgresql`, so it needs no database and can't
touch what production has already applied.

---

## Security boundaries

Detail in [SECURITY.md](SECURITY.md). The structural points:

- **`src/lib/accounts.ts` is the only door** to stored OAuth tokens.
  `encryptTokenFields` on the way in, `withTokens` on the way out. One place
  where plaintext exists, and nowhere for an unencrypted write to slip through.
- **`server-only`** marks every module that must never reach the client bundle.
  `src/lib/password.ts` is deliberately *not* marked, so CLI scripts can hash
  without importing request-scoped session code.
- **Rate limiting is database-backed** (`src/lib/rate-limit.ts`). In-memory
  counters are worthless on serverless — each instance keeps its own, so the
  real limit becomes limit × instances.

---

## Trade-offs taken knowingly

| Decision | Cost | Why anyway |
|---|---|---|
| Heuristic scorer, not a learned model | A learned model would likely score better | It's explainable, instant, free, and works offline. Users act on *why* a post is weak, which a black box can't tell them |
| SQLite locally | Two migration histories to maintain | `npm install && npm run dev` with no Docker and no cloud account is worth real friction elsewhere |
| Sandbox connectors | Extra branch in every publish path | The product is fully demonstrable with zero platform approvals, which is most of the first-run experience |
| No background token refresh | Users reconnect when tokens lapse | Each platform's refresh semantics differ enough that doing it properly is its own project |
