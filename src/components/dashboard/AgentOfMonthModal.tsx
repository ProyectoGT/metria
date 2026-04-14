"use client";

import { useState } from "react";
import { X, Trophy } from "lucide-react";
import type { AgentOfMonthData } from "@/lib/mock/dashboard";

type AgentOfMonthModalProps = {
  agents: Array<{ id: string; nombre: string }>;
  currentUserName: string;
  onSave: (data: AgentOfMonthData) => void;
  onClose: () => void;
};

export default function AgentOfMonthModal({
  agents,
  currentUserName,
  onSave,
  onClose,
}: AgentOfMonthModalProps) {
  const [agenteId, setAgenteId] = useState("");
  const [premio, setPremio] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const agente = agents.find((a) => a.id === agenteId);
    if (!agente || !premio.trim()) return;

    const now = new Date();
    const monthName = now.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

    onSave({
      agente: agente.nombre,
      premio: premio.trim(),
      añadidoPor: currentUserName,
      mes: monthName.charAt(0).toUpperCase() + monthName.slice(1),
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
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold text-text-primary">Premio del mes</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Agente premiado <span className="text-danger">*</span>
            </label>
            <select
              value={agenteId}
              onChange={(e) => setAgenteId(e.target.value)}
              className="input"
              required
            >
              <option value="">Selecciona un agente</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Premio <span className="text-danger">*</span>
            </label>
            <textarea
              value={premio}
              onChange={(e) => setPremio(e.target.value)}
              placeholder="Describe el premio o reconocimiento…"
              rows={3}
              className="input resize-none"
              required
            />
          </div>

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
              disabled={!agenteId || !premio.trim()}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              Guardar premio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
