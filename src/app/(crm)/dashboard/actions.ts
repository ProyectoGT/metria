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
