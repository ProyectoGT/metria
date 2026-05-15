"use client";

import { useEffect, useRef } from "react";
import { APIProvider, Map, Polygon, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import type { ZonaGeografica } from "@/modules/zonas-geograficas/services/types";

const MAP_ID = "metria-zonageo-map";
const DEFAULT_CENTER = { lat: 41.365795, lng: 2.053508 };

function themeColor(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function zonaToPaths(z: ZonaGeografica): { lat: number; lng: number }[] {
  if (z.geojson.type === "Polygon") {
    return z.geojson.coordinates[0].map((c) => ({ lat: c[1], lng: c[0] }));
  }
  if (z.geojson.type === "MultiPolygon") {
    return z.geojson.coordinates[0][0].map((c) => ({ lat: c[1], lng: c[0] }));
  }
  return [];
}

export function pathsToGeoJson(paths: { lat: number; lng: number }[]): {
  type: "Polygon";
  coordinates: number[][][];
} {
  const coords = paths.map((p) => [p.lng, p.lat]);
  if (coords.length > 0) coords.push(coords[0]);
  return { type: "Polygon", coordinates: [coords] };
}

function DrawingHandler({
  active,
  onPolygonComplete,
}: {
  active: boolean;
  onPolygonComplete: (geojson: { type: "Polygon"; coordinates: number[][][] }) => void;
}) {
  const map = useMap();
  const drawingLib = useMapsLibrary("drawing");
  const managerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null);

  useEffect(() => {
    if (!map || !drawingLib) return;

    if (!active) {
      if (managerRef.current) {
        managerRef.current.setMap(null);
        managerRef.current = null;
      }
      return;
    }

    const manager = new drawingLib.DrawingManager({
      drawingMode: drawingLib.OverlayType.POLYGON,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
        drawingModes: [drawingLib.OverlayType.POLYGON],
      },
      polygonOptions: {
        fillColor: themeColor("--color-primary", "#2563eb"),
        fillOpacity: 0.15,
        strokeColor: themeColor("--color-primary", "#2563eb"),
        strokeWeight: 2,
        editable: true,
        draggable: true,
        clickable: false,
      },
    });

    manager.setMap(map);
    managerRef.current = manager;

    listenerRef.current = google.maps.event.addListener(
      manager,
      "polygoncomplete",
      (polygon: google.maps.Polygon) => {
        manager.setDrawingMode(null);

        const paths = polygon
          .getPath()
          .getArray()
          .map((ll) => ({ lat: ll.lat(), lng: ll.lng() }));

        polygon.setMap(null);

        const geojson = pathsToGeoJson(paths);
        onPolygonComplete(geojson);
      },
    );

    return () => {
      if (listenerRef.current) {
        google.maps.event.removeListener(listenerRef.current);
        listenerRef.current = null;
      }
      if (managerRef.current) {
        managerRef.current.setMap(null);
        managerRef.current = null;
      }
    };
  }, [map, drawingLib, active, onPolygonComplete]);

  return null;
}

interface ZonaGeoMapProps {
  zonas: ZonaGeografica[];
  selectedZonaId: number | null;
  editableZonaId: number | null;
  drawingMode: boolean;
  onZonaClick: (zona: ZonaGeografica) => void;
  onDrawingComplete: (geojson: { type: "Polygon"; coordinates: number[][][] }) => void;
  onMapReady?: () => void;
}

export default function ZonaGeoMap({
  zonas,
  selectedZonaId,
  editableZonaId,
  drawingMode,
  onZonaClick,
  onDrawingComplete,
  onMapReady,
}: ZonaGeoMapProps) {
  const selectedStroke = themeColor("--color-warning", "#f59e0b");

  return (
    <div className="map-surface h-full w-full overflow-hidden rounded-ds-lg">
      <APIProvider
        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
        libraries={["drawing"]}
      >
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={14}
          gestureHandling="greedy"
          mapId={MAP_ID}
          style={{ width: "100%", height: "100%", minHeight: "400px" }}
          disableDefaultUI={false}
          onTilesLoaded={onMapReady}
        >
          {zonas.map((z) => (
            <Polygon
              key={z.id}
              paths={zonaToPaths(z)}
              strokeColor={z.id === selectedZonaId ? selectedStroke : z.color}
              strokeOpacity={0.85}
              strokeWeight={z.id === selectedZonaId ? 3 : 2}
              fillColor={z.color}
              fillOpacity={z.id === selectedZonaId ? 0.25 : 0.12}
              editable={z.id === editableZonaId}
              draggable={z.id === editableZonaId}
              clickable={true}
              onClick={() => onZonaClick(z)}
              zIndex={z.id === selectedZonaId ? 10 : 1}
            />
          ))}

          <DrawingHandler active={drawingMode} onPolygonComplete={onDrawingComplete} />
        </Map>
      </APIProvider>
    </div>
  );
}
