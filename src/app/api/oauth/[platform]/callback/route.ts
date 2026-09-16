import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireWorkspace } from "@/lib/auth";
import { db, writeJson } from "@/lib/db";
import { encryptTokenFields } from "@/lib/accounts";
import { planFor } from "@/lib/billing";
import {
  appUrl, exchangeCodeForTokens, fetchRemoteProfile,
} from "@/lib/platforms/oauth";
import { isPlatformId } from "@/lib/platforms/registry";

const fail = (message: string) =>
  NextResponse.redirect(
    appUrl(`/app/accounts?error=${encodeURIComponent(message)}`),
  );

export async function GET(
  req: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  const { workspace, user } = await requireWorkspace();
  if (!isPlatformId(platform)) return fail("Unknown platform.");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const denied = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (denied) return fail(denied);
  if (!code) return fail("No authorization code was returned.");

  const jar = await cookies();
  const expectedState = jar.get(`pw_oauth_state_${platform}`)?.value;
  const verifier = jar.get(`pw_oauth_verifier_${platform}`)?.value;
  jar.delete(`pw_oauth_state_${platform}`);
  jar.delete(`pw_oauth_verifier_${platform}`);

  if (!expectedState || state !== expectedState) {
    return fail("That login attempt expired or didn't match. Try again.");
  }

  const plan = planFor(user.plan);
  const count = await db.socialAccount.count({ where: { workspaceId: workspace.id } });
  if (count >= plan.maxAccounts) {
    return fail(`The ${plan.name} plan allows ${plan.maxAccounts} accounts.`);
  }

  try {
    const tokens = await exchangeCodeForTokens(platform, code, verifier);
    const profile = await fetchRemoteProfile(platform, tokens);

    await db.socialAccount.upsert({
      where: {
        workspaceId_platform_platformUserId: {
          workspaceId: workspace.id,
          platform,
          platformUserId: profile.platformUserId,
        },
      },
      create: {
        workspaceId: workspace.id,
        platform,
        platformUserId: profile.platformUserId,
        handle: profile.handle,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        ...encryptTokenFields({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? null,
        }),
        tokenExpiresAt: tokens.expiresAt,
        scope: tokens.scope,
        meta: writeJson(profile.meta ?? {}),
        isSandbox: false,
        status: "active",
      },
      update: {
        handle: profile.handle,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        ...encryptTokenFields({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? null,
        }),
        tokenExpiresAt: tokens.expiresAt,
        scope: tokens.scope,
        meta: writeJson(profile.meta ?? {}),
        isSandbox: false,
        status: "active",
      },
    });

    return NextResponse.redirect(appUrl("/app/accounts?connected=" + platform));
  } catch (err) {
    return fail((err as Error).message);
  }
}
