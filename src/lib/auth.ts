import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { hashPassword } from "./password";
import { slugify } from "./utils";

const COOKIE = "pw_session";
const SESSION_DAYS = 30;

export { hashPassword, verifyPassword } from "./password";

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const session = await db.session.create({ data: { userId, expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) await db.session.delete({ where: { id } }).catch(() => {});
  jar.delete(COOKIE);
}

/** Cached per request so layout + page don't hit the DB twice. */
export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;

  const session = await db.session.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id } }).catch(() => {});
    return null;
  }
  return session.user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** The active workspace. Everyone gets one at signup; agencies can add more. */
export const requireWorkspace = cache(async () => {
  const user = await requireUser();
  const jar = await cookies();
  const preferred = jar.get("pw_workspace")?.value;

  const workspaces = await db.workspace.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
  });

  const workspace =
    workspaces.find((w) => w.id === preferred) ?? workspaces[0];
  if (!workspace) redirect("/onboarding");

  return { user, workspace, workspaces };
});

/**
 * Creates the user plus a ready-to-use workspace: a default voice profile and
 * a sensible posting cadence, so the dashboard is never an empty shell.
 */
export async function registerUser(input: {
  email: string;
  password: string;
  name?: string;
  workspaceName?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new Error("An account with that email already exists.");

  const passwordHash = await hashPassword(input.password);
  const user = await db.user.create({
    data: { email, passwordHash, name: input.name?.trim() || null },
  });

  const wsName = input.workspaceName?.trim() || input.name?.trim() || "My brand";
  let slug = slugify(wsName);
  if (await db.workspace.findUnique({ where: { slug } })) {
    slug = `${slug}-${user.id.slice(-5)}`;
  }

  const workspace = await db.workspace.create({
    data: {
      ownerId: user.id,
      name: wsName,
      slug,
      timezone: "UTC",
      voiceProfiles: {
        create: {
          name: "Default voice",
          isDefault: true,
          summary:
            "No samples yet. Add 5-10 of your best posts and the Voice Fingerprint will learn how you actually write.",
        },
      },
    },
  });

  // Weekday queue: 9:15am and 4:30pm, the two slots most brands actually keep.
  await db.queueSlot.createMany({
    data: [1, 2, 3, 4, 5].flatMap((dayOfWeek) => [
      { workspaceId: workspace.id, dayOfWeek, hour: 9, minute: 15 },
      { workspaceId: workspace.id, dayOfWeek, hour: 16, minute: 30 },
    ]),
  });

  return { user, workspace };
}
