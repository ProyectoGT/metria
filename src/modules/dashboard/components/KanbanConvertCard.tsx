"use client";

import { useState } from "react";
import { Activity, BookOpen, Clock, Home, Phone, Star, Users } from "lucide-react";
import type { KanbanCardData, KanbanPriority } from "@/lib/mock/dashboard";
import type { UserRole } from "@/lib/roles";
import { DEFAULT_ACTIVITY_TIME, localDateKey, normalizeTime } from "@/lib/local-date-time";
import { type ActivityType } from "@/lib/activity-options";
import Drawer from "@/components/ui/drawer";

type ConvertData = {
  description: string;
  tipo: ActivityType;
  date: string;
  time: string;
  priority: KanbanPriority;
  assignedUserIds: number[];
};

type Props = {
  card: KanbanCardData;
  onConfirm: (data: ConvertData) => Promise<void>;
  onClose: () => void;
  agents?: Array<{ id: string; nombre: string }>;
  currentUserId: string;
  role: UserRole;
};

const PRIORITIES: { value: KanbanPriority; label: string; cls: string; activeCls: string }[] = [
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

export default function KanbanConvertCard({
  card,
  onConfirm,
  onClose,
  agents = [],
  currentUserId,
  role,
}: Props) {
  const [description, setDescription] = useState(card.title);
  const [tipo, setTipo] = useState<ActivityType>("actividad");
  const [date, setDate] = useState(localDateKey());
  const [time, setTime] = useState(DEFAULT_ACTIVITY_TIME);
  const [priority, setPriority] = useState<KanbanPriority>(card.priority);
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>(
    card.assignedUserIds?.length ? card.assignedUserIds.map(String) : [currentUserId],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAssign = role === "Administrador" || role === "Director" || role === "Responsable";
  const availableAgents = agents.length ? agents : [{ id: currentUserId, nombre: "Yo" }];

  function toggleAssigned(id: string) {
    setAssignedUserIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      return next.length ? next : prev;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError("La descripcion es obligatoria");
      return;
    }
    if (!date) {
      setError("La fecha es obligatoria");
      return;
    }
    if (!time) {
      setError("La hora es obligatoria");
      return;
    }
    if (assignedUserIds.length === 0) {
      setError("Debe asignarse al menos un usuario");
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        description: description.trim(),
        tipo,
        date,
        time: normalizeTime(time, DEFAULT_ACTIVITY_TIME),
        priority,
        assignedUserIds: assignedUserIds.map(Number),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al convertir la actividad");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title="Programar en Orden del dia"
      subtitle={card.title}
      width="md"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
          >
            Cancelar
          </button>
          <button
            form="kanban-convert-form"
            type="submit"
            disabled={isSubmitting || !description.trim() || assignedUserIds.length === 0}
            className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Convirtiendo..." : "Convertir a orden del dia"}
          </button>
        </div>
      }
    >
      <form id="kanban-convert-form" onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
        {/* Tipo de actividad */}
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

        {/* Descripcion */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Descripcion <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe la actividad..."
            className="input"
            required
            autoFocus
          />
        </div>

        {/* Fecha y hora */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Fecha <span className="text-danger">*</span>
            </label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Hora <span className="text-danger">*</span>
            </label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" required />
          </div>
        </div>

        {/* Prioridad */}
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

        {/* Usuarios asignados */}
        {canAssign && availableAgents.length > 0 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Usuarios asignados <span className="text-danger">*</span>
            </label>
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border border-border bg-background p-2">
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
            {assignedUserIds.length === 0 && (
              <p className="mt-1 text-xs text-danger">Selecciona al menos un usuario</p>
            )}
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
        )}
      </form>
    </Drawer>
  );
}
