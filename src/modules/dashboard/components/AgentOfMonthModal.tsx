"use client";

import { useState, useTransition } from "react";
import type { AgentOfMonthData } from "@/lib/mock/dashboard";
import {
  saveAgentOfMonthPrizeAction,
  saveAgentOfMonthWinnerAction,
} from "@/app/(crm)/dashboard/actions";
import Drawer from "@/components/ui/drawer";

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
    <Drawer
      open
      onClose={onClose}
      title={isPrizeMode ? "Premio del mes" : "Asignar premiado"}
      width="sm"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
          >
            Cancelar
          </button>
          <button
            form="agent-month-form"
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
      }
    >
      <form id="agent-month-form" onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
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
              El premiado se puede asignar mas adelante.
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
      </form>
    </Drawer>
  );
}
