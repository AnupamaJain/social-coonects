import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const body = z.object({
  name: z.string().trim().min(2).max(80),
  role: z.string().trim().min(2).max(80),
  handle: z.string().trim().max(60).optional().or(z.literal("")),
  quote: z.string().trim().min(40).max(600),
  rating: z.number().int().min(1).max(5),
});

/** Public, unauthenticated, so it is throttled hard and everything lands unapproved. */
export async function POST(req: Request) {
  const limited = await rateLimit(`testimonial:${clientIp(req)}`, 3, 3600);
  if (!limited.ok) return tooManyRequests(limited);

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill in every field (quotes need at least 40 characters)." }, { status: 400 });
  }
  const { handle, ...rest } = parsed.data;
  await db.testimonial.create({ data: { ...rest, handle: handle || null, approved: false } });
  return NextResponse.json({ ok: true }, { status: 201 });
}
