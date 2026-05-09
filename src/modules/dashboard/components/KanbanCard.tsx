"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import {
  Bell, Calendar, User, CheckCircle2, Circle, ExternalLink, AlertCircle, GripVertical,
} from "lucide-react";
import type { KanbanCardData, KanbanPriority } from "@/lib/mock/dashboard";
import { calcDurationMinutes, formatDuration, formatReminderLabel } from "@/lib/local-date-time";
import { PRIORITY_LABEL, PRIORITY_TONE } from "@/lib/design-system";

const priorityBadge: Record<KanbanPriority, { cls: string; label: string; dot: string }> = {
  alta:  { cls: PRIORITY_TONE.alta.badge,  label: PRIORITY_LABEL.alta,  dot: PRIORITY_TONE.alta.dot },
  media: { cls: PRIORITY_TONE.media.badge, label: PRIORITY_LABEL.media, dot: PRIORITY_TONE.media.dot },
  baja:  { cls: PRIORITY_TONE.baja.badge,  label: PRIORITY_LABEL.baja,  dot: PRIORITY_TONE.baja.dot },
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
  isCompleted?: boolean;
  onComplete?: (id: string) => void;
  onClick?: (id: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
};

function KanbanCard({
  card,
  isCompleted = false,
  onComplete,
  onClick,
  dragHandleProps,
  isDragging,
}: KanbanCardProps) {
  const badge = priorityBadge[card.priority];

  function handleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onComplete) return;
    onComplete(card.id);
  }

  function handleClick() {
    if (!isCompleted && onClick) {
      onClick(card.id);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  }

  const isInteractive = !!onClick && !isCompleted;

  return (
    <motion.div
      {...(dragHandleProps as Record<string, unknown>)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ boxShadow: "var(--shadow-layer-2)" }}
      onClick={handleClick}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={isInteractive ? card.title : undefined}
      className={[
        "group relative rounded-ds-lg border bg-surface p-4 pb-3 shadow-layer-1",
        "select-none transition-shadow duration-150",
        isInteractive ? "cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background" : "",
        isCompleted
          ? "border-border bg-muted opacity-60"
          : "border-border hover:border-primary/20",
        isDragging ? "z-50 rotate-[2deg] scale-[1.03] border-primary/25 bg-surface-elevated shadow-layer-3" : "",
      ].join(" ")}
      style={isDragging ? { pointerEvents: "none" } : undefined}
      layout
      layoutId={card.id}
    >
      {/* ── Cabecera: badges + acciones ────────────────────────────── */}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        {/* Badges de estado */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls} ${isCompleted ? "opacity-40" : ""}`}>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
          {card.fromOrdenDia && !isCompleted && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              Hoy
            </span>
          )}
        </div>

        {/* Acciones */}
        <div className="flex shrink-0 items-center gap-1">
          {isCompleted ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          ) : onComplete ? (
            <button
              onClick={handleComplete}
              className="rounded-lg p-1 text-text-secondary transition-colors hover:bg-success/10 hover:text-success"
              aria-label="Marcar como realizada"
            >
              <Circle className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Título ────────────────────────────────────────────────── */}
      <p className={[
        "text-sm font-medium leading-snug transition-all duration-300",
        isCompleted ? "line-through text-text-secondary" : "text-text-primary",
      ].join(" ")}>
        {card.title}
      </p>

      {/* ── Descripción ──────────────────────────────────────────── */}
      {card.description && !isCompleted && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-text-secondary">
          {card.description}
        </p>
      )}

      {/* ── Resultado al completar ────────────────────────────────── */}
      {isCompleted && card.resultado && (
        <p className="mt-2.5 rounded-xl bg-success/8 px-2.5 py-2 text-xs leading-relaxed text-success">
          ✓ {card.resultado}
        </p>
      )}

      {/* ── Footer: fecha + duración + recordatorio + asignados ─────── */}
      {!isCompleted && (card.dueDate || card.assignedUsers?.length || card.assignedBy || card.reminderMinutesBefore != null) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-2.5">
          {card.dueDate && (() => {
            const status = getDateStatus(card.dueDate);
            const style  = DATE_STYLES[status];
            const dur = calcDurationMinutes(card.time, card.timeEnd);
            return (
              <span className={`flex items-center gap-1 text-[11px] ${style.cls}`}>
                {status === "overdue"
                  ? <AlertCircle className="h-3 w-3" />
                  : <Calendar className="h-3 w-3" />
                }
                {style.label
                  ? <>{style.label} · {formatDate(card.dueDate)}</>
                  : formatDate(card.dueDate)
                }
                {dur && <span className="ml-0.5 text-text-secondary">({formatDuration(dur)})</span>}
                <a
                  href={googleCalendarUrl(card.title, card.dueDate)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Añadir al calendario"
                  className="ml-0.5 text-text-secondary/50 transition-colors hover:text-primary"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </span>
            );
          })()}
          {card.reminderMinutesBefore != null && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
              <Bell className="h-3 w-3" />
              {formatReminderLabel(card.reminderMinutesBefore)}
            </span>
          )}
          {(card.assignedUsers?.length || card.assignedBy) && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              <User className="h-3 w-3" />
              {card.assignedUsers?.length
                ? card.assignedUsers.slice(0, 2).join(", ") + (card.assignedUsers.length > 2 ? ` +${card.assignedUsers.length - 2}` : "")
                : `por ${card.assignedBy}`
              }
            </span>
          )}
        </div>
      )}

      {/* Drag handle — solo visible en hover */}
      {!isCompleted && (
        <div className="mt-2 flex justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-20 pointer-events-none">
          <GripVertical className="h-3.5 w-3.5 text-text-secondary" />
        </div>
      )}
    </motion.div>
  );
}

export default memo(KanbanCard);
