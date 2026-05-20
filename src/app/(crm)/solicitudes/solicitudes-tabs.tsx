"use client";

import { useState } from "react";
import { FileText, Inbox, Mail } from "lucide-react";

type Tab = "solicitudes" | "idealista";

type Props = {
  defaultTab: Tab;
  nuevosLeads: number;
  showIdealista: boolean;
  solicitudesContent: React.ReactNode;
  idealistaContent?: React.ReactNode;
};

export default function SolicitudesTabs({
  defaultTab,
  nuevosLeads,
  showIdealista,
  solicitudesContent,
  idealistaContent,
}: Props) {
  const [active, setActive] = useState<Tab>(defaultTab);
  const activeTab = showIdealista ? active : "solicitudes";

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
              <Inbox className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-text-primary">Solicitudes</h1>
              <p className="mt-0.5 text-sm text-text-secondary">Gestiona solicitudes, leads y oportunidades de clientes.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex w-fit gap-1 rounded-xl border border-border bg-background p-1 shadow-sm" role="tablist" aria-label="Secciones de solicitudes">
        <button
          onClick={() => setActive("solicitudes")}
          role="tab"
          aria-selected={active === "solicitudes"}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            active === "solicitudes"
              ? "bg-surface text-text-primary shadow-sm ring-1 ring-border/70"
              : "text-text-secondary hover:bg-surface/70 hover:text-text-primary"
          }`}
        >
          <FileText className="size-4" />
          Solicitudes
        </button>

        {showIdealista && (
          <button
            onClick={() => setActive("idealista")}
            role="tab"
            aria-selected={active === "idealista"}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              active === "idealista"
                ? "bg-surface text-text-primary shadow-sm ring-1 ring-border/70"
                : "text-text-secondary hover:bg-surface/70 hover:text-text-primary"
            }`}
          >
            <Mail className="size-4 text-orange-500" />
            <span className="font-black text-orange-500">idealista</span>
            {nuevosLeads > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                {nuevosLeads > 9 ? "9+" : nuevosLeads}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Content */}
      <div role="tabpanel" aria-label={active === "solicitudes" ? "Solicitudes" : "Idealista"}>
        {active === "solicitudes" ? solicitudesContent : idealistaContent}
      </div>
    </div>
  );
}
