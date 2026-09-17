import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * SQLite and Postgres need different migration SQL, so each gets its own
 * history and the active one is chosen from DATABASE_URL:
 *
 *   prisma/migrations           SQLite, local development (`npm run db:migrate`)
 *   prisma/migrations-postgres  Postgres, production (`prisma migrate deploy`)
 *
 * After changing schema.prisma, regenerate the Postgres history with
 * `npm run db:migrate:pg` so the two stay in step.
 */
const isPostgres = (process.env.DATABASE_URL ?? "").startsWith("postgres");

/**
 * Migrations must not run through a connection pooler.
 *
 * Neon (and Supabase) hand out a pgbouncer endpoint as DATABASE_URL, which is
 * right for serverless request handling but breaks DDL: pgbouncer's transaction
 * mode doesn't support the session-level advisory locks and prepared statements
 * Prisma Migrate relies on. The runtime adapter in src/lib/db.ts keeps using the
 * pooled URL; only the CLI is pointed at the direct one.
 */
const migrationUrl =
  process.env.DIRECT_DATABASE_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL ??
  "file:./dev.db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: isPostgres ? "prisma/migrations-postgres" : "prisma/migrations",
  },
  datasource: { url: migrationUrl },
});
