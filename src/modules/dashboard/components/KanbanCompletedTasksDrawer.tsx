"use client";

import { AlertCircle, Calendar, CheckCircle2, Eye, RotateCcw, User } from "lucide-react";
import Drawer from "@/components/ui/drawer";
import type { KanbanCardData } from "@/lib/mock/dashboard";

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const [date] = value.split("T");
  const [year, month, day] = date.split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function priorityClass(priority: KanbanCardData["priority"]) {
  if (priority === "alta") return "bg-danger/10 text-danger";
  if (priority === "baja") return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
  return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

type Props = {
  open: boolean;
  tasks: KanbanCardData[];
  loading?: boolean;
  error?: string | null;
  reopeningId?: string | null;
  onClose: () => void;
  onView: (task: KanbanCardData) => void;
  onReopen: (task: KanbanCardData) => void;
};

export default function KanbanCompletedTasksDrawer({
  open,
  tasks,
  loading = false,
  error = null,
  reopeningId = null,
  onClose,
  onView,
  onReopen,
}: Props) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Tareas completadas"
      subtitle={`${tasks.length} ocultas en Pendientes`}
      width="lg"
    >
      <div className="space-y-3 px-5 py-5">
        {loading && (
          <div className="flex items-center justify-center py-14">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        )}

        {!loading && error && (
          <div className="flex items-start gap-3 rounded-ds-lg border border-danger/20 bg-danger/8 px-4 py-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-ds-lg border border-dashed border-border bg-surface px-6 py-14 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-success/10 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-text-primary">No hay tareas completadas ocultas</p>
            <p className="mt-1 max-w-xs text-xs text-text-secondary">
              Cuando completes tareas de Pendientes, apareceran aqui para consulta o reapertura.
            </p>
          </div>
        )}

        {!loading && !error && tasks.map((task) => (
          <div
            key={task.id}
            className="rounded-ds-lg border border-border bg-surface p-4 shadow-layer-1"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-text-primary">{task.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${priorityClass(task.priority)}`}>
                    {task.priority}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(task.dueDate)}
                  </span>
                  {task.completedAt && (
                    <span>Finalizada {formatDate(task.completedAt)}</span>
                  )}
                </div>
                {task.assignedUsers?.length ? (
                  <div className="mt-2 flex items-center gap-1 text-xs text-text-secondary">
                    <User className="h-3.5 w-3.5" />
                    <span className="truncate">{task.assignedUsers.join(", ")}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => onView(task)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-primary"
              >
                <Eye className="h-3.5 w-3.5" />
                Ver detalle
              </button>
              <button
                type="button"
                onClick={() => onReopen(task)}
                disabled={reopeningId === task.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {reopeningId === task.id ? "Reabriendo..." : "Reabrir"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Drawer>
  );
}
