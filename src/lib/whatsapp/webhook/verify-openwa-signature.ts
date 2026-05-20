import crypto from 'crypto';

// Verifica la firma HMAC-SHA256 que OpenWA adjunta en el header x-openwa-signature.
// Formato esperado del header: "sha256=<hex_digest>"
export function verifyOpenWaSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader) return false;

  const expected = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex')}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expected)
    );
  } catch {
    // Buffer lengths differ -> firma inválida
    return false;
  }
}
