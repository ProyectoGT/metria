// ─── /api/tasks ──────────────────────────────────────────────────────────────
// GET  /api/tasks           → listar tareas (paginado, filtros, orden)
// POST /api/tasks           → crear tarea
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { apiSuccess, apiCreated, handleApiError, apiPaginated } from "@/lib/api/response";
import { validate, validateQuery } from "@/lib/api/validate";
import { CreateTaskSchema, TaskListSchema } from "@/lib/api/schemas";
import { UnauthorizedError } from "@/lib/api/errors";
import { revalidatePath } from "next/cache";

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const yo = await getCurrentUserContext();
    if (!yo) throw new UnauthorizedError();

    const params = validateQuery(TaskListSchema, Object.fromEntries(request.nextUrl.searchParams));
    const supabase = await createClient();

    let query = supabase
      .from("tareas")
      .select("*", { count: "exact" })
      .is("archived_at", null);

    // Filtros
    if (params.estado && params.estado !== "todas") {
      query = query.eq("estado", params.estado);
    }
    if (params.prioridad && params.prioridad !== "todas") {
      query = query.eq("prioridad", params.prioridad);
    }
    if (params.q) {
      query = query.ilike("titulo", `%${params.q}%`);
    }

    // Ordenación
    const orderCol = params.sortBy === "created_at" ? "id" : params.sortBy;
    query = query.order(orderCol, { ascending: params.sortOrder === "asc" });

    // Paginación
    const from = (params.page - 1) * params.pageSize;
    query = query.range(from, from + params.pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error("[api/tasks] DB error:", error);
      return handleApiError(error);
    }

    return apiPaginated(data ?? [], count ?? 0, params.page, params.pageSize);
  } catch (error) {
    return handleApiError(error);
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const yo = await getCurrentUserContext();
    if (!yo) throw new UnauthorizedError();

    const body = await request.json();
    const input = await validate(CreateTaskSchema, body);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tareas")
      .insert({
        titulo: input.titulo,
        prioridad: input.prioridad,
        owner_user_id: yo.id,
        empresa_id: yo.empresaId ?? undefined,
        estado: "pendiente",
      })
      .select()
      .single();

    if (error) {
      console.error("[api/tasks] Insert error:", error);
      return handleApiError(error);
    }

    revalidatePath("/dashboard");
    return apiCreated(data);
  } catch (error) {
    return handleApiError(error);
  }
}
