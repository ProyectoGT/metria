"use client";

import { useState } from "react";
import { Activity, BookOpen, Clock, Home, Phone, Star, Users, X } from "lucide-react";
import type { KanbanCardData, KanbanPriority } from "@/lib/mock/dashboard";
import type { UserRole } from "@/lib/roles";
import { DEFAULT_ACTIVITY_TIME, localDateKey } from "@/lib/local-date-time";

type NewCard = Omit<KanbanCardData, "id" | "source" | "dbId">;

type KanbanAddCardProps = {
  onAdd: (card: NewCard) => void;
  onClose: () => void;
  role: UserRole;
  agents?: Array<{ id: string; nombre: string }>;
  mode?: "tarea" | "actividad";
  currentUserId: string;
};

const PRIORITIES: { value: KanbanPriority; label: string; cls: string; activeCls: string }[] = [
  { value: "alta", label: "Alta", cls: "text-red-700 hover:bg-red-500/10", activeCls: "border-red-500 bg-red-500/15 text-red-700" },
  { value: "media", label: "Media", cls: "text-yellow-700 hover:bg-yellow-50", activeCls: "border-yellow-500 bg-yellow-100 text-yellow-700" },
  { value: "baja", label: "Baja", cls: "text-gray-600 hover:bg-gray-50", activeCls: "border-gray-400 bg-gray-100 text-gray-700" },
];

const ACTIVITY_TYPES = [
  { value: "visita", label: "Visita", icon: Home, active: "border-emerald-500 bg-emerald-500/15 text-emerald-700" },
  { value: "llamada", label: "Llamada", icon: Phone, active: "border-blue-500 bg-blue-500/15 text-blue-700" },
  { value: "reunion", label: "Reunion", icon: Users, active: "border-violet-500 bg-violet-500/15 text-violet-700" },
  { value: "seguimiento", label: "Seguimiento", icon: Clock, active: "border-amber-500 bg-amber-500/15 text-amber-700" },
  { value: "formacion", label: "Formacion", icon: BookOpen, active: "border-indigo-500 bg-indigo-500/15 text-indigo-700" },
  { value: "actividad", label: "Actividad", icon: Activity, active: "border-gray-400 bg-gray-500/15 text-gray-700" },
  { value: "otro", label: "Otro", icon: Star, active: "border-rose-400 bg-rose-500/15 text-rose-700" },
];

export default function KanbanAddCard({
  onAdd,
  onClose,
  role,
  agents = [],
  mode = "tarea",
  currentUserId,
}: KanbanAddCardProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<KanbanPriority>("media");
  const [tipo, setTipo] = useState("actividad");
  const [date, setDate] = useState(localDateKey());
  const [time, setTime] = useState(DEFAULT_ACTIVITY_TIME);
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([currentUserId]);

  const canAssign = role === "Administrador" || role === "Director" || role === "Responsable";
  const isActivity = mode === "actividad";
  const availableAgents = agents.length ? agents : [{ id: currentUserId, nombre: "Yo" }];

  function toggleAssigned(id: string) {
    setAssignedUserIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      return next.length ? next : prev;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || assignedUserIds.length === 0) return;
    onAdd({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      tipo,
      dueDate: isActivity ? `${date}T${time}` : undefined,
      time: isActivity ? time : undefined,
      assignedBy: null,
      assignedTo: assignedUserIds[0] ?? null,
      assignedUserIds: assignedUserIds.map(Number),
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-semibold text-text-primary">{isActivity ? "Nueva actividad" : "Nueva tarea"}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-4 overflow-y-auto px-6 py-5">
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
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              {isActivity ? "Descripcion" : "Titulo"} <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isActivity ? "Describe la actividad..." : "Titulo de la tarea"}
              className="input"
              required
              autoFocus
            />
          </div>

          {!isActivity && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Descripcion</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripcion opcional..."
                rows={2}
                className="input resize-none"
              />
            </div>
          )}

          {isActivity && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Fecha</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Hora</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" required />
              </div>
            </div>
          )}

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

          {canAssign && availableAgents.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                {isActivity ? "Usuarios asignados" : "Asignar a"}
              </label>
              {isActivity ? (
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
              ) : (
                <select
                  value={assignedUserIds[0] ?? currentUserId}
                  onChange={(e) => setAssignedUserIds([e.target.value])}
                  className="input"
                >
                  {availableAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.nombre}</option>
                  ))}
                </select>
              )}
            </div>
          )}

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
              disabled={!title.trim() || assignedUserIds.length === 0}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isActivity ? "Crear actividad" : "Anadir tarea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
