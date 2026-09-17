import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = {
  title: "Start free",
  // Auth pages are not landing pages; keep them out of the index.
  robots: { index: true, follow: true },
};

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/app");

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Start free</h1>
      <p className="mt-2 text-sm text-muted">
        No card required.{" "}
        <Link href="/login" className="font-medium text-clay-500 hover:underline">
          Already have an account?
        </Link>
      </p>
      <AuthForm mode="signup" />
    </div>
  );
}
