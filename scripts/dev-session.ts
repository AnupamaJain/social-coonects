/**
 * Prints a session cookie value for a user — handy for local smoke tests.
 *
 *   npx tsx scripts/dev-session.ts [email]
 *
 * This mints a session with no password. It needs direct database access, so it
 * is not a remote risk, but it has no business running against production —
 * hence the guards, which run before the database client is even constructed.
 */
import "dotenv/config";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("dev-session is a local development tool and refuses to run in production.");
  }
  if ((process.env.DATABASE_URL ?? "").startsWith("postgres")) {
    throw new Error("dev-session refuses to run against Postgres. It is for local SQLite only.");
  }

  // Imported lazily so the guards above fire before Prisma initialises.
  const { db } = await import("../src/lib/db");

  try {
    const email = process.argv[2] ?? "demo@sixfold.app";
    const user = await db.user.findUnique({ where: { email } });
    if (!user) throw new Error(`No user ${email}. Run: npm run db:seed`);

    const session = await db.session.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() + 86_400_000) },
    });
    console.log(session.id);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
