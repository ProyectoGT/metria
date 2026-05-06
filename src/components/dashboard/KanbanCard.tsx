"use client";

import { useState } from "react";
import {
  Activity,
  AlertCircle,
  BookOpen,
  Calendar,
  CalendarCheck,
  CalendarPlus,
  ChevronDown,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Home,
  Info,
  Pencil,
  Phone,
  Star,
  Trash2,
  User,
  Users,
} from "lucide-react";
import type { KanbanCardData, KanbanPriority } from "@/lib/mock/dashboard";
import { ACTIVITY_TYPES, type ActivityType } from "@/lib/activity-options";

const priorityBadge: Record<KanbanPriority, { dot: string; accent: string; label: string }> = {
  alta: { dot: "bg-red-500", accent: "border-l-red-500", label: "Prioridad alta" },
  media: { dot: "bg-amber-500", accent: "border-l-amber-500", label: "Prioridad media" },
  baja: { dot: "bg-slate-400", accent: "border-l-slate-400", label: "Prioridad baja" },
};

const typeBadge: Record<ActivityType, { icon: React.ElementType; cls: string; label: string }> = {
  actividad: { icon: Activity, cls: "text-slate-500", label: "Actividad" },
  llamada: { icon: Phone, cls: "text-blue-600 dark:text-blue-400", label: "Llamada" },
  visita: { icon: Home, cls: "text-emerald-600 dark:text-emerald-400", label: "Visita" },
  reunion: { icon: Users, cls: "text-violet-600 dark:text-violet-400", label: "Reunion" },
  seguimiento: { icon: Clock, cls: "text-amber-600 dark:text-amber-400", label: "Seguimiento" },
  formacion: { icon: BookOpen, cls: "text-indigo-600 dark:text-indigo-400", label: "Formacion" },
  otro: { icon: Star, cls: "text-rose-600 dark:text-rose-400", label: "Otro" },
};

function normalizeCardType(value: string | null | undefined): ActivityType {
  return ACTIVITY_TYPES.includes(value as ActivityType) ? value as ActivityType : "actividad";
}

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
  today: { cls: "text-amber-600 dark:text-amber-400 font-semibold", label: "Hoy" },
  soon: { cls: "text-amber-500 dark:text-amber-400" },
  normal: { cls: "text-text-secondary" },
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
  onEdit: (id: string) => void;
  onComplete?: (id: string) => void;
  onSchedule?: (id: string) => void;
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
  onSchedule,
  dragHandleProps,
  isDragging,
}: KanbanCardProps) {
  const priority = priorityBadge[card.priority];
  const activityType = card.source === "agenda" ? normalizeCardType(card.tipo) : null;
  const activityMeta = activityType ? typeBadge[activityType] : null;
  const ActivityIcon = activityMeta?.icon;
  const [completing, setCompleting] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const done = isCompleted || completing;

  function handleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    if (completing || !onComplete) return;
    setCompleting(true);
    setTimeout(() => {
      onComplete(card.id);
    }, 700);
  }

  return (
    <div
      {...dragHandleProps}
      className={[
        "rounded-lg border border-l-2 border-border p-3 shadow-sm",
        "transition-all duration-150 select-none",
        done ? "bg-background opacity-70" : "bg-surface hover:shadow-md",
        priority.accent,
        isDragging ? "shadow-lg rotate-1 opacity-90" : "",
        completing && !isCompleted ? "opacity-50" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`min-w-0 flex-1 text-sm font-medium leading-snug transition-all duration-300 ${
            done ? "line-through text-text-secondary" : "text-text-primary"
          }`}
        >
          {card.title}
        </p>

        <div className="flex shrink-0 items-center gap-1">
          {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDetailsOpen((value) => !value);
            }}
            className="shrink-0 rounded p-0.5 text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
            aria-expanded={detailsOpen}
            aria-label={detailsOpen ? "Ocultar detalles" : "Mostrar detalles"}
            title={detailsOpen ? "Ocultar detalles" : "Mostrar detalles"}
          >
            <span className="flex items-center">
              <Info className="h-3.5 w-3.5" />
              <ChevronDown className={`-ml-0.5 h-3 w-3 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
            </span>
          </button>

          {onSchedule && !completing && !isCompleted && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSchedule(card.id);
              }}
              className="shrink-0 rounded p-0.5 text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
              aria-label="Programar tarea"
              title="Programar tarea"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
            </button>
          )}

          {!completing && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(card.id);
              }}
              className="shrink-0 rounded p-0.5 text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
              aria-label="Editar tarea"
              title="Editar tarea"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}

          {onComplete && !isCompleted && (
            <button
              type="button"
              onClick={handleComplete}
              className={`shrink-0 rounded p-0.5 transition-colors ${
                completing ? "text-green-500" : "text-text-secondary hover:bg-success/10 hover:text-green-600 dark:hover:text-green-400"
              }`}
              aria-label="Marcar como realizada"
              title="Marcar como realizada"
            >
              {completing ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
            </button>
          )}

          {canDelete && (isCompleted || !completing) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(card.id);
              }}
              className="shrink-0 rounded p-0.5 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
              aria-label="Eliminar tarea"
              title="Eliminar tarea"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {card.description && !done && (
        <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{card.description}</p>
      )}

      {detailsOpen && (
        <div className="mt-3 space-y-2 rounded-md border border-border bg-background/50 p-2 text-xs text-text-secondary">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${priority.dot}`} aria-hidden="true" />
              {priority.label}
            </span>

            {ActivityIcon && activityMeta && (
              <span className="inline-flex items-center gap-1.5">
                <ActivityIcon className={`h-3.5 w-3.5 ${activityMeta.cls}`} />
                {activityMeta.label}
              </span>
            )}

            {card.fromOrdenDia && (
              <span className="inline-flex items-center gap-1.5 text-primary">
                <CalendarCheck className="h-3.5 w-3.5" />
                Orden del dia
              </span>
            )}
          </div>

          {card.dueDate && (() => {
            const status = getDateStatus(card.dueDate);
            const style = DATE_STYLES[status];
            return (
              <div className={`flex items-center gap-1 ${style.cls}`}>
                {status === "overdue" ? <AlertCircle className="h-3.5 w-3.5" /> : <Calendar className="h-3.5 w-3.5" />}
                <span>{style.label ? `${style.label} - ${formatDate(card.dueDate)}` : formatDate(card.dueDate)}</span>
                <a
                  href={googleCalendarUrl(card.title, card.dueDate)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Anadir al calendario"
                  className="ml-0.5 text-text-secondary transition-colors hover:text-primary"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            );
          })()}

          {(card.assignedUsers?.length || card.assignedBy) && (
            <div className="flex min-w-0 items-center gap-1">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {card.assignedUsers?.length ? card.assignedUsers.join(", ") : `por ${card.assignedBy}`}
              </span>
            </div>
          )}
        </div>
      )}

      {isCompleted && card.resultado && (
        <p className="mt-2 rounded-md border border-success/20 bg-success/5 px-2 py-1.5 text-xs leading-relaxed text-success">
          {card.resultado}
        </p>
      )}
    </div>
  );
}
