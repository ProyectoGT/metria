"use client";


import { APIProvider, Map, AdvancedMarker, InfoWindow, Polygon, useMap } from "@vis.gl/react-google-maps";
import { memo, useMemo, useState, useEffect, useCallback } from "react";
import { Navigation, FileText, MapPin } from "lucide-react";
import type { ZonaGeografica } from "@/types";

const OFICINA = { lat: 41.365795, lng: 2.053508 };

function zonaToPaths(z: ZonaGeografica): { lat: number; lng: number }[] {
  if (z.geojson.type === "Polygon") {
    return z.geojson.coordinates[0].map((c) => ({ lat: c[1], lng: c[0] }));
  }
  if (z.geojson.type === "MultiPolygon") {
    return z.geojson.coordinates[0][0].map((c) => ({ lat: c[1], lng: c[0] }));
  }
  return [];
}

function computeCentroid(z: ZonaGeografica): { lat: number; lng: number } {
  const pts = zonaToPaths(z);
  if (pts.length === 0) return OFICINA;
  let lat = 0, lng = 0;
  for (const p of pts) { lat += p.lat; lng += p.lng; }
  return { lat: lat / pts.length, lng: lng / pts.length };
}

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

type SelectedPoint = NoticiaMapPoint & { tipo: "noticia" | "encargo" };

type SelectedZone = {
  zona: ZonaGeografica;
  centroid: { lat: number; lng: number };
};

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
        boxShadow: "var(--shadow-layer-1)",
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
        background: "var(--color-sidebar-logo)",
        border: "2px solid var(--color-surface)",
        boxShadow: "var(--shadow-layer-1)",
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
  zonasGeograficas,
  showZonas = true,
  showNoticias = true,
  showEncargos = true,
}: {
  noticias: NoticiaMapPoint[];
  encargos: NoticiaMapPoint[];
  zonasGeograficas: ZonaGeografica[];
  showZonas?: boolean;
  showNoticias?: boolean;
  showEncargos?: boolean;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const [selected, setSelected] = useState<SelectedPoint | null>(null);
  const [selectedZone, setSelectedZone] = useState<SelectedZone | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<number | null>(null);

  const allPoints = useMemo(
    () => [
      ...noticias.map((n) => ({ lat: n.latitud, lng: n.longitud })),
      ...encargos.map((e) => ({ lat: e.latitud, lng: e.longitud })),
    ],
    [encargos, noticias],
  );

  const handleInfoWindowClose = useCallback(() => {
    setSelected(null);
    setSelectedZone(null);
  }, []);

  return (
    <div className="map-surface h-full w-full overflow-hidden rounded-ds-lg" style={{ minHeight: 380 }}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={OFICINA}
          defaultZoom={13}
          gestureHandling="greedy"
          mapId="metria-dashboard-map"
          style={{ width: "100%", height: "100%" }}
          onClick={() => { setSelected(null); setSelectedZone(null); }}
        >
            <MapLocationInit points={allPoints} />

            {/* Zonas geográficas */}
            {showZonas && zonasGeograficas.map((z) => {
              const isHovered = z.id === hoveredZoneId;
              return (
                <Polygon
                  key={`zgeo-${z.id}`}
                  paths={zonaToPaths(z)}
                  strokeColor={isHovered ? "#f59e0b" : z.color}
                  strokeOpacity={0.85}
                  strokeWeight={isHovered ? 3 : 2}
                  fillColor={z.color}
                  fillOpacity={isHovered ? 0.2 : 0.1}
                  clickable={true}
                  zIndex={isHovered ? 5 : 1}
                  onClick={() => {
                    setSelected(null);
                    setSelectedZone({ zona: z, centroid: computeCentroid(z) });
                  }}
                  onMouseOver={() => setHoveredZoneId(z.id)}
                  onMouseOut={() => setHoveredZoneId(null)}
                />
              );
            })}

            {/* Oficina */}
            <AdvancedMarker
              position={OFICINA}
              title="Master Iberica — Rambla Josep Maria Jujol, 42"
            >
              <SquarePin />
            </AdvancedMarker>

            {/* Noticias */}
            {showNoticias && noticias.map((n) => (
              <AdvancedMarker
                key={`n-${n.id}`}
                position={{ lat: n.latitud, lng: n.longitud }}
                title={n.propietario ?? `Propiedad #${n.id}`}
                onClick={() => { setSelectedZone(null); setSelected({ ...n, tipo: "noticia" }); }}
              >
                <CirclePin bg="#3b82f6" border="#1d4ed8" />
              </AdvancedMarker>
            ))}

            {/* Encargos */}
            {showEncargos && encargos.map((e) => (
              <AdvancedMarker
                key={`e-${e.id}`}
                position={{ lat: e.latitud, lng: e.longitud }}
                title={e.propietario ?? `Propiedad #${e.id}`}
                onClick={() => { setSelectedZone(null); setSelected({ ...e, tipo: "encargo" }); }}
              >
                <CirclePin bg="#22c55e" border="#15803d" />
              </AdvancedMarker>
            ))}

            {/* InfoWindow para noticias/encargos */}
            {selected && (
              <InfoWindow
                position={{ lat: selected.latitud, lng: selected.longitud }}
                onCloseClick={handleInfoWindowClose}
                pixelOffset={[0, -10]}
              >
                <div style={{ fontFamily: "inherit", minWidth: 220, maxWidth: 280, padding: "2px 2px 4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      background: selected.tipo === "noticia" ? "color-mix(in oklab, var(--color-primary) 12%, transparent)" : "color-mix(in oklab, var(--color-success) 12%, transparent)",
                      color: selected.tipo === "noticia" ? "var(--color-primary)" : "var(--color-success)",
                      border: `1px solid ${selected.tipo === "noticia" ? "color-mix(in oklab, var(--color-primary) 28%, transparent)" : "color-mix(in oklab, var(--color-success) 28%, transparent)"}`,
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: selected.tipo === "noticia" ? "var(--color-primary)" : "var(--color-success)",
                        flexShrink: 0,
                      }} />
                      {selected.tipo === "noticia" ? "Noticia" : "Encargo"}
                    </span>
                  </div>

                  <p style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 4px", lineHeight: 1.3 }}>
                    {selected.propietario?.trim() || `Propiedad #${selected.id}`}
                  </p>

                  {selected.propietario?.trim() && (selected.planta || selected.puerta) && (
                    <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 4px" }}>
                      Planta {selected.planta ?? "-"} · Puerta {selected.puerta ?? "-"}
                    </p>
                  )}

                  <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 2px" }}>
                    {selected.sector}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 12px" }}>
                    Finca {selected.finca}
                  </p>

                  <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "0 0 12px", fontVariantNumeric: "tabular-nums" }}>
                    {selected.latitud.toFixed(5)}, {selected.longitud.toFixed(5)}
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <a
                      href={buildDirectionsUrl(selected.latitud, selected.longitud)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        background: "var(--color-primary)", color: "#fff",
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
                          background: selected.tipo === "noticia" ? "color-mix(in oklab, var(--color-primary) 12%, transparent)" : "color-mix(in oklab, var(--color-success) 12%, transparent)",
                          color: selected.tipo === "noticia" ? "var(--color-primary)" : "var(--color-success)",
                          border: `1px solid ${selected.tipo === "noticia" ? "color-mix(in oklab, var(--color-primary) 28%, transparent)" : "color-mix(in oklab, var(--color-success) 28%, transparent)"}`,
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

            {/* InfoWindow para zonas */}
            {selectedZone && (
              <InfoWindow
                position={selectedZone.centroid}
                onCloseClick={handleInfoWindowClose}
                pixelOffset={[0, -10]}
              >
                <div style={{ fontFamily: "inherit", minWidth: 200, maxWidth: 260, padding: "2px 2px 4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      width: 10, height: 10, borderRadius: 2,
                      background: selectedZone.zona.color,
                      flexShrink: 0,
                    }} />
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      background: "color-mix(in oklab, var(--color-primary) 12%, transparent)",
                      color: "var(--color-primary)",
                      border: "1px solid color-mix(in oklab, var(--color-primary) 28%, transparent)",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}>
                      <MapPin style={{ width: 10, height: 10 }} />
                      Zona
                    </span>
                  </div>

                  <p style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 4px", lineHeight: 1.3 }}>
                    {selectedZone.zona.nombre}
                  </p>

                  {selectedZone.zona.descripcion && (
                    <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 8px" }}>
                      {selectedZone.zona.descripcion}
                    </p>
                  )}

                  <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "0 0 12px" }}>
                    {selectedZone.zona.tipo}
                  </p>

                  <a
                    href="/zonas-geograficas"
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      background: "var(--color-primary)", color: "#fff",
                      padding: "7px 12px", borderRadius: 7,
                      fontSize: 12, fontWeight: 600, textDecoration: "none",
                    }}
                  >
                    <MapPin style={{ width: 13, height: 13, flexShrink: 0 }} />
                    Ver en Zonas Geograficas
                  </a>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
    </div>
  );
}

export default memo(MapaDashboard);
