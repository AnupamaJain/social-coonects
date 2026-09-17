#!/usr/bin/env node
/**
 * Writes an *incremental* Postgres migration for whatever changed in
 * prisma/schema.prisma since the last commit.
 *
 *   npm run db:migrate:pg -- add_testimonials
 *
 * Production already has a database with the baseline applied, so the old
 * "regenerate the squashed baseline" approach would leave new tables silently
 * missing: `prisma migrate deploy` never re-runs a migration it has recorded.
 * This diffs the committed schema against the working copy instead, both with
 * the provider forced to postgresql, and needs no database to run.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";

const name = (process.argv[2] ?? "").replace(/[^a-z0-9_]/gi, "_").toLowerCase();
if (!name) {
  console.error("Usage: npm run db:migrate:pg -- <migration_name>");
  process.exit(1);
}

const pg = (schema) => schema.replace(/provider = "(?:sqlite|postgresql)"/, 'provider = "postgresql"');
const env = { ...process.env, DATABASE_URL: "postgres://placeholder/db" };

let previous;
try {
  previous = execFileSync("git", ["show", "HEAD:prisma/schema.prisma"], { encoding: "utf8" });
} catch {
  console.error("Could not read the committed schema from git HEAD.");
  process.exit(1);
}

writeFileSync(".pg-from.prisma", pg(previous));
writeFileSync(".pg-to.prisma", pg(readFileSync("prisma/schema.prisma", "utf8")));

try {
  const sql = execFileSync(
    "npx",
    ["prisma", "migrate", "diff", "--from-schema", ".pg-from.prisma", "--to-schema", ".pg-to.prisma", "--script"],
    { env, encoding: "utf8" },
  );
  if (!/\S/.test(sql.replace(/^--.*$/gm, ""))) {
    console.log("[pg-migration] no schema changes since HEAD — nothing written");
  } else {
    const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    const dir = `prisma/migrations-postgres/${stamp}_${name}`;
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/migration.sql`, sql);
    console.log(`[pg-migration] wrote ${dir}/migration.sql`);
    console.log(sql.trim().split("\n").filter((l) => /^(CREATE|ALTER|DROP)/.test(l)).map((l) => "  " + l.slice(0, 80)).join("\n"));
  }
} finally {
  rmSync(".pg-from.prisma", { force: true });
  rmSync(".pg-to.prisma", { force: true });
}
