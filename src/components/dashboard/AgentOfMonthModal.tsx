"use client";

import { useState } from "react";
import { X, Trophy, Award } from "lucide-react";
import type { AgentOfMonthData } from "@/lib/mock/dashboard";

type Mode = "prize" | "winner";

type AgentOfMonthModalProps = {
  mode: Mode;
  agents: Array<{ id: string; nombre: string }>;
  currentUserName: string;
  existingData?: AgentOfMonthData | null;
  onSave: (data: AgentOfMonthData) => void;
  onClose: () => void;
};

export default function AgentOfMonthModal({
  mode,
  agents,
  currentUserName,
  existingData,
  onSave,
  onClose,
}: AgentOfMonthModalProps) {
  const [agenteId, setAgenteId] = useState("");
  const [premio, setPremio] = useState(existingData?.premio ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const now = new Date();
    const monthName = now.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    const mes = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    if (mode === "prize") {
      // Solo guardamos el premio; el agente queda sin asignar
      onSave({
        agente: null,
        premio: premio.trim(),
        añadidoPor: currentUserName,
        mes,
      });
    } else {
      // Asignamos el premiado manteniendo el premio existente
      const agente = agents.find((a) => a.id === agenteId);
      if (!agente) return;
      onSave({
        agente: agente.nombre,
        premio: existingData?.premio ?? "",
        añadidoPor: existingData?.añadidoPor ?? currentUserName,
        mes: existingData?.mes ?? mes,
      });
    }

    onClose();
  }

  const isPrizeMode = mode === "prize";
  const canSubmit = isPrizeMode ? premio.trim().length > 0 : agenteId !== "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            {isPrizeMode ? (
              <Trophy className="h-5 w-5 text-amber-500" />
            ) : (
              <Award className="h-5 w-5 text-amber-500" />
            )}
            <h2 className="font-semibold text-text-primary">
              {isPrizeMode ? "Premio del mes" : "Asignar premiado"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {isPrizeMode && (
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
                autoFocus
              />
              <p className="mt-1.5 text-xs text-text-secondary">
                El premiado se puede asignar más adelante.
              </p>
            </div>
          )}

          {!isPrizeMode && (
            <>
              {existingData?.premio && (
                <div className="rounded-lg bg-accent/10 px-4 py-3">
                  <p className="text-xs font-medium text-accent">Premio del mes</p>
                  <p className="mt-0.5 text-sm text-text-primary">{existingData.premio}</p>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                  Agente premiado <span className="text-danger">*</span>
                </label>
                <select
                  value={agenteId}
                  onChange={(e) => setAgenteId(e.target.value)}
                  className="input"
                  required
                  autoFocus
                >
                  <option value="">Selecciona un agente</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </>
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
              disabled={!canSubmit}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPrizeMode ? "Guardar premio" : "Asignar premiado"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
