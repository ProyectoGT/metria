// ─── Badge ────────────────────────────────────────────────────────────────────
// Etiqueta compacta para estados, tipos y categorías.
//
// VARIANTES: default | primary | success | warning | danger | purple | blue | muted
// TAMAÑOS:   sm (default) | md
//
// USO:
//   <Badge>Neutral</Badge>
//   <Badge variant="success">Activo</Badge>
//   <Badge variant="danger" size="md">Alta prioridad</Badge>
//   <Badge className={ESTADO_PROPIEDAD.encargo}>Encargo</Badge>  ← con lib/theme.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

type Variant = "default" | "primary" | "success" | "warning" | "danger" | "purple" | "blue" | "muted";
type Size = "sm" | "md";

interface BadgeProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  default: "bg-muted          text-text-secondary",
  primary: "bg-primary/10     text-primary",
  success: "bg-success/12     text-success",
  warning: "bg-accent/15      text-amber-700 dark:text-amber-300",
  danger:  "bg-danger/12      text-danger",
  purple:  "bg-purple-500/12  text-purple-700 dark:text-purple-300",
  blue:    "bg-blue-500/12    text-blue-700   dark:text-blue-300",
  muted:   "bg-muted          text-text-secondary",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-2    py-0.5 text-[11px]",
  md: "px-2.5  py-1   text-xs",
};

export default function Badge({
  variant = "default",
  size = "sm",
  className = "",
  children,
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full font-semibold leading-none",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
