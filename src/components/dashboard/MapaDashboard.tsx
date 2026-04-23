"use client";


import { APIProvider, Map, AdvancedMarker, InfoWindow, Polygon, useMap } from "@vis.gl/react-google-maps";
import { useState, useEffect } from "react";
import { Navigation, FileText } from "lucide-react";

const OFICINA = { lat: 41.365795, lng: 2.053508 };

// Polígonos de zonas hardcodeados — ajustados visualmente sobre el mapa
type ZonaPoligono = { id: number; nombre: string; color: string; paths: { lat: number; lng: number }[] };
const ZONA_POLIGONOS: ZonaPoligono[] = [
  {
    id: 1,
    nombre: "Zona 1",
    color: "#2563eb",
    paths: [
      { lat: 41.372227, lng: 2.057209 }, // esquina NO
      { lat: 41.369529, lng: 2.059394 }, // esquina NE
      { lat: 41.367684, lng: 2.056071 }, // esquina SE
      { lat: 41.366279, lng: 2.052893 }, // quiebre sur — inicio indentación
      { lat: 41.367486, lng: 2.051755 }, // indentación sur
      { lat: 41.369068, lng: 2.054410 }, // indentación SO
      { lat: 41.370150, lng: 2.053546 }, // esquina SO
    ],
  },
  {
    id: 2,
    nombre: "Zona 2",
    color: "#dc2626",
    paths: [
      { lat: 41.368875, lng: 2.058310 }, // conexión con zona 1 — NO
      { lat: 41.367201, lng: 2.059675 }, // conexión con zona 1 — NE
      { lat: 41.366874, lng: 2.059194 }, // esquina NE
      { lat: 41.366600, lng: 2.059543 }, // quiebre este
      { lat: 41.365473, lng: 2.058526 }, // quiebre SE
      { lat: 41.365731, lng: 2.057657 }, // esquina SE
      { lat: 41.365223, lng: 2.057274 }, // quiebre sur
      { lat: 41.364945, lng: 2.056917 }, // quiebre sur-oeste
      { lat: 41.365728, lng: 2.055925 }, // esquina SO
      { lat: 41.364154, lng: 2.053344 }, // conexión con zona 1 — SO
      { lat: 41.365756, lng: 2.051767 },
      { lat: 41.367656, lng: 2.056016 }, // cierre
      { lat: 41.368875, lng: 2.058310 },
    ],
  },
];

export type NoticiaMapPoint = {
  id: number;
  propietario: string | null;
  planta: string | null;
  puerta: string | null;
  finca: string;
  sector: string;
  latitud: number;
  longitud: number;
  fincaId: number | null;
  sectorId: number | null;
  zonaId: number | null;
};

type Selected = NoticiaMapPoint & { tipo: "noticia" | "encargo" };

function buildDirectionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/${OFICINA.lat},${OFICINA.lng}/${lat},${lng}`;
}

function CirclePin({ bg, border }: { bg: string; border: string }) {
  return (
    <span
      style={{
        display: "block",
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: bg,
        border: `2.5px solid ${border}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }}
    />
  );
}

function SquarePin() {
  return (
    <span
      style={{
        display: "block",
        width: 16,
        height: 16,
        borderRadius: 3,
        background: "#111827",
        border: "2px solid #ffffff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
      }}
    />
  );
}

// Componente interno que ajusta el encuadre del mapa automáticamente
function MapBoundsAdjuster({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    // Incluir la oficina siempre
    bounds.extend(OFICINA);
    points.forEach((p) => bounds.extend(p));

    if (points.length === 1) {
      // Un solo punto: centrar y zoom fijo
      map.fitBounds(bounds, 80);
      map.setZoom(14);
    } else {
      map.fitBounds(bounds, 60);
    }
  }, [map, points]);

  return null;
}

export default function MapaDashboard({
  noticias,
  encargos,
}: {
  noticias: NoticiaMapPoint[];
  encargos: NoticiaMapPoint[];
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const [selected, setSelected] = useState<Selected | null>(null);

  const allPoints = [
    ...noticias.map((n) => ({ lat: n.latitud, lng: n.longitud })),
    ...encargos.map((e) => ({ lat: e.latitud, lng: e.longitud })),
  ];

  return (
    <section className="flex h-full w-full flex-col rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
      {/* Header con título y leyenda */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div>
          <h2 className="font-semibold text-text-primary">Mapa de propiedades</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Noticias y encargos con ubicacion registrada.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-gray-900 dark:bg-gray-100" />
            Oficina
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-blue-500" />
            Noticia
            {noticias.length > 0 && (
              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                {noticias.length}
              </span>
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
            Encargo
            {encargos.length > 0 && (
              <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                {encargos.length}
              </span>
            )}
          </span>
          {ZONA_POLIGONOS.map((z) => (
            <span key={z.id} className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-sm opacity-70"
                style={{ background: z.color }}
              />
              {z.nombre}
            </span>
          ))}
        </div>
      </div>

      {/* Mapa */}
      <div className="min-h-[300px] flex-1">
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={OFICINA}
            defaultZoom={13}
            gestureHandling="greedy"
            mapId="metria-dashboard-map"
            style={{ width: "100%", height: "100%" }}
          >
            <MapBoundsAdjuster points={allPoints} />

            {/* Polígonos de zonas */}
            {ZONA_POLIGONOS.map((z) => (
              <Polygon
                key={`zona-${z.id}`}
                paths={z.paths}
                strokeColor={z.color}
                strokeOpacity={0.85}
                strokeWeight={2}
                fillColor={z.color}
                fillOpacity={0.12}
              />
            ))}

            {/* Oficina */}
            <AdvancedMarker
              position={OFICINA}
              title="Master Iberica — Rambla Josep Maria Jujol, 42"
            >
              <SquarePin />
            </AdvancedMarker>

            {/* Noticias — círculo azul */}
            {noticias.map((n) => (
              <AdvancedMarker
                key={`n-${n.id}`}
                position={{ lat: n.latitud, lng: n.longitud }}
                title={n.propietario ?? `Propiedad #${n.id}`}
                onClick={() => setSelected({ ...n, tipo: "noticia" })}
              >
                <CirclePin bg="#3b82f6" border="#1d4ed8" />
              </AdvancedMarker>
            ))}

            {/* Encargos — círculo verde */}
            {encargos.map((e) => (
              <AdvancedMarker
                key={`e-${e.id}`}
                position={{ lat: e.latitud, lng: e.longitud }}
                title={e.propietario ?? `Propiedad #${e.id}`}
                onClick={() => setSelected({ ...e, tipo: "encargo" })}
              >
                <CirclePin bg="#22c55e" border="#15803d" />
              </AdvancedMarker>
            ))}

            {selected && (
              <InfoWindow
                position={{ lat: selected.latitud, lng: selected.longitud }}
                onCloseClick={() => setSelected(null)}
              >
                <div className="min-w-[190px] space-y-1.5 p-1 font-sans">
                  <div className="flex items-center gap-1.5">
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: selected.tipo === "noticia" ? "#3b82f6" : "#22c55e",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 10, fontWeight: 600, color: selected.tipo === "noticia" ? "#1d4ed8" : "#15803d", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {selected.tipo === "noticia" ? "Noticia" : "Encargo"}
                    </span>
                  </div>
                  <p style={{ fontWeight: 600, color: "#111827", margin: 0 }}>
                    {selected.propietario?.trim() ||
                      `Planta ${selected.planta ?? "-"} Puerta ${selected.puerta ?? "-"}`}
                  </p>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                    {selected.sector} · Finca {selected.finca}
                  </p>
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    <a
                      href={buildDirectionsUrl(selected.latitud, selected.longitud)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#2563eb",
                        color: "#fff",
                        padding: "6px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      <Navigation style={{ width: 13, height: 13 }} />
                      Como llegar desde la oficina
                    </a>
                    {selected.zonaId && selected.sectorId && selected.fincaId && (
                      <a
                        href={`/zona/${selected.zonaId}/sector/${selected.sectorId}/finca/${selected.fincaId}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          background: selected.tipo === "noticia" ? "#eff6ff" : "#f0fdf4",
                          color: selected.tipo === "noticia" ? "#1d4ed8" : "#15803d",
                          border: `1px solid ${selected.tipo === "noticia" ? "#bfdbfe" : "#bbf7d0"}`,
                          padding: "6px 12px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        <FileText style={{ width: 13, height: 13 }} />
                        Ver ficha
                      </a>
                    )}
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      </div>
    </section>
  );
}
