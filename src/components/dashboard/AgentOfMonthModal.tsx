"use client";

import { useState, useTransition } from "react";
import { X, Trophy, Award } from "lucide-react";
import type { AgentOfMonthData } from "@/lib/mock/dashboard";
import {
  saveAgentOfMonthPrizeAction,
  saveAgentOfMonthWinnerAction,
} from "@/app/(crm)/dashboard/actions";

type Mode = "prize" | "winner";

type AgentOfMonthModalProps = {
  mode: Mode;
  empresaId: number | null;
  agents: Array<{ id: string; nombre: string }>;
  currentUserName: string;
  existingData?: AgentOfMonthData | null;
  onSave: (data: AgentOfMonthData) => void;
  onClose: () => void;
};

export default function AgentOfMonthModal({
  mode,
  empresaId,
  agents,
  currentUserName,
  existingData,
  onSave,
  onClose,
}: AgentOfMonthModalProps) {
  const [agenteId, setAgenteId] = useState("");
  const [premio, setPremio] = useState(existingData?.premio ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function getMesLabel() {
    const now = new Date();
    const label = now.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        if (mode === "prize") {
          const mes = getMesLabel();
          const result = await saveAgentOfMonthPrizeAction({
            mes,
            premio: premio.trim(),
            anadidoPor: currentUserName,
          });
          onSave({
            id: result.id,
            agente: existingData?.agente ?? null,
            agenteId: existingData?.agenteId ?? null,
            premio: premio.trim(),
            añadidoPor: currentUserName,
            mes,
          });
        } else {
          const agente = agents.find((a) => a.id === agenteId);
          if (!agente || !empresaId) return;
          await saveAgentOfMonthWinnerAction({
            empresaId,
            agenteId: Number(agenteId),
            agenteNombre: agente.nombre,
          });
          onSave({
            id: existingData?.id,
            agente: agente.nombre,
            agenteId: Number(agenteId),
            premio: existingData?.premio ?? "",
            añadidoPor: existingData?.añadidoPor ?? currentUserName,
            mes: existingData?.mes ?? getMesLabel(),
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  const isPrizeMode = mode === "prize";
  const canSubmit = isPrizeMode ? premio.trim().length > 0 : agenteId !== "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl bg-surface shadow-xl">
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

          {error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
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
              disabled={!canSubmit || isPending}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending
                ? "Guardando..."
                : isPrizeMode
                  ? "Guardar premio"
                  : "Asignar premiado"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
