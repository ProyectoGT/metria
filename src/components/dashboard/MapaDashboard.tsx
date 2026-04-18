"use client";

import { APIProvider, Map, Marker, InfoWindow } from "@vis.gl/react-google-maps";
import { useState } from "react";
import { Navigation } from "lucide-react";

const OFICINA = { lat: 41.3697, lng: 2.0724 };

export type NoticiaMapPoint = {
  id: number;
  propietario: string | null;
  planta: string | null;
  puerta: string | null;
  finca: string;
  sector: string;
  latitud: number;
  longitud: number;
};

type Selected = NoticiaMapPoint & { tipo: "noticia" | "encargo" };

function buildDirectionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/${OFICINA.lat},${OFICINA.lng}/${lat},${lng}`;
}

// SVG circle pin — fillColor cambia por tipo
function pinIcon(fillColor: string, borderColor: string) {
  return {
    path: "M 0, 0 m -10, 0 a 10,10 0 1,0 20,0 a 10,10 0 1,0 -20,0",
    fillColor,
    fillOpacity: 1,
    strokeColor: borderColor,
    strokeWeight: 2.5,
    scale: 1,
    anchor: { x: 0, y: 0 } as google.maps.Point,
  };
}

// SVG para la oficina: cuadrado negro con borde blanco
function oficinaPinIcon() {
  return {
    path: "M -9,-9 L 9,-9 L 9,9 L -9,9 Z",
    fillColor: "#111827",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
    scale: 1,
    anchor: { x: 0, y: 0 } as google.maps.Point,
  };
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

  const totalConCoordenadas = noticias.length + encargos.length;

  return (
    <section>
      <div className="mb-4">
        <h2 className="font-semibold text-text-primary">Mapa de propiedades</h2>
        <p className="text-sm text-text-secondary">
          Noticias y encargos con ubicación registrada.{" "}
          {totalConCoordenadas === 0 && "Sin propiedades con coordenadas aun."}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border" style={{ height: 420 }}>
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={{ lat: OFICINA.lat, lng: OFICINA.lng }}
            defaultZoom={13}
            gestureHandling="greedy"
          >
            {/* Oficina */}
            <Marker
              position={{ lat: OFICINA.lat, lng: OFICINA.lng }}
              title="Master Iberica — Rambla Josep Maria Jujol, 42"
              icon={oficinaPinIcon()}
            />

            {/* Noticias — círculo azul */}
            {noticias.map((n) => (
              <Marker
                key={`n-${n.id}`}
                position={{ lat: n.latitud, lng: n.longitud }}
                title={n.propietario ?? `Propiedad #${n.id}`}
                icon={pinIcon("#3b82f6", "#1d4ed8")}
                onClick={() => setSelected({ ...n, tipo: "noticia" })}
              />
            ))}

            {/* Encargos — círculo verde */}
            {encargos.map((e) => (
              <Marker
                key={`e-${e.id}`}
                position={{ lat: e.latitud, lng: e.longitud }}
                title={e.propietario ?? `Propiedad #${e.id}`}
                icon={pinIcon("#22c55e", "#15803d")}
                onClick={() => setSelected({ ...e, tipo: "encargo" })}
              />
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
                  <a
                    href={buildDirectionsUrl(selected.latitud, selected.longitud)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      marginTop: 8,
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
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      </div>

      {/* Leyenda */}
      <div className="mt-3 flex items-center gap-5 text-xs text-text-secondary">
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
      </div>
    </section>
  );
}
