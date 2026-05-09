"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Phone, Users, Home, Clock, BookOpen, Star, Activity, Calendar,
  ChevronLeft, ChevronRight, X, Trash2, Check, Circle, Filter, Pencil, CheckCircle2, User, Bell, Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useToast, Toaster } from "@/components/ui/toast";
import { updateTareaEstadoAction } from "@/app/(crm)/dashboard/actions";
import { saveAgendaGoogleEventIdAction } from "@/app/(crm)/calendario/actions";
import type { UserRole } from "@/lib/roles";
import { DEFAULT_ACTIVITY_TIME, normalizeTime, calcDurationMinutes, formatDuration, formatReminderLabel, REMINDER_OPTIONS } from "@/lib/local-date-time";
import { isActivityPriority, isActivityType, normalizeActivityPriority, normalizeActivityType } from "@/lib/activity-options";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import Drawer from "@/components/ui/drawer";
import { AuditTimelineCard } from "@/components/audit/audit-timeline";

// ─── Types ────────────────────────────────────────────────────────────────────

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

type FormState = {
  description: string;
  event_date: string;
  time: string;
  time_end: string;
  priority: string;
  tipo: string;
  completed: boolean;
  result: string;
  syncToGcal: boolean;
  assignedUserIds: number[];
  reminderMinutes: number | null;
};

type ViewMode = "month" | "week";

type Props = {
  initialEvents: AgendaEvent[];
  initialTareas: TareaEvent[];
  isConnected: boolean;
  role: UserRole;
  currentUserId: number;
  empresaId: number | null;
  usersMap: Record<number, string>;
  filterableUsers: Array<{ id: number; name: string }>;
  archivedGoogleEventIds: string[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS: {
  value: string; label: string; icon: React.ElementType;
  dot: string; bg: string; text: string; border: string;
}[] = [
  { value: "visita",      label: "Visita",      icon: Home,     dot: "bg-emerald-500",  bg: "bg-emerald-500/10",  text: "text-emerald-700 dark:text-emerald-400",  border: "border-emerald-500/30" },
  { value: "llamada",     label: "Llamada",     icon: Phone,    dot: "bg-blue-500",     bg: "bg-blue-500/10",     text: "text-blue-700 dark:text-blue-400",        border: "border-blue-500/30"    },
  { value: "reunion",     label: "Reunion",     icon: Users,    dot: "bg-violet-500",   bg: "bg-violet-500/10",   text: "text-violet-700 dark:text-violet-400",    border: "border-violet-500/30"  },
  { value: "seguimiento", label: "Seguimiento", icon: Clock,    dot: "bg-amber-500",    bg: "bg-amber-500/10",    text: "text-amber-700 dark:text-amber-400",      border: "border-amber-500/30"   },
  { value: "formacion",   label: "Formacion",   icon: BookOpen, dot: "bg-indigo-500",   bg: "bg-indigo-500/10",   text: "text-indigo-700 dark:text-indigo-400",    border: "border-indigo-500/30"  },
  { value: "actividad",   label: "Actividad",   icon: Activity, dot: "bg-gray-400",     bg: "bg-gray-500/10",     text: "text-gray-600 dark:text-gray-400",        border: "border-gray-400/30"    },
  { value: "otro",        label: "Otro",        icon: Star,     dot: "bg-rose-400",     bg: "bg-rose-500/10",     text: "text-rose-700 dark:text-rose-400",        border: "border-rose-400/30"    },
];

const PRIORITIES = [
  { value: "alta",  label: "Alta",  dot: "ring-2 ring-red-500",   badge: "bg-red-500/15 text-red-700 dark:text-red-400"       },
  { value: "media", label: "Media", dot: "ring-2 ring-amber-400", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  { value: "baja",  label: "Baja",  dot: "ring-2 ring-blue-400",  badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400"    },
];

const MONTH_NAMES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const WEEKDAYS_SHORT = ["Lun","Mar","Mie","Jue","Vie","Sab","Dom"];
const WEEKDAYS_LONG  = ["Lunes","Martes","Miercoles","Jueves","Viernes","Sabado","Domingo"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function emptyForm(date?: Date, syncToGcal = false): FormState {
  return {
    description: "",
    event_date: toDateStr(date ?? new Date()),
    time: "",
    time_end: "",
    priority: "media",
    tipo: "actividad",
    completed: false,
    result: "",
    syncToGcal,
    assignedUserIds: [],
    reminderMinutes: null,
  };
}

function tipoMeta(tipo: string) {
  return TIPOS.find((t) => t.value === tipo) ?? TIPOS.find((t) => t.value === "actividad")!;
}

function priorityMeta(priority: string) {
  return PRIORITIES.find((p) => p.value === priority) ?? PRIORITIES[1];
}

const canSeeOthers = (role: UserRole) =>
  role === "Administrador" || role === "Director" || role === "Responsable";

function agendaAssignedIds(ev: AgendaEvent) {
  return ev.agenda_usuarios?.map((u) => u.usuario_id) ?? [];
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalendarioClient({
  initialEvents,
  initialTareas,
  isConnected,
  role,
  currentUserId,
  empresaId,
  usersMap,
  filterableUsers,
  archivedGoogleEventIds,
}: Props) {
  const today = useMemo(() => new Date(), []);
  const router = useRouter();

  const [viewMode, setViewMode]       = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [weekStart, setWeekStart]     = useState(() => getWeekStart(today));
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const [events, setEvents]         = useState<AgendaEvent[]>(() => initialEvents.map(normalizeCalendarEvent));
  const [tareas, setTareas]         = useState<TareaEvent[]>(initialTareas);
  const eventsRef = useRef(events);
  useEffect(() => { eventsRef.current = events; }, [events]);

  const [modalOpen, setModalOpen]   = useState(false);
  const [editId, setEditId]         = useState<number | null>(null);
  const [detailEvent, setDetailEvent] = useState<AgendaEvent | null>(null);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState<AgendaEvent | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(undefined, isConnected));
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [deleteId, setDeleteId]     = useState<number | null>(null);
  const [deleting, setDeleting]     = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [completingAgendaIds, setCompletingAgendaIds] = useState<Set<number>>(new Set());
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<number>>(new Set());

  // Sync events and tareas when server re-renders with fresh data
  useEffect(() => {
    if (saving) return;
    setEvents(initialEvents.map(normalizeCalendarEvent));
  }, [initialEvents, saving]);
  useEffect(() => { setTareas(initialTareas); }, [initialTareas]);
  const [gcalEvents, setGcalEvents] = useState<GCalEvent[]>([]);

  // Filter by user — default "all" for managers, currentUserId for agents
  const [filterUserId, setFilterUserId] = useState<number | "all">(() =>
    canSeeOthers(role) ? "all" : currentUserId
  );

  const supabase = useMemo(() => createClient(), []);
  const { toasts, toast } = useToast();

  // filterableUsers comes from the server — always complete regardless of events loaded

  // ── Apply user filter ──────────────────────────────────────────────────────

  const filteredEvents = useMemo(() =>
    filterUserId === "all" ? events : events.filter((e) => e.owner_user_id === filterUserId || e.user_id === filterUserId || agendaAssignedIds(e).includes(filterUserId)),
    [events, filterUserId]
  );

  const filteredTareas = useMemo(() =>
    filterUserId === "all" ? tareas : tareas.filter((t) => t.owner_user_id === filterUserId),
    [tareas, filterUserId]
  );

  // ── Calendar data maps ─────────────────────────────────────────────────────

  const calendarDays = useMemo(
    () => getCalendarDays(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate],
  );

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, AgendaEvent[]> = {};
    for (const ev of filteredEvents) (map[ev.event_date] ??= []).push(ev);
    return map;
  }, [filteredEvents]);

  const syncedGcalIds = useMemo(
    () =>
      new Set(
        events
          .filter((e) => e.owner_user_id === currentUserId)
          .map((e) => e.gcal_event_id)
          .filter((id): id is string => Boolean(id))
      ),
    [events, currentUserId]
  );

  const gcalByDate = useMemo(() => {
    const map: Record<string, GCalEvent[]> = {};

    for (const ev of gcalEvents) {
      if (syncedGcalIds.has(ev.id)) continue;

      const d = ev.start.dateTime
        ? ev.start.dateTime.split("T")[0]
        : (ev.start.date ?? "");

      (map[d] ??= []).push(ev);
    }

    return map;
  }, [gcalEvents, syncedGcalIds]);

  const tareasByDate = useMemo(() => {
    const map: Record<string, TareaEvent[]> = {};
    for (const t of filteredTareas) (map[t.fecha.split("T")[0]] ??= []).push(t);
    return map;
  }, [filteredTareas]);

  // ── Google Calendar fetch ──────────────────────────────────────────────────

  const gcalAbortRef = useRef<AbortController | null>(null);

  const fetchGcalEvents = useCallback(async () => {
    if (!isConnected) return;

    gcalAbortRef.current?.abort();
    const controller = new AbortController();
    gcalAbortRef.current = controller;

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

    let res: Response;
    try {
      res = await fetch(
        `/api/google/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
        { signal: controller.signal },
      );
    } catch {
      return; // abortado o error de red
    }
    if (!res.ok) return;

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

    if (controller.signal.aborted) return;
    setGcalEvents(visibleItems);

    await Promise.all(
      orphanIds.map((eventId) =>
        fetch("/api/google/events", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId }),
        }).catch(() => null),
      ),
    );
  }, [isConnected, currentDate, weekStart, viewMode, archivedGoogleEventIds]);

  useEffect(() => { fetchGcalEvents(); }, [fetchGcalEvents]);

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

  // ── Modal ──────────────────────────────────────────────────────────────────

  function openCreate(date?: Date) {
    setEditId(null);
    setForm({ ...emptyForm(date ?? selectedDate, isConnected), assignedUserIds: [currentUserId] });
    setSaveError(null);
    setModalOpen(true);
  }

  function openEdit(ev: AgendaEvent) {
    setEditId(ev.id);
    setForm({
      description: ev.description,
      event_date: ev.event_date,
      time: ev.time ?? "",
      time_end: ev.time_end ?? "",
      priority: ev.priority,
      tipo: ev.tipo ?? "actividad",
      completed: ev.completed,
      result: ev.result ?? "",
      syncToGcal: false,
      assignedUserIds: agendaAssignedIds(ev).length ? agendaAssignedIds(ev) : [ev.owner_user_id ?? currentUserId],
      reminderMinutes: ev.reminder_minutes_before ?? null,
    });
    setSaveError(null); setModalOpen(true);
  }

  function toggleAssignedUser(userId: number) {
    setForm((prev) => {
      const exists = prev.assignedUserIds.includes(userId);
      const next = exists
        ? prev.assignedUserIds.filter((id) => id !== userId)
        : [...prev.assignedUserIds, userId];
      return { ...prev, assignedUserIds: next.length ? next : prev.assignedUserIds };
    });
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    const priority = normalizeActivityPriority(form.priority);
    const tipo = normalizeActivityType(form.tipo);

    if (!form.description.trim()) return;
    if (!isActivityPriority(priority) || !isActivityType(tipo)) {
      setSaveError("Prioridad o tipo de actividad no validos");
      return;
    }
    if (form.assignedUserIds.length === 0) {
      setSaveError("Debes asignar al menos un usuario");
      return;
    }
    setSaving(true); setSaveError(null);

    // Validar hora de fin si se introduce
    const normalizedEnd = form.time_end ? normalizeTime(form.time_end, "") : null;
    const normalizedStart = normalizeTime(form.time, DEFAULT_ACTIVITY_TIME);
    if (normalizedEnd && normalizedEnd <= normalizedStart) {
      setSaveError("La hora de fin debe ser posterior a la hora de inicio");
      setSaving(false);
      return;
    }
    // Validar recordatorio requiere hora inicio
    if (form.reminderMinutes != null && !form.time.trim()) {
      setSaveError("Se requiere hora de inicio para configurar un recordatorio");
      setSaving(false);
      return;
    }

    const payload = {
      description: form.description.trim(),
      event_date: form.event_date,
      time: normalizedStart,
      time_end: normalizedEnd,
      priority,
      tipo,
      completed: form.completed,
      result: form.result || null,
      reminderMinutes: form.reminderMinutes,
    };
    const previousEvents = events;
    const optimisticId = editId ?? -Date.now();
    const optimisticEvent = normalizeCalendarEvent({
      id: optimisticId,
      description: payload.description,
      event_date: payload.event_date,
      time: payload.time,
      time_end: payload.time_end,
      priority: payload.priority,
      tipo: payload.tipo,
      completed: payload.completed,
      result: payload.result,
      reminder_minutes_before: payload.reminderMinutes,
      gcal_event_id: editId !== null ? events.find((event) => event.id === editId)?.gcal_event_id ?? null : null,
      owner_user_id: currentUserId,
      user_id: currentUserId,
      empresa_id: empresaId,
      created_at: new Date().toISOString(),
      agenda_usuarios: form.assignedUserIds.map((usuario_id) => ({ usuario_id, usuarios: null })),
    });

    setEvents((prev) =>
      editId !== null
        ? prev.map((event) => event.id === editId ? { ...event, ...optimisticEvent, id: editId } : event)
        : [...prev, optimisticEvent].sort((a, b) => a.event_date.localeCompare(b.event_date)),
    );
    setModalOpen(false);

    async function insertOrUpdate(p: typeof payload) {
      const assignedUserIds = form.assignedUserIds.length ? form.assignedUserIds : [currentUserId];
      if (editId !== null) {
        return supabase.rpc("update_agenda_activity", {
          p_agenda_id: editId,
          p_description: p.description,
          p_event_date: p.event_date,
          p_time: p.time,
          p_time_end: p.time_end ?? undefined,
          p_priority: p.priority,
          p_tipo: p.tipo,
          p_completed: p.completed,
          p_result: p.result ?? undefined,
          p_assigned_user_ids: assignedUserIds,
          p_reminder_minutes: p.reminderMinutes ?? -1,
        });
      }
      return supabase.rpc("create_agenda_activity_v2", {
        p_description: p.description,
        p_event_date: p.event_date,
        p_time: p.time,
        p_time_end: p.time_end ?? undefined,
        p_priority: p.priority,
        p_tipo: p.tipo,
        p_completed: p.completed,
        p_result: p.result ?? undefined,
        p_assigned_user_ids: assignedUserIds,
        p_visibility: "private",
        p_reminder_minutes: p.reminderMinutes ?? undefined,
      });
    }

    if (editId !== null) {
      const previousEvent = events.find((event) => event.id === editId);
      const { data, error } = await insertOrUpdate(payload);
      if (error) {
        setEvents(previousEvents);
        setSaveError(error.message);
        toast(error.message, "error");
      }
      else if (data) {
        const updated: AgendaEvent = {
          ...(data as unknown as AgendaEvent),
          agenda_usuarios: form.assignedUserIds.map((usuario_id) => ({ usuario_id, usuarios: null })),
        };
        const normalizedUpdated = normalizeCalendarEvent(updated);
        const googleEventId = normalizedUpdated.gcal_event_id ?? previousEvent?.gcal_event_id ?? null;

        if (isConnected && googleEventId) {
          const gcalRes = await fetch("/api/google/events", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventId: googleEventId,
              summary: payload.description,
              description: payload.result ?? "",
              date: payload.event_date,
              time: payload.time,
              timeEnd: payload.time_end ?? undefined,
              agendaId: editId,
              reminderMinutes: payload.reminderMinutes ?? undefined,
            }),
          });

          if (!gcalRes.ok) {
            const gcalData = await gcalRes.json().catch(() => null);
            toast(
              `Actividad actualizada en CRM, pero no en Google Calendar: ${gcalData?.error ?? "error de sincronizacion"}`,
              "error",
            );
          } else {
            setGcalEvents((prev) =>
              prev.map((event) =>
                event.id === googleEventId
                  ? {
                      ...event,
                      summary: payload.description,
                      start: { ...event.start, dateTime: `${payload.event_date}T${payload.time}:00` },
                    }
                  : event,
              ),
            );
          }
        }

        setEvents((prev) => prev.map((e) => e.id === editId ? normalizedUpdated : e));
        router.refresh();
        toast("Actividad actualizada");
      }
    } else {
      const { data, error } = await insertOrUpdate(payload);
      if (error) {
        setEvents(previousEvents);
        setSaveError(error.message);
        toast(error.message, "error");
      }
      else if (data) {
        let saved: AgendaEvent = {
          ...(data as unknown as AgendaEvent),
          agenda_usuarios: form.assignedUserIds.map((usuario_id) => ({ usuario_id, usuarios: null })),
        };
        saved = normalizeCalendarEvent(saved);

        setEvents((prev) =>
          [...prev.filter((event) => event.id !== optimisticId && event.id !== saved.id), saved]
            .sort((a, b) => a.event_date.localeCompare(b.event_date))
        );

        if (isConnected && form.syncToGcal) {
          const gcalRes = await fetch("/api/google/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              summary: form.description,
              date: form.event_date,
              time: normalizeTime(form.time, DEFAULT_ACTIVITY_TIME),
              timeEnd: form.time_end || undefined,
              agendaId: saved.id,
              reminderMinutes: form.reminderMinutes ?? undefined,
            }),
          });
          if (gcalRes.ok) {
            const gcalData = await gcalRes.json();
            if (gcalData.id) {
              const localAgendaId = saved.id;
              const googleEventId = gcalData.id;
              if (process.env.NODE_ENV !== "production") {
                console.log("[calendario] intentando guardar gcal_event_id", {
                  localAgendaId,
                  googleEventId,
                  currentUserId,
                  empresaId,
                });
              }

              const syncUpdateResult = await saveAgendaGoogleEventIdAction(localAgendaId, googleEventId);
              if (!syncUpdateResult.success) {
                const syncUpdateError = syncUpdateResult.error;
                if (process.env.NODE_ENV !== "production") {
                  console.error("[calendario] Error guardando gcal_event_id:", {
                    message: syncUpdateError?.message,
                    details: syncUpdateError?.details,
                    hint: syncUpdateError?.hint,
                    code: syncUpdateError?.code,
                    raw: JSON.stringify(syncUpdateError, Object.getOwnPropertyNames(syncUpdateError)),
                  });
                }
                toast(
                  `Actividad guardada en CRM, pero no enlazada con Google Calendar: ${syncUpdateError.message}`,
                  "error",
                );
              } else {
                saved = normalizeCalendarEvent({ ...saved, gcal_event_id: syncUpdateResult.data.gcal_event_id });
                setEvents((prev) => prev.map((event) => event.id === saved.id ? saved : event));
              }
            }
          } else {
            const gcalData = await gcalRes.json().catch(() => null);
            const message = gcalData?.error ?? "No se pudo sincronizar con Google Calendar";
            toast(`Actividad guardada localmente. ${message}`, "error");
          }
        }
        router.refresh();
        toast("Actividad creada");
      }
    }
    setSaving(false);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

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
    const { error } = await supabase.rpc("archive_agenda", { p_agenda_id: id, p_reason: "archived_from_calendar" });
    if (error) toast("Error al eliminar: " + error.message, "error");
    else { setEvents((prev) => prev.filter((e) => e.id !== id)); if (!eventId) setDeleteId(null); toast("Actividad eliminada"); }
    setDeleting(false);
  }

  // ── Complete tarea ─────────────────────────────────────────────────────────

  async function handleCompleteTarea(id: number) {
    setCompletingTaskIds((prev) => new Set(prev).add(id));
    setTareas((prev) => prev.map((t) => (t.id === id ? { ...t, estado: "completado" } : t)));
    try {
      await updateTareaEstadoAction(id, "completado");
      toast("Tarea completada");
    } catch {
      setTareas((prev) => prev.map((t) => (t.id === id ? { ...t, estado: "pendiente" } : t)));
      toast("Error al completar la tarea", "error");
    } finally {
      setCompletingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  // ── Complete agenda ────────────────────────────────────────────────────────

  async function handleCompleteAgenda(id: number, completed: boolean) {
    setCompletingAgendaIds((prev) => new Set(prev).add(id));
    setEvents((prev) => prev.map((e) => e.id === id ? { ...e, completed } : e));
    const { error } = await supabase.rpc("set_agenda_completed", {
      p_agenda_id: id,
      p_completed: completed,
      p_result: undefined,
    });
    if (error) {
      setEvents((prev) => prev.map((e) => e.id === id ? { ...e, completed: !completed } : e));
      toast("Error al completar la actividad", "error");
      setCompletingAgendaIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }
    router.refresh();
    toast(completed ? "Actividad completada" : "Actividad pendiente");
    setCompletingAgendaIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const todayStr        = toDateStr(today);
  const selectedDateStr = toDateStr(selectedDate);
  const deleteTarget    = events.find((e) => e.id === deleteId);

  const showOwner = canSeeOthers(role);

  // Period label
  const periodLabel = viewMode === "month"
    ? `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : (() => {
        const we = new Date(weekStart); we.setDate(we.getDate() + 6);
        const sameMonth = weekStart.getMonth() === we.getMonth();
        if (sameMonth) return `${weekStart.getDate()} – ${we.getDate()} ${MONTH_NAMES[we.getMonth()]} ${we.getFullYear()}`;
        return `${weekStart.getDate()} ${MONTH_NAMES[weekStart.getMonth()]} – ${we.getDate()} ${MONTH_NAMES[we.getMonth()]} ${we.getFullYear()}`;
      })();

  // ── Render helpers ─────────────────────────────────────────────────────────

  function DayEventDots({ dateStr }: { dateStr: string }) {
    const localEvs = eventsByDate[dateStr] ?? [];
    const gcalEvs  = gcalByDate[dateStr]   ?? [];
    const tareaEvs = tareasByDate[dateStr]  ?? [];
    const total    = localEvs.length + gcalEvs.length + tareaEvs.length;
    if (total === 0) return null;

    return (
      <div className="flex flex-col gap-0.5 overflow-hidden">
        {localEvs.slice(0, 2).map((ev) => {
          const t = tipoMeta(ev.tipo);
          return (
            <div key={ev.id} className={`group flex items-center gap-1 rounded px-1 py-0.5 ${ev.completed ? "opacity-50" : t.bg}`}>
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
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ev.completed ? "opacity-0" : t.dot}`} />
              <span className={`truncate text-[10px] font-medium leading-none ${ev.completed ? "line-through text-text-secondary" : t.text}`}>{ev.description}</span>
            </div>
          );
        })}
        {tareaEvs.slice(0, 1).map((t) => (
          <div key={`t-${t.id}`} className="flex items-center gap-1 rounded bg-violet-500/10 px-1 py-0.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
            <span className="truncate text-[10px] font-medium leading-none text-violet-700 dark:text-violet-400">{t.titulo}</span>
          </div>
        ))}
        {gcalEvs.slice(0, 1).map((ev) => (
          <div key={ev.id} className="flex items-center gap-1 rounded bg-blue-500/10 px-1 py-0.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
            <span className="truncate text-[10px] font-medium leading-none text-blue-700 dark:text-blue-400">{ev.summary}</span>
          </div>
        ))}
        {total > 3 && <span className="pl-1 text-[10px] text-text-secondary">+{total - 3} mas</span>}
      </div>
    );
  }

  function DayActivitiesList({ dateStr, date }: { dateStr: string; date: Date }) {
    const localEvs = [...(eventsByDate[dateStr] ?? [])].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
    const gcalEvs  = gcalByDate[dateStr]   ?? [];
    const tEvs     = tareasByDate[dateStr] ?? [];
    if (localEvs.length === 0 && gcalEvs.length === 0 && tEvs.length === 0) {
      return (
        <div className="flex flex-col items-center py-12">
          <Calendar className="mb-3 h-10 w-10 text-text-secondary/30" />
          <p className="text-sm text-text-secondary">Sin actividades este dia</p>
          <button onClick={() => openCreate(date)} className="mt-3 text-xs font-medium text-primary hover:underline">
            + Anadir actividad
          </button>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {tEvs.map((t) => {
          const p = PRIORITIES.find((pr) => pr.value === t.prioridad);
          const completada = t.estado === "completado";
          const hora = t.fecha.includes("T") ? new Date(t.fecha).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : null;
          const ownerName = showOwner && t.owner_user_id && t.owner_user_id !== currentUserId ? usersMap[t.owner_user_id] : null;
          return (
            <div key={`tarea-${t.id}`} className="group rounded-xl border border-violet-500/30 bg-violet-500/8 p-3">
              <div className="flex items-start gap-2">
                <button
                  onClick={() => !completada && handleCompleteTarea(t.id)}
                  title={completada ? "Completada" : "Marcar como completada"}
                  className={`mt-0.5 shrink-0 transition-colors ${completada ? "text-green-500 cursor-default" : "text-violet-400 hover:text-green-500"}`}
                >
                  {completingTaskIds.has(t.id)
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : completada
                      ? <Check className="complete-pop h-4 w-4" />
                      : <Circle className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium leading-snug ${completada ? "line-through text-text-secondary" : "text-text-primary"}`}>
                    {t.titulo}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {hora && <span className="text-xs text-text-secondary">{hora}</span>}
                    <span className="rounded-full bg-violet-500/15 px-1.5 py-px text-[10px] font-medium text-violet-700 dark:text-violet-400">Tarea</span>
                    {p && <span className={`rounded-full px-1.5 py-px text-[10px] font-medium ${p.badge}`}>{p.label}</span>}
                    {ownerName && <span className="text-[10px] text-text-secondary">{ownerName}</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {localEvs.map((ev) => {
          const t = tipoMeta(ev.tipo);
          const p = priorityMeta(ev.priority);
          const Icon = t.icon;
          const ownerName = showOwner && ev.owner_user_id && ev.owner_user_id !== currentUserId ? usersMap[ev.owner_user_id] : null;
          return (
            <div
              key={ev.id}
              onClick={() => setDetailEvent(ev)}
              className={`group relative cursor-pointer rounded-xl border p-3 transition-colors hover:brightness-95 ${t.bg} ${t.border}`}
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
                <div className={`mt-0.5 shrink-0 rounded-md p-1 ${t.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${t.text}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium leading-snug ${ev.completed ? "line-through text-text-secondary" : "text-text-primary"}`}>
                    {ev.description}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {ev.time && (
                      <span className="text-xs font-medium text-text-secondary">
                        {ev.time}{ev.time_end ? ` – ${ev.time_end}` : ""}
                        {(() => { const d = calcDurationMinutes(ev.time, ev.time_end); return d ? ` (${formatDuration(d)})` : ""; })()}
                      </span>
                    )}
                    <span className={`rounded-full px-1.5 py-px text-[10px] font-medium ${t.bg} ${t.text}`}>{t.label}</span>
                    <span className={`rounded-full px-1.5 py-px text-[10px] font-medium ${p.badge}`}>{p.label}</span>
                    {ev.reminder_minutes_before != null && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-medium text-primary">
                        <Bell className="h-2.5 w-2.5" />
                        {formatReminderLabel(ev.reminder_minutes_before)}
                      </span>
                    )}
                    {ev.gcal_event_id && <span className="rounded-full bg-blue-500/15 px-1.5 py-px text-[10px] font-medium text-blue-700 dark:text-blue-400">GCal</span>}
                    {ev.completed && <span className="rounded-full bg-success/15 px-1.5 py-px text-[10px] font-medium text-success">Completada</span>}
                    {ownerName && <span className="text-[10px] text-text-secondary">{ownerName}</span>}
                  </div>
                  {ev.result && <p className="mt-1.5 text-xs text-text-secondary line-clamp-2">{ev.result}</p>}
                </div>
              </div>
            </div>
          );
        })}
        {gcalEvs.map((ev) => (
          <div key={ev.id} className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Top bar: title + view toggle + filter + Google */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: title + view toggle + filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-text-primary leading-tight">Calendario</h1>
            <p className="text-xs text-text-secondary">Agenda y actividades</p>
          </div>
          <div className="flex overflow-hidden rounded-lg border border-border text-sm font-medium">
            <button
              onClick={() => switchView("month")}
              className={`px-4 py-2 transition-colors ${viewMode === "month" ? "bg-primary text-white" : "text-text-secondary hover:bg-background"}`}
            >
              Mes
            </button>
            <button
              onClick={() => switchView("week")}
              className={`border-l border-border px-4 py-2 transition-colors ${viewMode === "week" ? "bg-primary text-white" : "text-text-secondary hover:bg-background"}`}
            >
              Semana
            </button>
          </div>

          {/* User filter (managers only) */}
          {canSeeOthers(role) && filterableUsers.length > 1 && (
            <div className="relative" onKeyDown={(e) => { if (e.key === "Escape") setFilterOpen(false); }}>
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  filterUserId !== "all"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-text-secondary hover:bg-background"
                }`}
                aria-label="Filtrar por usuario"
                aria-expanded={filterOpen}
                aria-haspopup="listbox"
              >
                <Filter className="h-4 w-4" />
                {filterUserId === "all" ? "Todos" : (usersMap[filterUserId as number] ?? "Usuario")}
                {filterUserId !== "all" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setFilterUserId("all"); }}
                    className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-primary hover:bg-primary/30"
                    aria-label="Quitar filtro"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </button>
              {filterOpen && (
                <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-xl border border-border bg-surface shadow-lg" role="listbox" aria-label="Filtrar por usuario">
                  <div className="py-1">
                    <button
                      onClick={() => { setFilterUserId("all"); setFilterOpen(false); }}
                      role="option"
                      aria-selected={filterUserId === "all"}
                      className={`flex w-full items-center px-4 py-2.5 text-sm transition-colors hover:bg-background ${filterUserId === "all" ? "font-semibold text-primary" : "text-text-primary"}`}
                    >
                      Todos los usuarios
                    </button>
                    {filterableUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => { setFilterUserId(u.id); setFilterOpen(false); }}
                        role="option"
                        aria-selected={filterUserId === u.id}
                        className={`flex w-full items-center px-4 py-2.5 text-sm transition-colors hover:bg-background ${filterUserId === u.id ? "font-semibold text-primary" : "text-text-primary"}`}
                      >
                        {u.name}
                        {u.id === currentUserId && (
                          <span className="ml-1.5 text-xs text-text-secondary">(yo)</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Google Calendar */}
        <div className="flex items-center gap-3">
          {isConnected ? (
            <>
              <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Conectado
              </span>
              <a href="/api/google/disconnect" className="text-xs text-text-secondary underline-offset-2 hover:underline">
                Desconectar
              </a>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-text-secondary">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> No conectado
              </span>
              <a href="/api/google/auth" className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-background">
                Conectar Google Calendar
              </a>
            </>
          )}
        </div>
      </div>

      {/* ─── MONTH VIEW ────────────────────────────────────────────────────────── */}
      {viewMode === "month" && (
        <div className="flex flex-col gap-5 lg:flex-row">
          {/* Calendar grid */}
          <div className="flex-1 rounded-2xl border border-border bg-surface shadow-sm">
            {/* Nav */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-text-primary">{periodLabel}</h2>
              <div className="flex items-center gap-1.5">
                <button onClick={prevPeriod} className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-background hover:text-text-primary" aria-label="Mes anterior">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={goToday} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background">
                  Hoy
                </button>
                <button onClick={nextPeriod} className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-background hover:text-text-primary" aria-label="Mes siguiente">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {WEEKDAYS_SHORT.map((d) => (
                <div key={d} className="py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-text-secondary">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-border">
              {calendarDays.map(({ date, currentMonth }, i) => {
                const dateStr   = toDateStr(date);
                const isToday    = dateStr === todayStr;
                const isSelected = dateStr === selectedDateStr;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(new Date(date))}
                    className={[
                      "flex min-h-[80px] flex-col gap-1 p-2 text-left transition-colors",
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
                    <DayEventDots dateStr={dateStr} />
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 border-t border-border px-6 py-3">
              {TIPOS.map((t) => (
                <div key={t.value} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${t.dot}`} />
                  <span className="text-xs text-text-secondary">{t.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-violet-500" />
                <span className="text-xs text-text-secondary">Tarea</span>
              </div>
              {isConnected && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-xs text-text-secondary">Google Calendar</span>
                </div>
              )}
            </div>
          </div>

          {/* Day panel */}
          <div className="w-full shrink-0 rounded-2xl border border-border bg-surface shadow-sm lg:w-80">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Actividades del dia</h3>
                <p className="mt-0.5 text-xs text-text-secondary capitalize">
                  {selectedDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
                </p>
              </div>
              <button
                onClick={() => openCreate(selectedDate)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
                aria-label="Nueva actividad"
              >
                + Nueva
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <DayActivitiesList dateStr={selectedDateStr} date={selectedDate} />
            </div>
          </div>
        </div>
      )}

      {/* ─── WEEK VIEW ─────────────────────────────────────────────────────────── */}
      {viewMode === "week" && (
        <div className="rounded-2xl border border-border bg-surface shadow-sm">
          {/* Nav */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-base font-semibold text-text-primary">{periodLabel}</h2>
            <div className="flex items-center gap-1.5">
              <button onClick={prevPeriod} className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-background hover:text-text-primary" aria-label="Semana anterior">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={goToday} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background">
                Hoy
              </button>
              <button onClick={nextPeriod} className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-background hover:text-text-primary" aria-label="Semana siguiente">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Week columns header */}
          <div className="overflow-x-auto">
          <div className="grid grid-cols-7 divide-x divide-border border-b border-border min-w-[560px]">
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
                  className={`flex flex-col items-center gap-1 px-1 py-3 transition-colors hover:bg-background ${isSelected ? "bg-primary/5" : ""}`}
                >
                  <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                    {WEEKDAYS_LONG[i].slice(0, 3)}
                  </span>
                  <span className={[
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                    isToday ? "bg-primary text-white" : isSelected ? "bg-primary/15 text-primary" : "text-text-primary",
                  ].join(" ")}>
                    {date.getDate()}
                  </span>
                  {total > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                      {total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Week event rows — show all days side by side */}
          <div className="grid grid-cols-7 divide-x divide-border min-h-[400px] min-w-[560px]">
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
                  className={`min-h-[400px] cursor-pointer p-2 transition-colors hover:bg-background/50 ${isSelected ? "bg-primary/5" : ""} ${isToday ? "ring-1 ring-inset ring-primary/30" : ""}`}
                >
                  {/* New button on hover */}
                  <button
                    onClick={(e) => { e.stopPropagation(); openCreate(date); }}
                    className="mb-2 hidden w-full rounded-lg border border-dashed border-border py-1 text-xs text-text-secondary transition-colors hover:border-primary hover:text-primary group-hover:flex"
                  >
                    +
                  </button>

                  <div className="space-y-1">
                    {tEvs.map((t) => {
                      const completada = t.estado === "completado";
                      const hora = t.fecha.includes("T") ? new Date(t.fecha).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : null;
                      return (
                        <div
                          key={`t-${t.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-start gap-1 rounded-lg border border-violet-500/30 bg-violet-500/10 px-1.5 py-1"
                        >
                          <button
                            onClick={() => !completada && handleCompleteTarea(t.id)}
                            className={`mt-0.5 shrink-0 ${completada ? "text-green-500 cursor-default" : "text-violet-400 hover:text-green-500"}`}
                          >
                            {completingTaskIds.has(t.id)
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : completada
                                ? <Check className="complete-pop h-3 w-3" />
                                : <Circle className="h-3 w-3" />}
                          </button>
                          <div className="min-w-0">
                            {hora && <p className="text-[9px] font-medium text-violet-600 dark:text-violet-400">{hora}</p>}
                            <p className={`truncate text-[10px] font-medium leading-tight ${completada ? "line-through text-text-secondary" : "text-text-primary"}`}>
                              {t.titulo}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {localEvs.map((ev) => {
                      const t = tipoMeta(ev.tipo);
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); setDetailEvent(ev); }}
                          className={`group flex cursor-pointer items-start gap-1 rounded-lg border px-1.5 py-1 transition-colors hover:brightness-95 ${t.bg} ${t.border}`}
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCompleteAgenda(ev.id, !ev.completed); }}
                            className={`mt-0.5 shrink-0 ${ev.completed ? "text-green-500" : "text-text-secondary opacity-0 group-hover:opacity-100 hover:text-green-500"}`}
                          >
                            {completingAgendaIds.has(ev.id)
                              ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              : ev.completed
                                ? <Check className="complete-pop h-2.5 w-2.5" />
                                : <Circle className="h-2.5 w-2.5" />}
                          </button>
                          <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${t.dot} ${ev.completed ? "opacity-0" : ""}`} />
                          <div className="min-w-0">
                            {ev.time && <p className={`text-[9px] font-medium ${t.text}`}>{ev.time}</p>}
                            <p className={`truncate text-[10px] font-medium leading-tight ${ev.completed ? "line-through text-text-secondary" : "text-text-primary"}`}>
                              {ev.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {gcalEvs.map((ev) => (
                      <div key={ev.id} className="flex items-start gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-1.5 py-1">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                        <div className="min-w-0">
                          {ev.start.dateTime && (
                            <p className="text-[9px] font-medium text-blue-600">
                              {new Date(ev.start.dateTime).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                          <p className="truncate text-[10px] font-medium leading-tight text-text-primary">{ev.summary}</p>
                        </div>
                      </div>
                    ))}
                    {tEvs.length === 0 && localEvs.length === 0 && gcalEvs.length === 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openCreate(date); }}
                        className="flex w-full items-center justify-center rounded-lg border border-dashed border-border py-2 text-xs text-text-secondary opacity-50 transition-opacity hover:opacity-100 hover:text-primary hover:border-primary"
                        title="Nueva actividad"
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

          {/* Week day detail panel */}
          <div className="border-t border-border">
            <div className="flex items-center justify-between px-5 py-3">
              <p className="text-sm font-semibold text-text-primary capitalize">
                {selectedDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <button
                onClick={() => openCreate(selectedDate)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
              >
                + Nueva actividad
              </button>
            </div>
            <div className="px-5 pb-5">
              <DayActivitiesList dateStr={selectedDateStr} date={selectedDate} />
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Drawer ── */}
      <Drawer
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId !== null ? "Editar actividad" : "Nueva actividad"}
        width="md"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setModalOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.description.trim() || form.assignedUserIds.length === 0}
              className="pressable inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Guardando..." : editId !== null ? "Guardar cambios" : "Crear actividad"}
            </button>
          </div>
        }
      >
        <div className="space-y-4 px-5 py-5">
          {/* Tipo selector */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Tipo de actividad
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {TIPOS.map((t) => {
                const Icon = t.icon;
                const active = form.tipo === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm({ ...form, tipo: t.value })}
                    className={[
                      "flex flex-col items-center gap-1 rounded-xl border py-2.5 px-1 text-center transition-all",
                      active ? `${t.bg} ${t.border} ${t.text} border-2` : "border-border text-text-secondary hover:bg-background",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] font-medium">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-text-secondary">Descripcion *</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="Describe la actividad..."
              className="input mt-1.5"
              autoFocus
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-medium text-text-secondary">Fecha</label>
            <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="input mt-1.5" />
          </div>

          {/* Hora inicio / fin / duración */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-text-secondary">Hora inicio</label>
                <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="input mt-1.5" />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary">Hora fin</label>
                <input type="time" value={form.time_end} onChange={(e) => setForm({ ...form, time_end: e.target.value })} className="input mt-1.5" />
              </div>
            </div>
            {(() => {
              const dur = calcDurationMinutes(form.time, form.time_end);
              if (!dur) return null;
              return (
                <p className="flex items-center gap-1 text-xs text-text-secondary">
                  <Clock className="h-3 w-3" />
                  Duración: <span className="font-medium text-text-primary">{formatDuration(dur)}</span>
                </p>
              );
            })()}
          </div>

          {/* Recordatorio */}
          <div>
            <label className="text-xs font-medium text-text-secondary">Recordatorio</label>
            <select
              value={form.reminderMinutes == null ? "" : String(form.reminderMinutes)}
              onChange={(e) => setForm({ ...form, reminderMinutes: e.target.value === "" ? null : Number(e.target.value) })}
              className="input mt-1.5"
              disabled={!form.time.trim()}
            >
              {REMINDER_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value == null ? "" : String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </select>
            {!form.time.trim() && (
              <p className="mt-1 text-[10px] text-text-secondary">Introduce una hora de inicio para activar el recordatorio.</p>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-medium text-text-secondary">Prioridad</label>
            <div className="mt-1.5 flex overflow-hidden rounded-lg border border-border">
              {PRIORITIES.map((p, i) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setForm({ ...form, priority: p.value })}
                  className={[
                    "flex-1 py-2 text-sm font-medium transition-colors",
                    i > 0 ? "border-l border-border" : "",
                    form.priority === p.value ? "bg-primary text-white" : "bg-surface text-text-secondary hover:bg-background",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assigned users */}
          <div>
            <label className="text-xs font-medium text-text-secondary">Usuarios asignados *</label>
            <div className="mt-1.5 max-h-32 space-y-1 overflow-y-auto rounded-xl border border-border bg-background p-2">
              {[
                { id: currentUserId, name: usersMap[currentUserId] ?? "Yo" },
                ...filterableUsers.filter((u) => u.id !== currentUserId),
              ].map((user) => (
                <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-secondary hover:bg-surface">
                  <input
                    type="checkbox"
                    checked={form.assignedUserIds.includes(user.id)}
                    onChange={() => toggleAssignedUser(user.id)}
                    className="h-4 w-4 accent-primary"
                  />
                  {user.name}
                </label>
              ))}
            </div>
          </div>

          {/* Completed (edit only) */}
          {editId !== null && (
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-background p-3">
              <input type="checkbox" checked={form.completed} onChange={(e) => setForm({ ...form, completed: e.target.checked })} className="h-4 w-4 accent-primary" />
              <span className="text-sm text-text-secondary">Marcar como completada</span>
            </label>
          )}

          {/* Notes / result */}
          <div>
            <label className="text-xs font-medium text-text-secondary">Notas / resultado</label>
            <textarea
              value={form.result}
              onChange={(e) => setForm({ ...form, result: e.target.value })}
              placeholder="Observaciones, resultado de la actividad..."
              rows={3}
              className="input mt-1.5 resize-none"
            />
          </div>

          {/* GCal sync */}
          {editId === null && isConnected && (
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-background p-3">
              <input type="checkbox" checked={form.syncToGcal} onChange={(e) => setForm({ ...form, syncToGcal: e.target.checked })} className="h-4 w-4 accent-primary" />
              <div>
                <p className="text-sm font-medium text-text-primary">Sincronizar con Google Calendar</p>
                <p className="text-xs text-text-secondary">Se creara un evento en tu calendario de Google</p>
              </div>
            </label>
          )}

          {saveError && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{saveError}</p>
          )}
        </div>
      </Drawer>

      {/* ── Detail Drawer ── */}
      <Drawer
        open={detailEvent !== null}
        onClose={() => setDetailEvent(null)}
        title={detailEvent?.description ?? ""}
        subtitle="Actividad de calendario"
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
                aria-label="Marcar como completada"
                title="Marcar como completada"
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
              aria-label="Editar"
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
                aria-label="Eliminar"
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
                const t = tipoMeta(detailEvent.tipo);
                const p = priorityMeta(detailEvent.priority);
                return (
                  <>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${t.bg} ${t.text}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {t.label}
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
                      <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-400">GCal</span>
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
                    {detailEvent.time_end && ` – ${normalizeTime(detailEvent.time_end, "")}`}
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Asignado a</p>
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
                <p className="text-xs font-semibold text-success">Resultado</p>
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

      {/* ── Detail Delete Confirmation ── */}
      {confirmDeleteEvent !== null && (
        <ConfirmDialog
          open
          title="Eliminar actividad"
          description={
            confirmDeleteEvent.gcal_event_id && isConnected
              ? "Se eliminara tambien de Google Calendar. Esta accion no se puede deshacer."
              : "Esta accion no se puede deshacer."
          }
          confirmLabel="Eliminar"
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

      {/* ── Delete Confirmation (legacy) ── */}
      {deleteId !== null && (
        <ConfirmDialog
          open={deleteId !== null}
          title="Eliminar actividad"
          description={
            deleteTarget?.gcal_event_id && isConnected
              ? "Se eliminara tambien de Google Calendar. Esta accion no se puede deshacer."
              : "Esta accion no se puede deshacer."
          }
          confirmLabel="Eliminar"
          pending={deleting}
          onCancel={() => setDeleteId(null)}
          onConfirm={handleDelete}
        />
      )}

      <Toaster toasts={toasts} />
    </>
  );
}
