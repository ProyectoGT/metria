"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useToast, Toaster } from "@/components/ui/toast";
import { updateTareaEstadoAction } from "@/app/(crm)/dashboard/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgendaEvent = {
  id: number;
  description: string;
  event_date: string;
  time: string | null;
  priority: string;
  completed: boolean;
  result: string | null;
  gcal_event_id: string | null;
  user_id: number | null;
  created_at: string;
};

type TareaEvent = {
  id: number;
  titulo: string;
  prioridad: string | null;
  fecha: string; // ISO datetime o date
  estado: string | null;
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
  completed: boolean;
  result: string;
  syncToGcal: boolean;
};

type Props = {
  initialEvents: AgendaEvent[];
  initialTareas: TareaEvent[];
  isConnected: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITIES = [
  { value: "alta",  label: "Alta",  dot: "bg-red-500",  badge: "bg-red-100 text-red-700"   },
  { value: "media", label: "Media", dot: "bg-amber-400", badge: "bg-amber-100 text-amber-700" },
  { value: "baja",  label: "Baja",  dot: "bg-blue-400", badge: "bg-blue-100 text-blue-700"  },
];

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sab", "Dom"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);

  // Convert getDay() (0=Sun) to Mon-first (0=Mon…6=Sun)
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  const days: Array<{ date: Date; currentMonth: boolean }> = [];

  for (let i = startDow; i > 0; i--) {
    days.push({ date: new Date(year, month, 1 - i), currentMonth: false });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), currentMonth: true });
  }
  // Always fill to complete rows
  const needed = Math.ceil(days.length / 7) * 7;
  for (let d = 1; days.length < needed; d++) {
    days.push({ date: new Date(year, month + 1, d), currentMonth: false });
  }

  return days;
}

function emptyForm(date?: Date): FormState {
  return {
    description: "",
    event_date: toDateStr(date ?? new Date()),
    time: "",
    priority: "media",
    completed: false,
    result: "",
    syncToGcal: false,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalendarioClient({ initialEvents, initialTareas, isConnected }: Props) {
  const today = useMemo(() => new Date(), []);

  const [currentDate, setCurrentDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
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

  // ── Calendar grid ──────────────────────────────────────────────────────────

  const calendarDays = useMemo(
    () => getCalendarDays(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  const eventsByDate = useMemo(() => {
    const map: Record<string, AgendaEvent[]> = {};
    for (const ev of events) {
      (map[ev.event_date] ??= []).push(ev);
    }
    return map;
  }, [events]);

  const gcalByDate = useMemo(() => {
    const map: Record<string, GCalEvent[]> = {};
    for (const ev of gcalEvents) {
      const dateStr = ev.start.dateTime
        ? ev.start.dateTime.split("T")[0]
        : (ev.start.date ?? "");
      (map[dateStr] ??= []).push(ev);
    }
    return map;
  }, [gcalEvents]);

  const tareasByDate = useMemo(() => {
    const map: Record<string, TareaEvent[]> = {};
    for (const t of tareas) {
      const dateStr = t.fecha.split("T")[0];
      (map[dateStr] ??= []).push(t);
    }
    return map;
  }, [tareas]);

  // ── Google Calendar fetch ───────────────────────────────────────────────────

  const fetchGcalEvents = useCallback(async () => {
    if (!isConnected) return;
    const year  = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const timeMin = new Date(year, month, 1).toISOString();
    const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    const res = await fetch(`/api/google/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`);
    if (res.ok) {
      const data = await res.json();
      setGcalEvents(data.items ?? []);
    }
  }, [isConnected, currentDate]);

  useEffect(() => { fetchGcalEvents(); }, [fetchGcalEvents]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  function prevMonth() {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }
  function goToday() {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  }

  // ── Modal helpers ──────────────────────────────────────────────────────────

  function openCreate(date?: Date) {
    setEditId(null);
    setForm(emptyForm(date ?? selectedDate));
    setSaveError(null);
    setModalOpen(true);
  }

  function openEdit(ev: AgendaEvent) {
    setEditId(ev.id);
    setForm({
      description: ev.description,
      event_date: ev.event_date,
      time: ev.time ?? "",
      priority: ev.priority,
      completed: ev.completed,
      result: ev.result ?? "",
      syncToGcal: false,
    });
    setSaveError(null);
    setModalOpen(true);
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.description.trim()) return;
    setSaving(true);
    setSaveError(null);

    const payload = {
      description: form.description.trim(),
      event_date:  form.event_date,
      time:        form.time || null,
      priority:    form.priority,
      completed:   form.completed,
      result:      form.result || null,
    };

    if (editId !== null) {
      const { data, error } = await supabase
        .from("agenda").update(payload).eq("id", editId).select().single();
      if (error) { setSaveError(error.message); }
      else if (data) {
        setEvents((prev) => prev.map((e) => e.id === editId ? (data as AgendaEvent) : e));
        toast("Actividad actualizada");
        setModalOpen(false);
      }
    } else {
      const { data, error } = await supabase
        .from("agenda").insert(payload).select().single();
      if (error) { setSaveError(error.message); }
      else if (data) {
        let saved = data as AgendaEvent;

        // Optionally push to Google Calendar
        if (form.syncToGcal && isConnected) {
          const gcalRes = await fetch("/api/google/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              summary: form.description,
              date: form.event_date,
              time: form.time || null,
            }),
          });
          if (gcalRes.ok) {
            const gcalData = await gcalRes.json();
            if (gcalData.id) {
              const { data: updated } = await supabase
                .from("agenda")
                .update({ gcal_event_id: gcalData.id })
                .eq("id", saved.id)
                .select()
                .single();
              if (updated) {
                saved = updated as AgendaEvent;
                await fetchGcalEvents(); // refresh GCal list
              }
            }
          }
        }

        setEvents((prev) => [...prev, saved].sort((a, b) =>
          a.event_date.localeCompare(b.event_date)
        ));
        toast("Actividad creada");
        setModalOpen(false);
      }
    }

    setSaving(false);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (deleteId === null) return;
    setDeleting(true);

    const target = events.find((e) => e.id === deleteId);

    // Remove from Google Calendar if synced
    if (target?.gcal_event_id && isConnected) {
      await fetch("/api/google/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: target.gcal_event_id }),
      });
    }

    const { error } = await supabase.from("agenda").delete().eq("id", deleteId);
    if (error) {
      toast("Error al eliminar: " + error.message, "error");
    } else {
      setEvents((prev) => prev.filter((e) => e.id !== deleteId));
      toast("Actividad eliminada");
      setDeleteId(null);
    }
    setDeleting(false);
  }

  // ── Completar tarea desde el calendario ───────────────────────────────────

  async function handleCompleteTarea(id: number) {
    try {
      await updateTareaEstadoAction(id, "completado");
      setTareas((prev) =>
        prev.map((t) => (t.id === id ? { ...t, estado: "completado" } : t))
      );
      toast("Tarea completada");
    } catch {
      toast("Error al completar la tarea", "error");
    }
  }

  // ── Selected day data ──────────────────────────────────────────────────────

  const todayStr        = toDateStr(today);
  const selectedDateStr = toDateStr(selectedDate);
  const dayLocalEvents  = eventsByDate[selectedDateStr] ?? [];
  const dayGcalEvents   = gcalByDate[selectedDateStr]  ?? [];
  const dayTareas       = tareasByDate[selectedDateStr] ?? [];

  const deleteTarget = events.find((e) => e.id === deleteId);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Google Calendar connection row */}
      <div className="mb-6 flex items-center justify-end gap-3">
        {isConnected ? (
          <>
            <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Conectado
            </span>
            <a
              href="/api/google/disconnect"
              className="text-xs text-text-secondary underline-offset-2 hover:underline"
            >
              Desconectar
            </a>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
              No conectado
            </span>
            <a
              href="/api/google/auth"
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-background"
            >
              Conectar Google Calendar
            </a>
          </>
        )}
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-5">

        {/* ── Left: Calendar grid ── */}
        <div className="flex-1 rounded-2xl border border-border bg-surface p-6 shadow-sm">

          {/* Month nav */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={prevMonth}
                className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goToday}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
              >
                Hoy
              </button>
              <button
                onClick={nextMonth}
                className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="mb-1 grid grid-cols-7">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-text-secondary">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
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
                    "flex min-h-[68px] flex-col rounded-xl p-2 text-left transition-colors",
                    !currentMonth ? "opacity-35" : "",
                    isSelected
                      ? "border border-primary bg-primary/5"
                      : "border border-transparent hover:bg-background",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      isToday ? "bg-primary text-white" : "text-text-primary",
                    ].join(" ")}
                  >
                    {date.getDate()}
                  </span>

                  {total > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-0.5">
                      {localEvs.slice(0, 2).map((ev) => {
                        const p = PRIORITIES.find((p) => p.value === ev.priority);
                        return <span key={ev.id} className={`h-1.5 w-1.5 rounded-full ${p?.dot ?? "bg-gray-400"}`} />;
                      })}
                      {tareaEvs.slice(0, 2).map((t) => (
                        <span
                          key={`t-${t.id}`}
                          className={`h-1.5 w-1.5 rounded-full ${t.estado === "completado" ? "bg-green-400" : "bg-violet-500"}`}
                        />
                      ))}
                      {gcalEvs.slice(0, 1).map((ev) => (
                        <span key={ev.id} className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      ))}
                      {total > 5 && (
                        <span className="text-[9px] leading-none text-text-secondary">+{total - 5}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-border pt-4">
            {PRIORITIES.map((p) => (
              <div key={p.value} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                <span className="text-xs text-text-secondary">{p.label}</span>
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
        <div className="w-72 shrink-0 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Actividades del día</h3>
            <button
              onClick={() => openCreate(selectedDate)}
              className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
            >
              + Nueva
            </button>
          </div>

          <p className="mb-4 text-xs text-text-secondary capitalize">
            {selectedDate.toLocaleDateString("es-ES", {
              weekday: "long", day: "numeric", month: "long",
            })}
          </p>

          {dayLocalEvents.length === 0 && dayGcalEvents.length === 0 && dayTareas.length === 0 ? (
            <div className="flex flex-col items-center py-10">
              <p className="text-sm text-text-secondary">Sin actividades este día</p>
              <button
                onClick={() => openCreate(selectedDate)}
                className="mt-3 text-xs font-medium text-primary hover:underline"
              >
                + Añadir actividad
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Tareas del kanban */}
              {dayTareas.map((t) => {
                const p = PRIORITIES.find((pr) => pr.value === t.prioridad);
                const completada = t.estado === "completado";
                const hora = t.fecha.includes("T")
                  ? new Date(t.fecha).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                  : null;
                return (
                  <div
                    key={`tarea-${t.id}`}
                    className="group rounded-xl border border-violet-200 bg-violet-50 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => !completada && handleCompleteTarea(t.id)}
                        title={completada ? "Completada" : "Marcar como completada"}
                        className={`mt-0.5 shrink-0 transition-colors ${completada ? "text-green-500 cursor-default" : "text-violet-400 hover:text-green-500"}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          {completada
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            : <circle cx="12" cy="12" r="9" />}
                        </svg>
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium leading-snug ${completada ? "line-through text-text-secondary" : "text-text-primary"}`}>
                          {t.titulo}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          {hora && <span className="text-xs text-text-secondary">{hora}</span>}
                          <span className="rounded-full bg-violet-100 px-1.5 py-px text-[10px] font-medium text-violet-700">
                            Tarea
                          </span>
                          {p && (
                            <span className={`rounded-full px-1.5 py-px text-[10px] font-medium ${p.badge}`}>
                              {p.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Local agenda events */}
              {dayLocalEvents.map((ev) => {
                const p = PRIORITIES.find((pr) => pr.value === ev.priority);
                return (
                  <div
                    key={ev.id}
                    onClick={() => openEdit(ev)}
                    className="group relative cursor-pointer rounded-xl border border-border p-3 transition-colors hover:bg-background"
                  >
                    <div className="flex items-start gap-2">
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${p?.dot ?? "bg-gray-400"}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium leading-snug ${ev.completed ? "line-through text-text-secondary" : "text-text-primary"}`}>
                          {ev.description}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          {ev.time && (
                            <span className="text-xs text-text-secondary">{ev.time}</span>
                          )}
                          <span className={`rounded-full px-1.5 py-px text-[10px] font-medium ${p?.badge ?? ""}`}>
                            {p?.label}
                          </span>
                          {ev.gcal_event_id && (
                            <span className="rounded-full bg-blue-100 px-1.5 py-px text-[10px] font-medium text-blue-600">
                              GCal
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteId(ev.id); }}
                        className="shrink-0 rounded p-1 text-text-secondary opacity-0 transition-all hover:bg-red-50 hover:text-danger group-hover:opacity-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* GCal-only events */}
              {dayGcalEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-blue-100 bg-blue-50 p-3"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary leading-snug">{ev.summary}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {ev.start.dateTime && (
                          <span className="text-xs text-text-secondary">
                            {new Date(ev.start.dateTime).toLocaleTimeString("es-ES", {
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        )}
                        <span className="rounded-full bg-blue-100 px-1.5 py-px text-[10px] font-medium text-blue-600">
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

      {/* ── Create / Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-text-primary">
                {editId !== null ? "Editar actividad" : "Nueva actividad"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-text-secondary transition-colors hover:text-text-primary"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {/* Description */}
              <div>
                <label className="text-xs font-medium text-text-secondary">Descripción *</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  placeholder="Descripción de la actividad"
                  className="input mt-1.5"
                  autoFocus
                />
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-text-secondary">Fecha</label>
                  <input
                    type="date"
                    value={form.event_date}
                    onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                    className="input mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary">Hora</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="input mt-1.5"
                  />
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
                        form.priority === p.value
                          ? "bg-primary text-white"
                          : "bg-surface text-text-secondary hover:bg-background",
                      ].join(" ")}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Completed (edit only) */}
              {editId !== null && (
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.completed}
                    onChange={(e) => setForm({ ...form, completed: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm text-text-secondary">Marcar como completada</span>
                </label>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-text-secondary">Notas</label>
                <textarea
                  value={form.result}
                  onChange={(e) => setForm({ ...form, result: e.target.value })}
                  placeholder="Resultado u observaciones..."
                  rows={2}
                  className="input mt-1.5 resize-none"
                />
              </div>

              {/* Sync to GCal (create only, when connected) */}
              {editId === null && isConnected && (
                <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-background p-3">
                  <input
                    type="checkbox"
                    checked={form.syncToGcal}
                    onChange={(e) => setForm({ ...form, syncToGcal: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium text-text-primary">Sincronizar con Google Calendar</p>
                    <p className="text-xs text-text-secondary">Se creará un evento en tu calendario de Google</p>
                  </div>
                </label>
              )}

              {saveError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-danger">{saveError}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
              >
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
                ? "Se eliminará también de Google Calendar. Esta acción no se puede deshacer."
                : "Esta acción no se puede deshacer."}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
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
