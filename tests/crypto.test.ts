import { beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";

const KEY = crypto.randomBytes(32).toString("base64");

let encrypt: (v: string | null | undefined) => string | null;
let decrypt: (v: string | null | undefined) => string | null;

beforeAll(async () => {
  process.env.ENCRYPTION_KEY = KEY;
  ({ encrypt, decrypt } = await import("@/lib/crypto"));
});

describe("token encryption", () => {
  const token = "ya29.a0AfH6SMC-a-real-looking-oauth-access-token";

  it("round-trips", () => {
    expect(decrypt(encrypt(token))).toBe(token);
  });

  it("does not leak plaintext into the stored value", () => {
    const stored = encrypt(token)!;
    expect(stored).not.toContain("oauth");
    expect(stored.startsWith("enc:v1:")).toBe(true);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    expect(encrypt(token)).not.toBe(encrypt(token));
  });

  it("passes through values written before encryption existed", () => {
    expect(decrypt("legacy-plaintext-token")).toBe("legacy-plaintext-token");
  });

  it("returns null rather than throwing on a tampered value", () => {
    const stored = encrypt(token)!;
    const tampered = stored.slice(0, -4) + "AAAA";
    expect(decrypt(tampered)).toBeNull();
  });

  it("treats null and empty string as nothing to store", () => {
    expect(encrypt(null)).toBeNull();
    expect(encrypt("")).toBeNull();
    expect(decrypt(null)).toBeNull();
  });
});
