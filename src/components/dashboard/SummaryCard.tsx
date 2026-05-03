"use client";

import { memo } from "react";
import { type LucideIcon } from "lucide-react";

type SummaryCardProps = {
  count: number;
  label: string;
  accentColor: string;
  activeBg: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
};

const SummaryCard = memo(function SummaryCard({
  count,
  label,
  accentColor,
  activeBg,
  icon: Icon,
  isActive,
  onClick,
}: SummaryCardProps) {
  return (
    <button
      onClick={onClick}
      className={[
        "group relative w-full overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition-all duration-200 md:p-5",
        isActive
          ? `border-primary/30 ${activeBg} shadow-md ring-1 ring-primary/10`
          : "border-border bg-surface hover:border-secondary/35 hover:shadow-md",
      ].join(" ")}
    >
      {/* Icono en la esquina superior derecha — decorativo */}
      <div
        className={[
          "absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 md:h-10 md:w-10",
          accentColor,
        ].join(" ")}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Contenido */}
      <div className="pr-14">
        <p className="text-xs font-medium text-text-secondary">{label}</p>
        <p className="mt-1.5 text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
          {count}
        </p>
      </div>

      {/* Indicador activo */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/40" />
      )}
    </button>
  );
});

export default SummaryCard;
