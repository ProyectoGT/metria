"use server";

import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { revalidatePath } from "next/cache";
import { DEFAULT_ACTIVITY_TIME, localDateKey, normalizeDateKey, normalizeTime } from "@/lib/local-date-time";
import { normalizeActivityPriority, normalizeActivityType } from "@/lib/activity-options";

// ─── Crear tarea ──────────────────────────────────────────────────────────────

export async function createTareaAction(data: {
  titulo: string;
  prioridad: string;
  fecha?: string;
  estado?: "pendiente" | "en_progreso" | "completado";
  fromOrdenDia?: boolean;
  assignedUserIds?: number[];
}): Promise<{ id: number }> {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");

  const assignedUserIds = data.assignedUserIds?.length ? data.assignedUserIds : [yo.id];
  const { data: row, error } = await supabase.rpc("create_pending_tarea", {
    p_titulo: data.titulo,
    p_prioridad: data.prioridad,
    p_completed: data.estado === "completado",
    p_assigned_user_ids: assignedUserIds,
    p_visibility: "private",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/ordenes");
  return { id: row.id };
}

export async function createAgendaAction(data: {
  description: string;
  eventDate: string;
  time?: string | null;
  priority?: string;
  tipo?: string;
  completed?: boolean;
  result?: string | null;
  assignedUserIds?: number[];
}): Promise<{ id: number }> {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");

  const assignedUserIds = data.assignedUserIds?.length ? data.assignedUserIds : [yo.id];
  const { data: row, error } = await supabase.rpc("create_agenda_activity", {
    p_description: data.description,
    p_event_date: normalizeDateKey(data.eventDate),
    p_time: normalizeTime(data.time, DEFAULT_ACTIVITY_TIME),
    p_priority: normalizeActivityPriority(data.priority),
    p_tipo: normalizeActivityType(data.tipo),
    p_completed: data.completed ?? false,
    p_result: data.result ?? undefined,
    p_assigned_user_ids: assignedUserIds,
    p_visibility: "private",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/ordenes");
  revalidatePath("/calendario");
  return { id: row.id };
}

export async function updateAgendaAction(
  id: number,
  updates: {
    description?: string;
    eventDate?: string;
    time?: string | null;
    priority?: string;
    tipo?: string;
    completed?: boolean;
    result?: string | null;
    assignedUserIds?: number[];
  },
): Promise<void> {
  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("agenda")
    .select("description, event_date, time, priority, tipo, completed, result, agenda_usuarios(usuario_id)")
    .eq("id", id)
    .single();
  if (readError) throw new Error(readError.message);

  const currentAssigned = ((existing as unknown as { agenda_usuarios?: { usuario_id: number }[] }).agenda_usuarios ?? [])
    .map((u) => u.usuario_id);
  const { error } = await supabase.rpc("update_agenda_activity", {
    p_agenda_id: id,
    p_description: updates.description ?? existing.description,
    p_event_date: normalizeDateKey(updates.eventDate ?? existing.event_date),
    p_time: normalizeTime(updates.time ?? existing.time, DEFAULT_ACTIVITY_TIME),
    p_priority: normalizeActivityPriority(updates.priority ?? existing.priority),
    p_tipo: normalizeActivityType(updates.tipo ?? existing.tipo),
    p_completed: updates.completed ?? existing.completed,
    p_result: updates.result ?? existing.result ?? undefined,
    p_assigned_user_ids: updates.assignedUserIds?.length ? updates.assignedUserIds : currentAssigned,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/ordenes");
  revalidatePath("/calendario");
}

// ─── Actualizar titulo de tarea ───────────────────────────────────────────────

export async function updateTareaAction(
  id: number,
  updates: {
    titulo?: string;
    prioridad?: string;
    fecha?: string | null;
    assignedUserIds?: number[];
    completed?: boolean;
    resultado?: string | null;
  },
): Promise<void> {
  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("tareas")
    .select("titulo, prioridad, estado, resultado, tarea_usuarios(usuario_id)")
    .eq("id", id)
    .single();
  if (readError) throw new Error(readError.message);

  const currentAssigned = ((existing as unknown as { tarea_usuarios?: { usuario_id: number }[] }).tarea_usuarios ?? [])
    .map((u) => u.usuario_id);
  const { error } = await supabase.rpc("update_pending_tarea", {
    p_tarea_id: id,
    p_titulo: updates.titulo ?? existing.titulo,
    p_prioridad: updates.prioridad ?? existing.prioridad ?? "media",
    p_completed: updates.completed ?? existing.estado === "completado",
    p_resultado: updates.resultado ?? existing.resultado ?? undefined,
    p_assigned_user_ids: updates.assignedUserIds?.length ? updates.assignedUserIds : currentAssigned,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/ordenes");
}

// ─── Cambiar estado de tarea ──────────────────────────────────────────────────

export async function updateTareaEstadoAction(
  id: number,
  estado: "pendiente" | "en_progreso" | "completado",
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_tarea_completed", {
    p_tarea_id: id,
    p_completed: estado === "completado",
    p_resultado: undefined,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/ordenes");
}

// ─── Completar tarea con resultado ───────────────────────────────────────────

export async function completeTareaAction(id: number, resultado?: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_tarea_completed", {
    p_tarea_id: id,
    p_completed: true,
    p_resultado: resultado?.trim() || undefined,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/ordenes");
}

// ─── Eliminar tarea ───────────────────────────────────────────────────────────

export async function deleteTareaAction(id: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_tarea", {
    p_tarea_id: id,
    p_reason: "archived_from_dashboard",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/ordenes");
}

export async function completeAgendaAction(id: number, completed: boolean, result?: string | null): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_agenda_completed", {
    p_agenda_id: id,
    p_completed: completed,
    p_result: result?.trim() || undefined,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/ordenes");
  revalidatePath("/calendario");
}

export async function convertTareaToAgendaAction(
  id: number,
  options?: { date?: string; time?: string; assignedUserIds?: number[] },
): Promise<{ id: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("convert_tarea_to_agenda", {
    p_tarea_id: id,
    p_event_date: normalizeDateKey(options?.date ?? localDateKey()),
    p_time: normalizeTime(options?.time, DEFAULT_ACTIVITY_TIME),
    p_assigned_user_ids: options?.assignedUserIds ?? undefined,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/ordenes");
  revalidatePath("/calendario");
  return { id: data.id };
}

export async function convertAgendaToTareaAction(id: number, assignedUserIds?: number[]): Promise<{ id: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("convert_agenda_to_tarea", {
    p_agenda_id: id,
    p_assigned_user_ids: assignedUserIds ?? undefined,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/ordenes");
  revalidatePath("/calendario");
  return { id: data.id };
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
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");
  if (!yo.empresaId) throw new Error("Sin empresa asignada");

  // agente_del_mes tiene RLS con política de escritura para Admin/Director/Responsable.
  // createClient() es suficiente; el service role no es necesario.
  const supabase = await createClient();
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
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");
  // Validar que el target empresaId coincide con la empresa del usuario autenticado
  if (yo.empresaId !== data.empresaId) throw new Error("Sin acceso a esta empresa.");

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("agente_del_mes")
    .update({ agente_id: data.agenteId, agente_nombre: data.agenteNombre })
    .eq("empresa_id", yo.empresaId); // siempre la empresa del usuario autenticado

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function clearAgentOfMonthAction(): Promise<void> {
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");
  if (!yo.empresaId) throw new Error("Sin empresa asignada");

  const supabase = await createClient();
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
