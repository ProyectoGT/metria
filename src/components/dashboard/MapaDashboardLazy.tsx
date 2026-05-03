"use client";

import dynamic from "next/dynamic";
import type { NoticiaMapPoint } from "./MapaDashboard";

const MapaDashboard = dynamic(() => import("./MapaDashboard"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-border bg-surface-raised animate-pulse">
      <span className="text-sm text-text-secondary">Cargando mapa...</span>
    </div>
  ),
});

export default function MapaDashboardLazy({ noticias, encargos }: { noticias: NoticiaMapPoint[]; encargos: NoticiaMapPoint[] }) {
  return <MapaDashboard noticias={noticias} encargos={encargos} />;
}
