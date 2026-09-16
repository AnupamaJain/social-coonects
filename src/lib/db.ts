import { PrismaClient } from "@/generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const isPostgres = url.startsWith("postgres");

function createClient() {
  // Prisma 7 requires a driver adapter. Picking it from the URL means the same
  // build runs on local SQLite and on hosted Postgres with no code change.
  const adapter = isPostgres
    ? new PrismaPg({ connectionString: url })
    : new PrismaBetterSqlite3({ url });

  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** JSON columns are stored as TEXT so one schema serves SQLite and Postgres. */
export function readJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export const writeJson = (value: unknown) => JSON.stringify(value ?? null);
