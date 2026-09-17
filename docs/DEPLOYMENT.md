# Deployment

Target: Vercel + a managed Postgres. Nothing here is Vercel-specific except the
cron registration — any Node host works if you schedule the two cron endpoints
yourself.

---

## Before you start

Generate the two production secrets:

```bash
openssl rand -base64 32   # ENCRYPTION_KEY — 32 bytes, base64. The app refuses to boot without it in production.
openssl rand -hex 32      # CRON_SECRET    — any long random string.
```

Keep `ENCRYPTION_KEY` somewhere you will not lose it. It decrypts every stored
OAuth token; losing it means every user reconnects every account.

---

## 1. Provision

```bash
npm i -g vercel
vercel link
```

Add Postgres. The Neon integration sets `DATABASE_URL` on the project for you:

```bash
vercel integration add neon
```

Any Postgres connection string works — Supabase, RDS, a container. Only the URL
matters.

> **Then delete `.env.local`.** `vercel integration add` pulls the new
> variables into `.env.local` as a convenience — which means your *local* dev
> server is now pointed at the *production* database, with a Prisma client
> generated for SQLite. Nothing in the repo asked for that. Remove the file
> (it's gitignored) and local development goes back to `prisma/dev.db`.
>
> ```bash
> rm .env.local
> ```

> **Poolers and migrations.** Neon and Supabase both set `DATABASE_URL` to a
> pgbouncer endpoint. That's correct for serverless request handling, but
> migrations can't run through it — pgbouncer's transaction mode breaks the
> session-level locks Prisma Migrate needs. `prisma.config.ts` automatically
> prefers `DATABASE_URL_UNPOOLED` / `POSTGRES_URL_NON_POOLING` for the CLI,
> both of which the Neon integration sets for you. On a provider that sets
> neither, point `DIRECT_DATABASE_URL` at a direct connection yourself.

## 2. Configure

```bash
vercel env add ENCRYPTION_KEY production
vercel env add CRON_SECRET production
vercel env add APP_URL production            # https://your-app.vercel.app

# Optional, but this is what you're selling
vercel env add AI_GATEWAY_API_KEY production

# Optional — billing
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_PRICE_ID production
vercel env add STRIPE_WEBHOOK_SECRET production

# Optional — one pair per platform you want to publish to for real
vercel env add LINKEDIN_CLIENT_ID production
vercel env add LINKEDIN_CLIENT_SECRET production
```

Mirror anything you want working on preview deployments with
`vercel env add <NAME> preview`. **Preview and production should not share a
database** — preview branches run migrations.

## 3. Ship

```bash
vercel --prod
```

The build runs:

```
node scripts/db-provider.mjs   # schema provider -> postgresql
prisma generate
prisma migrate deploy          # applies prisma/migrations-postgres
next build
```

`migrate deploy` never drops data and never generates SQL on the fly. If a
migration doesn't apply, the build fails rather than half-migrating.

---

## 4. After the first deploy

Easy to forget, and each one silently breaks a feature.

### Verify the deploy

```bash
curl https://your-app.vercel.app/api/health
```

Check the `checks` block:

```jsonc
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "encryption": "configured",   // NOT "development-key"
    "scheduling": "secured",      // NOT "unsecured"
    "ai": "configured",
    "billing": "configured"
  }
}
```

`"encryption": "development-key"` in production means `ENCRYPTION_KEY` is
missing and tokens are being written with a key that is public in this
repository. Fix it before anyone connects an account.

### Stripe

1. Dashboard → Developers → Webhooks → add endpoint
   `https://your-app.vercel.app/api/stripe/webhook`.
2. Subscribe to `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`.
3. Copy the signing secret into `STRIPE_WEBHOOK_SECRET` and redeploy.
4. Switch the keys from test to live when you're ready to take real money.

### OAuth redirect URLs

For every platform you configured, add to its developer app:

```
https://your-app.vercel.app/api/oauth/{platform}/callback
```

`{platform}` is one of `x`, `linkedin`, `instagram`, `facebook`, `threads`,
`mastodon`. The in-app Accounts page lists these, so you can copy them from
there.

### Cron

**Vercel Hobby caps cron at one run per day**, and a deploy is *rejected
outright* if `vercel.ts` asks for more. So the defaults are Hobby-compatible and
the real scheduling runs elsewhere:

| Plan | What drives scheduling | Publishing interval |
|---|---|---|
| Hobby (default) | `.github/workflows/scheduler.yml` | every 5 minutes |
| Pro | Vercel Cron, with `CRON_FREQUENT=1` set on the project | every 5 minutes |

### On Hobby — GitHub Actions

Add two repository secrets under **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `APP_URL` | `https://your-app.vercel.app` |
| `CRON_SECRET` | the same value set on the Vercel project |

The workflow then runs every 5 minutes. Trigger it by hand once from the
**Actions** tab (**Scheduler → Run workflow**) to confirm the secrets are right —
a wrong `CRON_SECRET` shows up as a `401` in the step output.

GitHub's scheduler is best-effort and can lag several minutes under load, so a
post may go out slightly after its slot. Fine for social scheduling.

### On Pro — Vercel Cron

```bash
vercel env add CRON_FREQUENT production   # value: 1
vercel --prod
```

Then delete `.github/workflows/scheduler.yml`. Confirm both jobs appear under the
project's **Cron Jobs** tab. Vercel sends `Authorization: Bearer $CRON_SECRET`
automatically once the variable exists on the project.

Running both at once is harmless — `publishDuePosts` only picks up posts whose
scheduled time has already passed, so nothing publishes twice.

---

## Deploying somewhere else

Nothing is tied to Vercel except cron registration:

```bash
npm ci
npm run build       # includes prisma migrate deploy
npm start           # next start, defaults to :3000
```

Set every production variable in the environment, then schedule the two
endpoints however your platform does it:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/publish
curl -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/metrics
```

Run behind TLS. `Strict-Transport-Security` is sent on every response and
several cookies are `Secure` in production, so plain HTTP will break login.

---

## Rolling back

```bash
vercel rollback              # previous deployment
vercel ls                    # or pick a specific one
```

Application rollback does **not** roll back migrations. Since migrations here
are additive (new tables and columns), an older build tolerates a newer schema.
If you ever ship a destructive migration, that stops being true — restore the
database from a snapshot instead.

---

## Changing the schema after launch

1. Edit `prisma/schema.prisma`.
2. `npm run db:migrate` — creates the SQLite migration for local development.
3. `npm run db:migrate:pg` — **regenerates** the Postgres baseline.

Step 3 is a squashed baseline and only safe while production can be recreated.
Before your first real customer:

- freeze `prisma/migrations-postgres/0_init`,
- add incremental migrations next to it,
- stop running `db:migrate:pg`.

Background in
[ARCHITECTURE.md](ARCHITECTURE.md#two-databases-one-schema).
