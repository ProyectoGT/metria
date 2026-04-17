"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Newspaper,
  Search,
  ClipboardList,
  ShoppingBag,
  ArrowLeft,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
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
    accentColor: "bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
    activeBg: "bg-blue-500/5 dark:bg-blue-500/10",
  },
  {
    key: "investigaciones",
    label: "Investigaciones",
    icon: Search,
    accentColor: "bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
    activeBg: "bg-purple-500/5 dark:bg-purple-500/10",
  },
  {
    key: "encargos",
    label: "Encargos",
    icon: ClipboardList,
    accentColor: "bg-green-500/15 text-green-600 dark:bg-green-500/20 dark:text-green-400",
    activeBg: "bg-green-500/5 dark:bg-green-500/10",
  },
  {
    key: "pedidosActivos",
    label: "Pedidos activos",
    icon: ShoppingBag,
    accentColor: "bg-orange-500/15 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
    activeBg: "bg-orange-500/5 dark:bg-orange-500/10",
  },
];

// ─── Estado badge ─────────────────────────────────────────────────────────────

function estadoBadge(estado: string) {
  const s = estado.toLowerCase();
  if (s === "activo") return "bg-green-500/15 text-green-700 dark:bg-green-500/20 dark:text-green-400";
  if (s === "cerrado") return "bg-gray-500/15 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400";
  if (s === "reservado") return "bg-purple-500/15 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400";
  if (s === "pendiente") return "bg-yellow-500/15 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400";
  if (s.startsWith("encarg")) return "bg-green-500/15 text-green-700 dark:bg-green-500/20 dark:text-green-400";
  return "bg-blue-500/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400";
}

// ─── Property table ───────────────────────────────────────────────────────────

function PropertyTable({ listings }: { listings: PropertyListing[] }) {
  if (listings.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-text-secondary">
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
            <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Agente
            </th>
            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
              &nbsp;
            </th>
          </tr>
        </thead>
        <tbody>
          {listings.map((item) => {
            const href =
              item.zonaId && item.sectorId && item.fincaId
                ? `/zona/${item.zonaId}/sector/${item.sectorId}/finca/${item.fincaId}`
                : null;

            return (
              <tr
                key={item.id}
                className="group border-b border-border last:border-0 transition-colors hover:bg-background"
              >
                <td className="py-3 pr-6 font-medium text-text-primary">{item.nombre}</td>
                <td className="py-3 pr-6 text-text-secondary">{item.sector}</td>
                <td className="py-3 pr-6 text-text-secondary">{item.finca}</td>
                <td className="py-3 pr-6">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoBadge(item.estado)}`}
                  >
                    {item.estado.charAt(0).toUpperCase() + item.estado.slice(1)}
                  </span>
                </td>
                <td className="py-3 pr-4 text-text-secondary">{item.agente}</td>
                <td className="py-3">
                  {href ? (
                    <Link
                      href={href}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary opacity-0 transition-opacity hover:bg-primary/10 group-hover:opacity-100"
                      title="Ver ficha del piso"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Ver ficha
                    </Link>
                  ) : null}
                </td>
              </tr>
            );
          })}
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
    setActiveKey(key);
  }

  function handleClose() {
    setActiveKey(null);
  }

  return (
    <>
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

      {/* Full-screen overlay — cubre el contenido principal bajo el header */}
      {activeKey && activeCard && (
        <div className="fixed inset-0 z-30 flex flex-col bg-background pt-16 md:pl-[220px]">
          {/* Cabecera de la pantalla */}
          <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 md:px-6">
            <button
              onClick={handleClose}
              className="flex items-center gap-1.5 rounded-lg p-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
              aria-label="Volver al dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
            <div className="h-4 w-px bg-border" />
            <h2 className="font-semibold text-text-primary">{activeCard.label}</h2>
            <span className="ml-1 text-sm text-text-secondary">
              — {listings[activeKey].length} propiedades
            </span>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <PropertyTable listings={listings[activeKey]} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
