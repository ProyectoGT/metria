// ─── Design System — constantes de tema centralizadas ───────────────────────
//
// Usar estas constantes en lugar de clases Tailwind hardcoded para badges,
// estados y colores de prioridad. Así un cambio aquí se propaga globalmente.
//
// ── USO ──────────────────────────────────────────────────────────────────────
//
//   import { PRIORITY_BADGE, ESTADO_PROPIEDAD } from "@/lib/theme";
//   <span className={PRIORITY_BADGE.alta}>Alta</span>
//
// ─────────────────────────────────────────────────────────────────────────────

// ── Prioridades de tareas / acciones ─────────────────────────────────────────
export const PRIORITY_BADGE = {
  alta:  "bg-danger/12  text-danger",
  media: "bg-accent/15  text-amber-700 dark:text-amber-300",
  baja:  "bg-primary/10 text-primary",
} as const;

// ── Estados de propiedades ────────────────────────────────────────────────────
export const ESTADO_PROPIEDAD: Record<string, string> = {
  noticia:       "bg-primary/10      text-primary",
  investigacion: "bg-blue-500/12     text-blue-700    dark:text-blue-300",
  seguimiento:   "bg-accent/15       text-amber-700   dark:text-amber-300",
  encargo:       "bg-success/12      text-success",
  vendido:       "bg-success/20      text-success",
  neutral:       "bg-muted           text-text-secondary",
};

// ── Modalidades de pedido ─────────────────────────────────────────────────────
export const MODALIDAD_BADGE: Record<string, string> = {
  CV:  "bg-success/12  text-success",
  CH:  "bg-primary/10  text-primary",
  ALQ: "bg-purple-500/12 text-purple-700 dark:text-purple-300",
};

// ── Origen de pedido ──────────────────────────────────────────────────────────
export const ORIGEN_BADGE: Record<string, string> = {
  oficina: "bg-accent/15  text-amber-700 dark:text-amber-300",
  online:  "bg-purple-500/12 text-purple-700 dark:text-purple-300",
};

// ── Roles de usuario ──────────────────────────────────────────────────────────
export const ROL_BADGE: Record<string, string> = {
  Administrador: "bg-danger/10   text-danger",
  Director:      "bg-primary/10  text-primary",
  Responsable:   "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  Agente:        "bg-success/10  text-success",
};

// ── Estado de usuario ─────────────────────────────────────────────────────────
export const ESTADO_USUARIO: Record<string, string> = {
  active:   "bg-success/12 text-success",
  invited:  "bg-accent/15  text-amber-700 dark:text-amber-300",
  disabled: "bg-muted      text-text-secondary",
};

export const ESTADO_USUARIO_LABEL: Record<string, string> = {
  active:   "Activo",
  invited:  "Invitado",
  disabled: "Inactivo",
};

// ── Colores del avatar (basados en tokens) ────────────────────────────────────
// El hash se mantiene igual; solo los colores apuntan a clases semánticas
export const AVATAR_COLORS = [
  "bg-primary    text-white",
  "bg-success    text-white",
  "bg-danger     text-white",
  "bg-accent     text-white",
  "bg-purple-600 text-white",
  "bg-cyan-600   text-white",
  "bg-indigo-600 text-white",
  "bg-teal-600   text-white",
] as const;
