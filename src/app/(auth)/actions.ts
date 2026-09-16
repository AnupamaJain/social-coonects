"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import {
  createSession, destroySession, registerUser, verifyPassword,
} from "@/lib/auth";

export interface AuthState {
  error?: string;
}

const credentials = z.object({
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(10, "Use at least 10 characters.")
    .max(200, "That password is too long.")
    .refine((v) => !COMMON_PASSWORDS.has(v.toLowerCase()), "That password is too common."),
});

// Not a substitute for a breach corpus, but it stops the handful of passwords
// that show up in every credential-stuffing list.
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890",
  "qwerty123", "letmein123", "welcome123", "admin123", "iloveyou1", "abc123456",
]);

/** Server actions are the auth surface, so they carry their own throttle. */
async function throttle(scope: string, limit: number, windowSeconds: number) {
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0].trim() ??
    hdrs.get("x-real-ip") ??
    "unknown";
  return rateLimit(`${scope}:${ip}`, limit, windowSeconds);
}

export async function signupAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const limited = await throttle("signup", 5, 3600);
  if (!limited.ok) {
    return { error: "Too many sign-up attempts. Try again in a little while." };
  }

  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const { user } = await registerUser({
      ...parsed.data,
      name: (formData.get("name") as string) || undefined,
      workspaceName: (formData.get("workspace") as string) || undefined,
    });
    await createSession(user.id);
  } catch (err) {
    return { error: (err as Error).message };
  }

  redirect("/app?welcome=1");
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const limited = await throttle("login", 10, 900);
  if (!limited.ok) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await db.user.findUnique({ where: { email } });
  // Same message either way so the form can't be used to enumerate accounts.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "That email and password don't match." };
  }

  await createSession(user.id);
  redirect("/app");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
