"use server";

import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { revalidatePath } from "next/cache";

// ─── Crear tarea ──────────────────────────────────────────────────────────────

export async function createTareaAction(data: {
  titulo: string;
  prioridad: string;
  fecha?: string;
}): Promise<{ id: number }> {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");

  const { data: row, error } = await supabase
    .from("tareas")
    .insert({
      titulo: data.titulo,
      prioridad: data.prioridad,
      fecha: data.fecha || null,
      estado: "pendiente",
      owner_user_id: yo.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  return { id: row.id };
}

// ─── Cambiar estado de tarea ──────────────────────────────────────────────────

export async function updateTareaEstadoAction(
  id: number,
  estado: "pendiente" | "en_progreso" | "completado",
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("tareas").update({ estado }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

// ─── Completar tarea (alias para compatibilidad) ──────────────────────────────

export async function completeTareaAction(id: number): Promise<void> {
  return updateTareaEstadoAction(id, "completado");
}

// ─── Eliminar tarea ───────────────────────────────────────────────────────────

export async function deleteTareaAction(id: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("tareas").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

// ─── Columnas Kanban personalizadas ───────────────────────────────────────────

export async function addKanbanColumnAction(data: {
  col_id: string;
  titulo: string;
  orden: number;
}): Promise<void> {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("kanban_columnas").insert({
    user_id: yo.id,
    col_id: data.col_id,
    titulo: data.titulo,
    orden: data.orden,
  });

  if (error) throw new Error(error.message);
}

// ─── Agente del Mes ───────────────────────────────────────────────────────────

export async function saveAgentOfMonthPrizeAction(data: {
  mes: string;
  premio: string;
  anadidoPor: string;
}): Promise<{ id: number }> {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");
  if (!yo.empresaId) throw new Error("Sin empresa asignada");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase as any)
    .from("agente_del_mes")
    .upsert(
      {
        empresa_id: yo.empresaId,
        mes: data.mes,
        premio: data.premio,
        anadido_por: data.anadidoPor,
        agente_id: null,
        agente_nombre: null,
      },
      { onConflict: "empresa_id" }
    )
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  return { id: row.id };
}

export async function saveAgentOfMonthWinnerAction(data: {
  empresaId: number;
  agenteId: number;
  agenteNombre: string;
}): Promise<void> {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("agente_del_mes")
    .update({ agente_id: data.agenteId, agente_nombre: data.agenteNombre })
    .eq("empresa_id", data.empresaId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function clearAgentOfMonthAction(): Promise<void> {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");
  if (!yo.empresaId) throw new Error("Sin empresa asignada");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("agente_del_mes")
    .delete()
    .eq("empresa_id", yo.empresaId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function deleteKanbanColumnAction(col_id: string): Promise<void> {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("kanban_columnas")
    .delete()
    .eq("user_id", yo.id)
    .eq("col_id", col_id);

  if (error) throw new Error(error.message);
}
