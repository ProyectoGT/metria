// ─── MetricMiniCard ───────────────────────────────────────────────────────────
// Tarjeta compacta para mostrar una métrica numérica en vistas de detalle.
// Pensada para agruparse en una fila horizontal (3-4 cards).
//
// USO:
//   <MetricMiniCard label="Visitas" value={4} icon={<Calendar />} color="text-primary" />
//   <MetricMiniCard label="Documentos" value={2} />
//   <MetricMiniCard label="Días activo" value={45} trend="alto" />
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

type Trend = "alto" | "medio" | "bajo" | "neutro";

interface MetricMiniCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  color?: string;
  trend?: Trend;
  onClick?: () => void;
  className?: string;
}

const TREND_COLORS: Record<Trend, string> = {
  alto:   "text-success",
  medio:  "text-accent",
  bajo:   "text-danger",
  neutro: "text-text-secondary",
};

export default function MetricMiniCard({
  label,
  value,
  icon,
  color = "text-text-primary",
  trend,
  onClick,
  className = "",
}: MetricMiniCardProps) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      className={[
        "flex flex-col gap-1 rounded-xl border border-border bg-surface-raised px-3 py-3 text-left",
        onClick ? "cursor-pointer transition-all hover:border-primary/30 hover:shadow-sm hover:bg-surface" : "",
        className,
      ].join(" ")}
    >
      {icon && (
        <div className={`mb-0.5 ${color}`}>{icon}</div>
      )}
      <span className={`text-xl font-bold tracking-tight ${trend ? TREND_COLORS[trend] : color}`}>
        {value}
      </span>
      <span className="text-[11px] font-medium text-text-secondary leading-none">{label}</span>
    </Tag>
  );
}
