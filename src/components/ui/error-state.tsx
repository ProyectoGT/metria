import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/design-system";

interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

export default function ErrorState({
  title = "No se ha podido cargar",
  description = "Intentalo de nuevo en unos segundos.",
  action,
  compact = false,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-ds-lg border border-danger/20 bg-danger-soft text-center shadow-layer-1",
        compact ? "px-4 py-8" : "px-6 py-12",
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-ds-md border border-danger/20 bg-surface text-danger shadow-layer-1">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-text-secondary">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
