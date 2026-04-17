"use client";

import dynamic from "next/dynamic";
import type { NoticiaMapPoint } from "./MapaDashboard";

const MapaDashboard = dynamic(() => import("./MapaDashboard"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-xl bg-surface-hover animate-pulse">
      <span className="text-sm text-text-secondary">Cargando mapa...</span>
    </div>
  ),
});

export default function MapaDashboardLazy({ noticias }: { noticias: NoticiaMapPoint[] }) {
  return <MapaDashboard noticias={noticias} />;
}
