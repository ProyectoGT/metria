export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const UI = {
  surface: {
    base: "bg-surface text-text-primary",
    elevated: "bg-surface-elevated text-text-primary",
    muted: "bg-muted text-text-secondary",
  },
  border: {
    base: "border border-border",
    strong: "border border-border-strong",
    interactive: "border border-border hover:border-border-strong",
  },
  radius: {
    sm: "rounded-ds-sm",
    md: "rounded-ds-md",
    lg: "rounded-ds-lg",
    full: "rounded-full",
  },
  shadow: {
    layer1: "shadow-layer-1",
    layer2: "shadow-layer-2",
    layer3: "shadow-layer-3",
  },
  focus:
    "outline-none focus-visible:ring-2 focus-visible:ring-state-focus focus-visible:ring-offset-1 focus-visible:ring-offset-background",
  transition: "transition-all duration-200",
} as const;

export type Priority = "baja" | "media" | "alta";
export type WorkflowStatus = "pendiente" | "en_curso" | "completado" | "cancelado";

export const PRIORITY_LABEL: Record<Priority, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

export const PRIORITY_TONE: Record<
  Priority,
  { badge: string; dot: string; border: string; surface: string; text: string }
> = {
  baja: {
    badge: "bg-primary/10 text-primary",
    dot: "bg-primary",
    border: "border-l-primary",
    surface: "bg-primary/5",
    text: "text-primary",
  },
  media: {
    badge: "bg-warning/15 text-amber-700 dark:text-amber-300",
    dot: "bg-warning",
    border: "border-l-warning",
    surface: "bg-warning/8",
    text: "text-amber-700 dark:text-amber-300",
  },
  alta: {
    badge: "bg-danger/12 text-danger",
    dot: "bg-danger",
    border: "border-l-danger",
    surface: "bg-danger/5",
    text: "text-danger",
  },
};

export const STATUS_LABEL: Record<WorkflowStatus, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  completado: "Completado",
  cancelado: "Cancelado",
};

export const STATUS_TONE: Record<
  WorkflowStatus,
  { badge: string; dot: string; border: string; surface: string; text: string }
> = {
  pendiente: {
    badge: "bg-warning/15 text-amber-700 dark:text-amber-300",
    dot: "bg-warning",
    border: "border-l-warning",
    surface: "bg-warning/8",
    text: "text-amber-700 dark:text-amber-300",
  },
  en_curso: {
    badge: "bg-primary/10 text-primary",
    dot: "bg-primary",
    border: "border-l-primary",
    surface: "bg-primary/5",
    text: "text-primary",
  },
  completado: {
    badge: "bg-success/12 text-success",
    dot: "bg-success",
    border: "border-l-success",
    surface: "bg-success/5",
    text: "text-success",
  },
  cancelado: {
    badge: "bg-muted text-text-secondary",
    dot: "bg-text-secondary",
    border: "border-l-border-strong",
    surface: "bg-muted",
    text: "text-text-secondary",
  },
};

export function normalizeStatus(status: string | null | undefined): WorkflowStatus {
  if (status === "en_progreso" || status === "en proceso" || status === "en_curso") {
    return "en_curso";
  }
  if (status === "completada" || status === "completado") return "completado";
  if (status === "cancelada" || status === "cancelado") return "cancelado";
  return "pendiente";
}

export function normalizePriority(priority: string | null | undefined): Priority {
  if (priority === "alta" || priority === "media" || priority === "baja") return priority;
  return "media";
}
