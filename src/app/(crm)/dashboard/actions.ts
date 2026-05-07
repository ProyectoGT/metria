"use server";

import { createClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";
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
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");

  const supabase = createAdminClient();
  const { data: existing, error: readError } = await supabase
    .from("agenda")
    .select("id, description, event_date, time, priority, tipo, completed, result, user_id, owner_user_id, empresa_id, archived_at, agenda_usuarios(usuario_id)")
    .eq("id", id)
    .is("archived_at", null)
    .single();
  if (readError) throw new Error(readError.message);

  const currentAssigned = ((existing as unknown as { agenda_usuarios?: { usuario_id: number }[] }).agenda_usuarios ?? [])
    .map((u) => u.usuario_id);
  const isSameCompany = yo.empresaId !== null && existing.empresa_id === yo.empresaId;
  const isDirectManager = yo.role === "Administrador" || yo.role === "Director";
  const canEdit =
    isSameCompany && (
      isDirectManager ||
      existing.owner_user_id === yo.id ||
      existing.user_id === yo.id ||
      currentAssigned.includes(yo.id) ||
      (yo.role === "Responsable" && [
        yo.id,
        ...yo.supervisedAgentIds,
      ].some((allowedId) =>
        allowedId === existing.owner_user_id ||
        allowedId === existing.user_id ||
        currentAssigned.includes(allowedId)
      ))
    );

  if (!canEdit) throw new Error("Sin permisos para editar la actividad");

  const fallbackAssigned = currentAssigned.length
    ? currentAssigned
    : [existing.user_id, existing.owner_user_id, yo.id].filter((value): value is number => value != null);
  const candidateAssigned = updates.assignedUserIds?.length ? updates.assignedUserIds : fallbackAssigned;
  const allowedAssigned = Array.from(new Set(candidateAssigned));

  const { data: allowedUsers, error: usersError } = await supabase
    .from("usuarios")
    .select("id")
    .eq("empresa_id", yo.empresaId ?? -1)
    .in("id", allowedAssigned);
  if (usersError) throw new Error(usersError.message);

  const assignedUserIds = (allowedUsers ?? []).map((user) => user.id);
  if (assignedUserIds.length === 0) throw new Error("Debe asignarse al menos un usuario");
  if (yo.role === "Agente" && assignedUserIds.some((userId) => userId !== yo.id)) {
    throw new Error("Sin permisos para asignar esta actividad");
  }
  if (yo.role === "Responsable") {
    const allowed = new Set([yo.id, ...yo.supervisedAgentIds]);
    if (assignedUserIds.some((userId) => !allowed.has(userId))) {
      throw new Error("Sin permisos para asignar esta actividad");
    }
  }

  const firstAssigned = assignedUserIds[0];
  const { error: updateError } = await supabase
    .from("agenda")
    .update({
      description: (updates.description ?? existing.description).trim(),
      event_date: normalizeDateKey(updates.eventDate ?? existing.event_date),
      time: normalizeTime(updates.time ?? existing.time, DEFAULT_ACTIVITY_TIME),
      priority: normalizeActivityPriority(updates.priority ?? existing.priority),
      tipo: normalizeActivityType(updates.tipo ?? existing.tipo),
      completed: updates.completed ?? existing.completed,
      result: (updates.result ?? existing.result)?.trim() || null,
      user_id: firstAssigned,
    })
    .eq("id", id);
  if (updateError) throw new Error(updateError.message);

  const removedAssigned = currentAssigned.filter((userId) => !assignedUserIds.includes(userId));
  await Promise.all(removedAssigned.map((userId) =>
    supabase.from("agenda_usuarios").delete().eq("agenda_id", id).eq("usuario_id", userId)
  ));

  const { error: assignError } = await supabase
    .from("agenda_usuarios")
    .upsert(
      assignedUserIds.map((usuario_id) => ({ agenda_id: id, usuario_id })),
      { onConflict: "agenda_id,usuario_id" },
    );
  if (assignError) throw new Error(assignError.message);

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

  const supabase = createAdminClient();
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

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("agente_del_mes")
    .update({ agente_id: data.agenteId, agente_nombre: data.agenteNombre })
    .eq("empresa_id", data.empresaId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function clearAgentOfMonthAction(): Promise<void> {
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");
  if (!yo.empresaId) throw new Error("Sin empresa asignada");

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("agente_del_mes")
    .delete()
    .eq("empresa_id", yo.empresaId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

// ─── Archivar actividad (agenda) ──────────────────────────────────────────────

export async function archiveAgendaAction(id: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_agenda", {
    p_agenda_id: id,
    p_reason: "archived_from_dashboard",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/ordenes");
  revalidatePath("/calendario");
}

// ─── Convertir tarea a agenda (con tipo y campos completos) ───────────────────

export async function convertTareaToAgendaFullAction(
  tareaId: number,
  data: {
    description: string;
    eventDate: string;
    time: string;
    priority: string;
    tipo: string;
    assignedUserIds: number[];
  },
): Promise<{ id: number }> {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");

  const assignedUserIds = data.assignedUserIds.length ? data.assignedUserIds : [yo.id];

  const { data: agendaRow, error: createError } = await supabase.rpc("create_agenda_activity", {
    p_description: data.description,
    p_event_date: normalizeDateKey(data.eventDate),
    p_time: normalizeTime(data.time, DEFAULT_ACTIVITY_TIME),
    p_priority: normalizeActivityPriority(data.priority),
    p_tipo: normalizeActivityType(data.tipo),
    p_completed: false,
    p_result: undefined,
    p_assigned_user_ids: assignedUserIds,
    p_visibility: "private",
  });

  if (createError) throw new Error(createError.message);

  const agendaId = (agendaRow as unknown as { id: number }).id;

  // Archivar la tarea original (atomicidad: si falla, limpiamos la agenda creada)
  const { error: archiveError } = await supabase.rpc("archive_tarea", {
    p_tarea_id: tareaId,
    p_reason: "converted_to_agenda",
  });

  if (archiveError) {
    const adminClient = createAdminClient();
    await adminClient.from("agenda").delete().eq("id", agendaId);
    throw new Error("No se pudo completar la conversion. La tarea ya fue procesada.");
  }

  // Establecer enlace para trazabilidad
  const adminClient = createAdminClient();
  await adminClient.from("tareas").update({
    converted_to_agenda_id: agendaId,
    archived_at: new Date().toISOString(),
    archived_reason: "converted_to_agenda",
  }).eq("id", tareaId);

  revalidatePath("/dashboard");
  revalidatePath("/ordenes");
  revalidatePath("/calendario");

  return { id: agendaId };
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
