# Security

What is protected, how, and what is still open. Written to be honest rather
than reassuring — read [Known gaps](#known-gaps) before you take real
customers.

---

## Authentication

- Passwords hashed with **bcrypt**, cost factor 10.
- Signup requires 10+ characters and rejects a small list of the passwords that
  appear in every credential-stuffing dump. Not a substitute for a breach
  corpus; it stops the obvious cases.
- Sessions are **random ids stored in the database**, not JWTs — so revoking a
  session actually revokes it. 30-day absolute expiry, checked on every request,
  and expired rows are deleted on read.
- Session cookie is `httpOnly`, `sameSite=lax`, and `secure` in production.
- Login returns the **same error** for an unknown email and a wrong password, so
  the form can't enumerate accounts.

## Rate limiting

`src/lib/rate-limit.ts` — fixed window, stored in the database.

| Surface | Limit |
|---|---|
| Login | 10 per IP per 15 min |
| Signup | 5 per IP per hour |
| AI generation / rewrite | The plan's daily allowance, per user |
| Live scoring | 600 per user per minute |

Database-backed rather than in-memory on purpose: each serverless instance
would keep its own counters, making the effective limit `limit × instances`.

The AI limit is enforced server-side against the user's plan, not by hiding a
button — those calls cost money.

## Data at rest

OAuth access and refresh tokens are the most dangerous thing stored here: a
leaked row lets someone post as your customers.

- Encrypted with **AES-256-GCM** before they reach the database
  (`src/lib/crypto.ts`), versioned with an `enc:v1:` prefix.
- `ENCRYPTION_KEY` must be 32 bytes, base64. **The app throws on boot in
  production if it's missing** rather than silently falling back.
- `src/lib/accounts.ts` is the only door: `encryptTokenFields` in,
  `withTokens` out. One place where plaintext exists.
- A failed decrypt returns `null`, so a wrong key or tampered row makes the
  account read as disconnected instead of crashing a page.

Losing `ENCRYPTION_KEY` is unrecoverable by design — every user reconnects
every account.

## Transport and browser

Set for every response in `next.config.ts`:

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | camera, microphone, geolocation all denied |

`/app/*` and `/api/*` additionally send `Cache-Control: no-store`, so no proxy
or browser caches an authenticated response.

`X-Powered-By` is off.

## OAuth

- **CSRF**: a random `state` is generated per attempt, stored in a short-lived
  `httpOnly` cookie, and compared on callback. Mismatch aborts.
- **PKCE** for X, which requires it. The verifier lives in its own cookie with
  the same 10-minute lifetime.
- State and verifier cookies are deleted on callback whether it succeeds or
  fails.
- The callback re-checks the user's plan account limit — the limit is not
  enforced only in the UI.

## Billing

- Webhook signatures verified against `STRIPE_WEBHOOK_SECRET` using the **raw**
  body.
- Events are **deduplicated by id** (`ProcessedWebhook`). Stripe delivers at
  least once; this makes handling exactly once.
- Plan changes come from webhook events, never from the browser. A user cannot
  upgrade themselves by calling an endpoint.

## Cron endpoints

`/api/cron/publish` and `/api/cron/metrics` can publish on users' behalf, so
they authenticate with `Authorization: Bearer $CRON_SECRET`.

If `CRON_SECRET` is unset they are open in development and **closed in
production**. A forgotten secret should break scheduling loudly, not leave a
public publish endpoint on the internet.

## Tenancy

Every query under `src/app/app/` is scoped to the workspace from
`requireWorkspace()`, which resolves from the session and verifies ownership.
Workspace switching validates that the target belongs to the current user.

## Input validation

API routes parse bodies with **zod**, with explicit length caps on every string
that reaches a model prompt or the database. Server actions validate before any
write. JSON columns go through `readJson`, which returns a fallback rather than
throwing on malformed data.

---

## Known gaps

Genuinely open. Address these before scaling up:

1. **No CSP nonces.** `script-src` allows `'unsafe-inline'` because Next's
   bootstrap needs it. Adding nonces via middleware is the correct fix.
2. **No email verification or password reset.** Addresses are unverified, and a
   forgotten password means an admin has to intervene.
3. **No 2FA.**
4. **No audit log.** Publishes and account connections aren't recorded for
   later review — an agency handling client accounts will want this.
5. **No background token refresh.** Tokens are stored with expiry but not
   refreshed; users reconnect when one lapses.
6. **Rate limits are per-IP for auth.** A distributed attempt spreads across
   addresses. A managed WAF is the answer at scale.
7. **No key rotation procedure.** Rotating `ENCRYPTION_KEY` currently requires
   a migration that re-encrypts every token.
8. **Session cookies aren't rotated on privilege change.** A session id is
   stable for its whole 30 days.

## Reporting a vulnerability

Don't open a public issue. Email the maintainer with steps to reproduce.
