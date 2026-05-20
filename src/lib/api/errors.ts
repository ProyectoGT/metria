// ─── API Error Classes ───────────────────────────────────────────────────────
// Lanza estas excepciones en route handlers y se traducen automáticamente
// a respuestas con formato estándar via handleApiError().
// ─────────────────────────────────────────────────────────────────────────────

import { ErrorCodes, type ErrorCode } from "./types";

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(400, ErrorCodes.VALIDATION_ERROR, message, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, id?: string | number) {
    const msg = id ? `${resource} no encontrado (id: ${id})` : `${resource} no encontrado`;
    super(404, ErrorCodes.NOT_FOUND, msg);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "No autenticado") {
    super(401, ErrorCodes.UNAUTHORIZED, message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "No tienes permiso para realizar esta accion") {
    super(403, ErrorCodes.FORBIDDEN, message);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(409, ErrorCodes.CONFLICT, message, details);
    this.name = "ConflictError";
  }
}

export class RateLimitedError extends ApiError {
  constructor(message = "Demasiadas solicitudes. Intenta de nuevo mas tarde.") {
    super(429, ErrorCodes.RATE_LIMITED, message);
    this.name = "RateLimitedError";
  }
}
