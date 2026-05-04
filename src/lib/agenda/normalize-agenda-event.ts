import { DEFAULT_ACTIVITY_TIME, normalizeTime } from "@/lib/local-date-time";
import { utcToMadridDisplay } from "@/lib/dates/timezone";

export type AgendaEventRow = {
  id: number;
  description?: string | null;
  title?: string | null;
  titulo?: string | null;
  event_date?: string | null;
  fecha?: string | null;
  start_at?: string | null;
  end_at?: string | null;
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
  google_event_id?: string | null;
  sync_status?: string | null;
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

function dateFromOptionalIso(value: string | null | undefined) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return utcToMadridDisplay(value).date;
}

export function normalizeAgendaEvent(row: AgendaEventRow): NormalizedAgendaEvent {
  const startDisplay = row.start_at ? utcToMadridDisplay(row.start_at) : null;
  const createdDisplay = row.created_at ? utcToMadridDisplay(row.created_at) : null;
  const date = row.event_date
    ?? dateFromOptionalIso(row.fecha)
    ?? startDisplay?.date
    ?? createdDisplay?.date
    ?? "";
  const timeLabel = normalizeTime(row.time ?? startDisplay?.time ?? createdDisplay?.time, DEFAULT_ACTIVITY_TIME);

  return {
    id: row.id,
    title: row.description ?? row.title ?? row.titulo ?? `Actividad #${row.id}`,
    description: row.result ?? null,
    type: row.tipo ?? "actividad",
    date,
    startAt: row.start_at ?? (date ? `${date}T${timeLabel}:00` : ""),
    endAt: row.end_at ?? null,
    timeLabel,
    userId: row.user_id ?? null,
    ownerUserId: row.owner_user_id ?? null,
    empresaId: row.empresa_id ?? null,
    source: "agenda",
    syncStatus: row.sync_status ?? (row.gcal_event_id || row.google_event_id ? "synced" : "local"),
    usedCreatedAtFallback: !row.event_date && !row.fecha && !row.start_at && Boolean(row.created_at),
  };
}

