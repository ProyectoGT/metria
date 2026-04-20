"use client";

import { useState, useMemo } from "react";
import { ChevronDown, Calendar, AlertCircle } from "lucide-react";
import type { OrdenDiaAgente, KanbanPriority } from "@/lib/mock/dashboard";

type OrdenDiaPanelProps = {
  agentes: OrdenDiaAgente[];
};

const PRIORITY_BADGE: Record<KanbanPriority, { cls: string; label: string }> = {
  alta: { cls: "bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-400", label: "Alta" },
  media: { cls: "bg-yellow-500/15 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400", label: "Media" },
  baja: { cls: "bg-gray-500/15 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400", label: "Baja" },
};

function formatDate(iso: string) {
  const datePart = iso.split("T")[0];
  const [y, m, d] = datePart.split("-");
  const timePart = iso.includes("T") ? iso.split("T")[1]?.slice(0, 5) : null;
  return timePart ? `${d}/${m}/${y} ${timePart}` : `${d}/${m}/${y}`;
}

type DateStatus = "overdue" | "today" | "soon" | "normal";

function getDateStatus(iso: string): DateStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(iso.split("T")[0]);
  date.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays <= 2) return "soon";
  return "normal";
}

const DATE_STYLES: Record<DateStatus, { cls: string; label?: string }> = {
  overdue: { cls: "text-danger font-semibold", label: "Vencida" },
  today:   { cls: "text-amber-600 dark:text-amber-400 font-semibold", label: "Hoy" },
  soon:    { cls: "text-amber-500 dark:text-amber-400" },
  normal:  { cls: "text-text-secondary" },
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

  const totalTareas = useMemo(
    () => agentes.reduce((sum, a) => sum + a.tareas.length, 0),
    [agentes],
  );

  function toggle(id: number) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-text-primary">Orden del día</h2>
          <p className="text-sm text-text-secondary">Tareas pendientes de tu equipo.</p>
        </div>
        <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-text-secondary">
          {totalTareas} {totalTareas === 1 ? "tarea" : "tareas"}
        </span>
      </div>


      {agentes.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-secondary">
          No hay agentes que mostrar.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {agentes.map((agent) => {
            const isOpen = openIds.has(agent.id);
            const count = agent.tareas.length;
            return (
              <li key={agent.id}>
                <button
                  onClick={() => toggle(agent.id)}
                  className="flex w-full items-center justify-between py-3 text-left transition-colors hover:bg-background"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(agent.nombre)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{agent.nombre}</p>
                      <p className="text-xs text-text-secondary">
                        {count === 0
                          ? "Sin tareas pendientes"
                          : `${count} ${count === 1 ? "tarea pendiente" : "tareas pendientes"}`}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-text-secondary transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="pb-4 pl-12 pr-2">
                    {count === 0 ? (
                      <p className="py-3 text-sm text-text-secondary italic">
                        Este agente no tiene tareas pendientes.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {agent.tareas.map((t) => {
                          const badge = t.prioridad ? PRIORITY_BADGE[t.prioridad] : null;
                          return (
                            <li
                              key={t.id}
                              className="flex items-start gap-3 rounded-lg border border-border bg-background px-3 py-2"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-text-primary">{t.titulo}</p>
                                {t.fecha && (() => {
                                  const status = getDateStatus(t.fecha);
                                  const style = DATE_STYLES[status];
                                  return (
                                    <p className={`mt-0.5 flex items-center gap-1 text-xs ${style.cls}`}>
                                      {status === "overdue"
                                        ? <AlertCircle className="h-3 w-3" />
                                        : <Calendar className="h-3 w-3" />
                                      }
                                      {style.label
                                        ? <>{style.label} · {formatDate(t.fecha.split("T")[0])}</>
                                        : formatDate(t.fecha.split("T")[0])
                                      }
                                    </p>
                                  );
                                })()}
                              </div>
                              {badge && (
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}
                                >
                                  {badge.label}
                                </span>
                              )}
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
  );
}
