import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { refreshMetrics } from "@/lib/posts";
import { trainPredictor } from "@/lib/predictor";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function handle(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const refreshed = await refreshMetrics();

  // Refit each workspace's predictor against the numbers we just pulled.
  const workspaces = await db.workspace.findMany({ select: { id: true } });
  const trained = [];
  for (const w of workspaces) {
    trained.push({ workspaceId: w.id, ...(await trainPredictor(w.id)) });
  }

  return NextResponse.json({ ok: true, refreshed, trained, at: new Date().toISOString() });
}

export const GET = handle;
export const POST = handle;
