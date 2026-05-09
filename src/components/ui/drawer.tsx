// ─── Drawer / SidePanel ───────────────────────────────────────────────────────
// Panel lateral deslizante desde la derecha.
// Ideal para: detalle de encargo, timeline, colaboraciones, formularios.
//
// USO:
//   <Drawer open={open} onClose={() => setOpen(false)} title="Encargo">
//     <p>Contenido...</p>
//   </Drawer>
//
// ANCHOS: sm (360px) | md (480px, default) | lg (560px) | xl (680px) | full (100%)
// OVERLAY: suave bg-black/8, sin blur — el contenido de fondo permanece visible
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type DrawerWidth = "sm" | "md" | "lg" | "xl" | "full";

const WIDTH_CLASSES: Record<DrawerWidth, string> = {
  sm:   "w-full sm:max-w-[360px]",
  md:   "w-full sm:max-w-[480px]",
  lg:   "w-full sm:max-w-[560px]",
  xl:   "w-full sm:max-w-[680px]",
  full: "w-full",
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
  /** z-index override cuando se apila sobre otro Drawer (default z-[40]) */
  zIndex?: string;
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
  zIndex = "z-[40]",
}: DrawerProps) {
  const { t } = useI18n();

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Bloquear scroll del body
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 ${zIndex} flex justify-end`}>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/8"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
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
                      aria-label={t("common:close")}
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
