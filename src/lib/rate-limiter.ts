import { RateLimiterMemory } from "rate-limiter-flexible";

// Límite general para API routes (10 req / 60s por IP)
export const rateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
});

// Límite estricto para operaciones de autenticación (5 intentos / 5 min por IP)
export const authRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 300,
});

export function getIp(headers: Headers | { get(name: string): string | null }): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
