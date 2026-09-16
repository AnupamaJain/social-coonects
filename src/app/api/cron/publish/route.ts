import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { publishDuePosts } from "@/lib/posts";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function handle(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await publishDuePosts();
  return NextResponse.json({
    ok: true,
    processed: results.length,
    results,
    at: new Date().toISOString(),
  });
}

export const GET = handle;
export const POST = handle;
