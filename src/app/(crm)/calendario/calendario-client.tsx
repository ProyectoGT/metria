"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Phone, Users, Home, Clock, BookOpen, Star, Activity, Calendar,
  ChevronLeft, ChevronRight, Trash2, Check, Circle, Pencil, CheckCircle2, User, Bell, Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast, Toaster } from "@/components/ui/toast";
import type { UserRole } from "@/lib/roles";
import { normalizeTime, calcDurationMinutes, formatDuration, formatReminderLabel } from "@/lib/local-date-time";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import Drawer from "@/components/ui/drawer";
import { AuditTimelineCard } from "@/components/audit/audit-timeline";
import { useI18n } from "@/lib/i18n";
import { localeLabels } from "@/lib/i18n/config";
import {
  useAgendaItems,
  useCompleteAgendaItem,
  useDeleteAgendaItem,
} from "@/modules/agenda/hooks/use-agenda-items";
import { useCompleteTask, useTasks } from "@/modules/tareas/hooks/use-tasks";
import type { TareaRow } from "@/modules/tareas/services/tareas.service";
import EventFormModal from "./event-form-modal";
import UserMultiFilter from "./UserMultiFilter";

// â"€â"€â"€ Types â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

type AgendaEvent = {
  id: number;
  description: string;
  event_date: string;
  time: string | null;
  time_end: string | null;
  priority: string;
  tipo: string;
  completed: boolean;
  result: string | null;
  reminder_minutes_before: number | null;
  gcal_event_id: string | null;
  tarea_id?: number | null;
  owner_user_id: number | null;
  user_id: number | null;
  empresa_id: number | null;
  equipo_id?: number | null;
  visibility?: string | null;
  archived_at?: string | null;
  archived_reason?: string | null;
  converted_to_tarea_id?: number | null;
  created_at: string;
  agenda_usuarios?: Array<{ usuario_id: number; usuarios?: { nombre: string | null; apellidos: string | null } | null }>;
};

type TareaEvent = {
  id: number;
  titulo: string;
  prioridad: string | null;
  fecha: string;
  estado: string | null;
  owner_user_id: number | null;
};

type GCalEvent = {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  extendedProperties?: {
    private?: {
      source?: string;
      entity?: string;
      agendaId?: string;
    };
  };
};

// FormState moved to event-form-modal.tsx

type ViewMode = "month" | "week";

type Props = {
  initialEvents: AgendaEvent[];
  initialTareas: TareaEvent[];
  isConnected: boolean;
  role: UserRole;
  currentUserId: number;
  empresaId: number | null;
  supervisedIds: number[];
  usersMap: Record<number, string>;
  filterableUsers: Array<{ id: number; name: string }>;
  archivedGoogleEventIds: string[];
};

// â"€â"€â"€ Constants â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

// Static style data â€" labels computed inside component via t()
const TIPOS_META: { value: string; icon: React.ElementType; dot: string; bg: string; text: string; border: string }[] = [
  { value: "visita",      icon: Home,     dot: "bg-emerald-500",  bg: "bg-emerald-500/10",  text: "text-emerald-700 dark:text-emerald-400",  border: "border-emerald-500/30" },
  { value: "llamada",     icon: Phone,    dot: "bg-blue-500",     bg: "bg-blue-500/10",     text: "text-blue-700 dark:text-blue-400",        border: "border-blue-500/30"    },
  { value: "reunion",     icon: Users,    dot: "bg-violet-500",   bg: "bg-violet-500/10",   text: "text-violet-700 dark:text-violet-400",    border: "border-violet-500/30"  },
  { value: "seguimiento", icon: Clock,    dot: "bg-amber-500",    bg: "bg-amber-500/10",    text: "text-amber-700 dark:text-amber-400",      border: "border-amber-500/30"   },
  { value: "formacion",   icon: BookOpen, dot: "bg-indigo-500",   bg: "bg-indigo-500/10",   text: "text-indigo-700 dark:text-indigo-400",    border: "border-indigo-500/30"  },
  { value: "actividad",   icon: Activity, dot: "bg-gray-400",     bg: "bg-gray-500/10",     text: "text-gray-600 dark:text-gray-400",        border: "border-gray-400/30"    },
  { value: "otro",        icon: Star,     dot: "bg-rose-400",     bg: "bg-rose-500/10",     text: "text-rose-700 dark:text-rose-400",        border: "border-rose-400/30"    },
];

const PRIORITY_STYLES = [
  { value: "alta",  dot: "ring-2 ring-red-500",   badge: "bg-red-500/15 text-red-700 dark:text-red-400",       text: "text-red-700 dark:text-red-400" },
  { value: "media", dot: "ring-2 ring-amber-400", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400", text: "text-amber-700 dark:text-amber-400" },
  { value: "baja",  dot: "ring-2 ring-blue-400",  badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400",    text: "text-text-secondary" },
];

// â"€â"€â"€ Helpers â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  const days: { date: Date; currentMonth: boolean }[] = [];
  for (let i = startDow; i > 0; i--) days.push({ date: new Date(year, month, 1 - i), currentMonth: false });
  for (let d = 1; d <= lastDay.getDate(); d++) days.push({ date: new Date(year, month, d), currentMonth: true });
  const needed = Math.ceil(days.length / 7) * 7;
  for (let d = 1; days.length < needed; d++) days.push({ date: new Date(year, month + 1, d), currentMonth: false });
  return days;
}

/** Returns the Monday of the week containing `date` */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

function tipoMeta(tipo: string) {
  return TIPOS_META.find((m) => m.value === tipo) ?? TIPOS_META.find((m) => m.value === "actividad")!;
}

const canSeeOthers = (role: UserRole) =>
  role === "Administrador" || role === "Director" || role === "Responsable";

function agendaAssignedIds(ev: AgendaEvent) {
  return ev.agenda_usuarios?.map((u) => u.usuario_id) ?? [];
}

function toTareaEvent(tarea: TareaRow): TareaEvent | null {
  if (!tarea.fecha) return null;
  return {
    id: tarea.id,
    titulo: tarea.titulo,
    prioridad: tarea.prioridad,
    fecha: tarea.fecha,
    estado: tarea.estado,
    owner_user_id: tarea.owner_user_id,
  };
}

/** Normaliza los campos que pueden venir nulos de la base de datos */
function normalizeCalendarEvent(ev: AgendaEvent): AgendaEvent {
  return {
    ...ev,
    event_date: (ev.event_date ?? "").slice(0, 10) || toDateStr(new Date()),
    time: normalizeTime(ev.time ?? "", "") || null,
    time_end: normalizeTime(ev.time_end ?? "", "") || null,
    tipo: ev.tipo ?? "actividad",
    priority: ev.priority ?? "media",
    description: ev.description ?? `Actividad #${ev.id}`,
    reminder_minutes_before: ev.reminder_minutes_before ?? null,
  };
}

type LocalOverrides<T extends { id: number }> = Record<number, T | null>;

function applyLocalOverrides<T extends { id: number }>(
  serverItems: T[],
  overrides: LocalOverrides<T>,
): T[] {
  const next: T[] = [];
  const seen = new Set<number>();

  for (const item of serverItems) {
    seen.add(item.id);
    const override = overrides[item.id];
    if (override === null) continue;
    next.push(override ?? item);
  }

  for (const [rawId, override] of Object.entries(overrides)) {
    const id = Number(rawId);
    if (override && !seen.has(id)) next.push(override);
  }

  return next;
}

function diffLocalOverrides<T extends { id: number }>(
  serverItems: T[],
  nextItems: T[],
): LocalOverrides<T> {
  const serverById = new Map(serverItems.map((item) => [item.id, item]));
  const nextById = new Map(nextItems.map((item) => [item.id, item]));
  const overrides: LocalOverrides<T> = {};

  for (const [id, item] of nextById) {
    const serverItem = serverById.get(id);
    if (!serverItem || JSON.stringify(serverItem) !== JSON.stringify(item)) {
      overrides[id] = item;
    }
  }

  for (const item of serverItems) {
    if (!nextById.has(item.id)) overrides[item.id] = null;
  }

  return overrides;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalendarioClient({
  initialEvents,
  initialTareas,
  isConnected,
  role,
  currentUserId,
  empresaId,
  supervisedIds,
  usersMap,
  filterableUsers,
  archivedGoogleEventIds,
}: Props) {
  const { t, locale } = useI18n();
  const region = localeLabels[locale].region;

  // Locale-aware helpers
  const TIPOS = useMemo(() => TIPOS_META.map((m) => ({
    ...m,
    label: t(`calendar.tipos.${m.value}`),
  })), [t]);

  const PRIORITIES = useMemo(() => PRIORITY_STYLES.map((p) => ({
    ...p,
    label: t(`statuses.${p.value === "alta" ? "high" : p.value === "media" ? "medium" : "low"}`),
  })), [t]);

  function tipoLabel(tipo: string) {
    return TIPOS.find((tp) => tp.value === tipo)?.label ?? t("calendar.tipos.actividad");
  }

  function priorityMeta(priority: string) {
    return PRIORITIES.find((p) => p.value === priority) ?? PRIORITIES[1];
  }

  // Locale-aware month/weekday helpers (use Intl instead of hardcoded arrays)
  function getMonthName(month: number, year: number): string {
    return new Intl.DateTimeFormat(region, { month: "long" }).format(new Date(year, month, 1));
  }

  function getWeekdayShort(dayIndex: number): string {
    // dayIndex 0=Mon, 6=Sun
    const ref = new Date(2024, 0, 1 + dayIndex); // 2024-01-01 is a Monday
    return new Intl.DateTimeFormat(region, { weekday: "short" }).format(ref).slice(0, 3);
  }

  function getWeekdayLong(dayIndex: number): string {
    const ref = new Date(2024, 0, 1 + dayIndex);
    return new Intl.DateTimeFormat(region, { weekday: "long" }).format(ref);
  }

  const [today] = useState(() => new Date());
  const router = useRouter();

  const [viewMode, setViewMode]       = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [weekStart, setWeekStart]     = useState(() => getWeekStart(today));
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const [eventOverrides, setEventOverrides] = useState<LocalOverrides<AgendaEvent>>({});
  const [tareaOverrides, setTareaOverrides] = useState<LocalOverrides<TareaEvent>>({});

  const [modalOpen, setModalOpen]   = useState(false);
  const [editEvent, setEditEvent]   = useState<AgendaEvent | null>(null);
  const [formInitialDate, setFormInitialDate] = useState(() => toDateStr(new Date()));
  const [detailEvent, setDetailEvent] = useState<AgendaEvent | null>(null);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState<AgendaEvent | null>(null);
  const [deleteId, setDeleteId]     = useState<number | null>(null);
  const [deleting, setDeleting]     = useState(false);
  const [completingAgendaIds, setCompletingAgendaIds] = useState<Set<number>>(new Set());
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<number>>(new Set());

  // Set of user IDs whose events this user is allowed to see.
  // null = unrestricted (Admin / Director — RLS + empresa_id already gates).
  // This is a client-side safety net in case RLS is more permissive than expected.
  const allowedUserIdsSet = useMemo<Set<number> | null>(() => {
    if (role === "Administrador" || role === "Director") return null;
    if (role === "Responsable") return new Set([currentUserId, ...supervisedIds]);
    return new Set([currentUserId]); // Agente
  }, [role, currentUserId, supervisedIds]);

  const isEventAllowed = useCallback((ev: { owner_user_id: number | null; user_id?: number | null; agenda_usuarios?: { usuario_id: number }[] }): boolean => {
    if (!allowedUserIdsSet) return true;
    if (ev.owner_user_id !== null && allowedUserIdsSet.has(ev.owner_user_id)) return true;
    if (ev.user_id != null && allowedUserIdsSet.has(ev.user_id)) return true;
    return (ev.agenda_usuarios ?? []).some((u) => allowedUserIdsSet.has(u.usuario_id));
  }, [allowedUserIdsSet]);

  const agendaRange = useMemo(() => {
    if (viewMode === "week") {
      const end = new Date(weekStart);
      end.setDate(weekStart.getDate() + 6);
      return { start: toDateStr(weekStart), end: toDateStr(end), userId: currentUserId };
    }

    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return { start: toDateStr(start), end: toDateStr(end), userId: currentUserId };
  }, [currentDate, currentUserId, viewMode, weekStart]);

  const agendaItemsQuery = useAgendaItems(agendaRange);
  const tasksQuery = useTasks({
    userId: currentUserId,
    empresaId: empresaId ?? undefined,
    from: agendaRange.start,
    to: agendaRange.end,
    // Agente: restrict at DB level too (defense-in-depth)
    ...(role === "Agente" ? { assignedUserId: currentUserId } : {}),
  });
  const deleteAgendaItem = useDeleteAgendaItem();
  const completeAgendaItem = useCompleteAgendaItem();
  const completeTask = useCompleteTask();

  const serverEvents = useMemo(() => {
    const raw = (agendaItemsQuery.data ?? initialEvents).map(normalizeCalendarEvent);
    // Apply role-based visibility filter on client-fetched data (safety net over RLS)
    if (!allowedUserIdsSet) return raw;
    return raw.filter(isEventAllowed);
  }, [agendaItemsQuery.data, initialEvents, allowedUserIdsSet, isEventAllowed]);

  const serverTareas = useMemo(() => {
    const raw = tasksQuery.data?.map(toTareaEvent).filter((t): t is TareaEvent => t !== null) ?? initialTareas;
    if (!allowedUserIdsSet) return raw;
    return raw.filter((t) => t.owner_user_id !== null && allowedUserIdsSet.has(t.owner_user_id));
  }, [initialTareas, tasksQuery.data, allowedUserIdsSet]);
  const events = useMemo(
    () => applyLocalOverrides(serverEvents, eventOverrides),
    [eventOverrides, serverEvents],
  );
  const tareas = useMemo(
    () => applyLocalOverrides(serverTareas, tareaOverrides),
    [serverTareas, tareaOverrides],
  );
  const setEvents = useCallback<React.Dispatch<React.SetStateAction<AgendaEvent[]>>>(
    (updater) => {
      setEventOverrides((currentOverrides) => {
        const currentEvents = applyLocalOverrides(serverEvents, currentOverrides);
        const nextEvents = typeof updater === "function" ? updater(currentEvents) : updater;
        return diffLocalOverrides(serverEvents, nextEvents);
      });
    },
    [serverEvents],
  );
  const setTareas = useCallback<React.Dispatch<React.SetStateAction<TareaEvent[]>>>(
    (updater) => {
      setTareaOverrides((currentOverrides) => {
        const currentTareas = applyLocalOverrides(serverTareas, currentOverrides);
        const nextTareas = typeof updater === "function" ? updater(currentTareas) : updater;
        return diffLocalOverrides(serverTareas, nextTareas);
      });
    },
    [serverTareas],
  );
  const eventsRef = useRef(events);
  useEffect(() => { eventsRef.current = events; }, [events]);

  // Multi-user filter — empty Set = show all permitted events
  const [filterUserIds, setFilterUserIds] = useState<Set<number>>(new Set());

  const { toasts, toast } = useToast();

  // filterableUsers comes from the server — always complete regardless of events loaded

  // â"€â"€ Apply user filter â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const filteredEvents = useMemo(() => {
    if (filterUserIds.size === 0) return events;
    return events.filter(
      (e) =>
        (e.owner_user_id !== null && filterUserIds.has(e.owner_user_id)) ||
        (e.user_id !== null && filterUserIds.has(e.user_id)) ||
        agendaAssignedIds(e).some((id) => filterUserIds.has(id)),
    );
  }, [events, filterUserIds]);

  const filteredTareas = useMemo(() => {
    if (filterUserIds.size === 0) return tareas;
    return tareas.filter((t) => t.owner_user_id !== null && filterUserIds.has(t.owner_user_id));
  }, [tareas, filterUserIds]);

  // â"€â"€ Calendar data maps â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const calendarDays = useMemo(
    () => getCalendarDays(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate],
  );

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, AgendaEvent[]> = {};
    for (const ev of filteredEvents) {
      const normalized = normalizeCalendarEvent(ev);
      if (!normalized.event_date) continue;
      (map[normalized.event_date] ??= []).push(normalized);
    }
    return map;
  }, [filteredEvents]);

  const localAgendaIds = useMemo(() => new Set(events.map((ev) => String(ev.id))), [events]);

  const syncedGcalIds = useMemo(
    () =>
      new Set(
        events
          .map((e) => e.gcal_event_id)
          .filter((id): id is string => Boolean(id))
      ),
    [events]
  );

  const tareasByDate = useMemo(() => {
    const map: Record<string, TareaEvent[]> = {};
    for (const t of filteredTareas) (map[t.fecha.split("T")[0]] ??= []).push(t);
    return map;
  }, [filteredTareas]);

  // â"€â"€ Google Calendar fetch â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const gcalRange = useMemo(() => {
    let timeMin: string, timeMax: string;
    if (viewMode === "week") {
      timeMin = weekStart.toISOString();
      const we = new Date(weekStart); we.setDate(we.getDate() + 6); we.setHours(23, 59, 59);
      timeMax = we.toISOString();
    } else {
      const year = currentDate.getFullYear(), month = currentDate.getMonth();
      timeMin = new Date(year, month, 1).toISOString();
      timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    }

    return { timeMin, timeMax };
  }, [currentDate, viewMode, weekStart]);

  const gcalEventsQuery = useQuery({
    queryKey: ["google-calendar-events", gcalRange.timeMin, gcalRange.timeMax, archivedGoogleEventIds],
    enabled: isConnected,
    queryFn: async ({ signal }) => {
      let res: Response;
      try {
        res = await fetch(
          `/api/google/events?timeMin=${encodeURIComponent(gcalRange.timeMin)}&timeMax=${encodeURIComponent(gcalRange.timeMax)}`,
          { signal },
        );
      } catch {
        return [];
      }
      if (!res.ok) return [];

      const d = await res.json();
      const items = (d.items ?? []) as GCalEvent[];
      const localAgendaIds = new Set(eventsRef.current.map((ev) => String(ev.id)));
      const archivedGoogleIds = new Set(archivedGoogleEventIds);
      const visibleItems: GCalEvent[] = [];
      const orphanIds: string[] = [];

      for (const item of items) {
        const props = item.extendedProperties?.private;
        const isMetriaAgenda = props?.source === "metria" && props?.entity === "agenda" && props.agendaId;

        if (archivedGoogleIds.has(item.id) || (isMetriaAgenda && !localAgendaIds.has(props.agendaId!))) {
          orphanIds.push(item.id);
          continue;
        }

        visibleItems.push(item);
      }

      await Promise.all(
        orphanIds.map((eventId) =>
          fetch("/api/google/events", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId }),
          }).catch(() => null),
        ),
      );

      return visibleItems;
    },
  });

  const [hiddenGcalEventIds, setHiddenGcalEventIds] = useState<Set<string>>(new Set());
  const gcalEvents = useMemo(() => {
    const hiddenIds = new Set([...hiddenGcalEventIds, ...archivedGoogleEventIds]);
    return (gcalEventsQuery.data ?? []).filter((ev) => !hiddenIds.has(ev.id));
  }, [archivedGoogleEventIds, gcalEventsQuery.data, hiddenGcalEventIds]);
  const setGcalEvents = useCallback<React.Dispatch<React.SetStateAction<GCalEvent[]>>>(
    (updater) => {
      const nextEvents = typeof updater === "function" ? updater(gcalEvents) : updater;
      const nextIds = new Set(nextEvents.map((ev) => ev.id));
      setHiddenGcalEventIds((current) => {
        const next = new Set(current);
        for (const ev of gcalEvents) {
          if (!nextIds.has(ev.id)) next.add(ev.id);
        }
        return next;
      });
    },
    [gcalEvents],
  );

  const gcalByDate = useMemo(() => {
    const map: Record<string, GCalEvent[]> = {};

    for (const ev of gcalEvents) {
      if (syncedGcalIds.has(ev.id)) continue;
      const agendaId = ev.extendedProperties?.private?.agendaId;
      if (agendaId && localAgendaIds.has(agendaId)) continue;

      const d = ev.start.dateTime
        ? utcToMadridDisplay(ev.start.dateTime).date
        : (ev.start.date ?? "");

      (map[d] ??= []).push(ev);
    }

    return map;
  }, [gcalEvents, localAgendaIds, syncedGcalIds]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  function prevPeriod() {
    if (viewMode === "month") {
      setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    } else {
      setWeekStart((d) => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; });
    }
  }

  function nextPeriod() {
    if (viewMode === "month") {
      setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    } else {
      setWeekStart((d) => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; });
    }
  }

  function goToday() {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setWeekStart(getWeekStart(today));
    setSelectedDate(today);
  }

  // When switching to week view, sync weekStart with selectedDate
  function switchView(mode: ViewMode) {
    if (mode === "week") setWeekStart(getWeekStart(selectedDate));
    else setCurrentDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    setViewMode(mode);
  }

  // â"€â"€ Modal â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  function openCreate(date?: Date) {
    setEditEvent(null);
    setFormInitialDate(toDateStr(date ?? selectedDate));
    setModalOpen(true);
  }

  function openEdit(ev: AgendaEvent) {
    setEditEvent(ev);
    setModalOpen(true);
  }

  // â"€â"€ Save â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  // handleSave lives in EventFormModal.

  // â"€â"€ Delete â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  async function handleDelete(eventId?: number) {
    const id = eventId ?? deleteId;
    if (id === null) return;
    setDeleting(true);
    const target = events.find((e) => e.id === id);
    if (target?.gcal_event_id && isConnected) {
      const gcalDelete = await fetch("/api/google/events", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: target.gcal_event_id }) });
      if (!gcalDelete.ok) {
        const data = await gcalDelete.json().catch(() => null);
        toast(data?.error ?? "No se pudo eliminar de Google Calendar", "error");
        setDeleting(false);
        return;
      }
      setGcalEvents((prev) => prev.filter((ev) => ev.id !== target.gcal_event_id));
    }
    try {
      await deleteAgendaItem.mutateAsync({ id, reason: "archived_from_calendar" });
      setEvents((prev) => prev.filter((e) => e.id !== id));
      if (!eventId) setDeleteId(null);
      toast(t("calendar.actividadEliminada"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al eliminar";
      toast("Error al eliminar: " + message, "error");
    }
    setDeleting(false);
  }

  // â"€â"€ Complete tarea â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  async function handleCompleteTarea(id: number) {
    setCompletingTaskIds((prev) => new Set(prev).add(id));
    setTareas((prev) => prev.map((t) => (t.id === id ? { ...t, estado: "completado" } : t)));
    try {
      await completeTask.mutateAsync({ id, completed: true, source: "ordenes" });
      toast(t("tasks.completed"));
    } catch {
      setTareas((prev) => prev.map((t) => (t.id === id ? { ...t, estado: "pendiente" } : t)));
      toast(t("calendar.errorCompletar"), "error");
    } finally {
      setCompletingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  // â"€â"€ Complete agenda â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  async function handleCompleteAgenda(id: number, completed: boolean) {
    setCompletingAgendaIds((prev) => new Set(prev).add(id));
    setEvents((prev) => prev.map((e) => e.id === id ? { ...e, completed } : e));
    try {
      await completeAgendaItem.mutateAsync({ id, completed });
    } catch {
      setEvents((prev) => prev.map((e) => e.id === id ? { ...e, completed: !completed } : e));
      toast(t("calendar.errorCompletar"), "error");
      setCompletingAgendaIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }
    router.refresh();
    toast(completed ? t("calendar.actividadCompletada") : t("calendar.actividadPendiente"));
    setCompletingAgendaIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  // â"€â"€ Derived â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const todayStr        = toDateStr(today);
  const selectedDateStr = toDateStr(selectedDate);
  const deleteTarget    = events.find((e) => e.id === deleteId);

  const showOwner = canSeeOthers(role);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const normalizedInitialEvents = initialEvents.map(normalizeCalendarEvent);
    console.debug("[agenda:calendario:client]", {
      currentUserId,
      role,
      filterUserId,
      receivedEvents: initialEvents.length,
      stateEvents: events.length,
      filteredEvents: filteredEvents.length,
      selectedDateStr,
      selectedDateEvents: eventsByDate[selectedDateStr]?.map((event) => ({
        id: event.id,
        event_date: event.event_date,
        time: event.time,
        user_id: event.user_id,
        owner_user_id: event.owner_user_id,
        description: event.description,
      })) ?? [],
      groupedDateKeys: Object.keys(eventsByDate).sort(),
    });
    console.log("[calendario:client]", {
      initialCount: initialEvents.length,
      initialEvents: initialEvents.slice(0, 10).map((event) => ({
        id: event.id,
        description: event.description,
        event_date: event.event_date,
        time: event.time,
        tipo: event.tipo,
        user_id: event.user_id,
        owner_user_id: event.owner_user_id,
        gcal_event_id: event.gcal_event_id,
      })),
      normalizedCount: events.length,
      normalizedEvents: normalizedInitialEvents.slice(0, 10).map((event) => ({
        id: event.id,
        description: event.description,
        event_date: event.event_date,
        time: event.time,
        tipo: event.tipo,
        user_id: event.user_id,
        owner_user_id: event.owner_user_id,
        gcal_event_id: event.gcal_event_id,
      })),
      selectedDateStr,
      currentWeekStart: toDateStr(weekStart),
      currentMonth: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`,
      eventsByDateKeys: Object.keys(eventsByDate).sort(),
      selectedDayEvents: eventsByDate[selectedDateStr] ?? [],
    });
  }, [currentUserId, role, filterUserId, initialEvents, events.length, filteredEvents.length, selectedDateStr, eventsByDate, weekStart, currentDate]);

  // Period label
  const periodLabel = viewMode === "month"
    ? `${getMonthName(currentDate.getMonth(), currentDate.getFullYear())} ${currentDate.getFullYear()}`
    : (() => {
        const we = new Date(weekStart); we.setDate(we.getDate() + 6);
        const sameMonth = weekStart.getMonth() === we.getMonth();
        if (sameMonth) return `${weekStart.getDate()} - ${we.getDate()} ${getMonthName(we.getMonth(), we.getFullYear())} ${we.getFullYear()}`;
        return `${weekStart.getDate()} ${getMonthName(weekStart.getMonth(), weekStart.getFullYear())} - ${we.getDate()} ${getMonthName(we.getMonth(), we.getFullYear())} ${we.getFullYear()}`;
      })();

  // â"€â"€ Render helpers â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  function renderDayEventDots(dateStr: string) {
    const localEvs = eventsByDate[dateStr] ?? [];
    const gcalEvs  = gcalByDate[dateStr]   ?? [];
    const tareaEvs = tareasByDate[dateStr]  ?? [];
    const total    = localEvs.length + gcalEvs.length + tareaEvs.length;
    if (total === 0) return null;

    return (
      <div className="flex flex-col gap-0.5 overflow-hidden">
        {localEvs.slice(0, 2).map((ev) => {
          const tp = tipoMeta(ev.tipo);
          return (
            <div key={ev.id} className={`group flex items-center gap-1 rounded px-1 py-0.5 ${ev.completed ? "opacity-50" : tp.bg}`}>
              <button
                onClick={(e) => { e.stopPropagation(); handleCompleteAgenda(ev.id, !ev.completed); }}
                className={`shrink-0 ${ev.completed ? "text-green-500" : "text-text-secondary opacity-0 group-hover:opacity-100 hover:text-green-500"}`}
              >
                {completingAgendaIds.has(ev.id)
                  ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  : ev.completed
                    ? <Check className="complete-pop h-2.5 w-2.5" />
                    : <Circle className="h-2.5 w-2.5" />}
              </button>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ev.completed ? "opacity-0" : tp.dot}`} />
              <span className={`truncate text-[10px] font-medium leading-none ${ev.completed ? "line-through text-text-secondary" : tp.text}`}>{ev.description}</span>
            </div>
          );
        })}
        {tareaEvs.slice(0, 1).map((tarea) => (
          <div key={`t-${tarea.id}`} className="flex items-center gap-1 rounded bg-violet-500/10 px-1 py-0.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
            <span className="truncate text-[10px] font-medium leading-none text-violet-700 dark:text-violet-400">{tarea.titulo}</span>
          </div>
        ))}
        {gcalEvs.slice(0, 1).map((ev) => (
          <div key={ev.id} className="flex items-center gap-1 rounded bg-blue-500/10 px-1 py-0.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
            <span className="truncate text-[10px] font-medium leading-none text-blue-700 dark:text-blue-400">{ev.summary}</span>
          </div>
        ))}
        {total > 3 && <span className="pl-1 text-[10px] text-text-secondary">{t("calendar.masEventos", { count: total - 3 })}</span>}
      </div>
    );
  }

  function renderDayActivitiesList(dateStr: string, date: Date) {
    const localEvs = [...(eventsByDate[dateStr] ?? [])].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
    const gcalEvs  = gcalByDate[dateStr]   ?? [];
    const tEvs     = tareasByDate[dateStr] ?? [];
    if (localEvs.length === 0 && gcalEvs.length === 0 && tEvs.length === 0) {
      return (
        <div className="flex flex-col items-center px-4 py-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-text-secondary">
            <Calendar className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-text-primary">{t("calendar.sinActividadesEsteDia")}</p>
          <p className="mt-1 max-w-[240px] text-sm text-text-secondary">{t("calendar.huecoPendiente")}</p>
          <button onClick={() => openCreate(date)} className="mt-4 inline-flex items-center rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-dark">
            {t("calendar.anadirActividad")}
          </button>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {tEvs.map((tarea) => {
          const p = PRIORITIES.find((pr) => pr.value === tarea.prioridad);
          const completada = tarea.estado === "completado";
          const hora = tarea.fecha.includes("T") ? new Date(tarea.fecha).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : null;
          const ownerName = showOwner && tarea.owner_user_id && tarea.owner_user_id !== currentUserId ? usersMap[tarea.owner_user_id] : null;
          return (
            <div key={`tarea-${tarea.id}`} className="group rounded-ds-lg border border-border bg-surface-elevated p-3 shadow-layer-1">
              <div className="flex items-start gap-2">
                <button
                  onClick={() => !completada && handleCompleteTarea(tarea.id)}
                  title={completada ? "Completada" : "Marcar como completada"}
                  className={`mt-0.5 shrink-0 transition-colors ${completada ? "text-green-500 cursor-default" : "text-violet-400 hover:text-green-500"}`}
                >
                  {completingTaskIds.has(tarea.id)
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : completada
                      ? <Check className="complete-pop h-4 w-4" />
                      : <Circle className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium leading-snug ${completada ? "line-through text-text-secondary" : "text-text-primary"}`}>
                    {tarea.titulo}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {hora && <span className="text-xs text-text-secondary">{hora}</span>}
                    <span className="text-[10px] font-medium text-violet-700 dark:text-violet-400">{t("calendar.tarea")}</span>
                    {p && <span className={`text-[10px] font-medium ${p.text}`}>{p.label}</span>}
                    {ownerName && <span className="text-[10px] text-text-secondary">{ownerName}</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {localEvs.map((ev) => {
          const tp = tipoMeta(ev.tipo);
          const p = priorityMeta(ev.priority);
          const Icon = tp.icon;
          const ownerName = showOwner && ev.owner_user_id && ev.owner_user_id !== currentUserId ? usersMap[ev.owner_user_id] : null;
          return (
            <div
              key={ev.id}
              onClick={() => setDetailEvent(ev)}
              className={`group relative cursor-pointer rounded-ds-lg border border-border bg-surface-elevated p-3 shadow-layer-1 transition-colors hover:border-primary/25 hover:bg-surface ${tp.border}`}
            >
              <div className="flex items-start gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleCompleteAgenda(ev.id, !ev.completed); }}
                  title={ev.completed ? "Completada" : "Marcar como completada"}
                  className={`mt-0.5 shrink-0 transition-colors ${ev.completed ? "text-green-500 cursor-default" : "text-text-secondary opacity-0 group-hover:opacity-100 hover:text-green-500"}`}
                >
                  {completingAgendaIds.has(ev.id)
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : ev.completed
                      ? <CheckCircle2 className="complete-pop h-4 w-4" />
                      : <Circle className="h-4 w-4" />}
                </button>
                <div className={`mt-0.5 shrink-0 rounded-md p-1 ${tp.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${tp.text}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium leading-snug ${ev.completed ? "line-through text-text-secondary" : "text-text-primary"}`}>
                    {ev.description}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {ev.time && (
                      <span className="text-xs font-medium text-text-secondary">
                        {ev.time}{ev.time_end ? ` - ${ev.time_end}` : ""}
                        {(() => { const d = calcDurationMinutes(ev.time, ev.time_end); return d ? ` (${formatDuration(d)})` : ""; })()}
                      </span>
                    )}
                    <span className={`text-[10px] font-medium ${tp.text}`}>{tipoLabel(ev.tipo)}</span>
                    <span className={`text-[10px] font-medium ${p.text}`}>{p.label}</span>
                    {ev.reminder_minutes_before != null && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary">
                        <Bell className="h-2.5 w-2.5" />
                        {formatReminderLabel(ev.reminder_minutes_before)}
                      </span>
                    )}
                    {ev.gcal_event_id && <span className="text-[10px] font-medium text-blue-700 dark:text-blue-400">{t("calendar.gcal")}</span>}
                    {ev.completed && <span className="text-[10px] font-medium text-success">{t("calendar.completada")}</span>}
                    {ownerName && <span className="text-[10px] text-text-secondary">{ownerName}</span>}
                  </div>
                  {ev.result && <p className="mt-1.5 text-xs text-text-secondary line-clamp-2">{ev.result}</p>}
                </div>
              </div>
            </div>
          );
        })}
        {gcalEvs.map((ev) => (
          <div key={ev.id} className="rounded-ds-lg border border-border bg-surface-elevated p-3 shadow-layer-1">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 shrink-0 rounded-md bg-blue-500/20 p-1">
                <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary leading-snug">{ev.summary}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {ev.start.dateTime && (
                    <span className="text-xs text-text-secondary">
                      {new Date(ev.start.dateTime).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  <span className="rounded-full bg-blue-100 px-1.5 py-px text-[10px] font-medium text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                    Google Calendar
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // â"€â"€ Render â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  return (
    <>
      {/* Top bar: title + view toggle + filter + Google */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: title + view toggle + filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-text-primary leading-tight">{t("calendar.title")}</h1>
            <p className="text-xs text-text-secondary">{t("calendar.agendaYActividades")}</p>
          </div>
          <div className="flex overflow-hidden rounded-lg border border-border text-sm font-medium">
            <button
              onClick={() => switchView("month")}
              className={`px-4 py-2 transition-colors ${viewMode === "month" ? "bg-primary text-white" : "text-text-secondary hover:bg-background"}`}
            >
              {t("calendar.month")}
            </button>
            <button
              onClick={() => switchView("week")}
              className={`border-l border-border px-4 py-2 transition-colors ${viewMode === "week" ? "bg-primary text-white" : "text-text-secondary hover:bg-background"}`}
            >
              {t("calendar.week")}
            </button>
          </div>

          {/* User filter */}
          {canSeeOthers(role) && filterableUsers.length > 1 ? (
            <UserMultiFilter
              users={filterableUsers}
              selectedIds={filterUserIds}
              onChange={setFilterUserIds}
              currentUserId={currentUserId}
              role={role}
            />
          ) : role === "Agente" ? (
            <span className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-secondary">
              Mis tareas
            </span>
          ) : null}
        </div>

        {/* Right: Google Calendar */}
        <div className="flex items-center gap-3">
          {isConnected ? (
            <>
              <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> {t("calendar.conectado")}
              </span>
              <a href="/api/google/disconnect" className="text-xs text-text-secondary underline-offset-2 hover:underline">
                {t("calendar.desconectar")}
              </a>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-text-secondary">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> {t("calendar.noConectado")}
              </span>
              <a href="/api/google/auth" className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-background">
                {t("calendar.conectarGoogle")}
              </a>
            </>
          )}
        </div>
      </div>

      {/* â"€â"€â"€ MONTH VIEW â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      {viewMode === "month" && (
        <div className="flex flex-col gap-5 lg:flex-row">
          {/* Calendar grid */}
          <div className="flex-1 rounded-2xl border border-border bg-surface shadow-sm">
            {/* Nav */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-text-primary">{periodLabel}</h2>
              <div className="flex items-center gap-1.5">
                <button onClick={prevPeriod} className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-background hover:text-text-primary" aria-label={t("calendar.mesAnterior")}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={goToday} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background">
                  {t("calendar.hoy")}
                </button>
                <button onClick={nextPeriod} className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-background hover:text-text-primary" aria-label={t("calendar.mesSiguiente")}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-text-secondary">{getWeekdayShort(i)}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-border">
              {calendarDays.map(({ date, currentMonth }, i) => {
                const dateStr   = toDateStr(date);
                const isToday    = dateStr === todayStr;
                const isSelected = dateStr === selectedDateStr;
                return (
                  <div
                    key={i}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedDate(new Date(date))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedDate(new Date(date));
                      }
                    }}
                    className={[
                      "flex min-h-[80px] cursor-pointer flex-col gap-1 p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                      !currentMonth ? "opacity-30" : "",
                      isSelected ? "bg-primary/5 ring-1 ring-inset ring-primary" : "hover:bg-background",
                    ].join(" ")}
                  >
                    <span className={[
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      isToday ? "bg-primary text-white font-bold" : "text-text-primary",
                    ].join(" ")}>
                      {date.getDate()}
                    </span>
                    {renderDayEventDots(dateStr)}
                  </div>
                );
              })}
            </div>

          </div>

          {/* Day panel */}
          <div className="w-full shrink-0 rounded-2xl border border-border bg-surface shadow-sm lg:w-80">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">{t("calendar.actividadesDelDia")}</h3>
                <p className="mt-0.5 text-xs text-text-secondary capitalize">
                  {selectedDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
                </p>
              </div>
              <button
                onClick={() => openCreate(selectedDate)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
                aria-label={t("calendar.nuevaActividadLabel")}
              >
                {t("calendar.nuevaPlus")}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {renderDayActivitiesList(selectedDateStr, selectedDate)}
            </div>
          </div>
        </div>
      )}

      {/* â"€â"€â"€ WEEK VIEW â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      {viewMode === "week" && (
        <div className="flex flex-col gap-5 lg:flex-row">
          {/* Calendar grid */}
          <div className="flex-1 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          {/* Nav */}
          <div className="flex items-center justify-between border-b border-border bg-surface-elevated px-6 py-4">
            <h2 className="text-base font-semibold text-text-primary">{periodLabel}</h2>
            <div className="flex items-center gap-1.5">
              <button onClick={prevPeriod} className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-background hover:text-text-primary" aria-label={t("calendar.semanaAnterior")}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={goToday} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background">
                {t("calendar.hoy")}
              </button>
              <button onClick={nextPeriod} className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-background hover:text-text-primary" aria-label={t("calendar.semanaSiguiente")}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Week columns header */}
          <div className="overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-7 divide-x divide-border/70 border-b border-border bg-surface">
            {weekDays.map((date, i) => {
              const dateStr    = toDateStr(date);
              const isToday    = dateStr === todayStr;
              const isSelected = dateStr === selectedDateStr;
              const localEvs  = eventsByDate[dateStr] ?? [];
              const gcalEvs   = gcalByDate[dateStr]   ?? [];
              const tareaEvs  = tareasByDate[dateStr]  ?? [];
              const total      = localEvs.length + gcalEvs.length + tareaEvs.length;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(new Date(date))}
                  className={`flex flex-col items-center gap-1 px-2 py-3 transition-colors hover:bg-surface-elevated ${isSelected ? "bg-primary/5" : ""}`}
                >
                  <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                    {getWeekdayLong(i).slice(0, 3)}
                  </span>
                  <span className={[
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                    isToday ? "bg-primary text-white" : isSelected ? "bg-primary/15 text-primary" : "text-text-primary",
                  ].join(" ")}>
                    {date.getDate()}
                  </span>
                  {total > 0 && (
                    <span className="text-[11px] font-semibold text-primary">
                      {total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Week event rows â€" show all days side by side */}
          <div className="grid min-h-[420px] min-w-[640px] grid-cols-7 divide-x divide-border/70">
            {weekDays.map((date, i) => {
              const dateStr   = toDateStr(date);
              const localEvs  = [...(eventsByDate[dateStr] ?? [])].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
              const gcalEvs   = gcalByDate[dateStr]   ?? [];
              const tEvs      = tareasByDate[dateStr]  ?? [];
              const isToday    = dateStr === todayStr;
              const isSelected = dateStr === selectedDateStr;

              return (
                <div
                  key={i}
                  onClick={() => setSelectedDate(new Date(date))}
                  className={`group min-h-[420px] cursor-pointer p-2.5 transition-colors hover:bg-surface-elevated/60 ${isSelected ? "bg-primary/5" : ""} ${isToday ? "ring-1 ring-inset ring-primary/25" : ""}`}
                >
                  {/* New button on hover */}
                  <button
                    onClick={(e) => { e.stopPropagation(); openCreate(date); }}
                    className="mb-2 flex w-full items-center justify-center rounded-lg border border-dashed border-border py-1 text-xs text-text-secondary opacity-0 transition-all hover:border-primary hover:text-primary group-hover:opacity-100"
                  >
                    +
                  </button>

                  <div className="space-y-1.5">
                    {tEvs.map((tarea) => {
                      const completada = tarea.estado === "completado";
                      const hora = tarea.fecha.includes("T") ? new Date(tarea.fecha).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : null;
                      return (
                        <div
                          key={`t-${tarea.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-start gap-1.5 rounded-md border border-border bg-surface-elevated px-2 py-1.5 shadow-layer-1"
                        >
                          <button
                            onClick={() => !completada && handleCompleteTarea(tarea.id)}
                            className={`mt-0.5 shrink-0 ${completada ? "text-green-500 cursor-default" : "text-violet-400 hover:text-green-500"}`}
                          >
                            {completingTaskIds.has(tarea.id)
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : completada
                                ? <Check className="complete-pop h-3 w-3" />
                                : <Circle className="h-3 w-3" />}
                          </button>
                          <div className="min-w-0">
                            {hora && <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-400">{hora}</p>}
                            <p className={`truncate text-[11px] font-medium leading-tight ${completada ? "line-through text-text-secondary" : "text-text-primary"}`}>
                              {tarea.titulo}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {localEvs.map((ev) => {
                      const tp = tipoMeta(ev.tipo);
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); setDetailEvent(ev); }}
                          className={`group/event flex cursor-pointer items-start gap-1.5 rounded-md border border-border bg-surface-elevated px-2 py-1.5 shadow-layer-1 transition-colors hover:border-primary/25 hover:bg-surface ${tp.border}`}
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCompleteAgenda(ev.id, !ev.completed); }}
                            className={`mt-0.5 shrink-0 ${ev.completed ? "text-green-500" : "text-text-secondary opacity-0 group-hover/event:opacity-100 hover:text-green-500"}`}
                          >
                            {completingAgendaIds.has(ev.id)
                              ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              : ev.completed
                                ? <Check className="complete-pop h-2.5 w-2.5" />
                                : <Circle className="h-2.5 w-2.5" />}
                          </button>
                          <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${tp.dot} ${ev.completed ? "opacity-0" : ""}`} />
                          <div className="min-w-0">
                            {ev.time && <p className={`text-[10px] font-semibold ${tp.text}`}>{ev.time}</p>}
                            <p className={`truncate text-[11px] font-medium leading-tight ${ev.completed ? "line-through text-text-secondary" : "text-text-primary"}`}>
                              {ev.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {gcalEvs.map((ev) => (
                      <div key={ev.id} className="flex items-start gap-1.5 rounded-md border border-border bg-surface-elevated px-2 py-1.5 shadow-layer-1">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                        <div className="min-w-0">
                          {ev.start.dateTime && (
                            <p className="text-[10px] font-semibold text-blue-600">
                              {new Date(ev.start.dateTime).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                          <p className="truncate text-[11px] font-medium leading-tight text-text-primary">{ev.summary}</p>
                        </div>
                      </div>
                    ))}
                    {tEvs.length === 0 && localEvs.length === 0 && gcalEvs.length === 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openCreate(date); }}
                        className="flex w-full items-center justify-center rounded-md border border-dashed border-border py-3 text-xs text-text-secondary opacity-60 transition-all hover:border-primary hover:text-primary hover:opacity-100"
                        title={t("calendar.nuevaActividadLabel")}
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          </div>{/* end overflow-x-auto */}
          </div>{/* end calendar grid */}

          {/* Day panel — right sidebar, identical to month view */}
          <div className="w-full shrink-0 rounded-2xl border border-border bg-surface shadow-sm lg:w-80">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">{t("calendar.actividadesDelDia")}</h3>
                <p className="mt-0.5 text-xs text-text-secondary capitalize">
                  {selectedDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
                </p>
              </div>
              <button
                onClick={() => openCreate(selectedDate)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
                aria-label={t("calendar.nuevaActividadLabel")}
              >
                {t("calendar.nuevaPlus")}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {renderDayActivitiesList(selectedDateStr, selectedDate)}
            </div>
          </div>
        </div>
      )}

            {/* EventFormModal: isolated form state - typing does not re-render CalendarioClient */}
      <EventFormModal
        open={modalOpen}
        editEvent={editEvent}
        initialDate={formInitialDate}
        isConnected={isConnected}
        currentUserId={currentUserId}
        empresaId={empresaId}
        filterableUsers={filterableUsers}
        usersMap={usersMap}
        onClose={() => setModalOpen(false)}
        onEventsChange={setEvents}
        onGcalEventsChange={setGcalEvents}
        toast={toast}
      />

      {/* â"€â"€ Detail Drawer â"€â"€ */}
      <Drawer
        open={detailEvent !== null}
        onClose={() => setDetailEvent(null)}
        title={detailEvent?.description ?? ""}
        subtitle={t("calendar.actividadDeCalendario")}
        width="md"
        headerActions={
          <div className="flex items-center gap-1">
            {detailEvent && !detailEvent.completed && (
              <button
                type="button"
                onClick={(e) => {
                  if (!detailEvent) return;
                  e.stopPropagation();
                  handleCompleteAgenda(detailEvent.id, true);
                  setDetailEvent(null);
                }}
                className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-success/10 hover:text-success"
                aria-label={t("calendar.marcarCompletada")}
                title={t("calendar.marcarCompletada")}
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (!detailEvent) return;
                const ev = detailEvent;
                setDetailEvent(null);
                setTimeout(() => openEdit(ev), 150);
              }}
              className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
              aria-label={t("common.edit")}
            >
              <Pencil className="h-4 w-4" />
            </button>
            {canSeeOthers(role) && (
              <button
                type="button"
                onClick={() => {
                  if (!detailEvent) return;
                  setConfirmDeleteEvent(detailEvent);
                }}
                className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                aria-label={t("common.delete")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        }
      >
        {detailEvent && (
          <div className="space-y-5 px-5 py-5">
            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                const tp = tipoMeta(detailEvent.tipo);
                const p = priorityMeta(detailEvent.priority);
                return (
                  <>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tp.bg} ${tp.text}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {tipoLabel(detailEvent.tipo)}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.badge}`}>
                      {p.label}
                    </span>
                    {detailEvent.completed && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Completada
                      </span>
                    )}
                    {detailEvent.gcal_event_id && (
                      <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-400">{t("calendar.gcal")}</span>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>
                  {new Date(detailEvent.event_date + "T12:00:00").toLocaleDateString("es-ES", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric",
                  })}
                </span>
              </div>
              {detailEvent.time && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>
                    {normalizeTime(detailEvent.time, "")}
                    {detailEvent.time_end && ` - ${normalizeTime(detailEvent.time_end, "")}`}
                    {(() => {
                      const d = calcDurationMinutes(detailEvent.time, detailEvent.time_end);
                      return d ? <span className="ml-1 rounded-full bg-surface-raised px-2 py-0.5 text-xs font-medium">{formatDuration(d)}</span> : null;
                    })()}
                  </span>
                </div>
              )}
              {detailEvent.reminder_minutes_before != null && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Bell className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-primary font-medium">{formatReminderLabel(detailEvent.reminder_minutes_before)}</span>
                </div>
              )}
            </div>

            {(() => {
              const ids = agendaAssignedIds(detailEvent);
              if (ids.length === 0) return null;
              return (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{t("calendar.asignadoA")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ids.map((uid) => (
                      <span key={uid} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        <User className="h-3 w-3" />
                        {usersMap[uid] ?? `Usuario ${uid}`}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {detailEvent.completed && detailEvent.result && (
              <div className="rounded-xl bg-success/8 px-4 py-3">
                <p className="text-xs font-semibold text-success">{t("calendar.resultado")}</p>
                <p className="mt-1 text-sm text-text-primary">{detailEvent.result}</p>
              </div>
            )}

            <AuditTimelineCard
              entityType="agenda"
              entityId={detailEvent.id}
              compact
            />

            <div className="rounded-xl bg-surface-raised px-4 py-3 text-xs text-text-secondary">
              <p>Actividad de calendario · ID: {detailEvent.id}</p>
            </div>
          </div>
        )}
      </Drawer>

      {/* â"€â"€ Detail Delete Confirmation â"€â"€ */}
      {confirmDeleteEvent !== null && (
        <ConfirmDialog
          open
          title={t("calendar.eliminarActividad")}
          description={
            confirmDeleteEvent.gcal_event_id && isConnected
              ? t("calendar.seEliminaGcal")
              : t("calendar.irrecuperable")
          }
          confirmLabel={t("common.delete")}
          pending={deleting}
          onCancel={() => {
            setConfirmDeleteEvent(null);
            setDetailEvent(null);
          }}
          onConfirm={async () => {
            if (!confirmDeleteEvent) return;
            const ev = confirmDeleteEvent;
            setConfirmDeleteEvent(null);
            setDetailEvent(null);
            await handleDelete(ev.id);
          }}
        />
      )}

      {/* â"€â"€ Delete Confirmation (legacy) â"€â"€ */}
      {deleteId !== null && (
        <ConfirmDialog
          open={deleteId !== null}
          title={t("calendar.eliminarActividad")}
          description={
            deleteTarget?.gcal_event_id && isConnected
              ? t("calendar.seEliminaGcal")
              : t("calendar.irrecuperable")
          }
          confirmLabel={t("common.delete")}
          pending={deleting}
          onCancel={() => setDeleteId(null)}
          onConfirm={handleDelete}
        />
      )}

      <Toaster toasts={toasts} />
    </>
  );
}



