// ─── EmptyState ───────────────────────────────────────────────────────────────
// Estado vacío estándar para tablas, listas y paneles sin contenido.
//
// USO:
//   <EmptyState
//     icon={<ClipboardList className="h-8 w-8" />}
//     title="No hay solicitudes"
//     description="Crea la primera solicitud para empezar."
//     action={<Button>+ Nueva solicitud</Button>}
//   />
//
// VARIANTES: default (centrado, padding grande) | compact (menos padding)
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "default" | "compact";
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "default",
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center rounded-ds-lg border border-dashed border-border bg-surface-elevated text-center shadow-layer-1",
        variant === "compact" ? "py-10 px-4" : "py-16 px-6",
        className,
      ].join(" ")}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-ds-lg border border-border bg-muted text-text-secondary shadow-layer-1">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-xs text-sm text-text-secondary">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
