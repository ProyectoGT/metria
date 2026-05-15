"use client";

import { memo, useCallback, useEffect, useMemo, useState, useId, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, Calendar, CheckCircle2, ChevronDown, Circle, Clock, Loader2, Pencil, Plus, Trash2, User } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import Drawer from "@/components/ui/drawer";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import type { UserRole } from "@/lib/roles";
import { DEFAULT_ACTIVITY_TIME, normalizeTime, calcDurationMinutes, formatDuration, formatReminderLabel, REMINDER_OPTIONS } from "@/lib/local-date-time";
import { useToast, Toaster } from "@/components/ui/toast";
import { isActivityPriority, isActivityType, normalizeActivityPriority, normalizeActivityType, type ActivityType } from "@/lib/activity-options";
import { AuditTimelineCard } from "@/components/audit/audit-timeline";
import { useI18n } from "@/lib/i18n";

type Usuario = { id: number; nombre: string; apellidos: string };

type Actividad = {
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
  user_id?: number | null;
  owner_user_id: number | null;
  agenda_usuarios?: Array<{
    usuario_id: number;
    usuarios?: { nombre: string | null; apellidos: string | null } | null;
  }>;
};

type Props = {
  initialActividades: Actividad[];
  currentUserId: number;
  currentUserRole: UserRole | null;
  usuarios: Usuario[];
  today: string;
};

// Static style data — labels come from t() inside the component
const PRIORITY_STYLES = [
  { value: "alta",  badge: "bg-red-500/15 text-red-700 dark:text-red-400",    border: "border-l-red-500",  dot: "bg-red-500",  text: "text-red-700 dark:text-red-400" },
  { value: "media", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400", border: "border-l-amber-400", dot: "bg-amber-400", text: "text-amber-700 dark:text-amber-400" },
  { value: "baja",  badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400",  border: "border-l-blue-400", dot: "bg-blue-400",  text: "text-text-secondary" },
];

const TIPO_VALUES: ActivityType[] = ["actividad", "llamada", "visita", "reunion", "seguimiento", "formacion", "otro"];

function nombreCompleto(u: Usuario) {
  return `${u.nombre} ${u.apellidos}`.trim();
}

function canManageOthers(role: UserRole | null) {
  return role === "Administrador" || role === "Director" || role === "Responsable";
}

function assignedIds(actividad: Actividad) {
  return actividad.agenda_usuarios?.map((u) => u.usuario_id) ?? [];
}

// ─── Enriched row type ────────────────────────────────────────────────────────

type PriorityMeta = (typeof PRIORITY_STYLES)[0] & { label: string };

type EnrichedActividad = {
  actividad:     Actividad;
  meta:          PriorityMeta;
  ids:           number[];
  durationLabel: string | null;
  tipoLabelStr:  string;
};

// ─── ActividadRow ────────────────────────────────────────────────────────────
// Defined outside OrdenesClient so its reference is stable across renders and
// React.memo can compare props without the component type changing each time.

type ActividadRowProps = {
  enriched:       EnrichedActividad;
  isCompleting:   boolean;
  userMap:        Map<number, string>;
  onOpenDetail:   (actividad: Actividad) => void;
  onSetCompleted: (actividad: Actividad, completed: boolean) => void;
};

const ActividadRow = memo(function ActividadRow({
  enriched,
  isCompleting,
  userMap,
  onOpenDetail,
  onSetCompleted,
}: ActividadRowProps) {
  const { actividad, meta, ids, durationLabel, tipoLabelStr } = enriched;

  return (
    <div className="px-2 py-1.5">
      <div
        onClick={() => onOpenDetail(actividad)}
        className={`group flex cursor-pointer items-start gap-3 rounded-ds-lg border-l-2 bg-surface px-4 py-3 transition-all hover:bg-surface-elevated hover:shadow-layer-1 ${meta.border}`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isCompleting) onSetCompleted(actividad, !actividad.completed);
          }}
          disabled={isCompleting}
          className={`mt-0.5 shrink-0 transition-opacity disabled:opacity-50 ${
            actividad.completed
              ? "text-success"
              : "text-text-secondary opacity-0 group-hover:opacity-100 hover:text-success"
          }`}
        >
          {isCompleting
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : actividad.completed
              ? <CheckCircle2 className="complete-pop h-4 w-4" />
              : <Circle className="h-4 w-4" />}
        </button>

        <div className="min-w-0 flex-1">
          <p className={`break-words text-sm font-medium leading-snug ${actividad.completed ? "line-through text-text-secondary" : "text-text-primary"}`}>
            {actividad.description}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
            <span>
              {normalizeTime(actividad.time, DEFAULT_ACTIVITY_TIME)}
              {actividad.time_end ? ` – ${actividad.time_end}` : ""}
              {durationLabel ? ` (${durationLabel})` : ""}
            </span>
            <span>{tipoLabelStr}</span>
            {actividad.reminder_minutes_before != null && (
              <span className="inline-flex items-center gap-0.5 text-primary">
                <Bell className="h-3 w-3" />
                {formatReminderLabel(actividad.reminder_minutes_before)}
              </span>
            )}
            {ids.map((id) => (
              <span key={id}>{userMap.get(id) ?? `Usuario ${id}`}</span>
            ))}
          </div>
          {actividad.completed && actividad.result && (
            <p className="mt-1 text-xs italic text-text-secondary line-clamp-1">
              {actividad.result}
            </p>
          )}
        </div>

        <span className={`mt-0.5 inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold ${meta.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>
    </div>
  );
});

// ─── OrdenesClient ────────────────────────────────────────────────────────────

export default function OrdenesClient({
  initialActividades,
  currentUserId,
  currentUserRole,
  usuarios,
  today,
}: Props) {
  const { t } = useI18n();
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { toast, toasts } = useToast();
  const [actividades, setActividades] = useState<Actividad[]>(initialActividades);
  const [filterUserId, setFilterUserId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Actividad | null>(null);
  const [detailActividad, setDetailActividad] = useState<Actividad | null>(null);
  const [confirmDeleteActividad, setConfirmDeleteActividad] = useState<Actividad | null>(null);
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const formId = useId();
  const [form, setForm] = useState({
    description: "",
    time: DEFAULT_ACTIVITY_TIME,
    time_end: "",
    priority: "media",
    tipo: "actividad",
    result: "",
    completed: false,
    assignedUserIds: [currentUserId],
    reminderMinutes: null as number | null,
  });

  // Translated label arrays (stable when locale is stable)
  const PRIORIDADES = useMemo(() => PRIORITY_STYLES.map((p) => ({
    ...p,
    label: t(`statuses.${p.value === "alta" ? "high" : p.value === "media" ? "medium" : "low"}`),
  })), [t]);

  const TIPOS_ACTIVIDAD = useMemo((): Array<{ value: ActivityType; label: string }> =>
    TIPO_VALUES.map((v) => ({ value: v, label: t(`ordenes.tipos.${v}`) })),
    [t]
  );

  const userMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const usuario of usuarios) map.set(usuario.id, nombreCompleto(usuario));
    return map;
  }, [usuarios]);

  const filteredActividades = useMemo(() => {
    return actividades.filter((actividad) => {
      if (!filterUserId) return true;
      return assignedIds(actividad).includes(filterUserId) || actividad.owner_user_id === filterUserId || actividad.user_id === filterUserId;
    });
  }, [actividades, filterUserId]);

  const stats = useMemo(() => {
    let completed = 0;
    for (const a of filteredActividades) if (a.completed) completed++;
    return { total: filteredActividades.length, completed, pending: filteredActividades.length - completed };
  }, [filteredActividades]);

  // Pre-compute per-row derived data so the map in the render body is pure
  // array access instead of calling priorityMeta / assignedIds / calcDurationMinutes
  // on every render regardless of whether the data changed.
  const enrichedActividades = useMemo<EnrichedActividad[]>(() =>
    filteredActividades.map((actividad) => {
      const meta = PRIORIDADES.find((p) => p.value === actividad.priority) ?? PRIORIDADES[1];
      const ids = actividad.agenda_usuarios?.map((u) => u.usuario_id) ?? [];
      const durationMinutes = calcDurationMinutes(actividad.time, actividad.time_end);
      const normalized = normalizeActivityType(actividad.tipo);
      return {
        actividad,
        meta,
        ids,
        durationLabel: durationMinutes ? formatDuration(durationMinutes) : null,
        tipoLabelStr: TIPOS_ACTIVIDAD.find((item) => item.value === normalized)?.label
          ?? t("ordenes.tipos.actividad"),
      };
    }),
    [filteredActividades, PRIORIDADES, TIPOS_ACTIVIDAD, t],
  );

  // ── Dev-only render tracker (hooks always called, log only in dev) ─────────
  const devRenderCountRef = useRef(0);
  const devLastCommitRef = useRef<number | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const now = performance.now();
    const previous = devLastCommitRef.current;
    devLastCommitRef.current = now;
    devRenderCountRef.current += 1;
    if (devRenderCountRef.current <= 1 || previous == null) return;
    const delta = (now - previous).toFixed(1);
    console.debug(`[PERF] OrdenesClient commit #${devRenderCountRef.current} +${delta}ms`, {
      showModal,
      editing: !!editing,
      detailActividad: !!detailActividad,
      filterUserId,
      actividadesCount: actividades.length,
      filteredCount: filteredActividades.length,
    });
  });

  // Stable callbacks for ActividadRow — must not close over frequently-changing
  // state so that memo(ActividadRow) can bail out on unrelated renders.
  const handleRowOpenDetail = useCallback((actividad: Actividad) => {
    setDetailActividad(actividad);
  }, []); // setDetailActividad is a stable useState setter

  const handleRowSetCompleted = useCallback(async (actividad: Actividad, completed: boolean) => {
    // completingId guard is handled in ActividadRow via the isCompleting prop;
    // no need to reference completingId here, keeping this callback stable.
    setCompletingId(actividad.id);
    setActividades((prev) => prev.map((a) => a.id === actividad.id ? { ...a, completed } : a));
    const { data, error } = await supabase.rpc("set_agenda_completed", {
      p_agenda_id: actividad.id,
      p_completed: completed,
      p_result: completed ? (actividad.result ?? undefined) : undefined,
    });
    setCompletingId(null);
    if (error || !data) {
      setActividades((prev) => prev.map((a) => a.id === actividad.id ? { ...a, completed: !completed } : a));
      toast(error?.message ?? t("errors.generic"), "error");
      return;
    }
    router.refresh();
    toast(completed ? t("ordenes.actividadCompletada") : t("ordenes.actividadPendiente"));
  }, [supabase, toast, router, t]);

  function priorityMeta(priority: string | null) {
    return PRIORIDADES.find((p) => p.value === priority) ?? PRIORIDADES[1];
  }

  function tipoLabel(tipo: string | null) {
    const normalized = normalizeActivityType(tipo);
    return TIPOS_ACTIVIDAD.find((item) => item.value === normalized)?.label ?? t("ordenes.tipos.actividad");
  }

  function openCreate() {
    setEditing(null);
    setForm({
      description: "",
      time: DEFAULT_ACTIVITY_TIME,
      time_end: "",
      priority: "media",
      tipo: "actividad",
      result: "",
      completed: false,
      assignedUserIds: [filterUserId ?? currentUserId],
      reminderMinutes: null,
    });
    setShowModal(true);
  }

  function openEdit(actividad: Actividad) {
    const ids = assignedIds(actividad);
    setEditing(actividad);
    setForm({
      description: actividad.description,
      time: normalizeTime(actividad.time, DEFAULT_ACTIVITY_TIME),
      time_end: actividad.time_end ?? "",
      priority: actividad.priority ?? "media",
      tipo: actividad.tipo ?? "actividad",
      result: actividad.result ?? "",
      completed: actividad.completed,
      assignedUserIds: ids.length ? ids : [actividad.owner_user_id ?? currentUserId],
      reminderMinutes: actividad.reminder_minutes_before ?? null,
    });
    setShowModal(true);
  }

  function toggleAssigned(id: number) {
    setForm((prev) => {
      const exists = prev.assignedUserIds.includes(id);
      const next = exists ? prev.assignedUserIds.filter((userId) => userId !== id) : [...prev.assignedUserIds, id];
      return { ...prev, assignedUserIds: next.length ? next : prev.assignedUserIds };
    });
  }

  async function saveActividad(e: React.FormEvent) {
    e.preventDefault();
    const priority = normalizeActivityPriority(form.priority);
    const tipo = normalizeActivityType(form.tipo);

    if (!isActivityPriority(priority) || !isActivityType(tipo)) {
      toast(t("ordenes.prioridadTipoInvalidos"), "error");
      return;
    }

    if (!form.description.trim() || form.assignedUserIds.length === 0) {
      toast(t("ordenes.tituloUsuarioRequerido"), "error");
      return;
    }

    const normalizedStart = normalizeTime(form.time, DEFAULT_ACTIVITY_TIME);
    const normalizedEnd = form.time_end ? normalizeTime(form.time_end, "") : null;
    if (normalizedEnd && normalizedEnd <= normalizedStart) {
      toast(t("ordenes.horaFinInvalida"), "error");
      return;
    }
    if (form.reminderMinutes != null && !form.time.trim()) {
      toast(t("ordenes.recordatorioRequiereHora"), "error");
      return;
    }

    setSaving(true);
    const args = {
      p_description: form.description.trim(),
      p_event_date: today,
      p_time: normalizedStart,
      p_time_end: normalizedEnd ?? undefined,
      p_priority: priority,
      p_tipo: tipo,
      p_result: form.result.trim() || undefined,
      p_completed: form.completed,
      p_assigned_user_ids: form.assignedUserIds,
      p_reminder_minutes: form.reminderMinutes ?? undefined,
    };

    const previousActividades = actividades;
    const optimisticId = editing?.id ?? -Date.now();
    const optimisticActividad: Actividad = {
      id: optimisticId,
      description: args.p_description,
      event_date: today,
      time: args.p_time,
      time_end: args.p_time_end ?? null,
      priority,
      tipo,
      completed: form.completed,
      result: form.result.trim() || null,
      reminder_minutes_before: form.reminderMinutes,
      owner_user_id: editing?.owner_user_id ?? currentUserId,
      user_id: editing?.user_id ?? currentUserId,
      agenda_usuarios: form.assignedUserIds.map((usuario_id) => ({
        usuario_id,
        usuarios: null,
      })),
    };

    setActividades((prev) => editing
      ? prev.map((a) => a.id === editing.id ? { ...a, ...optimisticActividad, id: editing.id } : a)
      : [...prev, optimisticActividad].sort((a, b) => normalizeTime(a.time).localeCompare(normalizeTime(b.time))));
    setShowModal(false);

    const { data, error } = editing
      ? await supabase.rpc("update_agenda_activity_v2", { p_agenda_id: editing.id, ...args, p_reminder_minutes: form.reminderMinutes ?? -1 })
      : await supabase.rpc("create_agenda_activity_v2", { ...args, p_visibility: "private" });

    setSaving(false);
    if (error || !data) {
      setActividades(previousActividades);
      toast(error?.message ?? t("errors.saveFailed"), "error");
      return;
    }

    const updated = data as unknown as Actividad;
    const withUsers = {
      ...updated,
      agenda_usuarios: form.assignedUserIds.map((usuario_id) => ({
        usuario_id,
        usuarios: null,
      })),
    };
    setActividades((prev) => editing
      ? prev.map((a) => a.id === editing.id ? withUsers : a)
      : prev.map((a) => a.id === optimisticId ? withUsers : a)
          .sort((a, b) => normalizeTime(a.time).localeCompare(normalizeTime(b.time))));
    router.refresh();
    toast(editing ? t("ordenes.actividadActualizada") : t("ordenes.actividadCreada"));
  }


  async function archiveActividad(id: number) {
    const { error } = await supabase.rpc("archive_agenda", { p_agenda_id: id, p_reason: "archived_from_ordenes" });
    if (error) {
      toast(error.message, "error");
      return;
    }
    setActividades((prev) => prev.filter((a) => a.id !== id));
    router.refresh();
    toast(t("ordenes.actividadArchivada"));
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <Toaster toasts={toasts} />

      {/* Stats + actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-ds-lg border border-border bg-surface px-4 py-3 shadow-layer-1">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-text-primary">{stats.completed}/{stats.total}</span>
            <span className="text-text-secondary">{t("ordenes.completadasHoy")}</span>
          </div>
          <div className="text-sm text-text-secondary">
            {stats.pending} {t("ordenes.pendientes")}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canManageOthers(currentUserRole) && usuarios.length > 1 && (
            <div className="relative">
              <select
                value={filterUserId ?? ""}
                onChange={(e) => setFilterUserId(e.target.value ? Number(e.target.value) : null)}
                className="input h-9 appearance-none py-0 pl-3 pr-8 text-sm"
              >
                <option value="">{t("ordenes.todos")}</option>
                {usuarios.map((u) => <option key={u.id} value={u.id}>{nombreCompleto(u)}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
            </div>
          )}
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
            aria-label={t("ordenes.nuevaActividad")}
          >
            <Plus className="h-4 w-4" />
            {t("ordenes.nueva")}
          </button>
        </div>
      </div>

      {/* Activity list */}
      <div className="overflow-hidden rounded-ds-lg border border-border bg-surface shadow-layer-1">
        {filteredActividades.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-text-secondary">
              <Clock className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-text-primary">{t("ordenes.sinActividades")}</p>
            <p className="mt-1 max-w-sm text-sm text-text-secondary">{t("ordenes.creaActividad")}</p>
            <button onClick={openCreate} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark" aria-label={t("ordenes.anadirActividad")}>
              <Plus className="h-4 w-4" />
              {t("ordenes.anadirActividad")}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border/70">
            {enrichedActividades.map((enriched) => (
              <ActividadRow
                key={enriched.actividad.id}
                enriched={enriched}
                isCompleting={completingId === enriched.actividad.id}
                userMap={userMap}
                onOpenDetail={handleRowOpenDetail}
                onSetCompleted={handleRowSetCompleted}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Drawer */}
      <Drawer
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? t("ordenes.editarActividad") : t("ordenes.nuevaActividad")}
        width="md"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background">
              {t("ordenes.cancelar")}
            </button>
            <button
              form="ordenes-form"
              type="submit"
              disabled={saving || !form.description.trim() || form.assignedUserIds.length === 0}
              className="pressable inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? t("ordenes.guardando") : t("common.save")}
            </button>
          </div>
        }
      >
        <form id="ordenes-form" onSubmit={saveActividad} className="space-y-4 px-5 py-5">
          <div>
            <label htmlFor={`${formId}-titulo`} className="mb-1 block text-xs font-medium text-text-secondary">{t("ordenes.titulo")} *</label>
            <input
              id={`${formId}-titulo`}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="input text-sm"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${formId}-hora-inicio`} className="mb-1 block text-xs font-medium text-text-secondary">{t("ordenes.horaInicio")} *</label>
              <input
                id={`${formId}-hora-inicio`}
                type="time"
                value={form.time}
                onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
                className="input text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor={`${formId}-hora-fin`} className="mb-1 block text-xs font-medium text-text-secondary">{t("ordenes.horaFin")}</label>
              <input
                id={`${formId}-hora-fin`}
                type="time"
                value={form.time_end}
                onChange={(e) => setForm((prev) => ({ ...prev, time_end: e.target.value }))}
                className="input text-sm"
              />
            </div>
          </div>
          {(() => {
            const dur = calcDurationMinutes(form.time, form.time_end);
            return dur ? (
              <p className="flex items-center gap-1 text-xs text-text-secondary -mt-2">
                <Clock className="h-3 w-3" />
                {t("ordenes.duracion")} <span className="font-medium text-text-primary">{formatDuration(dur)}</span>
              </p>
            ) : null;
          })()}
          <div>
            <label htmlFor={`${formId}-prioridad`} className="mb-1 block text-xs font-medium text-text-secondary">{t("ordenes.prioridad")}</label>
            <select
              id={`${formId}-prioridad`}
              value={form.priority}
              onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
              className="input text-sm"
            >
              {PRIORIDADES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={`${formId}-recordatorio`} className="mb-1 block text-xs font-medium text-text-secondary">{t("ordenes.recordatorio")}</label>
            <select
              id={`${formId}-recordatorio`}
              value={form.reminderMinutes == null ? "" : String(form.reminderMinutes)}
              onChange={(e) => setForm((prev) => ({ ...prev, reminderMinutes: e.target.value === "" ? null : Number(e.target.value) }))}
              className="input text-sm"
            >
              {REMINDER_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value == null ? "" : String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${formId}-tipo`} className="mb-1 block text-xs font-medium text-text-secondary">{t("ordenes.tipoActividad")}</label>
            <select
              id={`${formId}-tipo`}
              value={form.tipo}
              onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))}
              className="input text-sm"
            >
              {TIPOS_ACTIVIDAD.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">{t("ordenes.usuarios")} *</label>
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
              {usuarios.map((u) => (
                <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-background">
                  <input
                    type="checkbox"
                    checked={form.assignedUserIds.includes(u.id)}
                    onChange={() => toggleAssigned(u.id)}
                    className="h-4 w-4 accent-primary"
                  />
                  {nombreCompleto(u)}
                </label>
              ))}
            </div>
          </div>
          {editing && (
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-background p-3">
              <input
                type="checkbox"
                checked={form.completed}
                onChange={(e) => setForm((prev) => ({ ...prev, completed: e.target.checked }))}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm text-text-secondary">{t("ordenes.marcarCompletada")}</span>
            </label>
          )}
          <div>
            <label htmlFor={`${formId}-resultado`} className="mb-1 block text-xs font-medium text-text-secondary">{t("ordenes.resultadoNotas")}</label>
            <textarea
              id={`${formId}-resultado`}
              value={form.result}
              onChange={(e) => setForm((prev) => ({ ...prev, result: e.target.value }))}
              rows={3}
              className="input resize-none text-sm"
            />
          </div>
        </form>
      </Drawer>

      {/* Detail Drawer */}
      <Drawer
        open={detailActividad !== null}
        onClose={() => setDetailActividad(null)}
        title={detailActividad?.description ?? ""}
        subtitle={t("ordenes.ordenDelDia")}
        width="md"
        headerActions={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (!detailActividad) return;
                const a = detailActividad;
                setDetailActividad(null);
                setTimeout(() => openEdit(a), 150);
              }}
              className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
              aria-label={t("common.edit")}
            >
              <Pencil className="h-4 w-4" />
            </button>
            {canManageOthers(currentUserRole) && (
              <button
                type="button"
                onClick={() => setConfirmDeleteActividad(detailActividad)}
                className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                aria-label={t("common.delete")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        }
      >
        {detailActividad && (
          <div className="space-y-5 px-5 py-5">
            <div className="rounded-ds-lg border border-border bg-surface-elevated p-4 shadow-layer-1">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${priorityMeta(detailActividad.priority).text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${priorityMeta(detailActividad.priority).dot}`} />
                  {priorityMeta(detailActividad.priority).label}
                </span>
                {detailActividad.completed && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                    <CheckCircle2 className="complete-pop h-3.5 w-3.5" />
                    {t("ordenes.completada")}
                  </span>
                )}
                <span className="text-xs font-medium text-text-secondary">
                  {tipoLabel(detailActividad.tipo)}
                </span>
              </div>
            </div>

            <div className="space-y-2 rounded-ds-lg border border-border bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{t("ordenes.planificacion")}</p>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>
                  {new Date(detailActividad.event_date + "T12:00:00").toLocaleDateString(undefined, {
                    weekday: "long", day: "numeric", month: "long", year: "numeric",
                  })}
                </span>
              </div>
              {detailActividad.time && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>
                    {normalizeTime(detailActividad.time, "")}
                    {detailActividad.time_end && ` – ${normalizeTime(detailActividad.time_end, "")}`}
                    {(() => {
                      const d = calcDurationMinutes(detailActividad.time, detailActividad.time_end);
                      return d ? <span className="ml-1 rounded-full bg-surface-raised px-2 py-0.5 text-xs font-medium">{formatDuration(d)}</span> : null;
                    })()}
                  </span>
                </div>
              )}
              {detailActividad.reminder_minutes_before != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Bell className="h-4 w-4 shrink-0 text-primary" />
                  <span className="font-medium text-primary">{formatReminderLabel(detailActividad.reminder_minutes_before)}</span>
                </div>
              )}
            </div>

            {assignedIds(detailActividad).length > 0 && (
              <div className="space-y-2 rounded-ds-lg border border-border bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{t("ordenes.asignadoA")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {assignedIds(detailActividad).map((uid) => (
                    <span key={uid} className="inline-flex items-center gap-1 rounded-md bg-surface-raised px-2.5 py-1 text-xs font-medium text-text-primary">
                      <User className="h-3 w-3" />
                      {userMap.get(uid) ?? `Usuario ${uid}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detailActividad.completed && detailActividad.result && (
              <div className="rounded-ds-lg border border-success/20 bg-success/8 px-4 py-3">
                <p className="text-xs font-semibold text-success">{t("ordenes.resultado")}</p>
                <p className="mt-1 text-sm text-text-primary">{detailActividad.result}</p>
              </div>
            )}

            <AuditTimelineCard
              entityType="agenda"
              entityId={detailActividad.id}
              compact
            />

            <div className="rounded-ds-lg bg-surface-raised px-4 py-3 text-xs text-text-secondary">
              <p>{t("ordenes.actividadId")} {detailActividad.id}</p>
            </div>
          </div>
        )}
      </Drawer>

      {confirmDeleteActividad && (
        <ConfirmDialog
          open
          title={t("ordenes.eliminarActividad")}
          description={t("ordenes.irrecuperable")}
          confirmLabel={t("common.delete")}
          onCancel={() => {
            setConfirmDeleteActividad(null);
            setDetailActividad(null);
          }}
          onConfirm={() => {
            if (!confirmDeleteActividad) return;
            const id = confirmDeleteActividad.id;
            setConfirmDeleteActividad(null);
            setDetailActividad(null);
            archiveActividad(id);
          }}
        />
      )}
    </div>
  );
}
