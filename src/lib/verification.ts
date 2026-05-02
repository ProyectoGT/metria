import { createHmac, timingSafeEqual } from "crypto";

// VERIFICATION_SECRET debe definirse en .env.local como variable independiente.
// Nunca usar SUPABASE_SERVICE_ROLE_KEY como secreto derivado: si el token HMAC
// se filtrase, comprometería también el acceso al admin de Supabase.
const SECRET =
  process.env.VERIFICATION_SECRET ??
  "metria-verification-fallback-change-in-production";

const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export function generateVerificationToken(userId: number, email: string): string {
  const expiry = Date.now() + EXPIRY_MS;
  const payload = `${userId}|${email.toLowerCase()}|${expiry}`;
  const hmac = createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}|${hmac}`).toString("base64url");
}

export function verifyVerificationToken(
  token: string
): { userId: number; email: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const lastPipe = decoded.lastIndexOf("|");
    if (lastPipe === -1) return null;

    const payload = decoded.slice(0, lastPipe);
    const hmac = decoded.slice(lastPipe + 1);

    const parts = payload.split("|");
    if (parts.length < 3) return null;

    const expiry = parseInt(parts[parts.length - 1]);
    const userId = parseInt(parts[0]);
    const email = parts.slice(1, -1).join("|");

    if (isNaN(expiry) || isNaN(userId)) return null;
    if (Date.now() > expiry) return null;

    const expectedHmac = createHmac("sha256", SECRET).update(payload).digest("hex");

    const a = Buffer.from(hmac, "hex");
    const b = Buffer.from(expectedHmac, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    return { userId, email };
  } catch {
    return null;
  }
}
