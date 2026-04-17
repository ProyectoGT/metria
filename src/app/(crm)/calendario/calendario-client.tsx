"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Phone, Users, Home, Clock, BookOpen, Star, Activity, Calendar, ChevronLeft, ChevronRight, X, Trash2, Check, Circle,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { useToast, Toaster } from "@/components/ui/toast";
import { updateTareaEstadoAction } from "@/app/(crm)/dashboard/actions";
import type { UserRole } from "@/lib/roles";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgendaEvent = {
  id: number;
  description: string;
  event_date: string;
  time: string | null;
  priority: string;
  tipo: string;
  completed: boolean;
  result: string | null;
  gcal_event_id: string | null;
  owner_user_id: number | null;
  created_at: string;
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
};

type FormState = {
  description: string;
  event_date: string;
  time: string;
  priority: string;
  tipo: string;
  completed: boolean;
  result: string;
  syncToGcal: boolean;
};

type Props = {
  initialEvents: AgendaEvent[];
  initialTareas: TareaEvent[];
  isConnected: boolean;
  role: UserRole;
  currentUserId: number;
  usersMap: Record<number, string>;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS: {
  value: string;
  label: string;
  icon: React.ElementType;
  dot: string;
  bg: string;
  text: string;
  border: string;
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
  { value: "alta",  label: "Alta",  dot: "ring-2 ring-red-500",   badge: "bg-red-500/15 text-red-700 dark:text-red-400"    },
  { value: "media", label: "Media", dot: "ring-2 ring-amber-400", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  { value: "baja",  label: "Baja",  dot: "ring-2 ring-blue-400",  badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400"  },
];

const MONTH_NAMES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const WEEKDAYS = ["Lun","Mar","Mie","Jue","Vie","Sab","Dom"];

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

function emptyForm(date?: Date): FormState {
  return {
    description: "",
    event_date: toDateStr(date ?? new Date()),
    time: "",
    priority: "media",
    tipo: "actividad",
    completed: false,
    result: "",
    syncToGcal: false,
  };
}

function tipoMeta(tipo: string) {
  return TIPOS.find((t) => t.value === tipo) ?? TIPOS.find((t) => t.value === "actividad")!;
}

function priorityMeta(priority: string) {
  return PRIORITIES.find((p) => p.value === priority) ?? PRIORITIES[1];
}

const isManager = (role: UserRole) =>
  role === "Administrador" || role === "Director" || role === "Responsable";

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalendarioClient({
  initialEvents,
  initialTareas,
  isConnected,
  role,
  currentUserId,
  usersMap,
}: Props) {
  const today = useMemo(() => new Date(), []);

  const [currentDate, setCurrentDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [events, setEvents]       = useState<AgendaEvent[]>(initialEvents);
  const [tareas, setTareas]       = useState<TareaEvent[]>(initialTareas);
  const [gcalEvents, setGcalEvents] = useState<GCalEvent[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);
  const [form, setForm]           = useState<FormState>(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteId, setDeleteId]   = useState<number | null>(null);
  const [deleting, setDeleting]   = useState(false);

  const supabase = useMemo(() => createClient(), []);
  const { toasts, toast } = useToast();

  // ── Calendar data maps ─────────────────────────────────────────────────────

  const calendarDays = useMemo(
    () => getCalendarDays(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate],
  );

  const eventsByDate = useMemo(() => {
    const map: Record<string, AgendaEvent[]> = {};
    for (const ev of events) (map[ev.event_date] ??= []).push(ev);
    return map;
  }, [events]);

  const gcalByDate = useMemo(() => {
    const map: Record<string, GCalEvent[]> = {};
    for (const ev of gcalEvents) {
      const d = ev.start.dateTime ? ev.start.dateTime.split("T")[0] : (ev.start.date ?? "");
      (map[d] ??= []).push(ev);
    }
    return map;
  }, [gcalEvents]);

  const tareasByDate = useMemo(() => {
    const map: Record<string, TareaEvent[]> = {};
    for (const t of tareas) (map[t.fecha.split("T")[0]] ??= []).push(t);
    return map;
  }, [tareas]);

  // ── Google Calendar fetch ──────────────────────────────────────────────────

  const fetchGcalEvents = useCallback(async () => {
    if (!isConnected) return;
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    const timeMin = new Date(year, month, 1).toISOString();
    const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    const res = await fetch(`/api/google/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`);
    if (res.ok) { const d = await res.json(); setGcalEvents(d.items ?? []); }
  }, [isConnected, currentDate]);

  useEffect(() => { fetchGcalEvents(); }, [fetchGcalEvents]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  function prevMonth() { setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)); }
  function nextMonth() { setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)); }
  function goToday()   { setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(today); }

  // ── Modal ──────────────────────────────────────────────────────────────────

  function openCreate(date?: Date) {
    setEditId(null); setForm(emptyForm(date ?? selectedDate)); setSaveError(null); setModalOpen(true);
  }

  function openEdit(ev: AgendaEvent) {
    setEditId(ev.id);
    setForm({ description: ev.description, event_date: ev.event_date, time: ev.time ?? "", priority: ev.priority, tipo: ev.tipo ?? "actividad", completed: ev.completed, result: ev.result ?? "", syncToGcal: false });
    setSaveError(null); setModalOpen(true);
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.description.trim()) return;
    setSaving(true); setSaveError(null);

    const payload = {
      description: form.description.trim(),
      event_date: form.event_date,
      time: form.time || null,
      priority: form.priority,
      tipo: form.tipo,
      completed: form.completed,
      result: form.result || null,
    };

    // Si la columna 'tipo' no existe aún en la BD, reintentamos sin ella
    async function insertOrUpdate(p: typeof payload) {
      if (editId !== null) {
        const res = await supabase.from("agenda").update(p).eq("id", editId).select().single();
        if (res.error?.message?.includes("'tipo'")) {
          const { tipo: _t, ...rest } = p as typeof p & { tipo?: string };
          return supabase.from("agenda").update(rest).eq("id", editId).select().single();
        }
        return res;
      }
      const res = await supabase.from("agenda").insert(p).select().single();
      if (res.error?.message?.includes("'tipo'")) {
        const { tipo: _t, ...rest } = p as typeof p & { tipo?: string };
        return supabase.from("agenda").insert(rest).select().single();
      }
      return res;
    }

    if (editId !== null) {
      const { data, error } = await insertOrUpdate(payload);
      if (error) setSaveError(error.message);
      else if (data) {
        setEvents((prev) => prev.map((e) => e.id === editId ? (data as AgendaEvent) : e));
        toast("Actividad actualizada"); setModalOpen(false);
      }
    } else {
      const { data, error } = await insertOrUpdate(payload);
      if (error) setSaveError(error.message);
      else if (data) {
        let saved = data as AgendaEvent;
        if (form.syncToGcal && isConnected) {
          const gcalRes = await fetch("/api/google/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ summary: form.description, date: form.event_date, time: form.time || null }),
          });
          if (gcalRes.ok) {
            const gcalData = await gcalRes.json();
            if (gcalData.id) {
              const { data: upd } = await supabase.from("agenda").update({ gcal_event_id: gcalData.id }).eq("id", saved.id).select().single();
              if (upd) { saved = upd as AgendaEvent; await fetchGcalEvents(); }
            }
          }
        }
        setEvents((prev) => [...prev, saved].sort((a, b) => a.event_date.localeCompare(b.event_date)));
        toast("Actividad creada"); setModalOpen(false);
      }
    }
    setSaving(false);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (deleteId === null) return;
    setDeleting(true);
    const target = events.find((e) => e.id === deleteId);
    if (target?.gcal_event_id && isConnected) {
      await fetch("/api/google/events", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: target.gcal_event_id }) });
    }
    const { error } = await supabase.from("agenda").delete().eq("id", deleteId);
    if (error) toast("Error al eliminar: " + error.message, "error");
    else { setEvents((prev) => prev.filter((e) => e.id !== deleteId)); toast("Actividad eliminada"); setDeleteId(null); }
    setDeleting(false);
  }

  // ── Complete tarea ─────────────────────────────────────────────────────────

  async function handleCompleteTarea(id: number) {
    try {
      await updateTareaEstadoAction(id, "completado");
      setTareas((prev) => prev.map((t) => (t.id === id ? { ...t, estado: "completado" } : t)));
      toast("Tarea completada");
    } catch { toast("Error al completar la tarea", "error"); }
  }

  // ── Selected day data ──────────────────────────────────────────────────────

  const todayStr        = toDateStr(today);
  const selectedDateStr = toDateStr(selectedDate);
  const dayLocalEvents  = [...(eventsByDate[selectedDateStr] ?? [])].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  const dayGcalEvents   = gcalByDate[selectedDateStr] ?? [];
  const dayTareas       = tareasByDate[selectedDateStr] ?? [];
  const deleteTarget    = events.find((e) => e.id === deleteId);

  const showOwner = isManager(role);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Google Calendar connection row */}
      <div className="mb-5 flex items-center justify-end gap-3">
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

      {/* Two-panel layout */}
      <div className="flex flex-col gap-5 lg:flex-row">

        {/* ── Left: Calendar grid ── */}
        <div className="flex-1 rounded-2xl border border-border bg-surface shadow-sm">

          {/* Month nav */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-text-primary">
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex items-center gap-1.5">
              <button onClick={prevMonth} className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-background hover:text-text-primary">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={goToday} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background">
                Hoy
              </button>
              <button onClick={nextMonth} className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-background hover:text-text-primary">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-border">
            {calendarDays.map(({ date, currentMonth }, i) => {
              const dateStr   = toDateStr(date);
              const localEvs  = eventsByDate[dateStr] ?? [];
              const gcalEvs   = gcalByDate[dateStr]   ?? [];
              const tareaEvs  = tareasByDate[dateStr]  ?? [];
              const isToday    = dateStr === todayStr;
              const isSelected = dateStr === selectedDateStr;
              const total      = localEvs.length + gcalEvs.length + tareaEvs.length;

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

                  {total > 0 && (
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      {localEvs.slice(0, 2).map((ev) => {
                        const t = tipoMeta(ev.tipo);
                        return (
                          <div key={ev.id} className={`flex items-center gap-1 rounded px-1 py-0.5 ${t.bg}`}>
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} />
                            <span className={`truncate text-[10px] font-medium leading-none ${t.text}`}>
                              {ev.description}
                            </span>
                          </div>
                        );
                      })}
                      {tareaEvs.slice(0, 1).map((t) => (
                        <div key={`t-${t.id}`} className="flex items-center gap-1 rounded bg-violet-500/10 px-1 py-0.5">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                          <span className="truncate text-[10px] font-medium leading-none text-violet-700 dark:text-violet-400">
                            {t.titulo}
                          </span>
                        </div>
                      ))}
                      {gcalEvs.slice(0, 1).map((ev) => (
                        <div key={ev.id} className="flex items-center gap-1 rounded bg-blue-500/10 px-1 py-0.5">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                          <span className="truncate text-[10px] font-medium leading-none text-blue-700 dark:text-blue-400">
                            {ev.summary}
                          </span>
                        </div>
                      ))}
                      {total > 3 && (
                        <span className="pl-1 text-[10px] text-text-secondary">+{total - 3} mas</span>
                      )}
                    </div>
                  )}
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

        {/* ── Right: Day activities ── */}
        <div className="w-full shrink-0 rounded-2xl border border-border bg-surface shadow-sm lg:w-80">
          {/* Header */}
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
            >
              + Nueva
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {dayLocalEvents.length === 0 && dayGcalEvents.length === 0 && dayTareas.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <Calendar className="mb-3 h-10 w-10 text-text-secondary/30" />
                <p className="text-sm text-text-secondary">Sin actividades este dia</p>
                <button onClick={() => openCreate(selectedDate)} className="mt-3 text-xs font-medium text-primary hover:underline">
                  + Anadir actividad
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Tareas kanban */}
                {dayTareas.map((t) => {
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
                          {completada
                            ? <Check className="h-4 w-4" />
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

                {/* Local agenda events */}
                {dayLocalEvents.map((ev) => {
                  const t = tipoMeta(ev.tipo);
                  const p = priorityMeta(ev.priority);
                  const Icon = t.icon;
                  const ownerName = showOwner && ev.owner_user_id && ev.owner_user_id !== currentUserId ? usersMap[ev.owner_user_id] : null;
                  return (
                    <div
                      key={ev.id}
                      onClick={() => openEdit(ev)}
                      className={`group relative cursor-pointer rounded-xl border p-3 transition-colors hover:brightness-95 ${t.bg} ${t.border}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 shrink-0 rounded-md p-1 ${t.bg}`}>
                          <Icon className={`h-3.5 w-3.5 ${t.text}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium leading-snug ${ev.completed ? "line-through text-text-secondary" : "text-text-primary"}`}>
                            {ev.description}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {ev.time && <span className="text-xs font-medium text-text-secondary">{ev.time}</span>}
                            <span className={`rounded-full px-1.5 py-px text-[10px] font-medium ${t.bg} ${t.text}`}>{t.label}</span>
                            <span className={`rounded-full px-1.5 py-px text-[10px] font-medium ${p.badge}`}>{p.label}</span>
                            {ev.gcal_event_id && <span className="rounded-full bg-blue-500/15 px-1.5 py-px text-[10px] font-medium text-blue-700 dark:text-blue-400">GCal</span>}
                            {ev.completed && <span className="rounded-full bg-success/15 px-1.5 py-px text-[10px] font-medium text-success">Completada</span>}
                            {ownerName && <span className="text-[10px] text-text-secondary">{ownerName}</span>}
                          </div>
                          {ev.result && (
                            <p className="mt-1.5 text-xs text-text-secondary line-clamp-2">{ev.result}</p>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteId(ev.id); }}
                          className="shrink-0 rounded p-1 text-text-secondary opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* GCal-only events */}
                {dayGcalEvents.map((ev) => (
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
            )}
          </div>
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-text-primary">
                {editId !== null ? "Editar actividad" : "Nueva actividad"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-background hover:text-text-primary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <div className="space-y-4">
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
                            active
                              ? `${t.bg} ${t.border} ${t.text} border-2`
                              : "border-border text-text-secondary hover:bg-background",
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

                {/* Date + Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-text-secondary">Fecha</label>
                    <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="input mt-1.5" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-secondary">Hora</label>
                    <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="input mt-1.5" />
                  </div>
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
            </div>

            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button onClick={() => setModalOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.description.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
              >
                {saving ? "Guardando..." : editId !== null ? "Guardar cambios" : "Crear actividad"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="text-base font-semibold text-text-primary">Eliminar actividad</h2>
            <p className="mt-2 text-sm text-text-secondary">
              {deleteTarget?.gcal_event_id && isConnected
                ? "Se eliminara tambien de Google Calendar. Esta accion no se puede deshacer."
                : "Esta accion no se puede deshacer."}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting} className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60">
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster toasts={toasts} />
    </>
  );
}
