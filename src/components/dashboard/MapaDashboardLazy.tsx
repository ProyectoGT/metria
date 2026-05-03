"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
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
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || isVisible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isVisible]);

  return (
    <div ref={ref} className="h-full w-full">
      {isVisible ? (
        <MapaDashboard noticias={noticias} encargos={encargos} />
      ) : (
        <div className="flex h-full min-h-[380px] items-center justify-center bg-surface-raised/60">
          <span className="text-sm text-text-secondary">El mapa se cargara al llegar a esta seccion.</span>
        </div>
      )}
    </div>
  );
}
