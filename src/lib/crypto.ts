import "server-only";
import crypto from "node:crypto";

/**
 * Envelope encryption for data at rest.
 *
 * OAuth access tokens are the most dangerous thing this app stores: a leaked
 * row lets someone post as your customers. They're encrypted with AES-256-GCM
 * before they touch the database, so a dump of the accounts table is inert
 * without ENCRYPTION_KEY.
 */
const ALGO = "aes-256-gcm";
const PREFIX = "enc:v1:";

// Marks values written before encryption existed, so reads stay backward
// compatible while old rows are re-saved.
const isEncrypted = (value: string) => value.startsWith(PREFIX);

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ENCRYPTION_KEY is required in production. Generate one with: openssl rand -base64 32",
      );
    }
    // Development only: a fixed key so `npm run dev` works with no setup, and
    // so a restart can still read what the previous run wrote.
    cachedKey = crypto.createHash("sha256").update("sixfold-development-key").digest();
    return cachedKey;
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be 32 bytes base64-encoded (got ${key.length}). Generate one with: openssl rand -base64 32`,
    );
  }
  cachedKey = key;
  return cachedKey;
}

export function encrypt(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === "") return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decrypt(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  // Written before encryption was introduced — return as-is.
  if (!isEncrypted(value)) return value;

  try {
    const buf = Buffer.from(value.slice(PREFIX.length), "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ciphertext = buf.subarray(28);

    const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    // Wrong key or tampered row. Returning null makes the account read as
    // disconnected rather than crashing a page render.
    return null;
  }
}
