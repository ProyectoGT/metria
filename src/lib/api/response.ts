// ─── API Response Helpers ────────────────────────────────────────────────────
// Funciones helpers para construir respuestas con el formato estándar.
// Uso en route handlers:
//
//   return apiSuccess({ id: 1, name: "foo" });
//   return apiPaginated(rows, total, page, pageSize);
//   return apiError(404, "NOT_FOUND", "Recurso no encontrado");
//   return handleApiError(error);  // atrapa ApiError y lo convierte
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { ApiError } from "./errors";
import type { ApiResponse, ApiErrorResponse, PaginationMeta } from "./types";
import { ErrorCodes } from "./types";

// ─── Success ─────────────────────────────────────────────────────────────────

export function apiSuccess<T>(data: T, meta?: PaginationMeta): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ data, meta } satisfies ApiResponse<T>);
}

export function apiCreated<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ data } satisfies ApiResponse<T>, { status: 201 });
}

export function apiNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function apiPaginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): NextResponse<ApiResponse<T[]>> {
  return apiSuccess(data, {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ─── Error ───────────────────────────────────────────────────────────────────

export function apiError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { error: { code, message, details } } satisfies ApiErrorResponse,
    { status },
  );
}

export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  if (error instanceof ApiError) {
    return apiError(error.statusCode, error.code, error.message, error.details);
  }

  if (error instanceof SyntaxError) {
    return apiError(400, ErrorCodes.VALIDATION_ERROR, "JSON mal formado");
  }

  console.error("[api] Unhandled error:", error);
  return apiError(500, ErrorCodes.INTERNAL_ERROR, "Error interno del servidor");
}
