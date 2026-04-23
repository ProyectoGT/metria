"use client";

import { useMemo, useState } from "react";
import {
  X, Trash2, CheckCircle2, Calendar, User, ChevronDown, Loader2,
  Plus, ClipboardList, Clock, ListTodo,
} from "lucide-react";
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
  resultado: string | null;
};

type Usuario = { id: number; nombre: string; apellidos: string };

type TareaForm = {
  titulo: string;
  prioridad: string;
  owner_user_id: number | null;
  // null → pendiente sin fecha | string → fecha concreta
  fecha: string | null;
};

type Props = {
  initialTareas: Tarea[];
  currentUserId: number;
  currentUserRole: UserRole | null;
  usuarios: Usuario[];
  today: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORIDADES = [
  { value: "alta",  label: "Alta",  dot: "bg-red-500",   border: "border-l-red-500",   badge: "bg-red-500/15 text-red-700 dark:text-red-400",      ring: "ring-red-500"   },
  { value: "media", label: "Media", dot: "bg-amber-400", border: "border-l-amber-400", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400", ring: "ring-amber-400" },
  { value: "baja",  label: "Baja",  dot: "bg-blue-400",  border: "border-l-blue-400",  badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400",    ring: "ring-blue-400"  },
];

const ESTADOS = [
  { value: "pendiente",   label: "Pendiente",   bg: "bg-gray-500/10",  text: "text-gray-600 dark:text-gray-400",   dot: "bg-gray-400"  },
  { value: "en_progreso", label: "En progreso", bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-400" },
  { value: "completado",  label: "Completado",  bg: "bg-success/10",   text: "text-success",                       dot: "bg-success"   },
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
function canCreateForOthers(role: UserRole | null) {
  return role === "Administrador" || role === "Director" || role === "Responsable";
}
function canDeleteTarea(role: UserRole | null) {
  return role === "Administrador" || role === "Director" || role === "Responsable";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrdenesClient({
  initialTareas,
  currentUserId,
  currentUserRole,
  usuarios,
  today,
}: Props) {
  const supabase = createClient();
  const { toast: showToast, toasts } = useToast();

  const [tareas, setTareas] = useState<Tarea[]>(initialTareas);

  // Modal
  const [showModal, setShowModal] = useState(false);
  // null = crear pendiente, string = crear para esa fecha (hoy normalmente)
  const [modalFecha, setModalFecha] = useState<string | null>(today);
  const [form, setForm] = useState<TareaForm>({ titulo: "", prioridad: "media", owner_user_id: currentUserId, fecha: today });
  const [saving, setSaving] = useState(false);

  // Filtros
  const [filterUserId, setFilterUserId] = useState<number | null>(null);

  // Panel detalle
  const [detailTarea, setDetailTarea] = useState<Tarea | null>(null);
  const [detailEditing, setDetailEditing] = useState(false);
  const [detailForm, setDetailForm] = useState<{ titulo: string; prioridad: string; fecha: string }>({ titulo: "", prioridad: "media", fecha: "" });
  const [detailSaving, setDetailSaving] = useState(false);
  const [estadoSaving, setEstadoSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [resultado, setResultado] = useState<string>("");
  const [resultadoSaving, setResultadoSaving] = useState(false);

  const multiUser = usuarios.length > 1 && canCreateForOthers(currentUserRole);

  const userMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const u of usuarios) m.set(u.id, nombreCompleto(u));
    return m;
  }, [usuarios]);

  // ── Splits ────────────────────────────────────────────────────────────────

  const tareasHoy = useMemo(() =>
    tareas.filter((t) => {
      if (t.fecha === null || t.fecha === undefined) return false;
      const fechaKey = t.fecha.split("T")[0];
      if (fechaKey !== today) return false;
      if (filterUserId !== null && t.owner_user_id !== filterUserId) return false;
      return true;
    }),
    [tareas, today, filterUserId]
  );

  const tareasPendientes = useMemo(() =>
    tareas.filter((t) => {
      if (t.fecha !== null && t.fecha !== undefined) return false;
      if (filterUserId !== null && t.owner_user_id !== filterUserId) return false;
      return true;
    }),
    [tareas, filterUserId]
  );

  const stats = useMemo(() => {
    const base = filterUserId ? tareas.filter((t) => t.owner_user_id === filterUserId) : tareas;
    const activas = base.filter((t) => t.estado !== "completado");
    return {
      hoy: tareasHoy.length,
      completadasHoy: tareasHoy.filter((t) => t.estado === "completado").length,
      pendientes: tareasPendientes.length,
      alta: activas.filter((t) => t.prioridad === "alta").length,
    };
  }, [tareas, tareasHoy, tareasPendientes, filterUserId]);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    setSaving(true);
    const ownerId = canCreateForOthers(currentUserRole) ? (form.owner_user_id ?? currentUserId) : currentUserId;
    // Si es tarea de hoy, fijar hora a las 20:00 por defecto
    const fechaFinal = form.fecha === today ? `${today}T20:00:00` : form.fecha;

    const { data, error } = await supabase
      .from("tareas")
      .insert({
        titulo: form.titulo.trim(),
        prioridad: form.prioridad,
        fecha: fechaFinal,
        estado: "pendiente",
        visibility: "private",
        owner_user_id: ownerId,
      })
      .select()
      .single();
    setSaving(false);
    if (error || !data) { showToast("Error al crear la tarea", "error"); return; }
    setTareas((prev) => [data as Tarea, ...prev]);
    setShowModal(false);
    setForm({ titulo: "", prioridad: "media", owner_user_id: currentUserId, fecha: today });
    showToast("Tarea creada");
  }

  async function handleSetEstado(tarea: Tarea, nuevoEstado: string) {
    setEstadoSaving(true);
    const payload =
      nuevoEstado !== "completado"
        ? { estado: nuevoEstado, resultado: null as string | null }
        : { estado: nuevoEstado };
    const { data, error } = await supabase.from("tareas").update(payload).eq("id", tarea.id).select().single();
    setEstadoSaving(false);
    if (error || !data) { showToast("Error al actualizar", "error"); return; }
    const updated = data as Tarea;
    setTareas((prev) => prev.map((t) => (t.id === tarea.id ? updated : t)));
    if (detailTarea?.id === tarea.id) {
      setDetailTarea(updated);
      setResultado(updated.resultado ?? "");
    }
  }

  async function handleSaveResultado() {
    if (!detailTarea) return;
    setResultadoSaving(true);
    const { data, error } = await supabase
      .from("tareas")
      .update({ resultado: resultado.trim() || null })
      .eq("id", detailTarea.id)
      .select()
      .single();
    setResultadoSaving(false);
    if (error || !data) { showToast("Error al guardar resultado", "error"); return; }
    const updated = data as Tarea;
    setTareas((prev) => prev.map((t) => (t.id === detailTarea.id ? updated : t)));
    setDetailTarea(updated);
    showToast("Resultado guardado");
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
      .eq("id", detailTarea.id)
      .select()
      .single();
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
    setDetailForm({
      titulo: tarea.titulo,
      prioridad: tarea.prioridad ?? "media",
      fecha: tarea.fecha ? tarea.fecha.split("T")[0] : "",
    });
    setResultado(tarea.resultado ?? "");
  }

  function openModal(fecha: string | null) {
    setModalFecha(fecha);
    setForm({ titulo: "", prioridad: "media", owner_user_id: filterUserId ?? currentUserId, fecha });
    setShowModal(true);
  }

  // ── Task card ─────────────────────────────────────────────────────────────

  function TareaCard({ tarea }: { tarea: Tarea }) {
    const p = priMeta(tarea.prioridad);
    const est = estadoMeta(tarea.estado);
    const completada = tarea.estado === "completado";
    const isSelected = detailTarea?.id === tarea.id;

    return (
      <div
        onClick={() => openDetail(tarea)}
        className={[
          "group flex cursor-pointer items-start gap-3 rounded-xl border border-l-4 bg-surface px-4 py-3 transition-all hover:shadow-sm sm:items-center",
          p.border,
          "border-border",
          isSelected ? "ring-1 ring-primary/30 shadow-sm bg-primary/[0.03]" : "hover:bg-background",
        ].join(" ")}
      >
        <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full sm:mt-0 ${est.dot}`} title={est.label} />

        <div className="min-w-0 flex-1">
          <p className={`break-words text-sm font-medium leading-snug ${completada ? "line-through text-text-secondary" : "text-text-primary"}`}>
            {tarea.titulo}
          </p>
          {multiUser && tarea.owner_user_id && (
            <p className="mt-0.5 text-xs text-text-secondary">{userMap.get(tarea.owner_user_id) ?? "—"}</p>
          )}
          {completada && tarea.resultado && (
            <p className="mt-1 text-xs italic text-text-secondary line-clamp-1">{tarea.resultado}</p>
          )}
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
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col gap-5">
      <Toaster toasts={toasts} />

      {/* ── Stats + filtros ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Stat chips */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 shadow-sm">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">{stats.completadasHoy}/{stats.hoy}</span>
            <span className="text-xs text-text-secondary">hoy</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 shadow-sm">
            <ListTodo className="h-3.5 w-3.5 text-text-secondary" />
            <span className="text-xs font-semibold text-text-primary">{stats.pendientes}</span>
            <span className="text-xs text-text-secondary">pendientes</span>
          </div>
          {stats.alta > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-500/10 px-3 py-2 shadow-sm dark:border-red-500/30">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-xs font-semibold text-red-700 dark:text-red-400">{stats.alta} alta</span>
            </div>
          )}
        </div>

        {/* Filtro de usuario */}
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
      </div>

      {/* ── Layout: listas + panel detalle ── */}
      <div className="flex min-h-0 flex-1 flex-col gap-5 lg:flex-row">

        {/* Columna de listas */}
        <div className="min-w-0 flex-1 space-y-6 overflow-y-auto">

          {/* ── Sección: Orden del día ── */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-text-primary">Orden del dia</h2>
                  <p className="text-[11px] text-text-secondary capitalize">
                    {new Date(today + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                </div>
                {tareasHoy.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {tareasHoy.filter((t) => t.estado !== "completado").length} pendiente{tareasHoy.filter((t) => t.estado !== "completado").length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <button
                onClick={() => openModal(today)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
              >
                <Plus className="h-3.5 w-3.5" />
                Anadir
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-surface shadow-sm">
              {tareasHoy.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-background">
                    <Clock className="h-5 w-5 text-text-secondary/40" />
                  </div>
                  <p className="text-sm font-medium text-text-primary">Sin tareas para hoy</p>
                  <p className="mt-1 text-xs text-text-secondary">Las tareas de hoy apareceran aqui</p>
                  <button onClick={() => openModal(today)} className="mt-3 text-xs font-medium text-primary hover:underline">
                    + Anadir tarea
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {tareasHoy.map((tarea) => (
                    <div key={tarea.id} className="p-2">
                      <TareaCard tarea={tarea} />
                    </div>
                  ))}
                  <div className="px-4 py-2.5 text-right">
                    <span className="text-xs text-text-secondary">
                      {tareasHoy.filter((t) => t.estado === "completado").length} de {tareasHoy.length} completadas
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── Sección: Pendientes ── */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                  <ListTodo className="h-4 w-4 text-text-secondary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-text-primary">Pendientes</h2>
                  <p className="text-[11px] text-text-secondary">Tareas sin fecha asignada</p>
                </div>
                {tareasPendientes.length > 0 && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                    {tareasPendientes.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => openModal(null)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                Anadir
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-surface shadow-sm">
              {tareasPendientes.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-background">
                    <ListTodo className="h-5 w-5 text-text-secondary/40" />
                  </div>
                  <p className="text-sm font-medium text-text-primary">Sin tareas pendientes</p>
                  <p className="mt-1 text-xs text-text-secondary">Las tareas no completadas del dia anterior apareceran aqui</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {tareasPendientes.map((tarea) => (
                    <div key={tarea.id} className="p-2">
                      <TareaCard tarea={tarea} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── Panel detalle ── */}
        <div className="w-full shrink-0 lg:w-72">
          <div className="rounded-2xl border border-border bg-surface shadow-sm lg:sticky lg:top-0">
            {detailTarea ? (
              <>
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

                <div className="space-y-4 px-5 py-4">
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
                        <label className="text-xs font-medium text-text-secondary">Fecha (vacio = sin fecha)</label>
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
                      {/* Estado */}
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
                                {active && !estadoSaving && <CheckCircle2 className="ml-auto h-3.5 w-3.5" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Resultado — solo si completado */}
                      {detailTarea.estado === "completado" && (
                        <div className="rounded-xl border border-border bg-background p-3">
                          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                            Resultado / consecuencia
                          </label>
                          <textarea
                            value={resultado}
                            onChange={(e) => setResultado(e.target.value)}
                            placeholder="¿Que ocurrio? ¿Cual fue el resultado?"
                            rows={3}
                            className="w-full resize-none bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary/60"
                          />
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={handleSaveResultado}
                              disabled={resultadoSaving || resultado.trim() === (detailTarea.resultado ?? "")}
                              className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                            >
                              {resultadoSaving ? "Guardando..." : "Guardar resultado"}
                            </button>
                          </div>
                        </div>
                      )}

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
                          <span className="ml-auto font-medium text-text-primary">
                            {detailTarea.fecha ? "Hoy" : "Sin fecha"}
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
              <div>
                <h2 className="text-base font-semibold text-text-primary">
                  {modalFecha ? "Tarea para hoy" : "Tarea pendiente"}
                </h2>
                <p className="text-xs text-text-secondary">
                  {modalFecha ? "Se anadira a la orden del dia" : "Sin fecha — quedara en pendientes"}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1.5 text-text-secondary hover:bg-background hover:text-text-primary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 px-6 py-5">
              {canCreateForOthers(currentUserRole) && usuarios.length > 1 && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Asignar a</label>
                  <select
                    value={form.owner_user_id ?? currentUserId}
                    onChange={(e) => setForm((f) => ({ ...f, owner_user_id: Number(e.target.value) }))}
                    className="input text-sm"
                  >
                    {usuarios.map((u) => <option key={u.id} value={u.id}>{nombreCompleto(u)}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Titulo *</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ej: Llamar a cliente Garcia"
                  required
                  autoFocus
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Prioridad</label>
                <div className="flex overflow-hidden rounded-lg border border-border">
                  {PRIORIDADES.map((p, i) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, prioridad: p.value }))}
                      className={[
                        "flex-1 py-2 text-sm font-medium transition-colors",
                        i > 0 ? "border-l border-border" : "",
                        form.prioridad === p.value ? "bg-primary text-white" : "text-text-secondary hover:bg-background",
                      ].join(" ")}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-border pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background">
                  Cancelar
                </button>
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
