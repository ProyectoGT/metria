"use client";

import { useState } from "react";
import { Activity, BookOpen, Clock, Home, Phone, Star, Users } from "lucide-react";
import type { KanbanCardData, KanbanPriority } from "@/lib/mock/dashboard";
import { DEFAULT_ACTIVITY_TIME, normalizeTime, splitLocalDateTime } from "@/lib/local-date-time";
import { ACTIVITY_TYPES as ACTIVITY_TYPE_VALUES, type ActivityType } from "@/lib/activity-options";
import Drawer from "@/components/ui/drawer";

type EditUpdates = {
  title: string;
  priority: KanbanPriority;
  dueDate?: string;
  tipo?: ActivityType;
  assignedUserIds?: number[];
};

type Props = {
  card: KanbanCardData;
  onSave: (updates: EditUpdates) => void;
  onClose: () => void;
  agents?: Array<{ id: string; nombre: string }>;
  currentUserId: string;
};

const PRIORITIES: { value: KanbanPriority; label: string; activeCls: string; cls: string }[] = [
  { value: "alta", label: "Alta", cls: "text-red-700 hover:bg-red-500/10", activeCls: "border-red-500 bg-red-500/15 text-red-700" },
  { value: "media", label: "Media", cls: "text-yellow-700 hover:bg-yellow-50", activeCls: "border-yellow-500 bg-yellow-100 text-yellow-700" },
  { value: "baja", label: "Baja", cls: "text-gray-600 hover:bg-gray-50", activeCls: "border-gray-400 bg-gray-100 text-gray-700" },
];

const ACTIVITY_TYPES: Array<{ value: ActivityType; label: string; icon: typeof Home; active: string }> = [
  { value: "visita", label: "Visita", icon: Home, active: "border-emerald-500 bg-emerald-500/15 text-emerald-700" },
  { value: "llamada", label: "Llamada", icon: Phone, active: "border-blue-500 bg-blue-500/15 text-blue-700" },
  { value: "reunion", label: "Reunion", icon: Users, active: "border-violet-500 bg-violet-500/15 text-violet-700" },
  { value: "seguimiento", label: "Seguimiento", icon: Clock, active: "border-amber-500 bg-amber-500/15 text-amber-700" },
  { value: "formacion", label: "Formacion", icon: BookOpen, active: "border-indigo-500 bg-indigo-500/15 text-indigo-700" },
  { value: "actividad", label: "Actividad", icon: Activity, active: "border-gray-400 bg-gray-500/15 text-gray-700" },
  { value: "otro", label: "Otro", icon: Star, active: "border-rose-400 bg-rose-500/15 text-rose-700" },
];

function normalizeEditType(value: string | null | undefined): ActivityType {
  return ACTIVITY_TYPE_VALUES.includes(value as ActivityType) ? value as ActivityType : "actividad";
}

export default function KanbanEditCard({ card, onSave, onClose, agents = [], currentUserId }: Props) {
  const initialDateTime = splitLocalDateTime(card.dueDate);
  const [title, setTitle]       = useState(card.title);
  const [priority, setPriority] = useState<KanbanPriority>(card.priority);
  const [date, setDate]         = useState(initialDateTime.date ?? "");
  const [time, setTime]         = useState(initialDateTime.time ?? card.time ?? DEFAULT_ACTIVITY_TIME);
  const [tipo, setTipo]         = useState<ActivityType>(() => normalizeEditType(card.tipo));
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>(
    card.assignedUserIds?.length ? card.assignedUserIds.map(String) : [currentUserId],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isActivity = card.source === "agenda";
  const availableAgents = agents.length ? agents : [{ id: currentUserId, nombre: "Yo" }];

  function toggleAssigned(id: string) {
    setAssignedUserIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      return next.length ? next : prev;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const dueDate = date ? `${date}T${normalizeTime(time, DEFAULT_ACTIVITY_TIME)}` : undefined;
    onSave({
      title: title.trim(),
      priority,
      dueDate,
      ...(isActivity ? { tipo } : {}),
      assignedUserIds: assignedUserIds.map(Number).filter(Number.isFinite),
    });
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={isActivity ? "Editar actividad" : "Editar tarea"}
      width="md"
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background">
            Cancelar
          </button>
          <button form="kanban-edit-form" type="submit" disabled={!title.trim() || assignedUserIds.length === 0 || isSubmitting} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50">
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      }
    >
      <form id="kanban-edit-form" onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
        {isActivity && (
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Tipo de actividad
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {ACTIVITY_TYPES.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setTipo(item.value)}
                    className={[
                      "flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-center transition-all",
                      tipo === item.value ? item.active : "border-border text-text-secondary hover:bg-background",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-text-secondary">{isActivity ? "Descripcion" : "Titulo"} *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            required
            autoFocus
          />
        </div>

        {isActivity && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Fecha</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Hora</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" />
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Prioridad</label>
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
          <label className="text-xs font-medium text-text-secondary">Usuarios asignados *</label>
          <div className="mt-1.5 max-h-32 space-y-1 overflow-y-auto rounded-xl border border-border bg-background p-2">
            {availableAgents.map((agent) => (
              <label key={agent.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-secondary hover:bg-surface">
                <input
                  type="checkbox"
                  checked={assignedUserIds.includes(agent.id)}
                  onChange={() => toggleAssigned(agent.id)}
                  className="h-4 w-4 accent-primary"
                />
                {agent.nombre}
              </label>
            ))}
          </div>
        </div>
      </form>
    </Drawer>
  );
}
