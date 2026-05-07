import { DEFAULT_ACTIVITY_TIME, normalizeTime } from "@/lib/local-date-time";

export type AgendaEventRow = {
  id: number;
  description?: string | null;
  event_date?: string | null;
  created_at?: string | null;
  time?: string | null;
  tipo?: string | null;
  priority?: string | null;
  completed?: boolean | null;
  result?: string | null;
  user_id?: number | null;
  owner_user_id?: number | null;
  empresa_id?: number | null;
  gcal_event_id?: string | null;
};

export type NormalizedAgendaEvent = {
  id: number;
  title: string;
  description: string | null;
  type: string;
  date: string;
  startAt: string;
  endAt: string | null;
  timeLabel: string;
  userId: number | null;
  ownerUserId: number | null;
  empresaId: number | null;
  source: "agenda";
  syncStatus: string;
  usedCreatedAtFallback: boolean;
};

export function normalizeAgendaEvent(row: AgendaEventRow): NormalizedAgendaEvent {
  const date = (row.event_date ?? "").slice(0, 10);
  const timeLabel = normalizeTime(row.time, DEFAULT_ACTIVITY_TIME);

  return {
    id: row.id,
    title: row.description ?? `Actividad #${row.id}`,
    description: row.result ?? null,
    type: row.tipo ?? "actividad",
    date,
    startAt: date ? `${date}T${timeLabel}:00` : "",
    endAt: null,
    timeLabel,
    userId: row.user_id ?? null,
    ownerUserId: row.owner_user_id ?? null,
    empresaId: row.empresa_id ?? null,
    source: "agenda",
    syncStatus: row.gcal_event_id ? "synced" : "local",
    usedCreatedAtFallback: false,
  };
}
