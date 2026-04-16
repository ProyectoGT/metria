"use client";

import { APIProvider, Map, Marker, InfoWindow } from "@vis.gl/react-google-maps";
import { useState } from "react";
import { Navigation } from "lucide-react";

// ─── Oficina ─────────────────────────────────────────────────────────────────

const OFICINA = {
  lat: 41.3697,
  lng: 2.0724,
};

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildDirectionsUrl(lat: number, lng: number) {
  const origin = `${OFICINA.lat},${OFICINA.lng}`;
  const destination = `${lat},${lng}`;
  return `https://www.google.com/maps/dir/${origin}/${destination}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MapaDashboard({ noticias }: { noticias: NoticiaMapPoint[] }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const [selected, setSelected] = useState<NoticiaMapPoint | null>(null);

  return (
    <section>
      <div className="mb-4">
        <h2 className="font-semibold text-text-primary">Mapa de noticias</h2>
        <p className="text-sm text-text-secondary">
          Propiedades en estado noticia con ubicación registrada.{" "}
          {noticias.length === 0 && "Sin propiedades con coordenadas aún."}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border" style={{ height: 420 }}>
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={{ lat: OFICINA.lat, lng: OFICINA.lng }}
            defaultZoom={13}
            gestureHandling="greedy"
          >
            {/* Marker oficina — icono negro por defecto */}
            <Marker
              position={{ lat: OFICINA.lat, lng: OFICINA.lng }}
              title="Master Ibérica — Rambla Josep Maria Jujol, 42"
              icon={{
                path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                fillColor: "#000000",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 1.5,
                scale: 1.8,
                anchor: { x: 12, y: 24 } as google.maps.Point,
              }}
            />

            {/* Markers noticias — azul */}
            {noticias.map((n) => (
              <Marker
                key={n.id}
                position={{ lat: n.latitud, lng: n.longitud }}
                title={n.propietario ?? `Propiedad #${n.id}`}
                icon={{
                  path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                  fillColor: "#2563eb",
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 1.5,
                  scale: 1.8,
                  anchor: { x: 12, y: 24 } as google.maps.Point,
                }}
                onClick={() => setSelected(n)}
              />
            ))}

            {/* InfoWindow al clicar un marcador */}
            {selected && (
              <InfoWindow
                position={{ lat: selected.latitud, lng: selected.longitud }}
                onCloseClick={() => setSelected(null)}
              >
                <div className="min-w-[180px] space-y-1.5 p-1 font-sans">
                  <p className="font-semibold text-gray-900">
                    {selected.propietario?.trim() ||
                      `Planta ${selected.planta ?? "-"} Puerta ${selected.puerta ?? "-"}`}
                  </p>
                  <p className="text-xs text-gray-500">
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
                    Cómo llegar desde la oficina
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
          <span className="inline-block h-3 w-3 rounded-full bg-black" />
          Oficina
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-blue-600" />
          Noticia
        </span>
      </div>
    </section>
  );
}
