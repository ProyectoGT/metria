// ─── Button ───────────────────────────────────────────────────────────────────
// Componente base de botón con variantes y tamaños.
//
// VARIANTES: primary | secondary | ghost | danger | outline
// TAMAÑOS:   sm | md (default) | lg
//
// USO:
//   <Button>Guardar</Button>
//   <Button variant="danger" size="sm">Eliminar</Button>
//   <Button variant="ghost" loading>Cargando...</Button>
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn, UI } from "@/lib/design-system";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  form?: string;
  formAction?: string | ((formData: FormData) => void | Promise<void>);
  title?: string;
  "aria-label"?: string;
  id?: string;
  name?: string;
  value?: string;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-primary text-white shadow-layer-1 hover:bg-primary-dark hover:shadow-layer-2 disabled:bg-primary/50 disabled:shadow-none",
  secondary:
    "border border-border bg-surface text-text-primary shadow-layer-1 hover:border-border-strong hover:bg-surface-elevated hover:shadow-layer-2 disabled:opacity-50 disabled:shadow-none",
  ghost:
    "text-text-secondary hover:bg-state-hover hover:text-text-primary disabled:opacity-40",
  danger:
    "bg-danger text-white shadow-layer-1 hover:bg-danger-dark hover:shadow-layer-2 disabled:bg-danger/50 disabled:shadow-none",
  outline:
    "border border-primary/60 bg-surface text-primary shadow-layer-1 hover:border-primary hover:bg-state-active disabled:opacity-50 disabled:shadow-none",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-8  px-3   text-xs  gap-1.5 rounded-lg",
  md: "h-9  px-4   text-sm  gap-2   rounded-lg",
  lg: "h-10 px-5   text-sm  gap-2   rounded-xl",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      disabled={isDisabled}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-200",
        UI.focus,
        "disabled:cursor-not-allowed",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </motion.button>
  );
}
