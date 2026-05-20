"use client";

import { cn } from "@/lib/design-system";

export type CalcStatus = "success" | "warning" | "danger" | "neutral";

type Props = {
  label: string;
  value: string;
  unit?: string;
  status?: CalcStatus;
  statusLabel?: string;
  secondaryLabel?: string;
  secondaryValue?: string;
  progressValue?: number;
  helpText?: string;
};

const BG: Record<CalcStatus, string> = {
  success: "bg-success/8 border-success/30",
  warning: "bg-warning/8 border-warning/30",
  danger:  "bg-danger/8 border-danger/30",
  neutral: "bg-primary/8 border-primary/25",
};

const PILL: Record<CalcStatus, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-amber-700 dark:text-amber-300",
  danger:  "bg-danger/15 text-danger",
  neutral: "bg-primary/15 text-primary",
};

const VALUE_COLOR: Record<CalcStatus, string> = {
  success: "text-success",
  warning: "text-amber-700 dark:text-amber-300",
  danger:  "text-danger",
  neutral: "text-primary",
};

const BAR_COLOR: Record<CalcStatus, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger:  "bg-danger",
  neutral: "bg-primary",
};

export function CalcHeroResult({
  label,
  value,
  unit,
  status = "neutral",
  statusLabel,
  secondaryLabel,
  secondaryValue,
  progressValue,
  helpText,
}: Props) {
  return (
    <div className={cn("rounded-2xl border p-5", BG[status])}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        {statusLabel && (
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", PILL[status])}>
            {statusLabel}
          </span>
        )}
      </div>

      <div className="flex items-end gap-2">
        <span className={cn("text-3xl font-medium leading-none md:text-4xl", VALUE_COLOR[status])}>
          {value}
        </span>
        {unit && <span className="mb-0.5 text-base text-text-secondary">{unit}</span>}
      </div>

      {secondaryLabel && secondaryValue && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs text-text-secondary">{secondaryLabel}</span>
          <span className="text-xs font-semibold text-text-primary">{secondaryValue}</span>
        </div>
      )}

      {progressValue !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/40">
          <div
            className={cn("h-full rounded-full transition-all", BAR_COLOR[status])}
            style={{ width: `${Math.min(progressValue, 100)}%` }}
          />
        </div>
      )}

      {helpText && (
        <p className="mt-2 text-xs leading-relaxed text-text-secondary">{helpText}</p>
      )}
    </div>
  );
}
