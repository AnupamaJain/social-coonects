import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireWorkspace } from "@/lib/auth";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { ACCEPTED_TYPES, MAX_VIDEO_BYTES } from "@/lib/media";

export const maxDuration = 60;

/**
 * Client-direct upload to Vercel Blob.
 *
 * The browser sends the file straight to Blob; this route only signs the
 * request. That keeps a 300 MB video off the function entirely, which matters
 * because uploads are the one thing here that would blow a request limit.
 *
 * Blob is optional. Without BLOB_READ_WRITE_TOKEN the composer falls back to
 * pasting a public URL, which costs nothing and needs no provisioning —
 * Instagram fetches media by URL regardless of where it is hosted.
 */
export async function POST(req: Request) {
  const { user } = await requireWorkspace();

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "File uploads need a Vercel Blob store. Paste a public media URL instead, or run `vercel blob store add` and redeploy.",
      },
      { status: 501 },
    );
  }

  const limited = await rateLimit(`upload:${user.id}`, 40, 3600);
  if (!limited.ok) return tooManyRequests(limited);

  try {
    const body = (await req.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [...ACCEPTED_TYPES],
        maximumSizeInBytes: MAX_VIDEO_BYTES,
        addRandomSuffix: true,
        // Instagram and Threads fetch the file themselves, so it has to be public.
        tokenPayload: JSON.stringify({ userId: user.id }),
      }),
      onUploadCompleted: async () => {
        // Nothing to do — the client attaches the returned URL to the draft.
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
