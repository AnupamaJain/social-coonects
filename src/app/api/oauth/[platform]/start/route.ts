import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireWorkspace } from "@/lib/auth";
import { buildAuthorizeUrl, createPkcePair } from "@/lib/platforms/oauth";
import { getPlatform, hasLiveCredentials, isPlatformId } from "@/lib/platforms/registry";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  await requireWorkspace();

  if (!isPlatformId(platform)) {
    return NextResponse.json({ error: "Unknown platform" }, { status: 404 });
  }
  if (!hasLiveCredentials(platform)) {
    const def = getPlatform(platform);
    return NextResponse.json(
      {
        error: `No OAuth app configured for ${def.name}. Set ${def.oauth?.clientIdEnv} and ${def.oauth?.clientSecretEnv}, or connect a sandbox account instead.`,
      },
      { status: 400 },
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  const pkce = getPlatform(platform).oauth?.usePkce ? createPkcePair() : null;

  const jar = await cookies();
  // Short-lived: the round trip to the provider and back, nothing more.
  const opts = {
    httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  };
  jar.set(`pw_oauth_state_${platform}`, state, opts);
  if (pkce) jar.set(`pw_oauth_verifier_${platform}`, pkce.verifier, opts);

  return NextResponse.redirect(
    buildAuthorizeUrl(platform, state, pkce?.challenge),
  );
}
