/**
 * Campos que nunca deben aparecer en un backup en texto claro.
 * Se sustituyen por el literal "[REDACTADO]" durante la exportacion.
 */
export const SENSITIVE_BACKUP_FIELDS: ReadonlyArray<string> = [
  "password",
  "password_hash",
  "hashed_password",
  "secret",
  "api_key",
  "api_secret",
  "access_token",
  "refresh_token",
  "oauth_token",
  "id_token",
  "private_key",
  "service_role_key",
  "service_role",
  "session_token",
  "session_secret",
  "webhook_secret",
  "signing_secret",
  "client_secret",
  "google_access_token",
  "google_refresh_token",
  "encrypted_token",
  "token_data",
  "confirmation_password",
  "delete_confirmation_password",
];

export function redactSensitiveFields(
  row: Record<string, unknown>,
  redactFields: readonly string[],
): Record<string, unknown> {
  if (redactFields.length === 0) return row;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    result[key] = redactFields.includes(key) && value !== null ? "[REDACTADO]" : value;
  }
  return result;
}
