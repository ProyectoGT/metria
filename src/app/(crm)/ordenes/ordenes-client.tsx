"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Calendar, CheckCircle2, ChevronDown, Circle, Clock, Loader2, Pencil, Plus, Trash2, User } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import Drawer from "@/components/ui/drawer";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import type { UserRole } from "@/lib/roles";
import { DEFAULT_ACTIVITY_TIME, normalizeTime, calcDurationMinutes, formatDuration, formatReminderLabel, REMINDER_OPTIONS } from "@/lib/local-date-time";
import { useToast, Toaster } from "@/components/ui/toast";
import { isActivityPriority, isActivityType, normalizeActivityPriority, normalizeActivityType, type ActivityType } from "@/lib/activity-options";

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

const PRIORIDADES = [
  { value: "alta", label: "Alta", badge: "bg-red-500/15 text-red-700 dark:text-red-400", border: "border-l-red-500" },
  { value: "media", label: "Media", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400", border: "border-l-amber-400" },
  { value: "baja", label: "Baja", badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400", border: "border-l-blue-400" },
];

const TIPOS_ACTIVIDAD: Array<{ value: ActivityType; label: string }> = [
  { value: "actividad", label: "Actividad" },
  { value: "llamada", label: "Llamada" },
  { value: "visita", label: "Visita" },
  { value: "reunion", label: "Reunion" },
  { value: "seguimiento", label: "Seguimiento" },
  { value: "formacion", label: "Formacion" },
  { value: "otro", label: "Otro" },
];

function nombreCompleto(u: Usuario) {
  return `${u.nombre} ${u.apellidos}`.trim();
}

function canManageOthers(role: UserRole | null) {
  return role === "Administrador" || role === "Director" || role === "Responsable";
}

function priorityMeta(priority: string | null) {
  return PRIORIDADES.find((p) => p.value === priority) ?? PRIORIDADES[1];
}

function tipoLabel(tipo: string | null) {
  const normalized = normalizeActivityType(tipo);
  return TIPOS_ACTIVIDAD.find((item) => item.value === normalized)?.label ?? "Actividad";
}

function assignedIds(actividad: Actividad) {
  return actividad.agenda_usuarios?.map((u) => u.usuario_id) ?? [];
}

export default function OrdenesClient({
  initialActividades,
  currentUserId,
  currentUserRole,
  usuarios,
  today,
}: Props) {
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

  const stats = useMemo(() => ({
    total: filteredActividades.length,
    completed: filteredActividades.filter((a) => a.completed).length,
    pending: filteredActividades.filter((a) => !a.completed).length,
  }), [filteredActividades]);

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
      toast("Prioridad o tipo de actividad no validos", "error");
      return;
    }

    if (!form.description.trim() || form.assignedUserIds.length === 0) {
      toast("Debes indicar titulo y al menos un usuario", "error");
      return;
    }

    // Validar hora fin
    const normalizedStart = normalizeTime(form.time, DEFAULT_ACTIVITY_TIME);
    const normalizedEnd = form.time_end ? normalizeTime(form.time_end, "") : null;
    if (normalizedEnd && normalizedEnd <= normalizedStart) {
      toast("La hora de fin debe ser posterior a la hora de inicio", "error");
      return;
    }
    if (form.reminderMinutes != null && !form.time.trim()) {
      toast("Se requiere hora de inicio para configurar un recordatorio", "error");
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
      ? await supabase.rpc("update_agenda_activity", { p_agenda_id: editing.id, ...args, p_reminder_minutes: form.reminderMinutes ?? -1 })
      : await supabase.rpc("create_agenda_activity_v2", { ...args, p_visibility: "private" });

    setSaving(false);
    if (error || !data) {
      setActividades(previousActividades);
      toast(error?.message ?? "Error al guardar", "error");
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
    toast(editing ? "Actividad actualizada" : "Actividad creada");
  }

  async function setCompleted(actividad: Actividad, completed: boolean) {
    if (completingId === actividad.id) return;
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
      toast(error?.message ?? "Error al actualizar", "error");
      return;
    }
    router.refresh();
    toast(completed ? "Actividad completada" : "Actividad pendiente");
  }

  async function archiveActividad(id: number) {
    const { error } = await supabase.rpc("archive_agenda", { p_agenda_id: id, p_reason: "archived_from_ordenes" });
    if (error) {
      toast(error.message, "error");
      return;
    }
    setActividades((prev) => prev.filter((a) => a.id !== id));
    router.refresh();
    toast("Actividad archivada");
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <Toaster toasts={toasts} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 shadow-sm">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">{stats.completed}/{stats.total}</span>
            <span className="text-xs text-text-secondary">hoy</span>
          </div>
          <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text-secondary shadow-sm">
            {stats.pending} pendientes
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
                <option value="">Todos</option>
                {usuarios.map((u) => <option key={u.id} value={u.id}>{nombreCompleto(u)}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
            </div>
          )}
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" />
            Nueva
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface shadow-sm">
        {filteredActividades.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Clock className="mb-3 h-10 w-10 text-text-secondary/40" />
            <p className="text-sm font-medium text-text-primary">Sin actividades para hoy</p>
            <button onClick={openCreate} className="mt-3 text-xs font-medium text-primary hover:underline">
              + Anadir actividad
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredActividades.map((actividad) => {
              const meta = priorityMeta(actividad.priority);
              const ids = assignedIds(actividad);
              return (
                <div key={actividad.id} className="p-2">
                  <div
                    onClick={() => setDetailActividad(actividad)}
                    className={`group flex cursor-pointer items-start gap-3 rounded-xl border border-l-4 bg-surface px-4 py-3 transition-all hover:bg-background hover:shadow-sm ${meta.border} border-border`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCompleted(actividad, !actividad.completed);
                      }}
                      disabled={completingId === actividad.id}
                      className={`mt-0.5 shrink-0 transition-opacity disabled:opacity-50 ${
                        actividad.completed
                          ? "text-success"
                          : "text-text-secondary opacity-0 group-hover:opacity-100 hover:text-success"
                      }`}
                    >
                      {completingId === actividad.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : actividad.completed
                          ? <CheckCircle2 className="h-4 w-4" />
                          : <Circle className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`break-words text-sm font-medium leading-snug ${actividad.completed ? "line-through text-text-secondary" : "text-text-primary"}`}>
                        {actividad.description}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
                        <span>
                          {normalizeTime(actividad.time, DEFAULT_ACTIVITY_TIME)}
                          {actividad.time_end ? ` – ${actividad.time_end}` : ""}
                          {(() => { const d = calcDurationMinutes(actividad.time, actividad.time_end); return d ? ` (${formatDuration(d)})` : ""; })()}
                        </span>
                        <span>{tipoLabel(actividad.tipo)}</span>
                        {actividad.reminder_minutes_before != null && (
                          <span className="inline-flex items-center gap-0.5 text-primary">
                            <Bell className="h-3 w-3" />
                            {formatReminderLabel(actividad.reminder_minutes_before)}
                          </span>
                        )}
                        {ids.map((id) => <span key={id}>{userMap.get(id) ?? `Usuario ${id}`}</span>)}
                      </div>
                      {actividad.completed && actividad.result && (
                        <p className="mt-1 text-xs italic text-text-secondary line-clamp-1">{actividad.result}</p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}>
                      {meta.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Drawer
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Editar actividad" : "Nueva actividad"}
        width="md"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background">
              Cancelar
            </button>
            <button
              form="ordenes-form"
              type="submit"
              disabled={saving || !form.description.trim() || form.assignedUserIds.length === 0}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        }
      >
        <form id="ordenes-form" onSubmit={saveActividad} className="space-y-4 px-5 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Titulo *</label>
            <input
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="input text-sm"
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Hora inicio *</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
                className="input text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Hora fin</label>
              <input
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
                Duración: <span className="font-medium text-text-primary">{formatDuration(dur)}</span>
              </p>
            ) : null;
          })()}
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Prioridad</label>
            <select
              value={form.priority}
              onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
              className="input text-sm"
            >
              {PRIORIDADES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Recordatorio</label>
            <select
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
            <label className="mb-1 block text-xs font-medium text-text-secondary">Tipo de actividad</label>
            <select
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
            <label className="mb-1 block text-xs font-medium text-text-secondary">Usuarios *</label>
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
              <span className="text-sm text-text-secondary">Marcar como completada</span>
            </label>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Resultado / notas</label>
            <textarea
              value={form.result}
              onChange={(e) => setForm((prev) => ({ ...prev, result: e.target.value }))}
              rows={3}
              className="input resize-none text-sm"
            />
          </div>
        </form>
      </Drawer>

      {/* Detalle de actividad */}
      <Drawer
        open={detailActividad !== null}
        onClose={() => setDetailActividad(null)}
        title={detailActividad?.description ?? ""}
        subtitle="Orden del dia"
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
              aria-label="Editar"
            >
              <Pencil className="h-4 w-4" />
            </button>
            {canManageOthers(currentUserRole) && (
              <button
                type="button"
                onClick={() => setConfirmDeleteActividad(detailActividad)}
                className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        }
      >
        {detailActividad && (
          <div className="space-y-5 px-5 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${priorityMeta(detailActividad.priority).badge}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {priorityMeta(detailActividad.priority).label}
              </span>
              {detailActividad.completed && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Completada
                </span>
              )}
              <span className="rounded-full bg-surface-raised px-2.5 py-1 text-xs font-medium text-text-secondary">
                {tipoLabel(detailActividad.tipo)}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>
                  {new Date(detailActividad.event_date + "T12:00:00").toLocaleDateString("es-ES", {
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
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Asignado a</p>
                <div className="flex flex-wrap gap-1.5">
                  {assignedIds(detailActividad).map((uid) => (
                    <span key={uid} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      <User className="h-3 w-3" />
                      {userMap.get(uid) ?? `Usuario ${uid}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detailActividad.completed && detailActividad.result && (
              <div className="rounded-xl bg-success/8 px-4 py-3">
                <p className="text-xs font-semibold text-success">Resultado</p>
                <p className="mt-1 text-sm text-text-primary">{detailActividad.result}</p>
              </div>
            )}

            <div className="rounded-xl bg-surface-raised px-4 py-3 text-xs text-text-secondary">
              <p>Actividad de calendario · ID: {detailActividad.id}</p>
            </div>
          </div>
        )}
      </Drawer>

      {confirmDeleteActividad && (
        <ConfirmDialog
          open
          title="Eliminar actividad"
          description="Esta actividad se archivara. Esta accion no se puede deshacer."
          confirmLabel="Eliminar"
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
