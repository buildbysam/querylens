import { config } from "@/config.js";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

// protection for registered-database passwords: AES-256-GCM with a key derived from ENCRYPTION_KEY.
// stored format: `v1.<iv>.<tag>.<ciphertext>` (base64url parts).
// decrypt only when connecting to the target database; never log or return the result.

const VERSION = "v1";
const key = Buffer.from(
  hkdfSync("sha256", config.getOrThrow("ENCRYPTION_KEY"), "querylens", "database-credentials", 32)
);

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [
    VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSecret(stored: string): string {
  const [version, iv, tag, ciphertext] = stored.split(".");
  if (version !== VERSION || !iv || !tag || ciphertext === undefined) {
    throw new Error("Unrecognised protected secret format");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
