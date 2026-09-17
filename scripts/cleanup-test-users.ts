/**
 * Removes accounts created by automated smoke tests (email starting with "test-").
 *
 *   DATABASE_URL="<direct postgres url>" npx tsx scripts/cleanup-test-users.ts
 *
 * Talks to Postgres through `pg` rather than Prisma on purpose: the generated
 * Prisma client is built for whichever provider the local schema is pointing at
 * (SQLite during development), so it can't be used against production without
 * flipping the provider and regenerating.
 *
 * Deliberately narrow — it only ever matches the smoke-test email prefix, so it
 * cannot take a real account with it. Cascades handle the owned rows.
 */
import "dotenv/config";
import { Client } from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString?.startsWith("postgres")) {
    throw new Error("Set DATABASE_URL to a direct (unpooled) Postgres URL.");
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    const found = await client.query<{ email: string }>(
      `SELECT email FROM "User" WHERE email LIKE 'test-%'`,
    );
    if (!found.rowCount) {
      console.log("No test accounts found.");
      return;
    }
    console.log("Removing:", found.rows.map((r) => r.email).join(", "));

    const del = await client.query(`DELETE FROM "User" WHERE email LIKE 'test-%'`);
    const total = await client.query<{ count: string }>(`SELECT COUNT(*) FROM "User"`);
    console.log(`Removed ${del.rowCount}. Remaining users: ${total.rows[0].count}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
