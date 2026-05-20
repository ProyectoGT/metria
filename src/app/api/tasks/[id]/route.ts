// ─── /api/tasks/:id ──────────────────────────────────────────────────────────
// GET    /api/tasks/:id      → obtener tarea
// PATCH  /api/tasks/:id      → actualizar tarea
// DELETE /api/tasks/:id      → eliminar (archivar) tarea
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { apiSuccess, apiNoContent, handleApiError } from "@/lib/api/response";
import { validate } from "@/lib/api/validate";
import { UpdateTaskSchema } from "@/lib/api/schemas";
import { NotFoundError, UnauthorizedError } from "@/lib/api/errors";
import { revalidatePath } from "next/cache";

type RouteContext = { params: Promise<{ id: string }> };
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function getTask(supabase: SupabaseServerClient, id: number) {
  const { data, error } = await supabase
    .from("tareas")
    .select("*")
    .eq("id", id)
    .is("archived_at", null)
    .single();

  if (error || !data) throw new NotFoundError("Tarea", id);
  return data;
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const yo = await getCurrentUserContext();
    if (!yo) throw new UnauthorizedError();

    const { id } = await context.params;
    const supabase = await createClient();
    const data = await getTask(supabase, Number(id));

    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error);
  }
}

// ─── PATCH ───────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const yo = await getCurrentUserContext();
    if (!yo) throw new UnauthorizedError();

    const { id } = await context.params;
    const body = await request.json();
    const input = await validate(UpdateTaskSchema, body);

    const supabase = await createClient();
    await getTask(supabase, Number(id)); // verifica que existe
    const taskUpdate = {
      ...(input.titulo !== undefined ? { titulo: input.titulo } : {}),
      ...(input.prioridad !== undefined ? { prioridad: input.prioridad } : {}),
      ...(input.estado !== undefined ? { estado: input.estado } : {}),
      ...(input.resultado !== undefined ? { resultado: input.resultado } : {}),
    };

    const { data, error } = await supabase
      .from("tareas")
      .update(taskUpdate)
      .eq("id", Number(id))
      .select()
      .single();

    if (error) {
      console.error("[api/tasks] Update error:", error);
      return handleApiError(error);
    }

    revalidatePath("/dashboard");
    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error);
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const yo = await getCurrentUserContext();
    if (!yo) throw new UnauthorizedError();

    const { id } = await context.params;
    const supabase = await createClient();
    await getTask(supabase, Number(id)); // verifica que existe

    const { error } = await supabase
      .from("tareas")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", Number(id));

    if (error) {
      console.error("[api/tasks] Delete error:", error);
      return handleApiError(error);
    }

    revalidatePath("/dashboard");
    return apiNoContent();
  } catch (error) {
    return handleApiError(error);
  }
}
