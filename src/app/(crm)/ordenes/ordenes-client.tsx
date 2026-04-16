"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { UserRole } from "@/lib/roles";
import { useToast, Toaster } from "@/components/ui/toast";

type Tarea = {
  id: number;
  titulo: string;
  prioridad: string | null;
  estado: string | null;
  fecha: string | null;
  owner_user_id: number | null;
  empresa_id: number | null;
  equipo_id: number | null;
  visibility: string;
};

type Usuario = {
  id: number;
  nombre: string;
  apellidos: string;
};

type TareaForm = {
  titulo: string;
  prioridad: string;
  fecha: string;
  owner_user_id: number | null;
};

type Props = {
  initialTareas: Tarea[];
  currentUserId: number;
  currentUserRole: UserRole | null;
  usuarios: Usuario[];
};

const PRIORIDADES = ["alta", "media", "baja"];

function emptyForm(defaultOwnerId: number | null): TareaForm {
  return {
    titulo: "",
    prioridad: "media",
    fecha: new Date().toISOString().slice(0, 10),
    owner_user_id: defaultOwnerId,
  };
}

/** Solo Admin, Director y Responsable pueden crear tareas para otros usuarios */
function canCreateForOthers(role: UserRole | null): boolean {
  if (!role) return false;
  return role === "Administrador" || role === "Director" || role === "Responsable";
}

/**
 * Puede eliminar si:
 * - Admin / Director / Responsable → siempre
 * - Agente → nunca
 */
function canDeleteTarea(currentUserRole: UserRole | null): boolean {
  if (!currentUserRole) return false;
  return (
    currentUserRole === "Administrador" ||
    currentUserRole === "Director" ||
    currentUserRole === "Responsable"
  );
}

const PRIORIDAD_BADGE: Record<string, string> = {
  alta: "bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  media: "bg-yellow-500/15 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
  baja: "bg-green-500/15 text-green-700 dark:bg-green-500/20 dark:text-green-400",
};

function formatFecha(fecha: string): string {
  const date = new Date(fecha + "T00:00:00");
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function nombreCompleto(u: Usuario) {
  return `${u.nombre} ${u.apellidos}`.trim();
}

export default function OrdenesClient({
  initialTareas,
  currentUserId,
  currentUserRole,
  usuarios,
}: Props) {
  const supabase = createClient();
  const { toast: showToast, toasts } = useToast();

  const [tareas, setTareas] = useState<Tarea[]>(initialTareas);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<TareaForm>(emptyForm(currentUserId));
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Filtro activo: null = todas, número = solo las de ese usuario
  const [filterUserId, setFilterUserId] = useState<number | null>(null);

  const multiUser = usuarios.length > 1 && canCreateForOthers(currentUserRole);

  // Mapa id → nombre para renderizar en cada tarea
  const userMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const u of usuarios) m.set(u.id, nombreCompleto(u));
    return m;
  }, [usuarios]);

  // Tareas filtradas según el selector
  const tareasFiltradas = useMemo(
    () =>
      filterUserId === null
        ? tareas
        : tareas.filter((t) => t.owner_user_id === filterUserId),
    [tareas, filterUserId]
  );

  // Agrupar por fecha
  const grouped = useMemo(() => {
    const map = new Map<string, Tarea[]>();
    for (const t of tareasFiltradas) {
      const key = t.fecha ?? "sin-fecha";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return new Map(
      [...map.entries()].sort(([a], [b]) => {
        if (a === "sin-fecha") return 1;
        if (b === "sin-fecha") return -1;
        return a.localeCompare(b);
      })
    );
  }, [tareasFiltradas]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    setSaving(true);

    const ownerId = canCreateForOthers(currentUserRole)
      ? (form.owner_user_id ?? currentUserId)
      : currentUserId;

    const { data, error } = await supabase
      .from("tareas")
      .insert({
        titulo: form.titulo.trim(),
        prioridad: form.prioridad,
        fecha: form.fecha,
        estado: "pendiente",
        visibility: "private",
        owner_user_id: ownerId,
      })
      .select()
      .single();

    setSaving(false);
    if (error || !data) {
      showToast("Error al crear la tarea", "error");
      return;
    }
    setTareas((prev) => [data as Tarea, ...prev]);
    setShowModal(false);
    setForm(emptyForm(currentUserId));
    showToast("Tarea creada", "success");
  }

  async function handleToggle(tarea: Tarea) {
    const nuevoEstado =
      tarea.estado === "completada" ? "pendiente" : "completada";
    const { data, error } = await supabase
      .from("tareas")
      .update({ estado: nuevoEstado })
      .eq("id", tarea.id)
      .select()
      .single();

    if (error || !data) {
      showToast("Error al actualizar la tarea", "error");
      return;
    }
    setTareas((prev) =>
      prev.map((t) => (t.id === tarea.id ? (data as Tarea) : t))
    );
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    const { error } = await supabase.from("tareas").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      showToast("Error al eliminar la tarea", "error");
      return;
    }
    setTareas((prev) => prev.filter((t) => t.id !== id));
    showToast("Tarea eliminada", "success");
  }

  return (
    <div className="space-y-6">
      <Toaster toasts={toasts} />

      {/* Barra superior: filtro de usuario + botón nueva tarea */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Filtro por usuario (solo si hay múltiples) */}
        {multiUser && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterUserId(null)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                filterUserId === null
                  ? "bg-primary text-white"
                  : "bg-background border border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              Todos
            </button>
            {usuarios.map((u) => (
              <button
                key={u.id}
                onClick={() =>
                  setFilterUserId(filterUserId === u.id ? null : u.id)
                }
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  filterUserId === u.id
                    ? "bg-primary text-white"
                    : "bg-background border border-border text-text-secondary hover:text-text-primary"
                }`}
              >
                {nombreCompleto(u)}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            setForm(emptyForm(currentUserId));
            setShowModal(true);
          }}
          className="ml-auto rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          + Nueva tarea
        </button>
      </div>

      {/* Lista agrupada por fecha */}
      {grouped.size === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-text-secondary">
          No hay tareas. Crea tu primera tarea del día.
        </div>
      ) : (
        [...grouped.entries()].map(([fecha, items]) => (
          <div key={fecha} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
              {fecha === "sin-fecha" ? "Sin fecha" : formatFecha(fecha)}
            </h2>
            <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
              {items.map((tarea) => (
                <div
                  key={tarea.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={tarea.estado === "completada"}
                    onChange={() => handleToggle(tarea)}
                    className="h-4 w-4 rounded border-border accent-primary cursor-pointer shrink-0"
                  />

                  {/* Título + dueño */}
                  <div className="flex-1 min-w-0">
                    <span
                      className={`block text-sm truncate ${
                        tarea.estado === "completada"
                          ? "line-through text-text-secondary"
                          : "text-text-primary"
                      }`}
                    >
                      {tarea.titulo}
                    </span>
                    {/* Mostrar propietario si hay múltiples usuarios visibles */}
                    {multiUser && tarea.owner_user_id && (
                      <span className="text-xs text-text-secondary">
                        {userMap.get(tarea.owner_user_id) ?? "—"}
                      </span>
                    )}
                  </div>

                  {/* Badge prioridad */}
                  {tarea.prioridad && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        PRIORIDAD_BADGE[tarea.prioridad] ?? ""
                      }`}
                    >
                      {tarea.prioridad}
                    </span>
                  )}

                  {/* Botón eliminar */}
                  {canDeleteTarea(currentUserRole) && (
                    <button
                      onClick={() => handleDelete(tarea.id)}
                      disabled={deletingId === tarea.id}
                      className="ml-1 shrink-0 rounded p-1 text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
                      title="Eliminar tarea"
                    >
                      {deletingId === tarea.id ? (
                        <span className="h-4 w-4 block animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Modal nueva tarea */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">
              Nueva tarea
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              {/* Asignar a (solo si puede crear para otros) */}
              {canCreateForOthers(currentUserRole) && usuarios.length > 1 && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary">
                    Asignar a
                  </label>
                  <select
                    value={form.owner_user_id ?? currentUserId}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        owner_user_id: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>
                        {nombreCompleto(u)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, titulo: e.target.value }))
                  }
                  placeholder="Ej: Llamar a cliente García"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary">
                    Fecha <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, fecha: e.target.value }))
                    }
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary">
                    Prioridad
                  </label>
                  <select
                    value={form.prioridad}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, prioridad: e.target.value }))
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {PRIORIDADES.map((p) => (
                      <option key={p} value={p} className="capitalize">
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-sidebar-hover transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Crear tarea"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
