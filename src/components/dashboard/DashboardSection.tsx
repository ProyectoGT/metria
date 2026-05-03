// ─── DashboardSection ────────────────────────────────────────────────────────
// Wrapper de sección para el dashboard con cabecera consistente.
// Usado para envolver el kanban, los paneles de inteligencia, etc.

import type { ReactNode } from "react";

interface DashboardSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function DashboardSection({
  title,
  description,
  action,
  icon,
  children,
  className = "",
}: DashboardSectionProps) {
  return (
    <section className={`min-w-0 ${className}`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-text-secondary">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
            {description && (
              <p className="mt-0.5 text-xs text-text-secondary">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
