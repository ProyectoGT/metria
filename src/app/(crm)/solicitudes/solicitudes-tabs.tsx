"use client";

import { useState } from "react";
import { FileText, Mail } from "lucide-react";

type Tab = "solicitudes" | "idealista";

type Props = {
  defaultTab: Tab;
  nuevosLeads: number;
  solicitudesContent: React.ReactNode;
  idealistaContent: React.ReactNode;
};

export default function SolicitudesTabs({ defaultTab, nuevosLeads, solicitudesContent, idealistaContent }: Props) {
  const [active, setActive] = useState<Tab>(defaultTab);

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-xl border border-border bg-background p-1 w-fit" role="tablist" aria-label="Secciones de solicitudes">
        <button
          onClick={() => setActive("solicitudes")}
          role="tab"
          aria-selected={active === "solicitudes"}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            active === "solicitudes"
              ? "bg-surface shadow-sm text-text-primary"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <FileText className="size-4" />
          Solicitudes
        </button>

        <button
          onClick={() => setActive("idealista")}
          role="tab"
          aria-selected={active === "idealista"}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            active === "idealista"
              ? "bg-surface shadow-sm text-text-primary"
              : "text-text-secondary hover:text-text-primary"
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
      </div>

      {/* Content */}
      <div role="tabpanel" aria-label={active === "solicitudes" ? "Solicitudes" : "Idealista"}>
        {active === "solicitudes" ? solicitudesContent : idealistaContent}
      </div>
    </div>
  );
}
