"use client";

import { useState, useTransition } from "react";
import { Trophy, Plus, Award, Trash2 } from "lucide-react";
import AgentOfMonthModal from "./AgentOfMonthModal";
import type { AgentOfMonthData } from "@/lib/mock/dashboard";
import type { UserRole } from "@/lib/roles";
import {
  clearAgentOfMonthAction,
} from "@/app/(crm)/dashboard/actions";

type AgentOfMonthProps = {
  initialData: AgentOfMonthData | null;
  empresaId: number | null;
  role: UserRole;
  currentUserName: string;
  agents: Array<{ id: string; nombre: string }>;
};

export default function AgentOfMonth({
  initialData,
  empresaId,
  role,
  currentUserName,
  agents,
}: AgentOfMonthProps) {
  const [data, setData] = useState<AgentOfMonthData | null>(initialData);
  const [modalMode, setModalMode] = useState<"prize" | "winner" | null>(null);
  const [isPending, startTransition] = useTransition();

  const canManage =
    role === "Administrador" || role === "Director" || role === "Responsable";

  function handleClear() {
    startTransition(async () => {
      try {
        await clearAgentOfMonthAction();
        setData(null);
      } catch (err) {
        void err;
      }
    });
  }

  if (!data && !canManage) return null;

  if (!data && canManage) {
    return (
      <>
        <div className="flex items-center justify-between rounded-xl border-2 border-dashed border-border bg-surface p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-text-primary">Aún no hay premio este mes</p>
              <p className="text-sm text-text-secondary">
                Reconoce el trabajo de un agente añadiendo un premio.
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalMode("prize")}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" />
            Añadir premio del mes
          </button>
        </div>

        {modalMode === "prize" && (
          <AgentOfMonthModal
            mode="prize"
            empresaId={empresaId}
            agents={agents}
            currentUserName={currentUserName}
            onSave={(saved) => { setData(saved); setModalMode(null); }}
            onClose={() => setModalMode(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-accent/20 bg-accent/5 shadow-sm">
        <div className="flex items-start justify-between p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
              <Trophy className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                Premio del mes · {data!.mes}
              </p>
              {data!.agente ? (
                <p className="mt-0.5 text-2xl font-bold text-text-primary">{data!.agente}</p>
              ) : (
                <p className="mt-0.5 text-lg font-semibold italic text-text-secondary">
                  Premiado pendiente de anunciar
                </p>
              )}
              <p className="mt-1 text-sm text-text-secondary">{data!.premio}</p>
              <p className="mt-2 text-xs text-text-secondary">
                Premio añadido por{" "}
                <span className="font-medium">{data!.añadidoPor}</span>
              </p>
            </div>
          </div>

          {canManage && (
            <div className="ml-4 flex shrink-0 flex-col items-end gap-2">
              {!data!.agente && (
                <button
                  onClick={() => setModalMode("winner")}
                  className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-surface px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
                >
                  <Award className="h-4 w-4" />
                  Asignar premiado
                </button>
              )}
              <button
                onClick={() => setModalMode("prize")}
                className="rounded-lg border border-accent/30 bg-surface px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
              >
                Cambiar premio
              </button>
              <button
                onClick={handleClear}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg border border-danger/30 bg-surface px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Quitar
              </button>
            </div>
          )}
        </div>
      </div>

      {modalMode === "prize" && (
        <AgentOfMonthModal
          mode="prize"
          empresaId={empresaId}
          agents={agents}
          currentUserName={currentUserName}
          existingData={data}
          onSave={(saved) => { setData(saved); setModalMode(null); }}
          onClose={() => setModalMode(null)}
        />
      )}

      {modalMode === "winner" && (
        <AgentOfMonthModal
          mode="winner"
          empresaId={empresaId}
          agents={agents}
          currentUserName={currentUserName}
          existingData={data}
          onSave={(saved) => { setData(saved); setModalMode(null); }}
          onClose={() => setModalMode(null)}
        />
      )}
    </>
  );
}
