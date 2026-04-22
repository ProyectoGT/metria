"use client";

import { useState } from "react";
import { Calendar, User, Trash2, CheckCircle2, Circle, ExternalLink, AlertCircle, Pencil } from "lucide-react";
import type { KanbanCardData, KanbanPriority } from "@/lib/mock/dashboard";

const priorityBadge: Record<KanbanPriority, { cls: string; label: string }> = {
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

function googleCalendarUrl(title: string, dateIso: string) {
  const hasTime = dateIso.includes("T");
  let start: string;
  let end: string;
  if (hasTime) {
    start = dateIso.replace(/[-:]/g, "").replace(/\.\d+/, "").slice(0, 15) + "Z";
    const dt = new Date(dateIso);
    dt.setHours(dt.getHours() + 1);
    end = dt.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "").slice(0, 15) + "Z";
  } else {
    start = dateIso.replace(/-/g, "");
    end = start;
  }
  const params = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${start}/${end}` });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

type KanbanCardProps = {
  card: KanbanCardData;
  canDelete: boolean;
  isCompleted?: boolean;
  onDelete: (id: string) => void;
  /** Abre el modal de edición completo */
  onEdit: (id: string) => void;
  onComplete?: (id: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
};

export default function KanbanCard({
  card,
  canDelete,
  isCompleted = false,
  onDelete,
  onEdit,
  onComplete,
  dragHandleProps,
  isDragging,
}: KanbanCardProps) {
  const badge = priorityBadge[card.priority];
  const [completing, setCompleting] = useState(false);
  const done = isCompleted || completing;

  function handleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    if (completing || !onComplete) return;
    setCompleting(true);
    setTimeout(() => { onComplete(card.id); }, 700);
  }

  return (
    <div
      {...dragHandleProps}
      className={[
        "rounded-lg border border-border p-3 shadow-sm",
        "transition-all duration-150 select-none",
        done ? "bg-background opacity-70" : "bg-surface hover:shadow-md",
        isDragging ? "shadow-lg rotate-1 opacity-90" : "",
        completing && !isCompleted ? "opacity-50" : "",
      ].join(" ")}
    >
      {/* Top row */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls} ${done ? "opacity-50" : ""}`}>
            {badge.label}
          </span>
          {card.fromOrdenDia && !isCompleted && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary dark:bg-primary/20">
              Orden del dia
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />}

          {/* Editar — siempre disponible salvo durante la animación de completar */}
          {!completing && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(card.id); }}
              className="shrink-0 rounded p-0.5 text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
              aria-label="Editar tarea"
              title="Editar tarea"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Completar */}
          {onComplete && !isCompleted && (
            <button
              onClick={handleComplete}
              className={`shrink-0 rounded p-0.5 transition-colors ${
                completing ? "text-green-500" : "text-text-secondary hover:bg-success/10 hover:text-green-600 dark:hover:text-green-400"
              }`}
              aria-label="Marcar como realizada"
            >
              {completing ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
            </button>
          )}

          {/* Borrar — visible incluso en completadas; solo se oculta durante los 700ms de animación */}
          {canDelete && (isCompleted || !completing) && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
              className="shrink-0 rounded p-0.5 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
              aria-label="Eliminar tarea"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <p className={`text-sm font-medium leading-snug transition-all duration-300 ${done ? "line-through text-text-secondary" : "text-text-primary"}`}>
        {card.title}
      </p>

      {/* Description */}
      {card.description && !done && (
        <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{card.description}</p>
      )}

      {/* Resultado */}
      {isCompleted && card.resultado && (
        <p className="mt-2 rounded-md bg-success/10 px-2 py-1.5 text-xs leading-relaxed text-success dark:bg-success/15">
          {card.resultado}
        </p>
      )}

      {/* Footer */}
      {!done && (card.dueDate || card.assignedBy) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {card.dueDate && (() => {
            const status = getDateStatus(card.dueDate);
            const style = DATE_STYLES[status];
            return (
              <span className={`flex items-center gap-1 text-xs ${style.cls}`}>
                {status === "overdue" ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                {style.label ? <>{style.label} · {formatDate(card.dueDate)}</> : formatDate(card.dueDate)}
                <a
                  href={googleCalendarUrl(card.title, card.dueDate)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Añadir al calendario"
                  className="ml-0.5 text-text-secondary transition-colors hover:text-primary"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </span>
            );
          })()}
          {card.assignedBy && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary dark:bg-primary/20">
              <User className="h-3 w-3" />
              por {card.assignedBy}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
