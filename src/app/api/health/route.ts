import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aiEnabled } from "@/lib/ai/model";
import { stripeEnabled } from "@/lib/billing";
import { PLATFORM_IDS, hasLiveCredentials } from "@/lib/platforms/registry";

export const dynamic = "force-dynamic";

/**
 * Liveness + readiness. Reports which optional subsystems are configured, so a
 * deploy can be verified without logging in and clicking through.
 */
export async function GET() {
  const startedAt = Date.now();

  let database: "ok" | "unreachable" = "ok";
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    database = "unreachable";
  }

  const body = {
    status: database === "ok" ? "ok" : "degraded",
    uptimeMs: Math.round(process.uptime() * 1000),
    latencyMs: Date.now() - startedAt,
    checks: {
      database,
      ai: aiEnabled() ? "configured" : "offline-fallback",
      billing: stripeEnabled() ? "configured" : "disabled",
      scheduling: process.env.CRON_SECRET ? "secured" : "unsecured",
      encryption: process.env.ENCRYPTION_KEY ? "configured" : "development-key",
      platforms: Object.fromEntries(
        PLATFORM_IDS.map((id) => [id, hasLiveCredentials(id) ? "live" : "sandbox"]),
      ),
    },
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
  };

  return NextResponse.json(body, { status: database === "ok" ? 200 : 503 });
}
