"use client";

import { memo } from "react";
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
        "flex w-full cursor-pointer items-center justify-between rounded-xl p-3 shadow-sm text-left sm:p-6",
        "border-2 transition-all duration-200",
        isActive
          ? `border-blue-600 ${activeBg}`
          : "border-transparent bg-surface hover:border-border hover:shadow-md",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 sm:gap-4">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12 ${accentColor}`}>
          <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
        </div>
        <div>
          <p className="text-xl font-bold text-text-primary sm:text-3xl">{count}</p>
          <p className="mt-0.5 text-xs font-medium text-text-secondary sm:text-sm">{label}</p>
        </div>
      </div>
      <ChevronRight className={["h-4 w-4 shrink-0 text-text-secondary transition-transform duration-200 sm:h-5 sm:w-5", isActive ? "rotate-90" : ""].join(" ")} />
    </button>
  );
});

export default SummaryCard;
