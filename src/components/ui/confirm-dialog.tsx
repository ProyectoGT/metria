"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Info, X } from "lucide-react";
import Button from "@/components/ui/button";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { cn, UI } from "@/lib/design-system";
import { useI18n } from "@/lib/i18n";
import { translateVisibleText } from "@/lib/i18n/translate-text";

type ConfirmVariant = "default" | "warning" | "danger";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  loading?: boolean;
  disabled?: boolean;
  danger?: boolean;
  variant?: ConfirmVariant;
  onCancel: () => void;
  onConfirm: () => void;
};

const variantMeta: Record<ConfirmVariant, { icon: typeof AlertTriangle; iconClass: string; button: "primary" | "danger" }> = {
  default: { icon: Info, iconClass: "bg-primary/10 text-primary", button: "primary" },
  warning: { icon: AlertTriangle, iconClass: "bg-amber-500/10 text-amber-600", button: "primary" },
  danger: { icon: AlertTriangle, iconClass: "bg-danger/10 text-danger", button: "danger" },
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  pending,
  loading,
  disabled = false,
  danger,
  variant,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useI18n();
  const busy = pending ?? loading ?? false;
  const resolvedVariant: ConfirmVariant = variant ?? (danger === false ? "default" : "danger");
  const meta = variantMeta[resolvedVariant];
  const Icon = meta.icon;
  const panelRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onCancel, open]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0 bg-black/40"
            onClick={busy ? undefined : onCancel}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
            className="relative z-10 w-full max-w-[440px] overflow-hidden rounded-2xl border border-border bg-surface shadow-layer-3"
          >
            <div className="flex items-start gap-3 px-5 py-5">
              <div className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meta.iconClass)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="confirm-dialog-title" className="text-base font-semibold text-text-primary">
                  {translateVisibleText(title)}
                </h2>
                <div id="confirm-dialog-description" className="mt-1.5 text-sm leading-6 text-text-secondary">
                  {typeof description === "string" ? translateVisibleText(description) : description}
                </div>
              </div>
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className={cn("rounded-ds-sm p-1.5 text-text-secondary transition-colors hover:bg-state-hover hover:text-text-primary disabled:opacity-50", UI.focus)}
                aria-label={t("common:close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-border bg-surface-elevated px-5 py-4 sm:flex-row sm:justify-end">
              <Button variant="secondary" size="sm" onClick={onCancel} disabled={busy}>
                {translateVisibleText(cancelLabel)}
              </Button>
              <Button
                variant={meta.button}
                size="sm"
                onClick={onConfirm}
                loading={busy}
                disabled={disabled || busy}
              >
                {busy ? t("common:loading") : translateVisibleText(confirmLabel)}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
