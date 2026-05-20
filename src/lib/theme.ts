import { PRIORITY_TONE, STATUS_TONE } from "@/lib/design-system";

export { cn, normalizePriority, normalizeStatus, PRIORITY_LABEL, PRIORITY_TONE, STATUS_LABEL, STATUS_TONE, UI } from "@/lib/design-system";
export type { Priority, WorkflowStatus } from "@/lib/design-system";

export const PRIORITY_BADGE = {
  alta: PRIORITY_TONE.alta.badge,
  media: PRIORITY_TONE.media.badge,
  baja: PRIORITY_TONE.baja.badge,
} as const;

export const PRIORITY_BORDER = {
  alta: PRIORITY_TONE.alta.border,
  media: PRIORITY_TONE.media.border,
  baja: PRIORITY_TONE.baja.border,
} as const;

export const ESTADO_TAREA = {
  pendiente: STATUS_TONE.pendiente.badge,
  en_curso: STATUS_TONE.en_curso.badge,
  en_progreso: STATUS_TONE.en_curso.badge,
  completado: STATUS_TONE.completado.badge,
  cancelado: STATUS_TONE.cancelado.badge,
} as const;

export const ESTADO_PROPIEDAD: Record<string, string> = {
  noticia: "bg-primary/10 text-primary",
  investigacion: "bg-primary/10 text-primary",
  seguimiento: "bg-warning/15 text-amber-700 dark:text-amber-300",
  encargo: "bg-success/12 text-success",
  vendido: "bg-success/20 text-success",
  neutral: "bg-muted text-text-secondary",
};

export const MODALIDAD_BADGE: Record<string, string> = {
  CV: "bg-success/12 text-success",
  CH: "bg-primary/10 text-primary",
  ALQ: "bg-primary/10 text-primary",
  CONTADO: "bg-success/12 text-success",
};

export const ORIGEN_BADGE: Record<string, string> = {
  oficina: "bg-warning/15 text-amber-700 dark:text-amber-300",
  online: "bg-primary/10 text-primary",
};

export const ROL_BADGE: Record<string, string> = {
  Administrador: "bg-danger/10 text-danger",
  Director: "bg-primary/10 text-primary",
  Responsable: "bg-primary/10 text-primary",
  Agente: "bg-success/10 text-success",
};

export const ESTADO_USUARIO: Record<string, string> = {
  active: STATUS_TONE.completado.badge,
  invited: STATUS_TONE.pendiente.badge,
  disabled: STATUS_TONE.cancelado.badge,
};

export const ESTADO_USUARIO_LABEL: Record<string, string> = {
  active: "Activo",
  invited: "Invitado",
  disabled: "Inactivo",
};

export const AVATAR_COLORS = [
  "bg-primary text-white",
  "bg-success text-white",
  "bg-danger text-white",
  "bg-warning text-white",
  "bg-slate-700 text-white",
  "bg-teal-700 text-white",
  "bg-indigo-700 text-white",
  "bg-cyan-700 text-white",
] as const;
