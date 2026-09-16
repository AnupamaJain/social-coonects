# Operations

Running it once it's live.

---

## Health

```bash
curl https://your-app.vercel.app/api/health
```

`200` with `"status": "ok"`, or `503` if the database is unreachable. Point
your uptime monitor at this, and alert on non-200.

The `checks` block is the fastest way to answer "why isn't X working":

| Field | Bad value | Means |
|---|---|---|
| `database` | `unreachable` | `DATABASE_URL` wrong, or the database is down |
| `encryption` | `development-key` | `ENCRYPTION_KEY` unset — **tokens are being written with a public key** |
| `scheduling` | `unsecured` | `CRON_SECRET` unset — cron routes reject everything in production |
| `ai` | `offline-fallback` | No AI key; generation is using the template writer |
| `billing` | `disabled` | Stripe not configured; nobody can upgrade |
| `platforms.*` | `sandbox` | No OAuth app for that platform; it won't publish anywhere real |

---

## Runbook

### Scheduled posts aren't going out

1. `curl -H "Authorization: Bearer $CRON_SECRET" https://your-app/api/cron/publish`
   — a `401` means the secret doesn't match what Vercel is sending.
2. Check the project's **Cron Jobs** tab. If empty, `vercel.ts` didn't register
   — redeploy.
3. On Vercel Hobby, cron runs **once a day**. That is not a scheduler. Upgrade,
   or drive the endpoint externally.
4. Check `Post.status`. Stuck at `publishing` means a crash mid-publish; stuck
   at `scheduled` with a past `scheduledAt` means cron never fired.

### A post failed to publish

`PostTarget.error` holds the provider's message verbatim. Common causes:

- **401/403** — token expired or scope revoked. The user reconnects the account.
- **Instagram "requires an image"** — expected; Instagram won't accept
  text-only. There's no upload UI yet.
- **LinkedIn 422** — usually a duplicate: LinkedIn rejects the same text posted
  twice in quick succession.

Partial failure is survivable by design: one platform failing leaves the others
published, and the post is marked `published` if any target succeeded.

### Analytics are all zeros

- Sandbox accounts generate plausible numbers — real zeros mean live accounts.
- LinkedIn impressions need the Marketing Developer Platform tier. Likes and
  comments still arrive. This is a platform limit, not a bug.
- Run `/api/cron/metrics` by hand and read the response.

### Someone's scores dropped after a retrain

Expected and usually correct: the weights moved toward what *their* audience
rewards. Check the analytics page — "What your audience rewards" shows the
deltas from the defaults, and the calibration chart shows whether the predictor
is tracking reality.

If the calibration chart is pure noise, the predictor isn't learning anything
useful for that workspace. With fewer than ~20 posts that's normal.

### Stripe upgrade didn't apply

1. Stripe Dashboard → Webhooks → check for delivery failures.
2. A `400` from our endpoint is a signature mismatch — `STRIPE_WEBHOOK_SECRET`
   doesn't match the endpoint's signing secret.
3. `{"duplicate": true}` means we'd already processed that event id; the plan
   should already be correct.
4. Last resort: set `User.plan` directly and investigate after.

---

## Maintenance

**`RateLimit`** rows are cleaned opportunistically (1% of requests delete
expired rows). If the table grows anyway:

```sql
DELETE FROM "RateLimit" WHERE "expiresAt" < NOW();
```

**`PostMetric`** is append-only — one row per target per refresh, every 6
hours. It's the fastest-growing table. Charts read only the newest row per
target, so old rows can be thinned:

```sql
-- keep the latest row per target, plus anything from the last 30 days
DELETE FROM "PostMetric" m
WHERE m."fetchedAt" < NOW() - INTERVAL '30 days'
  AND m.id NOT IN (
    SELECT DISTINCT ON ("postTargetId") id
    FROM "PostMetric" ORDER BY "postTargetId", "fetchedAt" DESC
  );
```

**`ProcessedWebhook`** grows one row per Stripe event. Rows older than 30 days
are safe to delete — Stripe won't retry that long.

**`Session`** rows are deleted when read after expiry, so inactive users leave
rows behind. Periodic cleanup: `DELETE FROM "Session" WHERE "expiresAt" < NOW();`

---

## Cost control

The only variable cost is AI generation. It's capped per user per day by plan
(`PLANS[*].maxAiRunsPerDay` in `src/lib/billing.ts`), enforced server-side.

To reduce spend:

- Lower `maxAiRunsPerDay`.
- Set `AI_MODEL` to a cheaper model — the writer prompt doesn't depend on a
  specific one.
- Route through AI Gateway and set a budget there.

Scoring, Voice Match and the predictor cost nothing — they're pure computation.

---

## Backups

The database is the entire product state. Whatever Postgres you chose, turn on
point-in-time recovery.

Back up `ENCRYPTION_KEY` separately, somewhere that survives losing your Vercel
account. A database backup without that key has unreadable OAuth tokens in it.

---

## Scaling notes

Roughly in the order they'll bite:

1. **`publishDuePosts` takes 25 posts per run, sequentially.** At five-minute
   cron that's 300/hour. Past that, batch by workspace and run them in parallel.
2. **`refreshMetrics` fetches up to 200 targets per run, sequentially.** Each is
   an external API call. This is the first thing to make concurrent.
3. **`trainPredictor` runs per workspace on every metrics cron.** It's ~600
   gradient epochs over a few hundred rows — fine for hundreds of workspaces,
   not for tens of thousands. Move to a queue when it hurts.
4. **Rate limit rows** are one upsert per limited request. Under real load,
   move to Redis.
