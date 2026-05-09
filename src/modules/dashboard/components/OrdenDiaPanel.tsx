"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronDown, CheckCircle2, Circle, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { OrdenDiaAgente, OrdenDiaTarea, KanbanPriority } from "@/lib/mock/dashboard";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { useToast, Toaster } from "@/components/ui/toast";
import { completeTareaAction, deleteTareaAction } from "@/app/(crm)/dashboard/actions";
import { PRIORITY_LABEL, PRIORITY_TONE } from "@/lib/design-system";

type OrdenDiaPanelProps = {
  agentes: OrdenDiaAgente[];
};

const PRIORITY_BADGE: Record<KanbanPriority, { cls: string; label: string }> = {
  alta:  { cls: PRIORITY_TONE.alta.badge,  label: PRIORITY_LABEL.alta },
  media: { cls: PRIORITY_TONE.media.badge, label: PRIORITY_LABEL.media },
  baja:  { cls: PRIORITY_TONE.baja.badge,  label: PRIORITY_LABEL.baja },
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

export default function OrdenDiaPanel({ agentes: initialAgentes }: OrdenDiaPanelProps) {
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ id: string | number; isAgenda: boolean } | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);
  const [localAgentes, setLocalAgentes] = useState<OrdenDiaAgente[]>(initialAgentes);
  const router = useRouter();
  const { toast, toasts } = useToast();

  useEffect(() => {
    setLocalAgentes(initialAgentes);
  }, [initialAgentes]);

  async function handleCompleteTarea(tareaId: number, currentEstado: string) {
    const nuevoEstado = currentEstado === "completado" ? "pendiente" : "completado";
    setCompletingTaskId(tareaId);
    setLocalAgentes((prev) =>
      prev.map((ag) => ({
        ...ag,
        tareas: ag.tareas.map((t) => t.id === tareaId ? { ...t, estado: nuevoEstado as OrdenDiaTarea["estado"] } : t),
      })),
    );
    try {
      await completeTareaAction(tareaId);
      router.refresh();
      toast(nuevoEstado === "completado" ? "Tarea completada" : "Tarea pendiente");
    } catch {
      setLocalAgentes((prev) =>
        prev.map((ag) => ({
          ...ag,
          tareas: ag.tareas.map((t) => t.id === tareaId ? { ...t, estado: currentEstado as OrdenDiaTarea["estado"] } : t),
        })),
      );
      toast("Error al completar la tarea", "error");
    } finally {
      setCompletingTaskId(null);
    }
  }

  const { totalTareas, totalCompletadas } = useMemo(() => {
    let total = 0, completadas = 0;
    for (const a of localAgentes) {
      total += a.tareas.length;
      completadas += a.tareas.filter((t) => t.estado === "completado").length;
    }
    return { totalTareas: total, totalCompletadas: completadas };
  }, [localAgentes]);

  function toggle(id: number) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    const { id, isAgenda } = deleteTarget;
    // Assuming the ID from Dashboard represents the DB ID directly or has a prefix
    // For now, try deleting as Tarea (if it fails, it might be an Agenda item, but Dashboard workspace only passes Tareas to OrdenDiaPanel? Let's check).
    // Actually, DashboardWorkspace maps both to KanbanCardData, but OrdenDiaPanel receives OrdenDiaAgente[].
    const dbId = typeof id === "string" ? parseInt(id.replace(/\D/g, ""), 10) : id;
    
    // Si isAgenda, tal vez usemos archive_agenda via supabase, pero el action de dashboard maneja Tareas.
    // Asumiremos que el backend archiva la tarea
    deleteTareaAction(dbId).then(() => router.refresh()).catch(() => router.refresh());
    
    setDeleteTarget(null);
  }

  return (
    <div className="flex h-full w-full flex-col rounded-xl border border-border bg-surface shadow-layer-1">
      <Toaster toasts={toasts} />
      {/* Header fijo */}
      <div className="shrink-0 border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-text-primary">Orden del dia</h2>
            <p className="text-sm text-text-secondary">Tareas de hoy de tu equipo</p>
          </div>
          <div className="flex items-center gap-2">
            {totalTareas > 0 && (
              <span className="text-xs text-text-secondary">
                {totalCompletadas}/{totalTareas}
              </span>
            )}
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-text-secondary">
              {totalTareas} {totalTareas === 1 ? "tarea" : "tareas"}
            </span>
          </div>
        </div>
        {/* Barra de progreso */}
        {totalTareas > 0 && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-success transition-all duration-500"
              style={{ width: `${Math.round((totalCompletadas / totalTareas) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Lista con scroll */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {localAgentes.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-secondary">
            No hay agentes que mostrar.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {localAgentes.map((agent) => {
              const isOpen = openIds.has(agent.id);
              const pendientes = agent.tareas.filter((t) => t.estado !== "completado").length;
              const completadas = agent.tareas.filter((t) => t.estado === "completado").length;
              const total = agent.tareas.length;

              return (
                <li key={agent.id}>
                  <button
                    onClick={() => toggle(agent.id)}
                    className="flex w-full items-center justify-between px-6 py-3 text-left transition-colors hover:bg-state-hover"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(agent.nombre)}
                        </div>
                        {completadas > 0 && completadas === total && (
                          <div className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-success">
                            <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{agent.nombre}</p>
                        <p className="text-xs text-text-secondary">
                          {total === 0
                            ? "Sin tareas"
                            : pendientes > 0
                              ? `${pendientes} pendiente${pendientes !== 1 ? "s" : ""}`
                              : "Todo completado"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {total > 0 && (
                        <span className="text-xs tabular-nums text-text-secondary">
                          {completadas}/{total}
                        </span>
                      )}
                      <ChevronDown
                        className={`h-4 w-4 text-text-secondary transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="pb-3 pl-[60px] pr-6">
                      {total === 0 ? (
                        <p className="py-2 text-xs italic text-text-secondary">
                          Sin tareas para hoy.
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {/* Primero las no completadas, luego las completadas */}
                          {[
                            ...agent.tareas.filter((t) => t.estado !== "completado"),
                            ...agent.tareas.filter((t) => t.estado === "completado"),
                          ].map((t) => {
                            const badge = t.prioridad ? PRIORITY_BADGE[t.prioridad] : null;
                            const completada = t.estado === "completado";

                            return (
                              <li
                                key={t.id}
                                className={[
                                  "group rounded-lg border px-3 py-2",
                                  completada
                                    ? "border-success/20 bg-success/5"
                                    : "border-border bg-surface-elevated",
                                ].join(" ")}
                              >
                                <div className="flex items-start gap-2">
                                  <button
                                    onClick={() => handleCompleteTarea(t.id, t.estado)}
                                    disabled={completingTaskId === t.id}
                                    className={`mt-0.5 shrink-0 transition-colors disabled:opacity-50 ${completada ? "text-success" : "text-text-secondary hover:text-success"}`}
                                    title={completada ? "Desmarcar" : "Marcar como completada"}
                                  >
                                    {completingTaskId === t.id
                                      ? <Loader2 className="h-4 w-4 animate-spin" />
                                      : completada
                                        ? <CheckCircle2 className="h-4 w-4" />
                                        : <Circle className="h-4 w-4" />
                                    }
                                  </button>
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-sm leading-snug ${completada ? "line-through text-text-secondary" : "text-text-primary"}`}>
                                      {t.titulo}
                                    </p>
                                    {completada && t.resultado && (
                                      <p className="mt-1 text-xs italic text-text-secondary line-clamp-2">
                                        {t.resultado}
                                      </p>
                                    )}
                                  </div>
                                  {badge && (
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                                      {badge.label}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => setDeleteTarget({ id: t.id, isAgenda: false })}
                                    className="ml-2 flex shrink-0 items-center justify-center rounded p-1 text-text-secondary opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                                    title="Eliminar tarea"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          title="Eliminar tarea"
          description="¿Estás seguro de que quieres eliminar esta tarea? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
