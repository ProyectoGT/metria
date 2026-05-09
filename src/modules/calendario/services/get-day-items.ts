import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeAgendaEvent } from "@/modules/calendario/services/normalize-agenda-event";

export type AgendaDayItem = {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  start_at: string;
  end_at: string | null;
  fecha: string;
  hora: string;
  user_id: number | null;
  agente_id: number | null;
  estado: string;
  source: "calendar" | "orden_dia" | "tarea" | "google";
  entity_type: "agenda" | "tarea" | "google";
  entity_id: number | string;
};

type AgendaRow = {
  id: number;
  description: string;
  event_date: string;
  time: string | null;
  tipo: string | null;
  completed: boolean;
  result: string | null;
  gcal_event_id?: string | null;
  user_id: number | null;
  owner_user_id: number | null;
  empresa_id?: number | null;
  created_at?: string | null;
};

export async function getDayItems(
  supabase: SupabaseClient,
  date: string,
): Promise<AgendaDayItem[]> {
  const { data, error } = await supabase
    .from("agenda")
    .select("id, description, event_date, time, tipo, completed, result, gcal_event_id, user_id, owner_user_id, empresa_id, created_at")
    .is("archived_at", null)
    .eq("event_date", date)
    .order("time", { ascending: true, nullsFirst: false });

  if (process.env.NODE_ENV !== "production") {
    if (error) {
      console.error("[getDayItems] Error:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        raw: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
    }
  }
  if (error) throw error;

  return ((data ?? []) as AgendaRow[]).map((row) => {
    const normalized = normalizeAgendaEvent(row);
    return {
      id: `agenda-${row.id}`,
      tipo: normalized.type,
      titulo: normalized.title,
      descripcion: normalized.description,
      start_at: normalized.startAt,
      end_at: null,
      fecha: normalized.date,
      hora: normalized.timeLabel,
      user_id: normalized.ownerUserId,
      agente_id: normalized.userId,
      estado: row.completed ? "completado" : "pendiente",
      source: "calendar",
      entity_type: "agenda",
      entity_id: row.id,
    };
  });
}
