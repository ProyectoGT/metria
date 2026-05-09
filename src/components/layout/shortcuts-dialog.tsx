"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Command } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { cn, UI } from "@/lib/design-system";

interface ShortcutDef {
  keys: string;
  labelKey: string;
  category: string;
}

const SHORTCUTS: ShortcutDef[] = [
  { keys: "/",            labelKey: "shortcuts.search",        category: "search" },
  { keys: "N",            labelKey: "shortcuts.newTask",       category: "general" },
  { keys: "G then D",     labelKey: "shortcuts.goDashboard",   category: "navigation" },
  { keys: "G then C",     labelKey: "shortcuts.goCalendar",    category: "navigation" },
  { keys: "G then O",     labelKey: "shortcuts.goDayOrders",   category: "navigation" },
  { keys: "G then U",     labelKey: "shortcuts.goUsers",       category: "navigation" },
  { keys: "G then P",     labelKey: "shortcuts.goProperties",  category: "navigation" },
  { keys: "?",            labelKey: "shortcuts.showHelp",      category: "general" },
  { keys: "Escape",       labelKey: "shortcuts.closePanel",    category: "general" },
];

const CATEGORIES = [
  { key: "general",    labelKey: "shortcuts.general" },
  { key: "navigation",  labelKey: "shortcuts.navigation" },
  { key: "search",      labelKey: "shortcuts.search" },
];

interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  const { t } = useI18n();
  const panelRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Command className="h-5 w-5 text-text-secondary" />
                <h2 id="shortcuts-title" className="text-base font-semibold text-text-primary">
                  {t("shortcuts.title") || "Atajos de teclado"}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={cn("rounded-ds-sm p-1.5 text-text-secondary transition-colors hover:bg-state-hover hover:text-text-primary", UI.focus)}
                aria-label={t("common:close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
              {CATEGORIES.map((cat) => {
                const items = SHORTCUTS.filter((s) => s.category === cat.key);
                if (items.length === 0) return null;
                return (
                  <div key={cat.key} className="mb-4 last:mb-0">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary/60">
                      {t(cat.labelKey) || cat.key}
                    </h3>
                    <div className="space-y-1.5">
                      {items.map((shortcut) => (
                        <div
                          key={shortcut.keys}
                          className="flex items-center justify-between rounded-lg px-2 py-1.5"
                        >
                          <span className="text-sm text-text-primary">
                            {t(shortcut.labelKey) || shortcut.keys}
                          </span>
                          <kbd className="inline-flex items-center gap-0.5 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-text-secondary shadow-sm">
                            {shortcut.keys.split(" ").map((part, i) => (
                              <span key={i}>
                                {i > 0 && <span className="mx-0.5 text-text-secondary/40">then</span>}
                                <span className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] font-semibold text-text-primary">
                                  {part}
                                </span>
                              </span>
                            ))}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border px-5 py-3">
              <p className="text-xs text-text-secondary">
                {t("shortcuts.pressQuestion") || "Pulsa ? para ver este diálogo en cualquier momento"}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
