"use client";

import { memo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, User, CheckCircle2, Circle, ExternalLink, AlertCircle, GripVertical } from "lucide-react";
import type { KanbanCardData, KanbanPriority } from "@/lib/mock/dashboard";

const priorityBadge: Record<KanbanPriority, { cls: string; label: string; dot: string }> = {
  alta:  { cls: "bg-danger/10  text-danger",                            label: "Alta",  dot: "bg-danger" },
  media: { cls: "bg-accent/15  text-amber-700 dark:text-amber-300",     label: "Media", dot: "bg-accent" },
  baja:  { cls: "bg-muted      text-text-secondary",                    label: "Baja",  dot: "bg-border" },
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
  const [completing, setCompleting] = useState(false);
  const done = isCompleted || completing;

  function handleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    if (completing || !onComplete) return;
    setCompleting(true);
    setTimeout(() => { onComplete(card.id); }, 700);
  }

  function handleClick() {
    if (!completing && !isCompleted && onClick) {
      onClick(card.id);
    }
  }

  return (
    <motion.div
      {...(dragHandleProps as Record<string, unknown>)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}
      onClick={handleClick}
      className={[
        "group relative rounded-2xl border bg-surface p-4 shadow-sm",
        "select-none",
        onClick && !done ? "cursor-pointer" : "",
        done
          ? "border-border bg-surface-raised opacity-60"
          : "border-border",
        isDragging ? "shadow-xl rotate-[1.5deg] scale-[1.02] border-primary/20 opacity-95" : "",
        completing && !isCompleted ? "scale-95 opacity-40" : "",
      ].join(" ")}
    >
      {/* Drag handle decorativo */}
      {!done && (
        <div className="absolute right-3 top-3.5 opacity-0 transition-opacity group-hover:opacity-25 pointer-events-none">
          <GripVertical className="h-3.5 w-3.5 text-text-secondary" />
        </div>
      )}

      {/* ── Cabecera: badges + acciones ────────────────────────────── */}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        {/* Badges de estado */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls} ${done ? "opacity-40" : ""}`}>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
          {card.fromOrdenDia && !done && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              Hoy
            </span>
          )}
        </div>

        {/* Acciones */}
        <div className="flex shrink-0 items-center gap-0.5">
          {isCompleted && (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
          )}
          {onComplete && !isCompleted && !completing && (
            <button
              onClick={handleComplete}
              className="rounded-lg p-1 text-text-secondary transition-colors hover:bg-success/10 hover:text-success"
              aria-label="Marcar como realizada"
            >
              <Circle className="h-3.5 w-3.5" />
            </button>
          )}
          {completing && (
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          )}
        </div>
      </div>

      {/* ── Título ────────────────────────────────────────────────── */}
      <p className={[
        "text-sm font-medium leading-snug transition-all duration-300",
        done ? "line-through text-text-secondary" : "text-text-primary",
      ].join(" ")}>
        {card.title}
      </p>

      {/* ── Descripción ──────────────────────────────────────────── */}
      {card.description && !done && (
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

      {/* ── Footer: fecha + asignados ─────────────────────────────── */}
      {!done && (card.dueDate || card.assignedUsers?.length || card.assignedBy) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-2.5">
          {card.dueDate && (() => {
            const status = getDateStatus(card.dueDate);
            const style  = DATE_STYLES[status];
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
    </motion.div>
  );
}

export default memo(KanbanCard);
