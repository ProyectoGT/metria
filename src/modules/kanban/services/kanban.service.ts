import { createClient } from "@/lib/supabase-browser";
import { throwIfSupabaseError } from "@/modules/shared/services/service-errors";
import type { KanbanCardData, KanbanColumnData } from "@/lib/mock/dashboard";
import type { KanbanBoard, KanbanQueryParams } from "../types";
import { combineLocalDateTime, localDateKey, normalizeTime } from "@/lib/local-date-time";
import { normalizeActivityType } from "@/lib/activity-options";

export type KanbanMoveCardInput = {
  dbId: number;
  source: "tarea" | "agenda";
  newEstado: string;
};

type AssignedUserJoin = {
  usuario_id?: number | null;
  usuarios?: { nombre: string | null; apellidos: string | null } | null;
};

function assignedNames(rows: AssignedUserJoin[] | null | undefined) {
  return (rows ?? [])
    .map((row) => `${row.usuarios?.nombre ?? ""} ${row.usuarios?.apellidos ?? ""}`.trim())
    .filter(Boolean);
}

function assignedIds(rows: AssignedUserJoin[] | null | undefined) {
  return (rows ?? [])
    .map((row) => row.usuario_id)
    .filter((id): id is number => typeof id === "number");
}

function normalizePriority(priority: string | null | undefined): "alta" | "media" | "baja" {
  return priority === "alta" || priority === "baja" || priority === "media" ? priority : "media";
}

export async function fetchKanbanBoard(params: KanbanQueryParams): Promise<KanbanBoard> {
  const supabase = createClient();
  const userScope = params.agentIds?.length ? params.agentIds : [params.userId];
  const today = localDateKey();

  const { data: tareas, error: tareasError } = await supabase
    .from("tareas")
    .select(`
      id, titulo, prioridad, fecha, estado, resultado, from_orden_dia,
      tarea_usuarios(usuario_id, usuarios(nombre, apellidos))
    `)
    .eq("empresa_id", params.empresaId)
    .in("estado", ["pendiente", "completado"])
    .is("archived_at", null)
    .order("fecha", { ascending: true, nullsFirst: false });

  throwIfSupabaseError(tareasError, "No se pudo cargar el tablero kanban");

  const { data: agenda, error: agendaError } = await supabase
    .from("agenda")
    .select(`
      id, description, priority, tipo, event_date, time, time_end,
      reminder_minutes_before, completed, result, gcal_event_id,
      agenda_usuarios(usuario_id, usuarios(nombre, apellidos))
    `)
    .eq("empresa_id", params.empresaId)
    .eq("event_date", today)
    .is("archived_at", null)
    .order("time", { ascending: true, nullsFirst: false });

  throwIfSupabaseError(agendaError, "No se pudo cargar la agenda del kanban");

  const pendientes: KanbanCardData[] = [];
  const agendaHoy: KanbanCardData[] = [];

  for (const t of tareas ?? []) {
    const joins = t.tarea_usuarios as AssignedUserJoin[] | null;
    const ids = assignedIds(joins);
    if (ids.length && !ids.some((id) => userScope.includes(id))) continue;

    const card: KanbanCardData = {
      id: `tarea-${t.id}`,
      source: "tarea",
      dbId: t.id,
      title: t.titulo,
      priority: normalizePriority(t.prioridad),
      dueDate: t.fecha ?? undefined,
      resultado: t.resultado as string | null,
      isCompleted: t.estado === "completado",
      assignedUserIds: ids,
      assignedUsers: assignedNames(joins),
      fromOrdenDia: t.from_orden_dia ?? false,
    };

    pendientes.push(card);
  }

  for (const a of agenda ?? []) {
    const joins = a.agenda_usuarios as AssignedUserJoin[] | null;
    const ids = assignedIds(joins);
    if (ids.length && !ids.some((id) => userScope.includes(id))) continue;

    agendaHoy.push({
      id: `agenda-${a.id}`,
      source: "agenda",
      dbId: a.id,
      title: a.description,
      priority: normalizePriority(a.priority),
      tipo: normalizeActivityType(a.tipo),
      dueDate: combineLocalDateTime(a.event_date, normalizeTime(a.time, "09:00")),
      time: normalizeTime(a.time, "09:00"),
      timeEnd: a.time_end ?? null,
      reminderMinutesBefore: a.reminder_minutes_before ?? null,
      assignedUserIds: ids,
      assignedUsers: assignedNames(joins),
      resultado: a.result ?? null,
      isCompleted: a.completed,
      fromOrdenDia: true,
      gcalEventId: a.gcal_event_id ?? null,
    });
  }

  const columns: KanbanColumnData[] = [
    { id: "pendientes", title: "Pendientes", fixed: true, cards: pendientes },
    { id: "en_progreso", title: "Agenda hoy", fixed: true, cards: agendaHoy },
  ];

  return { columns };
}

async function moveCard(input: KanbanMoveCardInput): Promise<void> {
  const supabase = createClient();

  if (input.source === "agenda") {
    const completed = input.newEstado === "completado";
    const { error } = await supabase.rpc("update_agenda_activity_v2", {
      p_agenda_id: input.dbId,
      p_completed: completed,
    });
    throwIfSupabaseError(error, "No se pudo mover la actividad de agenda");
    return;
  }

  const estado = input.newEstado === "completado" ? "completado" : input.newEstado;
  const { error } = await supabase
    .from("tareas")
    .update({ estado })
    .eq("id", input.dbId);
  throwIfSupabaseError(error, "No se pudo mover la tarea");
}

export const kanbanService = {
  getBoard: fetchKanbanBoard,
  moveCard,
};
