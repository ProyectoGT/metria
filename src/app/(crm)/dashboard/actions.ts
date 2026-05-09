"use server";

import { createClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserContext } from "@/lib/current-user";
import { requirePermission } from "@/lib/access-control";
import { revalidatePath } from "next/cache";
import { DEFAULT_ACTIVITY_TIME, localDateKey, normalizeDateKey, normalizeTime } from "@/lib/local-date-time";
import { normalizeActivityPriority, normalizeActivityType } from "@/lib/activity-options";
import { recordAudit, recordAuditCreate, recordAuditUpdate, recordAuditDelete } from "@/lib/audit";

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
  await requirePermission("create", "tareas").catch(() => {
    throw new Error("No tienes permiso para crear tareas");
  });

  const assignedUserIds = data.assignedUserIds?.length ? data.assignedUserIds : [yo.id];
  const { data: row, error } = await supabase.rpc("create_pending_tarea", {
    p_titulo: data.titulo,
    p_prioridad: data.prioridad,
    p_completed: data.estado === "completado",
    p_assigned_user_ids: assignedUserIds,
    p_visibility: "private",
  });

  if (error) throw new Error(error.message);

  await recordAuditCreate(yo.id, "tarea", row.id, {
    titulo: data.titulo,
    prioridad: data.prioridad,
    estado: data.estado === "completado" ? "completado" : "pendiente",
    assignedUserIds,
  }, { empresaId: yo.empresaId });

  revalidatePath("/dashboard");
  revalidatePath("/ordenes");
  revalidatePath("/calendario");
  return { id: row.id };
}

export async function createAgendaAction(data: {
  description: string;
  eventDate: string;
  time?: string | null;
  timeEnd?: string | null;
  priority?: string;
  tipo?: string;
  completed?: boolean;
  result?: string | null;
  assignedUserIds?: number[];
  reminderMinutes?: number | null;
}): Promise<{ id: number }> {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");
  await requirePermission("create", "calendario").catch(() => {
    throw new Error("No tienes permiso para crear actividades en el calendario");
  });

  if (!data.assignedUserIds?.length) throw new Error("Debe asignarse al menos un usuario");

  // Validar que si hay hora fin, sea posterior a la hora inicio
  const normalizedStart = normalizeTime(data.time, DEFAULT_ACTIVITY_TIME);
  const normalizedEnd = data.timeEnd ? normalizeTime(data.timeEnd, "") : null;
  if (normalizedEnd && normalizedEnd <= normalizedStart) {
    throw new Error("La hora de fin debe ser posterior a la hora de inicio");
  }

  // No crear recordatorio sin hora de inicio
  if (data.reminderMinutes != null && !data.time?.trim()) {
    throw new Error("Se requiere hora de inicio para configurar un recordatorio");
  }

  const { data: row, error } = await supabase.rpc("create_agenda_activity_v2", {
    p_description: data.description,
    p_event_date: normalizeDateKey(data.eventDate),
    p_time: normalizedStart,
    p_time_end: normalizedEnd ?? undefined,
    p_priority: normalizeActivityPriority(data.priority),
    p_tipo: normalizeActivityType(data.tipo),
    p_completed: data.completed ?? false,
    p_result: data.result ?? undefined,
    p_assigned_user_ids: data.assignedUserIds,
    p_visibility: "private",
    p_reminder_minutes: data.reminderMinutes ?? undefined,
  });

  if (error) {
    console.error("[createAgendaAction]", error.message);
    throw new Error("No se pudo crear la actividad. Revisa fecha, hora y usuarios asignados.");
  }

  await recordAuditCreate(yo.id, "agenda", row.id, {
    description: data.description,
    eventDate: data.eventDate,
    time: normalizedStart,
    timeEnd: normalizedEnd,
    priority: normalizeActivityPriority(data.priority),
    tipo: normalizeActivityType(data.tipo),
    completed: data.completed ?? false,
    assignedUserIds: data.assignedUserIds,
  }, { empresaId: yo.empresaId });

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
    timeEnd?: string | null;
    priority?: string;
    tipo?: string;
    completed?: boolean;
    result?: string | null;
    assignedUserIds?: number[];
    reminderMinutes?: number | null;
  },
): Promise<void> {
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");

  const supabase = createAdminClient();
  const { data: existing, error: readError } = await supabase
    .from("agenda")
    .select("id, description, event_date, time, time_end, priority, tipo, completed, result, reminder_minutes_before, user_id, owner_user_id, empresa_id, archived_at, agenda_usuarios(usuario_id)")
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

  // Validar hora inicio/fin
  const resolvedTime = updates.time !== undefined ? updates.time : existing.time;
  const resolvedTimeEnd = updates.timeEnd !== undefined ? updates.timeEnd : existing.time_end;
  const normalizedStart = normalizeTime(resolvedTime, DEFAULT_ACTIVITY_TIME);
  const normalizedEnd = resolvedTimeEnd ? normalizeTime(resolvedTimeEnd, "") : null;
  if (normalizedEnd && normalizedEnd <= normalizedStart) {
    throw new Error("La hora de fin debe ser posterior a la hora de inicio");
  }

  // Validar recordatorio
  const resolvedReminder = updates.reminderMinutes !== undefined ? updates.reminderMinutes : existing.reminder_minutes_before;
  if (resolvedReminder != null && !resolvedTime?.trim()) {
    throw new Error("Se requiere hora de inicio para configurar un recordatorio");
  }

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
      time: normalizedStart,
      time_end: normalizedEnd,
      priority: normalizeActivityPriority(updates.priority ?? existing.priority),
      tipo: normalizeActivityType(updates.tipo ?? existing.tipo),
      completed: updates.completed ?? existing.completed,
      result: (updates.result ?? existing.result)?.trim() || null,
      user_id: firstAssigned,
      reminder_minutes_before: resolvedReminder,
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

  // Actualizar recordatorios (anti-duplicados vía UNIQUE constraint en DB)
  await supabase.rpc("upsert_agenda_reminders", {
    p_agenda_id: id,
    p_event_date: normalizeDateKey(updates.eventDate ?? existing.event_date),
    p_time: normalizedStart,
    p_minutes: resolvedReminder ?? 0,
    p_empresa_id: existing.empresa_id!,
  });

  await recordAuditUpdate(yo.id, "agenda", id, {
    description: existing.description,
    event_date: existing.event_date,
    time: existing.time,
    time_end: existing.time_end,
    priority: existing.priority,
    tipo: existing.tipo,
    completed: existing.completed,
    result: existing.result,
    assignedUserIds: currentAssigned,
  }, {
    description: (updates.description ?? existing.description).trim(),
    event_date: normalizeDateKey(updates.eventDate ?? existing.event_date),
    time: normalizedStart,
    time_end: normalizedEnd,
    priority: normalizeActivityPriority(updates.priority ?? existing.priority),
    tipo: normalizeActivityType(updates.tipo ?? existing.tipo),
    completed: updates.completed ?? existing.completed,
    result: (updates.result ?? existing.result)?.trim() || null,
    assignedUserIds,
  }, { empresaId: existing.empresa_id });

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
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");

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

  await recordAuditUpdate(yo.id, "tarea", id, {
    titulo: existing.titulo,
    prioridad: existing.prioridad,
    estado: existing.estado,
    resultado: existing.resultado,
    assignedUserIds: currentAssigned,
  }, {
    titulo: updates.titulo ?? existing.titulo,
    prioridad: updates.prioridad ?? existing.prioridad ?? "media",
    estado: updates.completed !== undefined ? (updates.completed ? "completado" : existing.estado) : existing.estado,
    resultado: updates.resultado ?? existing.resultado,
    assignedUserIds: updates.assignedUserIds?.length ? updates.assignedUserIds : currentAssigned,
  }, { empresaId: yo.empresaId });

  revalidatePath("/dashboard");
  revalidatePath("/ordenes");
}

// ─── Cambiar estado de tarea ──────────────────────────────────────────────────

export async function updateTareaEstadoAction(
  id: number,
  estado: "pendiente" | "en_progreso" | "completado",
): Promise<void> {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");

  const { data: before } = await supabase
    .from("tareas")
    .select("estado, titulo")
    .eq("id", id)
    .single();

  const { error } = await supabase.rpc("set_tarea_completed", {
    p_tarea_id: id,
    p_completed: estado === "completado",
    p_resultado: undefined,
  });
  if (error) throw new Error(error.message);

  await recordAuditUpdate(yo.id, "tarea", id, {
    estado: before?.estado ?? "pendiente",
  }, {
    estado,
  }, { empresaId: yo.empresaId, metadata: { action: "estado_change" } });

  revalidatePath("/dashboard");
  revalidatePath("/ordenes");
  revalidatePath("/calendario");
}

// ─── Completar tarea con resultado ───────────────────────────────────────────

export async function completeTareaAction(id: number, resultado?: string): Promise<void> {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");

  const { data: before } = await supabase
    .from("tareas")
    .select("estado, resultado, titulo")
    .eq("id", id)
    .single();

  const { error } = await supabase.rpc("set_tarea_completed", {
    p_tarea_id: id,
    p_completed: true,
    p_resultado: resultado?.trim() || undefined,
  });
  if (error) throw new Error(error.message);

  await recordAuditUpdate(yo.id, "tarea", id, {
    estado: before?.estado ?? "pendiente",
    resultado: before?.resultado,
  }, {
    estado: "completado",
    resultado: resultado?.trim() || null,
  }, { empresaId: yo.empresaId, metadata: { action: "completada" } });

  revalidatePath("/dashboard");
  revalidatePath("/ordenes");
  revalidatePath("/calendario");
}

// ─── Accion unificada para completar tarea o agenda ─────────────────────────

export async function completeTaskAction(input: {
  type: "tarea" | "agenda";
  id: number;
  completed: boolean;
  resultado?: string;
}): Promise<{ success: boolean }> {
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");

  if (input.type === "tarea") {
    const supabase = await createClient();
    const { data: before } = await supabase
      .from("tareas")
      .select("estado, resultado, titulo")
      .eq("id", input.id)
      .single();

    const { error } = await supabase.rpc("set_tarea_completed", {
      p_tarea_id: input.id,
      p_completed: input.completed,
      p_resultado: input.resultado?.trim() || undefined,
    });
    if (error) throw new Error(error.message);

    await recordAuditUpdate(yo.id, "tarea", input.id, {
      estado: before?.estado ?? "pendiente",
      resultado: before?.resultado,
    }, {
      estado: input.completed ? "completado" : before?.estado ?? "pendiente",
      resultado: input.resultado?.trim() || null,
    }, { empresaId: yo.empresaId, metadata: { action: "complete_task" } });
  } else {
    const supabase = await createClient();
    const { data: before } = await supabase
      .from("agenda")
      .select("completed, result, description")
      .eq("id", input.id)
      .single();

    const { error } = await supabase.rpc("set_agenda_completed", {
      p_agenda_id: input.id,
      p_completed: input.completed,
      p_result: input.resultado?.trim() || undefined,
    });
    if (error) throw new Error(error.message);

    await recordAuditUpdate(yo.id, "agenda", input.id, {
      completed: before?.completed ?? false,
      result: before?.result,
    }, {
      completed: input.completed,
      result: input.resultado?.trim() || null,
    }, { empresaId: yo.empresaId, metadata: { action: "complete_task" } });
  }

  revalidatePath("/dashboard");
  revalidatePath("/ordenes");
  revalidatePath("/calendario");
  return { success: true };
}

// ─── Eliminar tarea ───────────────────────────────────────────────────────────

export async function deleteTareaAction(id: number): Promise<void> {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");

  const { data: snapshot } = await supabase
    .from("tareas")
    .select("titulo, prioridad, estado, resultado")
    .eq("id", id)
    .single();

  const { error } = await supabase.rpc("archive_tarea", {
    p_tarea_id: id,
    p_reason: "archived_from_dashboard",
  });
  if (error) throw new Error(error.message);

  await recordAuditDelete(yo.id, "tarea", id, snapshot ?? undefined, { empresaId: yo.empresaId });

  revalidatePath("/dashboard");
  revalidatePath("/ordenes");
  revalidatePath("/calendario");
}

export async function completeAgendaAction(id: number, completed: boolean, result?: string | null): Promise<void> {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");

  const { data: before } = await supabase
    .from("agenda")
    .select("completed, result, description")
    .eq("id", id)
    .single();

  const { error } = await supabase.rpc("set_agenda_completed", {
    p_agenda_id: id,
    p_completed: completed,
    p_result: result?.trim() || undefined,
  });
  if (error) throw new Error(error.message);

  const actionLabel = completed ? "agenda.completada" : "agenda.editada";
  await recordAudit({
    actorId: yo.id,
    action: actionLabel,
    entityType: "agenda",
    entityId: id,
    empresaId: yo.empresaId,
    before: { completed: before?.completed ?? false, result: before?.result },
    after: { completed, result: result?.trim() || null },
  });

  revalidatePath("/dashboard");
  revalidatePath("/ordenes");
  revalidatePath("/calendario");
}

export async function convertTareaToAgendaAction(
  id: number,
  options?: { date?: string; time?: string; assignedUserIds?: number[] },
): Promise<{ id: number }> {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");

  const { data, error } = await supabase.rpc("convert_tarea_to_agenda", {
    p_tarea_id: id,
    p_event_date: normalizeDateKey(options?.date ?? localDateKey()),
    p_time: normalizeTime(options?.time, DEFAULT_ACTIVITY_TIME),
    p_assigned_user_ids: options?.assignedUserIds ?? undefined,
  });
  if (error) throw new Error(error.message);

  await recordAuditCreate(yo.id, "agenda", data.id, {
    converted_from_tarea_id: id,
    event_date: options?.date ?? localDateKey(),
    time: normalizeTime(options?.time, DEFAULT_ACTIVITY_TIME),
  }, { empresaId: yo.empresaId, metadata: { conversion: "tarea_to_agenda", sourceTareaId: id } });

  revalidatePath("/dashboard");
  revalidatePath("/ordenes");
  revalidatePath("/calendario");
  return { id: data.id };
}

export async function convertAgendaToTareaAction(id: number, assignedUserIds?: number[]): Promise<{ id: number }> {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");

  const { data, error } = await supabase.rpc("convert_agenda_to_tarea", {
    p_agenda_id: id,
    p_assigned_user_ids: assignedUserIds ?? undefined,
  });
  if (error) throw new Error(error.message);

  await recordAuditCreate(yo.id, "tarea", data.id, {
    converted_from_agenda_id: id,
  }, { empresaId: yo.empresaId, metadata: { conversion: "agenda_to_tarea", sourceAgendaId: id } });

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
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");

  const { data: snapshot } = await supabase
    .from("agenda")
    .select("description, event_date, time, priority, tipo, completed, result")
    .eq("id", id)
    .single();

  const { error } = await supabase.rpc("archive_agenda", {
    p_agenda_id: id,
    p_reason: "archived_from_dashboard",
  });
  if (error) throw new Error(error.message);

  await recordAuditDelete(yo.id, "agenda", id, snapshot ?? undefined, { empresaId: yo.empresaId });

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
    timeEnd?: string | null;
    priority: string;
    tipo: string;
    assignedUserIds: number[];
    reminderMinutes?: number | null;
  },
): Promise<{ id: number }> {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");

  if (!data.assignedUserIds.length) throw new Error("Debe asignarse al menos un usuario");
  const assignedUserIds = data.assignedUserIds;

  const normalizedStart = normalizeTime(data.time, DEFAULT_ACTIVITY_TIME);
  const normalizedEnd = data.timeEnd ? normalizeTime(data.timeEnd, "") : null;
  if (normalizedEnd && normalizedEnd <= normalizedStart) {
    throw new Error("La hora de fin debe ser posterior a la hora de inicio");
  }

  const { data: agendaRow, error: createError } = await supabase.rpc("create_agenda_activity_v2", {
    p_description: data.description,
    p_event_date: normalizeDateKey(data.eventDate),
    p_time: normalizedStart,
    p_time_end: normalizedEnd ?? undefined,
    p_priority: normalizeActivityPriority(data.priority),
    p_tipo: normalizeActivityType(data.tipo),
    p_completed: false,
    p_result: undefined,
    p_assigned_user_ids: assignedUserIds,
    p_visibility: "private",
    p_reminder_minutes: data.reminderMinutes ?? undefined,
  });

  if (createError) {
    console.error("[convertTareaToAgendaFullAction]", createError.message);
    throw new Error("No se pudo crear la actividad. Revisa fecha, hora y usuarios asignados.");
  }

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

  await recordAuditCreate(yo.id, "agenda", agendaId, {
    description: data.description,
    eventDate: data.eventDate,
    priority: data.priority,
    tipo: data.tipo,
    assignedUserIds,
  }, { empresaId: yo.empresaId, metadata: { conversion: "tarea_to_agenda_full", sourceTareaId: tareaId } });

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
