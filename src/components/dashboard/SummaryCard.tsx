"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";

type SummaryCardProps = {
  count: number;
  label: string;
  /** Tailwind classes for icon container, e.g. "bg-blue-100 text-blue-600" */
  accentColor: string;
  /** Tailwind class for active card background, e.g. "bg-blue-50" */
  activeBg: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
};

export default function SummaryCard({
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
        "flex w-full cursor-pointer items-center justify-between rounded-xl p-6 shadow-sm text-left",
        "border-2 transition-all duration-200",
        isActive
          ? `border-blue-600 ${activeBg}`
          : "border-transparent bg-surface hover:border-border hover:shadow-md",
      ].join(" ")}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${accentColor}`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-3xl font-bold text-text-primary">{count}</p>
          <p className="mt-0.5 text-sm font-medium text-text-secondary">{label}</p>
        </div>
      </div>
      <ChevronRight
        className={[
          "h-5 w-5 shrink-0 text-text-secondary transition-transform duration-200",
          isActive ? "rotate-90" : "",
        ].join(" ")}
      />
    </button>
  );
}
