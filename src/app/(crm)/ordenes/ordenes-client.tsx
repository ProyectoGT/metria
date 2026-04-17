"use client";

import { useMemo, useState } from "react";
import { X, Trash2, CheckCircle2, Circle, Calendar, User, ChevronDown, Loader2, Plus, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import type { UserRole } from "@/lib/roles";
import { useToast, Toaster } from "@/components/ui/toast";

// ─── Types ────────────────────────────────────────────────────────────────────

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

type Usuario = { id: number; nombre: string; apellidos: string };
type TareaForm = { titulo: string; prioridad: string; fecha: string; owner_user_id: number | null };

type Props = {
  initialTareas: Tarea[];
  currentUserId: number;
  currentUserRole: UserRole | null;
  usuarios: Usuario[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORIDADES = [
  { value: "alta",  label: "Alta",  dot: "bg-red-500",   border: "border-l-red-500",   badge: "bg-red-500/15 text-red-700 dark:text-red-400",      ring: "ring-red-500"   },
  { value: "media", label: "Media", dot: "bg-amber-400", border: "border-l-amber-400", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400", ring: "ring-amber-400" },
  { value: "baja",  label: "Baja",  dot: "bg-blue-400",  border: "border-l-blue-400",  badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400",    ring: "ring-blue-400"  },
];

const ESTADOS = [
  { value: "pendiente",   label: "Pendiente",    bg: "bg-gray-500/10",   text: "text-gray-600 dark:text-gray-400",     dot: "bg-gray-400"   },
  { value: "en_progreso", label: "En progreso",  bg: "bg-amber-500/10",  text: "text-amber-700 dark:text-amber-400",   dot: "bg-amber-400"  },
  { value: "completado",  label: "Completado",   bg: "bg-success/10",    text: "text-success",                         dot: "bg-success"    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function priMeta(p: string | null) {
  return PRIORIDADES.find((x) => x.value === p) ?? PRIORIDADES[1];
}
function estadoMeta(e: string | null) {
  return ESTADOS.find((x) => x.value === e) ?? ESTADOS[0];
}
function nombreCompleto(u: Usuario) {
  return `${u.nombre} ${u.apellidos}`.trim();
}
function parseFechaKey(fecha: string) {
  return fecha.split("T")[0];
}
function formatFechaKey(key: string): string {
  if (key === "sin-fecha") return "Sin fecha";
  try {
    const d = new Date(key + "T12:00:00");
    if (isNaN(d.getTime())) return "Fecha no valida";
    return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch { return key; }
}
function formatFechaDisplay(fecha: string | null): string {
  if (!fecha) return "Sin fecha";
  return formatFechaKey(parseFechaKey(fecha));
}
function isFechaHoy(fecha: string | null) {
  if (!fecha) return false;
  return parseFechaKey(fecha) === new Date().toISOString().split("T")[0];
}
function isFechaPasada(fecha: string | null) {
  if (!fecha) return false;
  return parseFechaKey(fecha) < new Date().toISOString().split("T")[0];
}
function canCreateForOthers(role: UserRole | null) {
  return role === "Administrador" || role === "Director" || role === "Responsable";
}
function canDeleteTarea(role: UserRole | null) {
  return role === "Administrador" || role === "Director" || role === "Responsable";
}
function emptyForm(defaultOwnerId: number | null): TareaForm {
  return { titulo: "", prioridad: "media", fecha: new Date().toISOString().slice(0, 10), owner_user_id: defaultOwnerId };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrdenesClient({ initialTareas, currentUserId, currentUserRole, usuarios }: Props) {
  const supabase = createClient();
  const { toast: showToast, toasts } = useToast();

  const [tareas, setTareas] = useState<Tarea[]>(initialTareas);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<TareaForm>(emptyForm(currentUserId));
  const [saving, setSaving] = useState(false);

  // Filtros
  const [filterUserId, setFilterUserId] = useState<number | null>(null);
  const [filterPrioridad, setFilterPrioridad] = useState<string | null>(null);

  // Panel de detalle (siempre reservado)
  const [detailTarea, setDetailTarea] = useState<Tarea | null>(null);
  const [detailEditing, setDetailEditing] = useState(false);
  const [detailForm, setDetailForm] = useState<{ titulo: string; prioridad: string; fecha: string }>({ titulo: "", prioridad: "media", fecha: "" });
  const [detailSaving, setDetailSaving] = useState(false);
  const [estadoSaving, setEstadoSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const multiUser = usuarios.length > 1 && canCreateForOthers(currentUserRole);

  const userMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const u of usuarios) m.set(u.id, nombreCompleto(u));
    return m;
  }, [usuarios]);

  // ── Filtrado y agrupado ────────────────────────────────────────────────────

  const tareasFiltradas = useMemo(() => {
    return tareas.filter((t) => {
      if (filterUserId !== null && t.owner_user_id !== filterUserId) return false;
      if (filterPrioridad !== null && t.prioridad !== filterPrioridad) return false;
      return true;
    });
  }, [tareas, filterUserId, filterPrioridad]);

  const grouped = useMemo(() => {
    const map = new Map<string, Tarea[]>();
    for (const t of tareasFiltradas) {
      const raw = t.fecha ?? "sin-fecha";
      const key = raw === "sin-fecha" ? "sin-fecha" : parseFechaKey(raw);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return new Map(
      [...map.entries()].sort(([a], [b]) => {
        if (a === "sin-fecha") return 1;
        if (b === "sin-fecha") return -1;
        return a.localeCompare(b);
      }),
    );
  }, [tareasFiltradas]);

  const countsByPrioridad = useMemo(() => {
    const base = filterUserId ? tareas.filter((t) => t.owner_user_id === filterUserId) : tareas;
    return {
      alta:  base.filter((t) => t.prioridad === "alta"  && t.estado !== "completado").length,
      media: base.filter((t) => t.prioridad === "media" && t.estado !== "completado").length,
      baja:  base.filter((t) => t.prioridad === "baja"  && t.estado !== "completado").length,
    };
  }, [tareas, filterUserId]);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    setSaving(true);
    const ownerId = canCreateForOthers(currentUserRole) ? (form.owner_user_id ?? currentUserId) : currentUserId;
    const { data, error } = await supabase
      .from("tareas")
      .insert({ titulo: form.titulo.trim(), prioridad: form.prioridad, fecha: form.fecha, estado: "pendiente", visibility: "private", owner_user_id: ownerId })
      .select().single();
    setSaving(false);
    if (error || !data) { showToast("Error al crear la tarea", "error"); return; }
    setTareas((prev) => [data as Tarea, ...prev]);
    setShowModal(false);
    setForm(emptyForm(currentUserId));
    showToast("Tarea creada");
  }

  async function handleSetEstado(tarea: Tarea, nuevoEstado: string) {
    setEstadoSaving(true);
    const { data, error } = await supabase.from("tareas").update({ estado: nuevoEstado }).eq("id", tarea.id).select().single();
    setEstadoSaving(false);
    if (error || !data) { showToast("Error al actualizar", "error"); return; }
    const updated = data as Tarea;
    setTareas((prev) => prev.map((t) => (t.id === tarea.id ? updated : t)));
    if (detailTarea?.id === tarea.id) setDetailTarea(updated);
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    const { error } = await supabase.from("tareas").delete().eq("id", id);
    setDeletingId(null);
    if (error) { showToast("Error al eliminar", "error"); return; }
    setTareas((prev) => prev.filter((t) => t.id !== id));
    if (detailTarea?.id === id) setDetailTarea(null);
    showToast("Tarea eliminada");
  }

  async function handleDetailSave() {
    if (!detailTarea || !detailForm.titulo.trim()) return;
    setDetailSaving(true);
    const { data, error } = await supabase
      .from("tareas")
      .update({ titulo: detailForm.titulo.trim(), prioridad: detailForm.prioridad, fecha: detailForm.fecha || null })
      .eq("id", detailTarea.id).select().single();
    setDetailSaving(false);
    if (error || !data) { showToast("Error al guardar", "error"); return; }
    const updated = data as Tarea;
    setTareas((prev) => prev.map((t) => (t.id === detailTarea.id ? updated : t)));
    setDetailTarea(updated);
    setDetailEditing(false);
    showToast("Tarea actualizada");
  }

  function openDetail(tarea: Tarea) {
    setDetailTarea(tarea);
    setDetailEditing(false);
    setDetailForm({ titulo: tarea.titulo, prioridad: tarea.prioridad ?? "media", fecha: tarea.fecha ? parseFechaKey(tarea.fecha) : "" });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const totalTareas = tareas.length;
  const totalCompletadas = tareas.filter((t) => t.estado === "completado").length;

  return (
    <div className="flex h-full flex-col gap-5">
      <Toaster toasts={toasts} />

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {PRIORIDADES.map((p) => {
          const count = countsByPrioridad[p.value as keyof typeof countsByPrioridad];
          const active = filterPrioridad === p.value;
          return (
            <button
              key={p.value}
              onClick={() => setFilterPrioridad(active ? null : p.value)}
              className={[
                "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                active
                  ? `border-l-4 ${p.border} border-border bg-surface shadow-sm ring-1 ${p.ring}/30`
                  : "border-border bg-surface hover:bg-background",
              ].join(" ")}
            >
              <span className={`h-3 w-3 shrink-0 rounded-full ${p.dot}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-text-secondary">{p.label}</p>
                <p className="text-xl font-bold text-text-primary">{count}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Barra filtros + botón ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Dropdown de usuario */}
        {multiUser && (
          <div className="relative">
            <select
              value={filterUserId ?? ""}
              onChange={(e) => setFilterUserId(e.target.value === "" ? null : Number(e.target.value))}
              className="input h-9 appearance-none py-0 pl-3 pr-8 text-sm"
            >
              <option value="">Todos los agentes</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{nombreCompleto(u)}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
          </div>
        )}

        {filterPrioridad && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${priMeta(filterPrioridad).badge}`}>
            {priMeta(filterPrioridad).label}
            <button onClick={() => setFilterPrioridad(null)} className="ml-0.5 hover:opacity-70">×</button>
          </span>
        )}

        {(filterUserId !== null || filterPrioridad !== null) && (
          <button onClick={() => { setFilterUserId(null); setFilterPrioridad(null); }} className="text-xs text-text-secondary hover:text-danger">
            Limpiar filtros
          </button>
        )}

        <button
          onClick={() => { setForm(emptyForm(filterUserId ?? currentUserId)); setShowModal(true); }}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Nueva tarea
        </button>
      </div>

      {/* ── Layout principal: lista + panel detalle (siempre visible) ── */}
      <div className="flex min-h-0 flex-1 gap-5">

        {/* Lista */}
        <div className="min-w-0 flex-1 space-y-6 overflow-y-auto">
          {grouped.size === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface py-16 text-center">
              <p className="text-sm font-medium text-text-primary">No hay tareas</p>
              <p className="mt-1 text-xs text-text-secondary">
                {filterPrioridad || filterUserId ? "Prueba cambiando los filtros" : "Crea la primera tarea del dia"}
              </p>
              <button onClick={() => { setForm(emptyForm(currentUserId)); setShowModal(true); }} className="mt-4 text-sm font-medium text-primary hover:underline">
                + Nueva tarea
              </button>
            </div>
          ) : (
            [...grouped.entries()].map(([fechaKey, items]) => {
              const esHoy = fechaKey === new Date().toISOString().split("T")[0];
              const esPasada = fechaKey !== "sin-fecha" && fechaKey < new Date().toISOString().split("T")[0];
              const pendientes = items.filter((t) => t.estado !== "completado").length;

              return (
                <div key={fechaKey}>
                  <div className="mb-2 flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${esHoy ? "bg-primary" : esPasada ? "bg-danger" : "bg-border"}`} />
                    <h2 className={`text-sm font-semibold capitalize ${esHoy ? "text-primary" : esPasada ? "text-danger" : "text-text-secondary"}`}>
                      {formatFechaKey(fechaKey)}
                      {esHoy && <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">HOY</span>}
                    </h2>
                    {pendientes > 0 && (
                      <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                        {pendientes} pendiente{pendientes > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {items.map((tarea) => {
                      const p = priMeta(tarea.prioridad);
                      const est = estadoMeta(tarea.estado);
                      const completada = tarea.estado === "completado";
                      const isSelected = detailTarea?.id === tarea.id;

                      return (
                        <div
                          key={tarea.id}
                          onClick={() => openDetail(tarea)}
                          className={[
                            "group flex cursor-pointer items-center gap-3 rounded-xl border border-border border-l-4 bg-surface px-4 py-3 transition-all hover:shadow-sm",
                            p.border,
                            isSelected ? "ring-1 ring-primary/30 shadow-sm bg-primary/3" : "hover:bg-background",
                          ].join(" ")}
                        >
                          {/* Dot de estado */}
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${est.dot}`}
                            title={est.label}
                          />

                          {/* Contenido */}
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium leading-snug ${completada ? "line-through text-text-secondary" : "text-text-primary"}`}>
                              {tarea.titulo}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2">
                              {multiUser && tarea.owner_user_id && (
                                <span className="text-xs text-text-secondary">{userMap.get(tarea.owner_user_id) ?? "—"}</span>
                              )}
                              {tarea.fecha && (
                                <span className={`text-xs ${isFechaPasada(tarea.fecha) && !completada ? "text-danger" : "text-text-secondary"}`}>
                                  {isFechaHoy(tarea.fecha) ? "Hoy" : formatFechaDisplay(tarea.fecha)}
                                </span>
                              )}
                            </div>
                          </div>

                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${p.badge}`}>
                            {p.label}
                          </span>

                          {canDeleteTarea(currentUserRole) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(tarea.id); }}
                              disabled={deletingId === tarea.id}
                              className="shrink-0 rounded p-1 text-text-secondary opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100 disabled:opacity-50"
                            >
                              {deletingId === tarea.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}

          {totalTareas > 0 && (
            <p className="pb-4 text-center text-xs text-text-secondary">
              {totalCompletadas} de {totalTareas} tareas completadas
            </p>
          )}
        </div>

        {/* ── Panel detalle (siempre visible, ancho fijo) ── */}
        <div className="w-72 shrink-0">
          <div className="sticky top-0 rounded-2xl border border-border bg-surface shadow-sm">
            {detailTarea ? (
              <>
                {/* Header con color de prioridad */}
                <div className={`flex items-start justify-between gap-2 rounded-t-2xl border-b-4 border-x-0 border-t-0 border-border px-5 py-4 ${priMeta(detailTarea.prioridad).border}`}>
                  <div className="min-w-0 flex-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${priMeta(detailTarea.prioridad).badge}`}>
                      {priMeta(detailTarea.prioridad).label}
                    </span>
                    {!detailEditing && (
                      <p className={`mt-2 text-sm font-semibold leading-snug ${detailTarea.estado === "completado" ? "line-through text-text-secondary" : "text-text-primary"}`}>
                        {detailTarea.titulo}
                      </p>
                    )}
                  </div>
                  <button onClick={() => setDetailTarea(null)} className="mt-0.5 shrink-0 rounded-lg p-1.5 text-text-secondary hover:bg-background hover:text-text-primary">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                  {detailEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-text-secondary">Titulo</label>
                        <input type="text" value={detailForm.titulo} onChange={(e) => setDetailForm({ ...detailForm, titulo: e.target.value })} className="input mt-1 text-sm" autoFocus />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-text-secondary">Prioridad</label>
                        <div className="mt-1 flex overflow-hidden rounded-lg border border-border">
                          {PRIORIDADES.map((p, i) => (
                            <button
                              key={p.value} type="button"
                              onClick={() => setDetailForm({ ...detailForm, prioridad: p.value })}
                              className={["flex-1 py-1.5 text-xs font-medium transition-colors", i > 0 ? "border-l border-border" : "", detailForm.prioridad === p.value ? "bg-primary text-white" : "text-text-secondary hover:bg-background"].join(" ")}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-text-secondary">Fecha</label>
                        <input type="date" value={detailForm.fecha} onChange={(e) => setDetailForm({ ...detailForm, fecha: e.target.value })} className="input mt-1 text-sm" />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => setDetailEditing(false)} className="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium text-text-secondary hover:bg-background">Cancelar</button>
                        <button onClick={handleDetailSave} disabled={detailSaving || !detailForm.titulo.trim()} className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-medium text-white hover:bg-primary-dark disabled:opacity-50">
                          {detailSaving ? "Guardando..." : "Guardar"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Selector de estado */}
                      <div>
                        <label className="mb-2 block text-xs font-medium text-text-secondary">Estado</label>
                        <div className="flex flex-col gap-1.5">
                          {ESTADOS.map((est) => {
                            const active = (detailTarea.estado ?? "pendiente") === est.value;
                            return (
                              <button
                                key={est.value}
                                onClick={() => !active && handleSetEstado(detailTarea, est.value)}
                                disabled={estadoSaving}
                                className={[
                                  "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all disabled:opacity-60",
                                  active
                                    ? `${est.bg} ${est.text} border-transparent ring-1 ring-current/30`
                                    : "border-border text-text-secondary hover:bg-background",
                                ].join(" ")}
                              >
                                <span className={`h-2 w-2 shrink-0 rounded-full ${est.dot}`} />
                                {est.label}
                                {active && estadoSaving && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" />}
                                {active && !estadoSaving && (
                                  <CheckCircle2 className="ml-auto h-3.5 w-3.5" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="space-y-2.5 border-t border-border pt-3">
                        {multiUser && detailTarea.owner_user_id && (
                          <div className="flex items-center gap-2 text-xs">
                            <User className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                            <span className="text-text-secondary">Asignado a:</span>
                            <span className="ml-auto font-medium text-text-primary">{userMap.get(detailTarea.owner_user_id) ?? "—"}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                          <span className="text-text-secondary">Fecha:</span>
                          <span className={`ml-auto font-medium ${isFechaPasada(detailTarea.fecha) && detailTarea.estado !== "completado" ? "text-danger" : "text-text-primary"}`}>
                            {isFechaHoy(detailTarea.fecha) ? "Hoy" : formatFechaDisplay(detailTarea.fecha)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 border-t border-border pt-3">
                        <button onClick={() => setDetailEditing(true)} className="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium text-text-secondary hover:bg-background hover:text-text-primary">
                          Editar
                        </button>
                        {canDeleteTarea(currentUserRole) && (
                          <button onClick={() => handleDelete(detailTarea.id)} disabled={deletingId === detailTarea.id} className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50">
                            {deletingId === detailTarea.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              /* Estado vacío — espacio reservado */
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-background">
                  <ClipboardList className="h-6 w-6 text-text-secondary/40" />
                </div>
                <p className="text-sm font-medium text-text-primary">Detalle de tarea</p>
                <p className="mt-1 text-xs text-text-secondary">
                  Haz clic en una tarea para ver y editar sus detalles
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal nueva tarea ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-text-primary">Nueva tarea</h2>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1.5 text-text-secondary hover:bg-background hover:text-text-primary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 px-6 py-5">
              {canCreateForOthers(currentUserRole) && usuarios.length > 1 && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Asignar a</label>
                  <select value={form.owner_user_id ?? currentUserId} onChange={(e) => setForm((f) => ({ ...f, owner_user_id: Number(e.target.value) }))} className="input text-sm">
                    {usuarios.map((u) => <option key={u.id} value={u.id}>{nombreCompleto(u)}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Titulo *</label>
                <input type="text" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Llamar a cliente Garcia" required autoFocus className="input text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Fecha *</label>
                  <input type="date" value={form.fecha} onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} required className="input text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Prioridad</label>
                  <select value={form.prioridad} onChange={(e) => setForm((f) => ({ ...f, prioridad: e.target.value }))} className="input text-sm">
                    {PRIORIDADES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-border pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background">Cancelar</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50">
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
