import type { PostgrestError } from "@supabase/supabase-js";

export type ServiceErrorKind = "technical" | "functional";

export class DomainServiceError extends Error {
  constructor(
    message: string,
    public readonly kind: ServiceErrorKind,
    public readonly code?: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "DomainServiceError";
  }
}

export function technicalError(message: string, cause?: unknown, code?: string) {
  return new DomainServiceError(message, "technical", code, cause);
}

export function functionalError(message: string, code?: string, cause?: unknown) {
  return new DomainServiceError(message, "functional", code, cause);
}

export function throwIfSupabaseError(error: PostgrestError | null, message: string): asserts error is null {
  if (error) {
    throw technicalError(message, error, error.code);
  }
}
