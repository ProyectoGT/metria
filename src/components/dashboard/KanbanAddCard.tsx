"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { KanbanCardData, KanbanPriority } from "@/lib/mock/dashboard";
import type { UserRole } from "@/lib/roles";

type NewCard = Omit<KanbanCardData, "id">;

type KanbanAddCardProps = {
  onAdd: (card: NewCard) => void;
  onClose: () => void;
  role: UserRole;
  /** Available agents for assignment (director/responsable/admin only) */
  agents?: Array<{ id: string; nombre: string }>;
};

const PRIORITIES: { value: KanbanPriority; label: string; cls: string; activeClsBorder: string }[] = [
  { value: "alta", label: "Alta", cls: "text-red-700 hover:bg-red-500/10", activeClsBorder: "border-red-500 bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
  { value: "media", label: "Media", cls: "text-yellow-700 hover:bg-yellow-50", activeClsBorder: "border-yellow-500 bg-yellow-100 text-yellow-700" },
  { value: "baja", label: "Baja", cls: "text-gray-600 hover:bg-gray-50", activeClsBorder: "border-gray-400 bg-gray-100 text-gray-700" },
];

export default function KanbanAddCard({ onAdd, onClose, role, agents = [] }: KanbanAddCardProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<KanbanPriority>("media");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const canAssign =
    role === "Administrador" || role === "Director" || role === "Responsable";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate || undefined,
      assignedBy: null,
      assignedTo: assignedTo || null,
    });
    onClose();
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-semibold text-text-primary">Nueva tarea</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Título <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título de la tarea"
              className="input"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción opcional…"
              rows={2}
              className="input resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Prioridad
            </label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={[
                    "flex-1 rounded-lg border py-2 text-sm font-medium transition-colors",
                    priority === p.value
                      ? p.activeClsBorder
                      : `border-border ${p.cls}`,
                  ].join(" ")}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Fecha límite
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input"
            />
          </div>

          {/* Assign to (admin / director / responsable only) */}
          {canAssign && agents.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Asignar a
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="input"
              >
                <option value="">Sin asignar</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              Añadir tarea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
