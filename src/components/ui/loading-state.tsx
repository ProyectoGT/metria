import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/design-system";

type LoadingStateSize = "sm" | "md" | "lg";

interface LoadingStateProps {
  title?: string;
  description?: string;
  size?: LoadingStateSize;
  inline?: boolean;
  className?: string;
  children?: ReactNode;
}

const SIZE_CLASSES: Record<LoadingStateSize, { icon: string; gap: string; padding: string }> = {
  sm: { icon: "h-4 w-4", gap: "gap-2", padding: "px-3 py-2" },
  md: { icon: "h-5 w-5", gap: "gap-3", padding: "px-4 py-6" },
  lg: { icon: "h-6 w-6", gap: "gap-4", padding: "px-6 py-12" },
};

export default function LoadingState({
  title = "Cargando",
  description,
  size = "md",
  inline = false,
  className = "",
  children,
}: LoadingStateProps) {
  const classes = SIZE_CLASSES[size];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center text-text-secondary",
        inline ? classes.gap : `flex-col text-center ${classes.gap} ${classes.padding}`,
        className,
      )}
    >
      <Loader2 className={cn("shrink-0 animate-spin text-primary", classes.icon)} />
      <div className={inline ? "min-w-0" : ""}>
        <p className="text-sm font-medium text-text-primary">{title}</p>
        {description && <p className="mt-1 text-xs text-text-secondary">{description}</p>}
        {children}
      </div>
    </div>
  );
}
