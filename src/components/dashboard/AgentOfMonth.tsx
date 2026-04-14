"use client";

import { useState } from "react";
import { Trophy, Plus } from "lucide-react";
import AgentOfMonthModal from "./AgentOfMonthModal";
import type { AgentOfMonthData } from "@/lib/mock/dashboard";
import type { UserRole } from "@/lib/roles";

type AgentOfMonthProps = {
  initialData: AgentOfMonthData | null;
  role: UserRole;
  currentUserName: string;
  agents: Array<{ id: string; nombre: string }>;
};

export default function AgentOfMonth({
  initialData,
  role,
  currentUserName,
  agents,
}: AgentOfMonthProps) {
  const [data, setData] = useState<AgentOfMonthData | null>(initialData);
  const [showModal, setShowModal] = useState(false);

  const canManage =
    role === "Administrador" || role === "Director" || role === "Responsable";

  // No premio + cannot manage → render nothing
  if (!data && !canManage) return null;

  // No premio + can manage → show CTA card
  if (!data && canManage) {
    return (
      <>
        <div className="flex items-center justify-between rounded-xl border-2 border-dashed border-border bg-surface p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
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
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" />
            Añadir premio del mes
          </button>
        </div>
        {showModal && (
          <AgentOfMonthModal
            agents={agents}
            currentUserName={currentUserName}
            onSave={setData}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  // Premio configured
  return (
    <>
      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
              <Trophy className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Agente del mes · {data!.mes}
              </p>
              <p className="mt-0.5 text-2xl font-bold text-text-primary">{data!.agente}</p>
              <p className="mt-1 text-sm text-text-secondary">{data!.premio}</p>
              <p className="mt-2 text-xs text-text-secondary">
                Premio añadido por <span className="font-medium">{data!.añadidoPor}</span>
              </p>
            </div>
          </div>
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="rounded-lg border border-amber-300 bg-white/70 px-3 py-1.5 text-sm font-medium text-amber-800 transition-colors hover:bg-white"
            >
              Cambiar
            </button>
          )}
        </div>
      </div>
      {showModal && (
        <AgentOfMonthModal
          agents={agents}
          currentUserName={currentUserName}
          onSave={setData}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
