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

type TareaForm = {
  titulo: string;
  prioridad: string;
  fecha: string;
};

type Props = {
  initialTareas: Tarea[];
  currentUserId: number | null;
  currentUserRole: UserRole | null;
};

const PRIORIDADES = ["alta", "media", "baja"];

function emptyForm(): TareaForm {
  return {
    titulo: "",
    prioridad: "media",
    fecha: new Date().toISOString().slice(0, 10),
  };
}

function canDeleteTarea(
  tarea: Pick<Tarea, "owner_user_id">,
  currentUserId: number | null,
  currentUserRole: UserRole | null
): boolean {
  if (!currentUserRole) return false;
  if (currentUserRole === "Agente") return false;
  if (
    currentUserRole === "Administrador" ||
    currentUserRole === "Director" ||
    currentUserRole === "Responsable"
  )
    return true;
  return tarea.owner_user_id === currentUserId;
}

const PRIORIDAD_BADGE: Record<string, string> = {
  alta: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  media: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  baja: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
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

export default function OrdenesClient({
  initialTareas,
  currentUserId,
  currentUserRole,
}: Props) {
  const supabase = createClient();
  const { toast: showToast, toasts } = useToast();

  const [tareas, setTareas] = useState<Tarea[]>(initialTareas);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<TareaForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Agrupar tareas por fecha
  const grouped = useMemo(() => {
    const map = new Map<string, Tarea[]>();
    for (const t of tareas) {
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
  }, [tareas]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("tareas")
      .insert({
        titulo: form.titulo.trim(),
        prioridad: form.prioridad,
        fecha: form.fecha,
        estado: "pendiente",
        visibility: "private",
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
    setForm(emptyForm());
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

      {/* Botón nueva tarea */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            setForm(emptyForm());
            setShowModal(true);
          }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
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
                    className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                  />

                  {/* Título */}
                  <span
                    className={`flex-1 text-sm ${
                      tarea.estado === "completada"
                        ? "line-through text-text-secondary"
                        : "text-text-primary"
                    }`}
                  >
                    {tarea.titulo}
                  </span>

                  {/* Badge prioridad */}
                  {tarea.prioridad && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        PRIORIDAD_BADGE[tarea.prioridad] ?? ""
                      }`}
                    >
                      {tarea.prioridad}
                    </span>
                  )}

                  {/* Botón eliminar */}
                  {canDeleteTarea(tarea, currentUserId, currentUserRole) && (
                    <button
                      onClick={() => handleDelete(tarea.id)}
                      disabled={deletingId === tarea.id}
                      className="ml-1 rounded p-1 text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
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
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">
              Nueva tarea
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
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
