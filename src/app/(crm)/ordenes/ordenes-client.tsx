"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Clock, Loader2, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import type { UserRole } from "@/lib/roles";
import { DEFAULT_ACTIVITY_TIME, normalizeTime } from "@/lib/local-date-time";
import { useToast, Toaster } from "@/components/ui/toast";
import { isActivityPriority, isActivityType, normalizeActivityPriority, normalizeActivityType } from "@/lib/activity-options";

type Usuario = { id: number; nombre: string; apellidos: string };

type Actividad = {
  id: number;
  description: string;
  event_date: string;
  time: string | null;
  priority: string;
  tipo: string;
  completed: boolean;
  result: string | null;
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

function nombreCompleto(u: Usuario) {
  return `${u.nombre} ${u.apellidos}`.trim();
}

function canManageOthers(role: UserRole | null) {
  return role === "Administrador" || role === "Director" || role === "Responsable";
}

function priorityMeta(priority: string | null) {
  return PRIORIDADES.find((p) => p.value === priority) ?? PRIORIDADES[1];
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
  const supabase = createClient();
  const { toast, toasts } = useToast();
  const [actividades, setActividades] = useState<Actividad[]>(initialActividades);
  const [filterUserId, setFilterUserId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Actividad | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    description: "",
    time: DEFAULT_ACTIVITY_TIME,
    priority: "media",
    tipo: "actividad",
    result: "",
    completed: false,
    assignedUserIds: [currentUserId],
  });

  const userMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const usuario of usuarios) map.set(usuario.id, nombreCompleto(usuario));
    return map;
  }, [usuarios]);

  const filteredActividades = useMemo(() => {
    return actividades.filter((actividad) => {
      if (!filterUserId) return true;
      return assignedIds(actividad).includes(filterUserId) || actividad.owner_user_id === filterUserId;
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
      priority: "media",
      tipo: "actividad",
      result: "",
      completed: false,
      assignedUserIds: [filterUserId ?? currentUserId],
    });
    setShowModal(true);
  }

  function openEdit(actividad: Actividad) {
    const ids = assignedIds(actividad);
    setEditing(actividad);
    setForm({
      description: actividad.description,
      time: normalizeTime(actividad.time, DEFAULT_ACTIVITY_TIME),
      priority: actividad.priority ?? "media",
      tipo: actividad.tipo ?? "actividad",
      result: actividad.result ?? "",
      completed: actividad.completed,
      assignedUserIds: ids.length ? ids : [actividad.owner_user_id ?? currentUserId],
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

    setSaving(true);
    const args = {
      p_description: form.description.trim(),
      p_event_date: today,
      p_time: normalizeTime(form.time, DEFAULT_ACTIVITY_TIME),
      p_priority: priority,
      p_tipo: tipo,
      p_result: form.result.trim() || null,
      p_completed: form.completed,
      p_assigned_user_ids: form.assignedUserIds,
    };

    const { data, error } = editing
      ? await supabase.rpc("update_agenda_activity", { p_agenda_id: editing.id, ...args })
      : await supabase.rpc("create_agenda_activity", { ...args, p_visibility: "private" });

    setSaving(false);
    if (error || !data) {
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
      : [...prev, withUsers].sort((a, b) => normalizeTime(a.time).localeCompare(normalizeTime(b.time))));
    setShowModal(false);
    toast(editing ? "Actividad actualizada" : "Actividad creada");
  }

  async function setCompleted(actividad: Actividad, completed: boolean) {
    const { data, error } = await supabase.rpc("set_agenda_completed", {
      p_agenda_id: actividad.id,
      p_completed: completed,
      p_result: completed ? actividad.result : null,
    });
    if (error || !data) {
      toast(error?.message ?? "Error al actualizar", "error");
      return;
    }
    setActividades((prev) => prev.map((a) => a.id === actividad.id ? { ...a, completed } : a));
  }

  async function archiveActividad(id: number) {
    setDeletingId(id);
    const { error } = await supabase.rpc("archive_agenda", { p_agenda_id: id, p_reason: "archived_from_ordenes" });
    setDeletingId(null);
    if (error) {
      toast(error.message, "error");
      return;
    }
    setActividades((prev) => prev.filter((a) => a.id !== id));
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
                    onClick={() => openEdit(actividad)}
                    className={`group flex cursor-pointer items-start gap-3 rounded-xl border border-l-4 bg-surface px-4 py-3 transition-all hover:bg-background hover:shadow-sm ${meta.border} border-border`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCompleted(actividad, !actividad.completed);
                      }}
                      className={`mt-0.5 shrink-0 ${actividad.completed ? "text-success" : "text-text-secondary hover:text-success"}`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`break-words text-sm font-medium leading-snug ${actividad.completed ? "line-through text-text-secondary" : "text-text-primary"}`}>
                        {actividad.description}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
                        <span>{normalizeTime(actividad.time, DEFAULT_ACTIVITY_TIME)}</span>
                        {ids.map((id) => <span key={id}>{userMap.get(id) ?? `Usuario ${id}`}</span>)}
                      </div>
                      {actividad.completed && actividad.result && (
                        <p className="mt-1 text-xs italic text-text-secondary line-clamp-1">{actividad.result}</p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}>
                      {meta.label}
                    </span>
                    {canManageOthers(currentUserRole) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          archiveActividad(actividad.id);
                        }}
                        disabled={deletingId === actividad.id}
                        className="shrink-0 rounded p-1 text-text-secondary opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100 disabled:opacity-50"
                      >
                        {deletingId === actividad.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-text-primary">
                {editing ? "Editar actividad" : "Nueva actividad"}
              </h2>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1.5 text-text-secondary hover:bg-background hover:text-text-primary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={saveActividad} className="space-y-4 px-6 py-5">
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
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Hora *</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
                    className="input text-sm"
                    required
                  />
                </div>
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
              <div className="flex justify-end gap-3 border-t border-border pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.description.trim() || form.assignedUserIds.length === 0}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
