// ─── Drawer / SidePanel ───────────────────────────────────────────────────────
// Panel lateral deslizante desde la derecha.
// Ideal para: detalle de encargo, timeline, colaboraciones.
//
// USO:
//   <Drawer open={open} onClose={() => setOpen(false)} title="Encargo">
//     <p>Contenido...</p>
//   </Drawer>
//
// ANCHOS: sm (320px) | md (480px, default) | lg (560px) | xl (640px)
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

type DrawerWidth = "sm" | "md" | "lg" | "xl";

const WIDTH_CLASSES: Record<DrawerWidth, string> = {
  sm: "w-full sm:max-w-sm",
  md: "w-full sm:max-w-[480px]",
  lg: "w-full sm:max-w-[560px]",
  xl: "w-full sm:max-w-2xl",
};

interface DrawerProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  width?: DrawerWidth;
  headerActions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export default function Drawer({
  open,
  onClose,
  title,
  subtitle,
  width = "md",
  headerActions,
  children,
  footer,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[40] flex justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[3px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={[
          "relative z-10 flex flex-col bg-surface shadow-xl",
          "h-full border-l border-border",
          WIDTH_CLASSES[width],
        ].join(" ")}
      >
        {/* Header */}
        {(title || headerActions || onClose) && (
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0">
              {title && (
                <h2 className="text-base font-semibold text-text-primary">{title}</h2>
              )}
              {subtitle && (
                <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {headerActions}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto">{children}</div>

        {/* Footer opcional */}
        {footer && (
          <div className="shrink-0 border-t border-border bg-surface px-5 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
