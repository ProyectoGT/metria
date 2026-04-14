"use client";

import { useState } from "react";
import { Newspaper, Search, ClipboardList, ShoppingBag, X, type LucideIcon } from "lucide-react";
import SummaryCard from "./SummaryCard";
import type { SummaryData, SummaryType, PropertyListing } from "@/lib/mock/dashboard";

// ─── Card definitions ─────────────────────────────────────────────────────────

type CardDef = {
  key: SummaryType;
  label: string;
  icon: LucideIcon;
  accentColor: string;
  activeBg: string;
};

const CARDS: CardDef[] = [
  {
    key: "noticias",
    label: "Noticias",
    icon: Newspaper,
    accentColor: "bg-blue-100 text-blue-600",
    activeBg: "bg-blue-50",
  },
  {
    key: "investigaciones",
    label: "Investigaciones",
    icon: Search,
    accentColor: "bg-purple-100 text-purple-600",
    activeBg: "bg-purple-50",
  },
  {
    key: "encargos",
    label: "Encargos",
    icon: ClipboardList,
    accentColor: "bg-green-100 text-green-600",
    activeBg: "bg-green-50",
  },
  {
    key: "pedidosActivos",
    label: "Pedidos activos",
    icon: ShoppingBag,
    accentColor: "bg-orange-100 text-orange-600",
    activeBg: "bg-orange-50",
  },
];

// ─── Estado badge ─────────────────────────────────────────────────────────────

function estadoBadge(estado: string) {
  const s = estado.toLowerCase();
  if (s === "activo") return "bg-green-100 text-green-700";
  if (s === "cerrado") return "bg-gray-100 text-gray-600";
  if (s === "reservado") return "bg-purple-100 text-purple-700";
  if (s === "pendiente") return "bg-yellow-100 text-yellow-700";
  return "bg-blue-100 text-blue-700"; // en negociación, en proceso, en estudio…
}

// ─── Property table ───────────────────────────────────────────────────────────

function PropertyTable({ listings }: { listings: PropertyListing[] }) {
  if (listings.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">
        No hay propiedades en esta categoría.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-3 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Propiedad
            </th>
            <th className="pb-3 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Sector
            </th>
            <th className="pb-3 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Finca
            </th>
            <th className="pb-3 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Estado
            </th>
            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Agente
            </th>
          </tr>
        </thead>
        <tbody>
          {listings.map((item) => (
            <tr
              key={item.id}
              className="border-b border-border last:border-0 transition-colors hover:bg-background"
            >
              <td className="py-3 pr-6 font-medium text-text-primary">{item.nombre}</td>
              <td className="py-3 pr-6 text-text-secondary">{item.sector}</td>
              <td className="py-3 pr-6 text-text-secondary">{item.finca}</td>
              <td className="py-3 pr-6">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoBadge(item.estado)}`}
                >
                  {item.estado}
                </span>
              </td>
              <td className="py-3 text-text-secondary">{item.agente}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Summary panel ────────────────────────────────────────────────────────────

type SummaryPanelProps = {
  summary: SummaryData;
  listings: Record<SummaryType, PropertyListing[]>;
};

export default function SummaryPanel({ summary, listings }: SummaryPanelProps) {
  const [activeKey, setActiveKey] = useState<SummaryType | null>(null);

  const activeCard = CARDS.find((c) => c.key === activeKey);

  function handleCardClick(key: SummaryType) {
    setActiveKey((prev) => (prev === key ? null : key));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card) => (
          <SummaryCard
            key={card.key}
            count={summary[card.key]}
            label={card.label}
            accentColor={card.accentColor}
            activeBg={card.activeBg}
            icon={card.icon}
            isActive={activeKey === card.key}
            onClick={() => handleCardClick(card.key)}
          />
        ))}
      </div>

      {/* Expanded listing */}
      {activeKey && activeCard && (
        <div className="rounded-xl border-2 border-blue-600 bg-surface p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">
              {activeCard.label}
              <span className="ml-2 text-sm font-normal text-text-secondary">
                — todas las propiedades
              </span>
            </h3>
            <button
              onClick={() => setActiveKey(null)}
              className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
              aria-label="Cerrar listado"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <PropertyTable listings={listings[activeKey]} />
        </div>
      )}
    </div>
  );
}
