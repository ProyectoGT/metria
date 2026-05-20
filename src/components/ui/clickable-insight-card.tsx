// ─── ClickableInsightCard ─────────────────────────────────────────────────────
// Tarjeta clicable que muestra un insight/resumen y abre drawer/modal al hacer click.
// Usada en vistas de detalle para mostrar info relacionada de forma accesible.
//
// USO:
//   <ClickableInsightCard
//     title="Matches de propiedades"
//     description="3 propiedades encajan con este pedido."
//     icon={<Home className="h-4 w-4" />}
//     badge={{ label: "3", variant: "primary" }}
//     onClick={() => setMatchesOpen(true)}
//   />
// ─────────────────────────────────────────────────────────────────────────────

import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface InsightBadge {
  label: string;
  className?: string;
}

interface ClickableInsightCardProps {
  title: string;
  description?: string;
  icon?: ReactNode | LucideIcon;
  iconColor?: string;
  badge?: InsightBadge;
  onClick: () => void;
  className?: string;
  alert?: boolean;
}

export default function ClickableInsightCard({
  title,
  description,
  icon,
  iconColor = "bg-primary/10 text-primary",
  badge,
  onClick,
  className = "",
  alert = false,
}: ClickableInsightCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group flex w-full items-center gap-3 rounded-2xl border bg-surface p-4 text-left shadow-sm",
        "transition-all duration-150 hover:border-primary/30 hover:shadow-md",
        alert ? "border-amber-500/30 bg-amber-500/5" : "border-border",
        className,
      ].join(" ")}
    >
      {/* Icono */}
      {icon && (
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-150 group-hover:scale-110 ${iconColor}`}>
          {typeof icon === "function" ? null : icon as ReactNode}
        </div>
      )}

      {/* Contenido */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">{title}</span>
          {badge && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className ?? "bg-primary/10 text-primary"}`}>
              {badge.label}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-0.5 truncate text-xs text-text-secondary">{description}</p>
        )}
      </div>

      {/* Chevron */}
      <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary" />
    </button>
  );
}
