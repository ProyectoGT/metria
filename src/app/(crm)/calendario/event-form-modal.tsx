"use client";

import { useState, useMemo, useId } from "react";
import { useRouter } from "next/navigation";
import { Phone, Users, Home, Clock, BookOpen, Star, Activity, Loader2 } from "lucide-react";
import Drawer from "@/components/ui/drawer";
import { useI18n } from "@/lib/i18n";
import { DEFAULT_ACTIVITY_TIME, normalizeTime, calcDurationMinutes, formatDuration, REMINDER_OPTIONS } from "@/lib/local-date-time";
import { isActivityPriority, isActivityType, normalizeActivityPriority, normalizeActivityType } from "@/lib/activity-options";
import { useCreateAgendaItem, useUpdateAgendaItem } from "@/modules/agenda/hooks/use-agenda-items";
import { defaultSyncToGoogleCalendar } from "@/modules/agenda/defaults";
import { saveAgendaGoogleEventIdAction } from "@/app/(crm)/calendario/actions";

// ─── Types (re-declared locally to avoid cross-file coupling) ─────────────────

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
  owner_user_id: number | null;
  user_id: number | null;
  empresa_id: number | null;
  created_at: string;
  agenda_usuarios?: Array<{ usuario_id: number; usuarios?: { nombre: string | null; apellidos: string | null } | null }>;
};

type GCalEvent = {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  extendedProperties?: { private?: { source?: string; entity?: string; agendaId?: string } };
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

// ─── Static style data (same as in calendario-client.tsx) ─────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function agendaAssignedIds(ev: AgendaEvent) {
  return ev.agenda_usuarios?.map((u) => u.usuario_id) ?? [];
}

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

function emptyForm(date: Date | undefined, syncToGcal: boolean): FormState {
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

// ─── Props ────────────────────────────────────────────────────────────────────

export type EventFormModalProps = {
  open:               boolean;
  /** null = create mode, non-null = edit mode */
  editEvent:          AgendaEvent | null;
  /** YYYY-MM-DD used when creating a new event */
  initialDate:        string;
  isConnected:        boolean;
  currentUserId:      number;
  empresaId:          number | null;
  filterableUsers:    Array<{ id: number; name: string }>;
  usersMap:           Record<number, string>;
  onClose:            () => void;
  onEventsChange:     React.Dispatch<React.SetStateAction<AgendaEvent[]>>;
  onGcalEventsChange: React.Dispatch<React.SetStateAction<GCalEvent[]>>;
  onSavingChange?:    (saving: boolean) => void;
  toast:              (message: string, type?: "success" | "error" | "info") => void;
};

// ─── Component ────────────────────────────────────────────────────────────────
// Defined outside CalendarioClient so form state (form, saving, saveError) is
// isolated here.  Typing in the form only re-renders EventFormModal, not the
// calendar grid.

export default function EventFormModal(props: EventFormModalProps) {
  if (!props.open) return null;

  const instanceKey = props.editEvent
    ? `edit-${props.editEvent.id}`
    : `create-${props.initialDate}`;

  return <EventFormModalInner key={instanceKey} {...props} />;
}

function EventFormModalInner({
  open,
  editEvent,
  initialDate,
  isConnected,
  currentUserId,
  empresaId,
  filterableUsers,
  usersMap,
  onClose,
  onEventsChange,
  onGcalEventsChange,
  onSavingChange,
  toast,
}: EventFormModalProps) {
  const { t } = useI18n();
  const router = useRouter();
  const formId = useId();
  const createAgendaItem = useCreateAgendaItem();
  const updateAgendaItem = useUpdateAgendaItem();

  const TIPOS = useMemo(() => TIPOS_META.map((m) => ({
    ...m, label: t(`calendar.tipos.${m.value}`),
  })), [t]);

  const PRIORITIES = useMemo(() => {
    const labelKey = (v: string) => {
      if (v === "alta")  return "statuses.high";
      if (v === "media") return "statuses.medium";
      return "statuses.low";
    };
    return PRIORITY_STYLES.map((p) => ({ ...p, label: t(labelKey(p.value)) }));
  }, [t]);

  const editId = editEvent?.id ?? null;

  function buildFormFromEvent(ev: AgendaEvent): FormState {
    const ids = agendaAssignedIds(ev);
    return {
      description:     ev.description,
      event_date:      ev.event_date,
      time:            ev.time ?? "",
      time_end:        ev.time_end ?? "",
      priority:        ev.priority,
      tipo:            ev.tipo ?? "actividad",
      completed:       ev.completed,
      result:          ev.result ?? "",
      syncToGcal:      false,
      assignedUserIds: ids.length ? ids : [ev.owner_user_id ?? currentUserId],
      reminderMinutes: ev.reminder_minutes_before ?? null,
    };
  }

  function buildEmptyForm(): FormState {
    const date = initialDate ? new Date(initialDate + "T12:00:00") : undefined;
    return { ...emptyForm(date, defaultSyncToGoogleCalendar(isConnected)), assignedUserIds: [currentUserId] };
  }

  const [form, setForm]           = useState<FormState>(() =>
    editEvent ? buildFormFromEvent(editEvent) : buildEmptyForm(),
  );
  const [savingLocal, setSavingLocal] = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);

  function setSaving(value: boolean) {
    setSavingLocal(value);
    onSavingChange?.(value);
  }

  function toggleAssignedUser(userId: number) {
    setForm((prev) => {
      const exists = prev.assignedUserIds.includes(userId);
      const next   = exists
        ? prev.assignedUserIds.filter((id) => id !== userId)
        : [...prev.assignedUserIds, userId];
      return { ...prev, assignedUserIds: next.length ? next : prev.assignedUserIds };
    });
  }

  async function handleSave() {
    const priority = normalizeActivityPriority(form.priority);
    const tipo     = normalizeActivityType(form.tipo);

    if (!form.description.trim()) return;
    if (!isActivityPriority(priority) || !isActivityType(tipo)) {
      setSaveError(t("calendar.prioridadTipoInvalidos"));
      return;
    }
    if (form.assignedUserIds.length === 0) {
      setSaveError(t("calendar.usuarioRequerido"));
      return;
    }
    setSaving(true);
    setSaveError(null);

    const normalizedEnd   = form.time_end ? normalizeTime(form.time_end, "") : null;
    const normalizedStart = normalizeTime(form.time, DEFAULT_ACTIVITY_TIME);
    if (normalizedEnd && normalizedEnd <= normalizedStart) {
      setSaveError(t("calendar.horaFinInvalida"));
      setSaving(false);
      return;
    }
    if (form.reminderMinutes != null && !form.time.trim()) {
      setSaveError(t("calendar.recordatorioRequiereHora"));
      setSaving(false);
      return;
    }

    const payload = {
      description:     form.description.trim(),
      event_date:      form.event_date,
      time:            normalizedStart,
      time_end:        normalizedEnd,
      priority,
      tipo,
      completed:       form.completed,
      result:          form.result || null,
      reminderMinutes: form.reminderMinutes,
    };

    const optimisticId    = editId ?? -Date.now();
    const optimisticEvent = normalizeCalendarEvent({
      id:                      optimisticId,
      description:             payload.description,
      event_date:              payload.event_date,
      time:                    payload.time,
      time_end:                payload.time_end,
      priority:                payload.priority,
      tipo:                    payload.tipo,
      completed:               payload.completed,
      result:                  payload.result,
      reminder_minutes_before: payload.reminderMinutes,
      gcal_event_id:           editEvent?.gcal_event_id ?? null,
      owner_user_id:           currentUserId,
      user_id:                 currentUserId,
      empresa_id:              empresaId,
      created_at:              new Date().toISOString(),
      agenda_usuarios:         form.assignedUserIds.map((uid) => ({ usuario_id: uid, usuarios: null })),
    });

    onEventsChange((prev) =>
      editId !== null
        ? prev.map((ev) => ev.id === editId ? { ...ev, ...optimisticEvent, id: editId } : ev)
        : [...prev, optimisticEvent].sort((a, b) => a.event_date.localeCompare(b.event_date)),
    );
    onClose();

    async function insertOrUpdate(p: typeof payload) {
      const assignedUserIds = form.assignedUserIds.length ? form.assignedUserIds : [currentUserId];
      if (editId !== null) {
        return updateAgendaItem.mutateAsync({
          id:               editId,
          description:      p.description,
          eventDate:        p.event_date,
          time:             p.time,
          timeEnd:          p.time_end,
          priority:         p.priority,
          tipo:             p.tipo,
          completed:        p.completed,
          result:           p.result,
          assignedUserIds,
          reminderMinutes:  p.reminderMinutes ?? -1,
        });
      }
      return createAgendaItem.mutateAsync({
        description:     p.description,
        eventDate:       p.event_date,
        time:            p.time,
        timeEnd:         p.time_end,
        priority:        p.priority,
        tipo:            p.tipo,
        completed:       p.completed,
        result:          p.result,
        assignedUserIds,
        visibility:      "private",
        reminderMinutes: p.reminderMinutes,
      });
    }

    if (editId !== null) {
      try {
        const data = await insertOrUpdate(payload);
        if (data) {
          const updated: AgendaEvent = {
            ...(data as unknown as AgendaEvent),
            agenda_usuarios: form.assignedUserIds.map((uid) => ({ usuario_id: uid, usuarios: null })),
          };
          const normalizedUpdated = normalizeCalendarEvent(updated);
          const googleEventId     = normalizedUpdated.gcal_event_id ?? editEvent?.gcal_event_id ?? null;

          if (isConnected && googleEventId) {
            const gcalRes = await fetch("/api/google/events", {
              method:  "PUT",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({
                eventId:         googleEventId,
                summary:         payload.description,
                description:     payload.result ?? "",
                date:            payload.event_date,
                time:            payload.time,
                timeEnd:         payload.time_end ?? undefined,
                agendaId:        editId,
                reminderMinutes: payload.reminderMinutes ?? undefined,
              }),
            });
            if (!gcalRes.ok) {
              const gcalData = await gcalRes.json().catch(() => null);
              toast("Actividad actualizada en CRM, pero no en Google Calendar: " + (gcalData?.error ?? "error de sincronizacion"), "error");
            } else {
              onGcalEventsChange((prev) =>
                prev.map((ev) =>
                  ev.id === googleEventId
                    ? { ...ev, summary: payload.description, start: { ...ev.start, dateTime: payload.event_date + "T" + payload.time + ":00" } }
                    : ev,
                ),
              );
            }
          }
          onEventsChange((prev) => prev.map((ev) => ev.id === editId ? normalizedUpdated : ev));
          router.refresh();
          toast(t("calendar.actividadActualizada"));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : t("calendar.errorGuardar");
        if (editEvent) {
          onEventsChange((prev) => prev.map((ev) => ev.id === editId ? editEvent : ev));
        }
        setSaveError(message);
        toast(message, "error");
      }
    } else {
      try {
        const data = await insertOrUpdate(payload);
        if (data) {
          let saved: AgendaEvent = {
            ...(data as unknown as AgendaEvent),
            agenda_usuarios: form.assignedUserIds.map((uid) => ({ usuario_id: uid, usuarios: null })),
          };
          saved = normalizeCalendarEvent(saved);

          onEventsChange((prev) =>
            [...prev.filter((ev) => ev.id !== optimisticId && ev.id !== saved.id), saved]
              .sort((a, b) => a.event_date.localeCompare(b.event_date)),
          );

          if (isConnected && form.syncToGcal) {
            const gcalRes = await fetch("/api/google/events", {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({
                summary:         form.description,
                date:            form.event_date,
                time:            normalizeTime(form.time, DEFAULT_ACTIVITY_TIME),
                timeEnd:         form.time_end || undefined,
                agendaId:        saved.id,
                reminderMinutes: form.reminderMinutes ?? undefined,
              }),
            });
            if (gcalRes.ok) {
              const gcalData = await gcalRes.json();
              if (gcalData.id) {
                if (process.env.NODE_ENV !== "production") {
                  console.log("[calendario] intentando guardar gcal_event_id", { localAgendaId: saved.id, googleEventId: gcalData.id, currentUserId, empresaId });
                }
                const syncResult = await saveAgendaGoogleEventIdAction(saved.id, gcalData.id);
                if (!syncResult.success) {
                  if (process.env.NODE_ENV !== "production") {
                    const e = syncResult.error;
                    console.error("[calendario] Error guardando gcal_event_id:", { message: e?.message, details: e?.details, hint: e?.hint, code: e?.code });
                  }
                  toast("Actividad guardada en CRM, pero no enlazada con Google Calendar: " + syncResult.error.message, "error");
                } else {
                  saved = normalizeCalendarEvent({ ...saved, gcal_event_id: syncResult.data.gcal_event_id });
                  onEventsChange((prev) => prev.map((ev) => ev.id === saved.id ? saved : ev));
                }
              }
            } else {
              const gcalData = await gcalRes.json().catch(() => null);
              toast("Actividad guardada localmente. " + (gcalData?.error ?? "No se pudo sincronizar con Google Calendar"), "error");
            }
          }
          router.refresh();
          toast(t("calendar.actividadCreada"));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : t("calendar.errorGuardar");
        onEventsChange((prev) => prev.filter((ev) => ev.id !== optimisticId));
        setSaveError(message);
        toast(message, "error");
      }
    }
    setSaving(false);
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editId !== null ? t("calendar.editarActividad") : t("calendar.nuevaActividadLabel")}
      width="md"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background sm:w-auto"
          >
            {t("calendar.cancelar")}
          </button>
          <button
            onClick={handleSave}
            disabled={savingLocal || !form.description.trim() || form.assignedUserIds.length === 0}
            className="pressable inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60 sm:w-auto"
          >
            {savingLocal && <Loader2 className="h-4 w-4 animate-spin" />}
            {savingLocal
              ? t("calendar.guardando")
              : editId !== null
                ? t("calendar.guardarCambios")
                : t("calendar.crearActividad")}
          </button>
        </div>
      }
    >
      <div className="space-y-4 px-5 py-5">
        {/* Tipo selector */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {t("ordenes.tipoActividad")}
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {TIPOS.map((tp) => {
              const Icon   = tp.icon;
              const active = form.tipo === tp.value;
              return (
                <button
                  key={tp.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, tipo: tp.value }))}
                  className={[
                    "flex flex-col items-center gap-1 rounded-xl border py-2.5 px-1 text-center transition-all",
                    active ? `${tp.bg} ${tp.border} ${tp.text} border-2` : "border-border text-text-secondary hover:bg-background",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[10px] font-medium">{tp.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor={`${formId}-descripcion`} className="text-xs font-medium text-text-secondary">
            {t("calendar.descripcion")} *
          </label>
          <input
            id={`${formId}-descripcion`}
            type="text"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder={t("calendar.describeLaActividad")}
            className="input mt-1.5"
          />
        </div>

        {/* Date */}
        <div>
          <label htmlFor={`${formId}-fecha`} className="text-xs font-medium text-text-secondary">
            {t("calendar.fecha")}
          </label>
          <input
            id={`${formId}-fecha`}
            type="date"
            value={form.event_date}
            onChange={(e) => setForm((prev) => ({ ...prev, event_date: e.target.value }))}
            className="input mt-1.5"
          />
        </div>

        {/* Time start / end / duration */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${formId}-hora-inicio`} className="text-xs font-medium text-text-secondary">
                {t("calendar.horaInicio")}
              </label>
              <input
                id={`${formId}-hora-inicio`}
                type="time"
                value={form.time}
                onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
                className="input mt-1.5"
              />
            </div>
            <div>
              <label htmlFor={`${formId}-hora-fin`} className="text-xs font-medium text-text-secondary">
                {t("calendar.horaFin")}
              </label>
              <input
                id={`${formId}-hora-fin`}
                type="time"
                value={form.time_end}
                onChange={(e) => setForm((prev) => ({ ...prev, time_end: e.target.value }))}
                className="input mt-1.5"
              />
            </div>
          </div>
          {(() => {
            const dur = calcDurationMinutes(form.time, form.time_end);
            if (!dur) return null;
            return (
              <p className="flex items-center gap-1 text-xs text-text-secondary">
                <Clock className="h-3 w-3" />
                {t("ordenes.duracion")}: <span className="font-medium text-text-primary">{formatDuration(dur)}</span>
              </p>
            );
          })()}
        </div>

        {/* Reminder */}
        <div>
          <label htmlFor={`${formId}-recordatorio`} className="text-xs font-medium text-text-secondary">
            {t("calendar.recordatorio")}
          </label>
          <select
            id={`${formId}-recordatorio`}
            value={form.reminderMinutes == null ? "" : String(form.reminderMinutes)}
            onChange={(e) => setForm((prev) => ({ ...prev, reminderMinutes: e.target.value === "" ? null : Number(e.target.value) }))}
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
            <p className="mt-1 text-[10px] text-text-secondary">{t("calendar.duracionHint")}</p>
          )}
        </div>

        {/* Priority */}
        <div>
          <label className="text-xs font-medium text-text-secondary">{t("calendar.prioridad")}</label>
          <div className="mt-1.5 flex overflow-hidden rounded-lg border border-border">
            {PRIORITIES.map((p, i) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, priority: p.value }))}
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
          <label className="text-xs font-medium text-text-secondary">
            {t("calendar.usuariosAsignados")} *
          </label>
          <div className="mt-1.5 max-h-32 space-y-1 overflow-y-auto rounded-xl border border-border bg-background p-2">
            {[
              { id: currentUserId, name: usersMap[currentUserId] ?? "Yo" },
              ...filterableUsers.filter((u) => u.id !== currentUserId),
            ].map((user) => (
              <label
                key={user.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-secondary hover:bg-surface"
              >
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
            <input
              type="checkbox"
              checked={form.completed}
              onChange={(e) => setForm((prev) => ({ ...prev, completed: e.target.checked }))}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-sm text-text-secondary">{t("calendar.marcarCompletada")}</span>
          </label>
        )}

        {/* Notes / result */}
        <div>
          <label htmlFor={`${formId}-notas`} className="text-xs font-medium text-text-secondary">
            {t("calendar.notasResultado")}
          </label>
          <textarea
            id={`${formId}-notas`}
            value={form.result}
            onChange={(e) => setForm((prev) => ({ ...prev, result: e.target.value }))}
            placeholder={t("calendar.observaciones")}
            rows={3}
            className="input mt-1.5 resize-none"
          />
        </div>

        {/* GCal sync (create only) */}
        {editId === null && isConnected && (
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-background p-3">
            <input
              type="checkbox"
              checked={form.syncToGcal}
              onChange={(e) => setForm((prev) => ({ ...prev, syncToGcal: e.target.checked }))}
              className="h-4 w-4 accent-primary"
            />
            <div>
              <p className="text-sm font-medium text-text-primary">{t("calendar.sincronizarGcal")}</p>
              <p className="text-xs text-text-secondary">{t("calendar.sincronizarGcalDesc")}</p>
            </div>
          </label>
        )}

        {saveError && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{saveError}</p>
        )}
      </div>
    </Drawer>
  );
}
