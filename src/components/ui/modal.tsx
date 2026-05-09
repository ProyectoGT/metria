// ─── Modal / Dialog (side panel variant) ──────────────────────────────────────
// Panel lateral deslizante desde la derecha.
// Antes era un modal centrado — ahora usa el mismo patron que Drawer.
//
// USO basico:
//   <Modal open={open} onClose={() => setOpen(false)}>
//     <ModalHeader title="Editar pedido" onClose={() => setOpen(false)} />
//     <ModalBody>…contenido…</ModalBody>
//     <ModalFooter>
//       <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
//       <Button onClick={handleSave}>Guardar</Button>
//     </ModalFooter>
//   </Modal>
//
// TAMAÑOS: sm (360px) | md (480px, default) | lg (560px) | xl (680px)
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn, UI } from "@/lib/design-system";
import { useFocusTrap } from "@/hooks/use-focus-trap";

type ModalSize = "sm" | "md" | "lg" | "xl";

const WIDTH_CLASSES: Record<ModalSize, string> = {
  sm: "w-full sm:max-w-[360px]",
  md: "w-full sm:max-w-[480px]",
  lg: "w-full sm:max-w-[560px]",
  xl: "w-full sm:max-w-[680px]",
};

// ── Modal Root ────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  size?: ModalSize;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, size = "md", children, className = "" }: ModalProps) {
  const panelRef = useFocusTrap(open);

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

  const labelledById = open ? "modal-title" : undefined;

  const isSmall = size === "sm";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[40] flex items-end justify-center sm:items-center sm:justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            aria-hidden="true"
          />
          {isSmall ? (
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={labelledById}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.65 }}
              className={cn(
                "relative z-10 flex w-full flex-col rounded-t-2xl bg-surface shadow-layer-3 sm:max-w-[360px] sm:rounded-2xl sm:mx-4",
                "max-h-[85vh]",
                className,
              )}
            >
              {children}
            </motion.div>
          ) : (
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={labelledById}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
              className={cn(
                "relative z-10 flex h-full flex-col",
                "modal-panel",
                WIDTH_CLASSES[size],
                className,
              )}
            >
              {children}
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Modal Header ──────────────────────────────────────────────────────────────

interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  children?: ReactNode;
}

export function ModalHeader({ title, subtitle, onClose, children }: ModalHeaderProps) {
  const { t } = useI18n();

  return (
    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div className="min-w-0">
        <h2 id="modal-title" className="text-base font-semibold text-text-primary">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {children}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={cn("rounded-ds-sm p-1.5 text-text-secondary transition-colors hover:bg-state-hover hover:text-text-primary", UI.focus)}
            aria-label={t("common:close")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Modal Body ────────────────────────────────────────────────────────────────

interface ModalBodyProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function ModalBody({ children, className = "", noPadding = false }: ModalBodyProps) {
  return (
    <div
      className={[
        "flex-1 overflow-y-auto",
        noPadding ? "" : "px-5 py-5",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

// ── Modal Footer ──────────────────────────────────────────────────────────────

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export function ModalFooter({ children, className = "" }: ModalFooterProps) {
  return (
    <div
      className={[
        "flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-surface-elevated px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export default Modal;
