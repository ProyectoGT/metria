type SupabaseCookieOptions = {
  maxAge?: number;
  path?: string;
  sameSite?: boolean | "lax" | "strict" | "none";
  secure?: boolean;
  httpOnly?: boolean;
  domain?: string;
  expires?: Date;
};

export const PERSISTENT_AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function getPersistentAuthCookieOptions<T extends SupabaseCookieOptions>(
  options: T
): T & { maxAge: number; path: string; sameSite: boolean | "lax" | "strict" | "none" } {
  return {
    ...options,
    maxAge: PERSISTENT_AUTH_COOKIE_MAX_AGE,
    path: options.path ?? "/",
    sameSite: options.sameSite ?? "lax",
  };
}
