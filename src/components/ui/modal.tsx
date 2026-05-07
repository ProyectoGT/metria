// ─── Modal / Dialog ───────────────────────────────────────────────────────────
// Sistema de modal con slots semánticos: Root, Header, Body, Footer.
//
// USO básico:
//   <Modal open={open} onClose={() => setOpen(false)}>
//     <ModalHeader title="Editar pedido" onClose={() => setOpen(false)} />
//     <ModalBody>…contenido…</ModalBody>
//     <ModalFooter>
//       <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
//       <Button onClick={handleSave}>Guardar</Button>
//     </ModalFooter>
//   </Modal>
//
// TAMAÑOS: sm (max-w-sm) | md (max-w-lg, default) | lg (max-w-2xl) | xl (max-w-4xl)
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

type ModalSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
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
  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[30] flex items-center justify-center p-3 sm:p-4"
        >
          {/* Overlay suave: sin blur, opacidad ~8% */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/8"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Contenedor */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={[
              "relative z-10 flex w-full flex-col rounded-2xl border border-border bg-surface shadow-xl",
              "max-h-[calc(100vh-2rem)] overflow-hidden",
              SIZE_CLASSES[size],
              className,
            ].join(" ")}
          >
            {children}
          </motion.div>
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
  return (
    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {children}
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
        noPadding ? "" : "px-6 py-5",
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
        "flex shrink-0 flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export default Modal;
