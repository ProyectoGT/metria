// ─── /api/tasks/:id/complete ─────────────────────────────────────────────────
// PATCH /api/tasks/:id/complete → marcar tarea como completada
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { validate } from "@/lib/api/validate";
import { CompleteTaskSchema } from "@/lib/api/schemas";
import { NotFoundError, UnauthorizedError } from "@/lib/api/errors";
import { revalidatePath } from "next/cache";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const yo = await getCurrentUserContext();
    if (!yo) throw new UnauthorizedError();

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const input = await validate(CompleteTaskSchema, body);

    const supabase = await createClient();

    const { data: existing, error: fetchError } = await supabase
      .from("tareas")
      .select("id, estado")
      .eq("id", Number(id))
      .is("archived_at", null)
      .single();

    if (fetchError || !existing) throw new NotFoundError("Tarea", id);

    const { data, error } = await supabase
      .from("tareas")
      .update({
        estado: "completado",
        resultado: input.resultado ?? null,
      })
      .eq("id", Number(id))
      .select()
      .single();

    if (error) {
      console.error("[api/tasks/complete] Update error:", error);
      return handleApiError(error);
    }

    revalidatePath("/dashboard");
    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error);
  }
}
