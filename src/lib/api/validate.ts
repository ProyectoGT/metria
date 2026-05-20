// ─── API Validation Helper ───────────────────────────────────────────────────
// Envuelve schemas Zod para validación estandarizada en route handlers.
// Uso:
//   const data = await validate(MySchema, request.json());
//   // data está tipado como output del schema
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";
import { ValidationError } from "./errors";

export async function validate<T extends z.ZodType>(
  schema: T,
  input: unknown,
): Promise<z.infer<T>> {
  const result = await schema.safeParseAsync(input);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    throw new ValidationError("Datos invalidos", details);
  }
  return result.data;
}

export function validateQuery<T extends z.ZodType>(
  schema: T,
  input: Record<string, string | string[] | undefined>,
): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    throw new ValidationError("Parametros de consulta invalidos", details);
  }
  return result.data;
}

// ─── Schemas compartidos ─────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const SortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});
