// ─── Card, StatCard, SectionCard ─────────────────────────────────────────────
//
// Card:        contenedor base con borde, fondo surface y sombra layer-1
// StatCard:    métrica numérica con label, icono opcional y trend opcional
// SectionCard: sección con título, descripción opcional y slot de acción
//
// USO:
//   <Card>Contenido</Card>
//   <Card padding="lg">Contenido con más aire</Card>
//
//   <StatCard label="Noticias" value={18} icon={<Bell />} />
//   <StatCard label="Encargos" value={5} trend={+2} trendLabel="vs mes anterior" />
//
//   <SectionCard title="Acciones recomendadas" description="Basado en tu actividad.">
//     <p>...</p>
//   </SectionCard>
//   <SectionCard title="Agentes" action={<Button size="sm">+ Invitar</Button>}>
//     <Table />
//   </SectionCard>
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// ── Card base ─────────────────────────────────────────────────────────────────

type Padding = "none" | "sm" | "md" | "lg";

interface CardProps {
  padding?: Padding;
  className?: string;
  children: ReactNode;
  hover?: boolean;
}

const PADDING_CLASSES: Record<Padding, string> = {
  none: "",
  sm:   "p-4",
  md:   "p-5",
  lg:   "p-6",
};

export function Card({ padding = "md", className = "", children, hover }: CardProps) {
  return (
    <motion.div
      className={[
        "rounded-2xl border border-border bg-surface shadow-sm",
        PADDING_CLASSES[padding],
        className,
      ].join(" ")}
      {...(hover
        ? {
            whileHover: { y: -2, boxShadow: "0 8px 25px rgba(0,0,0,0.08)" },
            transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
          }
        : {})}
    >
      {children}
    </motion.div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  iconColor?: string;
  trend?: number;
  trendLabel?: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  iconColor = "text-primary",
  trend,
  trendLabel,
  onClick,
  active = false,
  className = "",
}: StatCardProps) {
  const TrendIcon =
    trend == null ? null
    : trend > 0   ? TrendingUp
    : trend < 0   ? TrendingDown
    : Minus;

  const trendColor =
    trend == null ? ""
    : trend > 0   ? "text-success"
    : trend < 0   ? "text-danger"
    : "text-text-secondary";

  return (
    <div
      onClick={onClick}
      className={[
        "group rounded-2xl border bg-surface p-5 shadow-sm transition-all duration-200",
        onClick ? "cursor-pointer select-none" : "",
        active
          ? "border-primary shadow-md ring-1 ring-primary/20"
          : "border-border hover:border-secondary/35 hover:shadow-md",
        className,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-text-secondary">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-text-primary">
            {value}
          </p>
          {trend != null && TrendIcon && (
            <div className={`mt-2 flex items-center gap-1 text-xs ${trendColor}`}>
              <TrendIcon className="h-3.5 w-3.5 shrink-0" />
              <span>{Math.abs(trend)}</span>
              {trendLabel && (
                <span className="text-text-secondary">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised transition-colors",
              "group-hover:bg-primary/5",
              iconColor,
            ].join(" ")}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// ── SectionCard ───────────────────────────────────────────────────────────────

interface SectionCardProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  padding?: Padding;
  className?: string;
  children: ReactNode;
}

export function SectionCard({
  title,
  description,
  action,
  padding = "md",
  className = "",
  children,
}: SectionCardProps) {
  const hasHeader = title || action;

  return (
    <div
      className={[
        "overflow-hidden rounded-2xl border border-border bg-surface shadow-sm",
        className,
      ].join(" ")}
    >
      {hasHeader && (
        <div className="flex flex-col gap-3 border-b border-border bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          {title && (
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
              {description && (
                <p className="mt-0.5 text-xs text-text-secondary">{description}</p>
              )}
            </div>
          )}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={PADDING_CLASSES[padding]}>{children}</div>
    </div>
  );
}

// Re-exportación por defecto para uso de Card básica
export default Card;
