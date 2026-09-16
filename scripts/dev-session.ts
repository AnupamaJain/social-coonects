/** Prints a session cookie value for a user — handy for local smoke tests. */
import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  const email = process.argv[2] ?? "demo@postwave.app";
  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No user ${email}. Run: npm run db:seed`);
  const session = await db.session.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + 86_400_000) },
  });
  console.log(session.id);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
