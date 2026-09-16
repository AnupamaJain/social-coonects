#!/usr/bin/env node
/**
 * Prisma pins the datasource provider at schema level, but this app is meant to
 * run on SQLite locally and Postgres in production. So before generate/build we
 * point the schema at whichever DATABASE_URL is actually set.
 *
 * The runtime driver adapter is chosen the same way in src/lib/db.ts.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SCHEMA = new URL("../prisma/schema.prisma", import.meta.url);
const url = process.env.DATABASE_URL ?? "file:./dev.db";
const wanted = url.startsWith("postgres") ? "postgresql" : "sqlite";

const current = readFileSync(SCHEMA, "utf8");
// Only the datasource provider matches — the generator's is "prisma-client-js".
const next = current.replace(/provider = "(?:sqlite|postgresql)"/, `provider = "${wanted}"`);

if (current === next) {
  console.log(`[db-provider] already ${wanted}`);
} else {
  writeFileSync(SCHEMA, next);
  console.log(`[db-provider] schema set to ${wanted}`);
}
