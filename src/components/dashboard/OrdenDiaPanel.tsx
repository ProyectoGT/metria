"use client";

import { useState, useMemo } from "react";
import { ChevronDown, CheckCircle2 } from "lucide-react";
import type { OrdenDiaAgente, KanbanPriority } from "@/lib/mock/dashboard";

type OrdenDiaPanelProps = {
  agentes: OrdenDiaAgente[];
};

const PRIORITY_BADGE: Record<KanbanPriority, { cls: string; label: string }> = {
  alta:  { cls: "bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-400",       label: "Alta"  },
  media: { cls: "bg-yellow-500/15 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400", label: "Media" },
  baja:  { cls: "bg-gray-500/15 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400",   label: "Baja"  },
};

const ESTADO_DOT: Record<string, string> = {
  pendiente:   "bg-gray-400",
  en_progreso: "bg-amber-400",
  completado:  "bg-success",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

export default function OrdenDiaPanel({ agentes }: OrdenDiaPanelProps) {
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  const { totalTareas, totalCompletadas } = useMemo(() => {
    let total = 0, completadas = 0;
    for (const a of agentes) {
      total += a.tareas.length;
      completadas += a.tareas.filter((t) => t.estado === "completado").length;
    }
    return { totalTareas: total, totalCompletadas: completadas };
  }, [agentes]);

  function toggle(id: number) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex h-full w-full flex-col rounded-xl bg-surface shadow-sm">
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
            <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-text-secondary">
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
        {agentes.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-secondary">
            No hay agentes que mostrar.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {agentes.map((agent) => {
              const isOpen = openIds.has(agent.id);
              const pendientes = agent.tareas.filter((t) => t.estado !== "completado").length;
              const completadas = agent.tareas.filter((t) => t.estado === "completado").length;
              const total = agent.tareas.length;

              return (
                <li key={agent.id}>
                  <button
                    onClick={() => toggle(agent.id)}
                    className="flex w-full items-center justify-between px-6 py-3 text-left transition-colors hover:bg-background"
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
                            const dot = ESTADO_DOT[t.estado] ?? "bg-gray-400";

                            return (
                              <li
                                key={t.id}
                                className={[
                                  "rounded-lg border px-3 py-2",
                                  completada
                                    ? "border-success/20 bg-success/5"
                                    : "border-border bg-background",
                                ].join(" ")}
                              >
                                <div className="flex items-start gap-2">
                                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
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
    </div>
  );
}
