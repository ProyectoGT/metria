import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey() {
  const secret =
    process.env.EMAIL_TOKEN_ENCRYPTION_KEY ??
    process.env.GOOGLE_CLIENT_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error("EMAIL_TOKEN_ENCRYPTION_KEY is required to encrypt email tokens.");
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptSecret(value: string): string {
  const [ivPart, authTagPart, encryptedPart] = value.split(".");
  if (!ivPart || !authTagPart || !encryptedPart) {
    throw new Error("Invalid encrypted token payload.");
  }

  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(authTagPart, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
