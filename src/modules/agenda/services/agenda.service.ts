import { createClient } from "@/lib/supabase-browser";
import { throwIfSupabaseError } from "@/modules/shared/services/service-errors";
import type { AgendaEvent, AgendaEventsFilters } from "../types";
import type { Database, Tables } from "@/types/database.types";

type CreateAgendaArgs = Database["public"]["Functions"]["create_agenda_activity_v2"]["Args"];
type UpdateAgendaArgs = Database["public"]["Functions"]["update_agenda_activity_v2"]["Args"];
type ArchiveAgendaArgs = Database["public"]["Functions"]["archive_agenda"]["Args"];
type CompleteAgendaArgs = Database["public"]["Functions"]["set_agenda_completed"]["Args"];
export type AgendaRow = Tables<"agenda">;

export type AgendaCreateInput = {
  description: string;
  eventDate: string;
  time: string;
  timeEnd?: string | null;
  priority?: string;
  tipo?: string;
  completed?: boolean;
  result?: string | null;
  assignedUserIds?: number[];
  visibility?: string;
  reminderMinutes?: number | null;
};

export type AgendaUpdateInput = {
  id: number;
  description?: string;
  eventDate?: string;
  time?: string;
  timeEnd?: string | null;
  priority?: string;
  tipo?: string;
  completed?: boolean;
  result?: string | null;
  assignedUserIds?: number[];
  reminderMinutes?: number | null;
};

export type AgendaDeleteInput = {
  id: number;
  reason?: string;
};

export type AgendaCompleteInput = {
  id: number;
  completed: boolean;
  result?: string | null;
};

// userId is part of the cache key, but RLS decides the actual visible rows.
export async function fetchAgendaEvents(params: AgendaEventsFilters): Promise<AgendaEvent[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("agenda")
    .select(`
      id, description, event_date, time, time_end, priority, tipo,
      completed, result, reminder_minutes_before, gcal_event_id,
      converted_to_tarea_id, owner_user_id, user_id, empresa_id,
      equipo_id, visibility, archived_at, created_at,
      agenda_usuarios(usuario_id, usuarios(nombre, apellidos))
    `)
    .gte("event_date", params.start)
    .lte("event_date", params.end)
    .is("archived_at", null)
    .order("event_date", { ascending: true });

  throwIfSupabaseError(error, "No se pudieron cargar los eventos de agenda");
  return (data ?? []) as unknown as AgendaEvent[];
}

async function create(input: AgendaCreateInput): Promise<AgendaRow> {
  const supabase = createClient();
  const args: CreateAgendaArgs = {
    p_description: input.description,
    p_event_date: input.eventDate,
    p_time: input.time,
    p_time_end: input.timeEnd ?? undefined,
    p_priority: input.priority,
    p_tipo: input.tipo,
    p_completed: input.completed,
    p_result: input.result ?? undefined,
    p_assigned_user_ids: input.assignedUserIds,
    p_visibility: input.visibility,
    p_reminder_minutes: input.reminderMinutes ?? undefined,
  };

  const { data, error } = await supabase.rpc("create_agenda_activity_v2", args);
  throwIfSupabaseError(error, "No se pudo crear la actividad de agenda");
  return data;
}

async function update(input: AgendaUpdateInput): Promise<AgendaRow> {
  const supabase = createClient();
  const args: UpdateAgendaArgs = {
    p_agenda_id: input.id,
    p_description: input.description,
    p_event_date: input.eventDate,
    p_time: input.time,
    p_time_end: input.timeEnd ?? undefined,
    p_priority: input.priority,
    p_tipo: input.tipo,
    p_completed: input.completed,
    p_result: input.result ?? undefined,
    p_assigned_user_ids: input.assignedUserIds,
    p_reminder_minutes: input.reminderMinutes ?? undefined,
  };

  const { data, error } = await supabase.rpc("update_agenda_activity_v2", args);
  throwIfSupabaseError(error, "No se pudo actualizar la actividad de agenda");
  return data;
}

async function archive(input: AgendaDeleteInput): Promise<AgendaRow> {
  const supabase = createClient();
  const args: ArchiveAgendaArgs = {
    p_agenda_id: input.id,
    p_reason: input.reason,
  };

  const { data, error } = await supabase.rpc("archive_agenda", args);
  throwIfSupabaseError(error, "No se pudo eliminar la actividad de agenda");
  return data;
}

async function complete(input: AgendaCompleteInput): Promise<AgendaRow> {
  const supabase = createClient();
  const args: CompleteAgendaArgs = {
    p_agenda_id: input.id,
    p_completed: input.completed,
    p_result: input.result ?? undefined,
  };

  const { data, error } = await supabase.rpc("set_agenda_completed", args);
  throwIfSupabaseError(error, "No se pudo cambiar el estado de la actividad");
  return data;
}

export const agendaService = {
  list: fetchAgendaEvents,
  create,
  update,
  delete: archive,
  complete,
};
