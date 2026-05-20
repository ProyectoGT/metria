// ─── API Library ─────────────────────────────────────────────────────────────
// Export público de todas las herramientas de la API estandarizada.
//
// Uso en route handlers:
//   import { apiSuccess, apiPaginated, handleApiError, validate } from "@/lib/api";
//   import { NotFoundError, ValidationError } from "@/lib/api";
// ─────────────────────────────────────────────────────────────────────────────

export * from "./types";
export * from "./errors";
export * from "./response";
export * from "./validate";
export * from "./schemas";
