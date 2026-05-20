"use client";

import { MapPin } from "lucide-react";
import type { ZonaGeografica } from "@/modules/zonas-geograficas/services/types";

interface ZonaGeoListPanelProps {
  zonas: ZonaGeografica[];
  selectedZonaId: number | null;
  onSelectZona: (zona: ZonaGeografica) => void;
  loading?: boolean;
}

export default function ZonaGeoListPanel({
  zonas,
  selectedZonaId,
  onSelectZona,
  loading,
}: ZonaGeoListPanelProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl bg-muted p-3">
            <div className="mb-2 h-4 w-24 rounded bg-border" />
            <div className="h-3 w-32 rounded bg-border" />
          </div>
        ))}
      </div>
    );
  }

  if (zonas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <MapPin className="mb-2 h-8 w-8 text-text-secondary/40" />
        <p className="text-sm font-medium text-text-secondary">Sin zonas</p>
        <p className="mt-1 text-xs text-text-secondary/60">
          Dibuja tu primera zona en el mapa
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {zonas.map((z) => {
        const isSelected = z.id === selectedZonaId;
        const vertexCount =
          z.geojson.type === "Polygon"
            ? z.geojson.coordinates[0].length - 1
            : 0;

        return (
          <button
            key={z.id}
            onClick={() => onSelectZona(z)}
            className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition-all ${
              isSelected
                ? "bg-primary/10 ring-1 ring-primary/30"
                : "hover:bg-muted"
            }`}
          >
            <span
              className="mt-1 h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: z.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">
                {z.nombre}
              </p>
              <p className="mt-0.5 text-xs text-text-secondary">
                {vertexCount} puntos ·{" "}
                {new Date(z.created_at).toLocaleDateString("es-ES")}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
