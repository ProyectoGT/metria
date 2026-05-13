import { createClient } from "@/lib/supabase-browser";
import type { AgendaEvent, AgendaEventsFilters } from "../types";

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

  if (error) throw error;
  return (data ?? []) as unknown as AgendaEvent[];
}
