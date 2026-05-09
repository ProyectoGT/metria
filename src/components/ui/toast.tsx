"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { translateVisibleText } from "@/lib/i18n/translate-text";

type ToastType = "success" | "error" | "info";

export type ToastItem = { id: number; message: string; type: ToastType };

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  function toast(message: string, type: ToastType = "success") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message: translateVisibleText(message), type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }

  return { toasts, toast };
}

export function Toaster({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div
      className="fixed bottom-5 left-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none sm:left-auto sm:right-5 sm:w-auto"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({ toast }: { toast: ToastItem }) {
  const base =
    "flex items-center gap-2.5 rounded-ds-md border px-4 py-3 text-sm font-medium shadow-layer-3";
  const colors =
    toast.type === "success"
      ? "border-success/20 bg-success text-white"
      : toast.type === "error"
      ? "border-danger/20 bg-danger text-white"
      : "border-border bg-surface-elevated text-text-primary";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={`${base} ${colors} max-w-full sm:max-w-sm`}
    >
      {toast.type === "success" && (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {toast.type === "error" && (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {toast.message}
    </motion.div>
  );
}
