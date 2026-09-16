<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Postwave

A social media scheduler whose differentiators are the Voice Fingerprint,
the Pre-flight Predictor, and the Autopilot Queue. Read
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing any of the three —
several decisions there look arbitrary and aren't.

## Before you push

```bash
npm run check    # typecheck + lint + tests
```

## Things that will bite you

- **`src/lib/scoring.ts` and `src/lib/voice-stats.ts` must stay pure.** No
  database, no model calls, no `server-only`. They run on every keystroke in the
  composer and must work with no AI key configured.
- **The pre-flight score is absolute, not a percentile.** Training may change
  which signals carry weight, never the overall level. The reasoning, and the
  bug that produced the rule, are in ARCHITECTURE.md.
- **Never read `SocialAccount.accessToken` directly.** Go through
  `withTokens` / `encryptTokenFields` in `src/lib/accounts.ts` — tokens are
  encrypted at rest and that is the only place they are plaintext.
- **After editing `prisma/schema.prisma`, run both `npm run db:migrate` and
  `npm run db:migrate:pg`.** SQLite and Postgres keep separate histories.
- **Autopilot drafts land in `needs_approval`, never `scheduled`.** Nothing
  publishes without a human. That's a product guarantee.
- **Responsive grids need a base `grid-cols-1`.** Without it the implicit column
  is `auto`-sized and wide children scroll the page sideways on mobile.
