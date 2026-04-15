"use client";

import { useState } from "react";
import { Calendar, User, Trash2, CheckCircle2, Circle } from "lucide-react";
import type { KanbanCardData, KanbanPriority } from "@/lib/mock/dashboard";

// ─── Priority styles ──────────────────────────────────────────────────────────

const priorityBadge: Record<KanbanPriority, { cls: string; label: string }> = {
  alta: { cls: "bg-red-100 text-red-700", label: "Alta" },
  media: { cls: "bg-yellow-100 text-yellow-700", label: "Media" },
  baja: { cls: "bg-gray-100 text-gray-600", label: "Baja" },
};

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

type KanbanCardProps = {
  card: KanbanCardData;
  /** Whether this card can be deleted (own cards) */
  canDelete: boolean;
  /** Called when the delete button is pressed */
  onDelete: (id: string) => void;
  /** Called when the card is marked as completed */
  onComplete?: (id: string) => void;
  /** Drag handle props forwarded from the Draggable wrapper in KanbanColumn */
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
};

export default function KanbanCard({
  card,
  canDelete,
  onDelete,
  onComplete,
  dragHandleProps,
  isDragging,
}: KanbanCardProps) {
  const badge = priorityBadge[card.priority];
  const [completing, setCompleting] = useState(false);

  function handleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    if (completing || !onComplete) return;
    setCompleting(true);
    // Breve retardo para mostrar el tachado antes de eliminar
    setTimeout(() => {
      onComplete(card.id);
    }, 700);
  }

  return (
    <div
      {...dragHandleProps}
      className={[
        "rounded-lg border border-border bg-surface p-3 shadow-sm",
        "transition-all duration-150 select-none",
        isDragging ? "shadow-lg rotate-1 opacity-90" : "hover:shadow-md",
        completing ? "opacity-50" : "",
      ].join(" ")}
    >
      {/* Top row: priority badge + actions */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}
        >
          {badge.label}
        </span>
        <div className="flex items-center gap-1">
          {onComplete && (
            <button
              onClick={handleComplete}
              className={`shrink-0 rounded p-0.5 transition-colors ${
                completing
                  ? "text-green-500"
                  : "text-text-secondary hover:bg-green-50 hover:text-green-600"
              }`}
              aria-label="Marcar como realizada"
              title="Marcar como realizada"
            >
              {completing ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Circle className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          {canDelete && !completing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(card.id);
              }}
              className="shrink-0 rounded p-0.5 text-text-secondary transition-colors hover:bg-red-50 hover:text-danger"
              aria-label="Eliminar tarea"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Title — tachado cuando se está completando */}
      <p
        className={`text-sm font-medium leading-snug text-text-primary transition-all duration-300 ${
          completing ? "line-through text-text-secondary" : ""
        }`}
      >
        {card.title}
      </p>

      {/* Description */}
      {card.description && !completing && (
        <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{card.description}</p>
      )}

      {/* Footer: date + assigned badge */}
      {!completing && (card.dueDate || card.assignedBy) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {card.dueDate && (
            <span className="flex items-center gap-1 text-xs text-text-secondary">
              <Calendar className="h-3 w-3" />
              {formatDate(card.dueDate)}
            </span>
          )}
          {card.assignedBy && (
            <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
              <User className="h-3 w-3" />
              por {card.assignedBy}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
