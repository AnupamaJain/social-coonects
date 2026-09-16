#!/usr/bin/env node
/**
 * Regenerates the Postgres baseline from the current schema.
 *
 * Postgres deploys run `prisma migrate deploy` against prisma/migrations-postgres,
 * which this script keeps in step with schema.prisma. It is a single squashed
 * baseline: fine while the product is pre-launch and the production database can
 * be recreated. Once you have real customer data, stop squashing — add an
 * incremental migration alongside it instead.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = "prisma/migrations-postgres/0_init";
const env = { ...process.env, DATABASE_URL: "postgres://placeholder/db" };

execFileSync("node", ["scripts/db-provider.mjs"], { env, stdio: "inherit" });

try {
  const sql = execFileSync(
    "npx",
    ["prisma", "migrate", "diff", "--from-empty", "--to-schema", "prisma/schema.prisma", "--script"],
    { env, encoding: "utf8" },
  );
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/migration.sql`, sql);
  writeFileSync("prisma/migrations-postgres/migration_lock.toml", 'provider = "postgresql"\n');
  const tables = (sql.match(/CREATE TABLE/g) ?? []).length;
  console.log(`[sync-pg-migration] wrote ${OUT}/migration.sql (${tables} tables)`);
} finally {
  // Always restore whatever the local DATABASE_URL implies.
  execFileSync("node", ["scripts/db-provider.mjs"], { stdio: "inherit" });
}
