"use client";


import { APIProvider, Map, AdvancedMarker, InfoWindow, Polygon, useMap } from "@vis.gl/react-google-maps";
import { memo, useMemo, useState, useEffect } from "react";
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

// Zoom aproximado para un radio de 10 km
const ZOOM_10KM = 12;

// Centra el mapa en la ubicación del usuario (radio ~10 km).
// Si el usuario no da permiso, hace fitBounds sobre los puntos como antes.
function MapLocationInit({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (!navigator.geolocation) {
      fallbackFit(map, points);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        map.setZoom(ZOOM_10KM);
      },
      () => fallbackFit(map, points),
      { timeout: 5000 }
    );
  // Solo al montar — no queremos re-centrar si los puntos cambian
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

function fallbackFit(map: google.maps.Map, points: { lat: number; lng: number }[]) {
  if (points.length === 0) {
    map.setCenter(OFICINA);
    map.setZoom(ZOOM_10KM);
    return;
  }
  const bounds = new google.maps.LatLngBounds();
  bounds.extend(OFICINA);
  points.forEach((p) => bounds.extend(p));
  map.fitBounds(bounds, points.length === 1 ? 80 : 60);
  if (points.length === 1) map.setZoom(14);
}

function MapaDashboard({
  noticias,
  encargos,
}: {
  noticias: NoticiaMapPoint[];
  encargos: NoticiaMapPoint[];
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const [selected, setSelected] = useState<Selected | null>(null);

  const allPoints = useMemo(
    () => [
      ...noticias.map((n) => ({ lat: n.latitud, lng: n.longitud })),
      ...encargos.map((e) => ({ lat: e.latitud, lng: e.longitud })),
    ],
    [encargos, noticias],
  );

  return (
    <div className="h-full w-full" style={{ minHeight: 380 }}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={OFICINA}
          defaultZoom={13}
          gestureHandling="greedy"
          mapId="metria-dashboard-map"
          style={{ width: "100%", height: "100%" }}
        >
            <MapLocationInit points={allPoints} />

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
                pixelOffset={[0, -10]}
              >
                <div style={{ fontFamily: "inherit", minWidth: 220, maxWidth: 280, padding: "2px 2px 4px" }}>
                  {/* Badge tipo */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      background: selected.tipo === "noticia" ? "#eff6ff" : "#f0fdf4",
                      color: selected.tipo === "noticia" ? "#1d4ed8" : "#15803d",
                      border: `1px solid ${selected.tipo === "noticia" ? "#bfdbfe" : "#bbf7d0"}`,
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: selected.tipo === "noticia" ? "#3b82f6" : "#22c55e",
                        flexShrink: 0,
                      }} />
                      {selected.tipo === "noticia" ? "Noticia" : "Encargo"}
                    </span>
                  </div>

                  {/* Nombre grande */}
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 4px", lineHeight: 1.3 }}>
                    {selected.propietario?.trim() || `Propiedad #${selected.id}`}
                  </p>

                  {/* Planta / puerta si hay propietario */}
                  {selected.propietario?.trim() && (selected.planta || selected.puerta) && (
                    <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 4px" }}>
                      Planta {selected.planta ?? "-"} · Puerta {selected.puerta ?? "-"}
                    </p>
                  )}

                  {/* Ubicación */}
                  <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 2px" }}>
                    {selected.sector}
                  </p>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px" }}>
                    Finca {selected.finca}
                  </p>

                  {/* Coordenadas */}
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 12px", fontVariantNumeric: "tabular-nums" }}>
                    {selected.latitud.toFixed(5)}, {selected.longitud.toFixed(5)}
                  </p>

                  {/* Acciones */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <a
                      href={buildDirectionsUrl(selected.latitud, selected.longitud)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        background: "#2563eb", color: "#fff",
                        padding: "7px 12px", borderRadius: 7,
                        fontSize: 12, fontWeight: 600, textDecoration: "none",
                      }}
                    >
                      <Navigation style={{ width: 13, height: 13, flexShrink: 0 }} />
                      Como llegar desde la oficina
                    </a>
                    {selected.id && (
                      <a
                        href={`/propiedades/${selected.id}`}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          background: selected.tipo === "noticia" ? "#eff6ff" : "#f0fdf4",
                          color: selected.tipo === "noticia" ? "#1d4ed8" : "#15803d",
                          border: `1px solid ${selected.tipo === "noticia" ? "#bfdbfe" : "#bbf7d0"}`,
                          padding: "7px 12px", borderRadius: 7,
                          fontSize: 12, fontWeight: 600, textDecoration: "none",
                        }}
                      >
                        <FileText style={{ width: 13, height: 13, flexShrink: 0 }} />
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
  );
}

export default memo(MapaDashboard);
