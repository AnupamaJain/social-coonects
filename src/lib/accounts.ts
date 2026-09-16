import "server-only";
import { db } from "./db";
import { decrypt, encrypt } from "./crypto";

/**
 * Single door in and out of the credentials on SocialAccount.
 *
 * Every read of an access token goes through `withTokens` and every write
 * through `encryptTokenFields`, so there is exactly one place where plaintext
 * exists and nowhere for an un-encrypted write to sneak in.
 */
export interface AccountTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

export function encryptTokenFields<T extends Partial<AccountTokens>>(data: T): T {
  const out = { ...data };
  if ("accessToken" in data) out.accessToken = encrypt(data.accessToken) as T["accessToken"];
  if ("refreshToken" in data) out.refreshToken = encrypt(data.refreshToken) as T["refreshToken"];
  return out;
}

export function withTokens<T extends AccountTokens>(account: T): T {
  return {
    ...account,
    accessToken: decrypt(account.accessToken),
    refreshToken: decrypt(account.refreshToken),
  };
}

/** Accounts for a workspace with tokens decrypted, ready to publish with. */
export async function getPublishableAccounts(workspaceId: string) {
  const accounts = await db.socialAccount.findMany({
    where: { workspaceId, status: "active" },
    orderBy: { createdAt: "asc" },
  });
  return accounts.map(withTokens);
}
