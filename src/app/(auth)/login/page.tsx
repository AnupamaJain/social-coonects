import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = {
  title: "Log in",
  // Auth pages are not landing pages; keep them out of the index.
  robots: { index: false, follow: true },
};

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/app");

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-sm text-muted">
        Log in to your queue.{" "}
        <Link href="/signup" className="font-medium text-clay-500 hover:underline">
          Need an account?
        </Link>
      </p>
      <AuthForm mode="login" />
    </div>
  );
}
