// ─── API Standard Types ──────────────────────────────────────────────────────
// Formato único de respuesta para toda la API REST de Metria.
//
// Success:  { data: T, meta?: PaginationMeta }
// Error:    { error: ApiErrorBody }
// ─────────────────────────────────────────────────────────────────────────────

/** Envoltorio estándar de respuesta exitosa */
export type ApiResponse<T> = {
  data: T;
  meta?: PaginationMeta;
};

/** Metadatos de paginación */
export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/** Cuerpo de error estándar */
export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

/** Envoltorio de error */
export type ApiErrorResponse = {
  error: ApiErrorBody;
};

/** Parámetros de paginación (query string) */
export type PaginationParams = {
  page?: number;
  pageSize?: number;
};

/** Parámetros de ordenación (query string) */
export type SortParams = {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

/** Parámetros de filtrado (query string libre) */
export type FilterParams = Record<string, string | undefined>;

/** Query completo que recibe un endpoint listable */
export type ListQuery = PaginationParams & SortParams & FilterParams;

// ─── Códigos de error normalizados ───────────────────────────────────────────

export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
  DEPENDENCY_ERROR: "DEPENDENCY_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
