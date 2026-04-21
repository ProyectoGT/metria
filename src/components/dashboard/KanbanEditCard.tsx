"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { KanbanCardData, KanbanPriority } from "@/lib/mock/dashboard";

type EditUpdates = { title: string; priority: KanbanPriority; dueDate?: string };

type Props = {
  card: KanbanCardData;
  onSave: (updates: EditUpdates) => void;
  onClose: () => void;
};

const PRIORITIES: { value: KanbanPriority; label: string; cls: string; activeCls: string }[] = [
  { value: "alta",  label: "Alta",  cls: "text-red-700 hover:bg-red-500/10",    activeCls: "border-red-500 bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
  { value: "media", label: "Media", cls: "text-yellow-700 hover:bg-yellow-50",  activeCls: "border-yellow-500 bg-yellow-100 text-yellow-700" },
  { value: "baja",  label: "Baja",  cls: "text-gray-600 hover:bg-gray-50",      activeCls: "border-gray-400 bg-gray-100 text-gray-700" },
];

export default function KanbanEditCard({ card, onSave, onClose }: Props) {
  const [title, setTitle]       = useState(card.title);
  const [priority, setPriority] = useState<KanbanPriority>(card.priority);
  const [dueDate, setDueDate]   = useState(card.dueDate ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), priority, dueDate: dueDate || undefined });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-semibold text-text-primary">Editar tarea</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-background hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Titulo <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Prioridad</label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={[
                    "flex-1 rounded-lg border py-2 text-sm font-medium transition-colors",
                    priority === p.value ? p.activeCls : `border-border ${p.cls}`,
                  ].join(" ")}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Fecha y hora limite</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background">
              Cancelar
            </button>
            <button type="submit" disabled={!title.trim()} className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50">
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
