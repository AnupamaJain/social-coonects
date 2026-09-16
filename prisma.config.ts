import "dotenv/config";
import { defineConfig, env } from "prisma/config";

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

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: isPostgres ? "prisma/migrations-postgres" : "prisma/migrations",
  },
  datasource: { url: env("DATABASE_URL") },
});
