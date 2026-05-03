"use client";

import dynamic from "next/dynamic";
import type { NoticiaMapPoint } from "./MapaDashboard";

const MapaDashboard = dynamic(() => import("./MapaDashboard"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[380px] items-center justify-center bg-surface-raised animate-pulse">
      <span className="text-sm text-text-secondary">Cargando mapa...</span>
    </div>
  ),
});

export default function MapaDashboardLazy({ noticias, encargos }: { noticias: NoticiaMapPoint[]; encargos: NoticiaMapPoint[] }) {
  return <div className="h-full w-full"><MapaDashboard noticias={noticias} encargos={encargos} /></div>;
}
