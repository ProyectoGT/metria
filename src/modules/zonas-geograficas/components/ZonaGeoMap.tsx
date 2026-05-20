"use client";

import { useEffect, useRef } from "react";
import { APIProvider, Map, Polygon, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import type { ZonaGeografica } from "@/modules/zonas-geograficas/services/types";

export type PolygonGeoJson = { type: "Polygon"; coordinates: number[][][] };
export type LatLngBoundsLiteral = { north: number; south: number; east: number; west: number };
export type LatLngLiteral = { lat: number; lng: number };

export type DraftInfo =
  | { kind: "polygon"; geojson: PolygonGeoJson }
  | { kind: "rectangle"; bounds: LatLngBoundsLiteral }
  | { kind: "square"; bounds: LatLngBoundsLiteral }
  | { kind: "circle"; center: LatLngLiteral; radius: number };

const MAP_ID = "metria-zonageo-map";
const DEFAULT_CENTER = { lat: 41.365795, lng: 2.053508 };
const GOOGLE_MAPS_LIBRARIES = ["drawing"];

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

export function pathsToGeoJson(paths: { lat: number; lng: number }[]): PolygonGeoJson {
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

function EditablePolygonOverlay({
  geojson,
  color,
  onChange,
}: {
  geojson: { type: "Polygon"; coordinates: number[][][] };
  color: string;
  onChange: (geojson: { type: "Polygon"; coordinates: number[][][] }) => void;
}) {
  const map = useMap();
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!map) return;

    const polygon = new google.maps.Polygon({
      paths: geojson.coordinates[0].slice(0, -1).map((coord) => ({
        lat: coord[1],
        lng: coord[0],
      })),
      fillColor: color,
      fillOpacity: 0.28,
      strokeColor: color,
      strokeOpacity: 0.95,
      strokeWeight: 3,
      editable: true,
      draggable: true,
      clickable: false,
      zIndex: 40,
    });

    polygon.setMap(map);
    polygonRef.current = polygon;

    const emitChange = () => {
      const paths = polygon
        .getPath()
        .getArray()
        .map((ll) => ({ lat: ll.lat(), lng: ll.lng() }));
      onChangeRef.current(pathsToGeoJson(paths));
    };

    const path = polygon.getPath();
    listenersRef.current = [
      google.maps.event.addListener(path, "set_at", emitChange),
      google.maps.event.addListener(path, "insert_at", emitChange),
      google.maps.event.addListener(path, "remove_at", emitChange),
      google.maps.event.addListener(polygon, "dragend", emitChange),
    ];

    const bounds = new google.maps.LatLngBounds();
    path.forEach((point) => bounds.extend(point));
    if (!bounds.isEmpty()) map.fitBounds(bounds, 64);

    return () => {
      for (const listener of listenersRef.current) {
        google.maps.event.removeListener(listener);
      }
      listenersRef.current = [];
      polygon.setMap(null);
      polygonRef.current = null;
    };
  }, [map, geojson, color]);

  return null;
}

function EditableRectangleOverlay({
  kind,
  bounds,
  color,
  onChange,
}: {
  kind: "rectangle" | "square";
  bounds: LatLngBoundsLiteral;
  color: string;
  onChange: (bounds: LatLngBoundsLiteral) => void;
}) {
  const map = useMap();
  const rectRef = useRef<google.maps.Rectangle | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const onChangeRef = useRef(onChange);
  const isRestoringRef = useRef(false);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!map) return;
    const rect = new google.maps.Rectangle({
      bounds,
      fillColor: color,
      fillOpacity: 0.28,
      strokeColor: color,
      strokeOpacity: 0.95,
      strokeWeight: 3,
      draggable: true,
      editable: true,
      clickable: false,
      zIndex: 40,
    });
    rect.setMap(map);
    rectRef.current = rect;

    const emitChange = () => {
      if (isRestoringRef.current) return;
      const b = rect.getBounds();
      if (!b) return;
      const ne = b.getNorthEast();
      const sw = b.getSouthWest();

      let resultBounds: LatLngBoundsLiteral;

      if (kind === "square") {
        isRestoringRef.current = true;
        const center = { lat: (ne.lat() + sw.lat()) / 2, lng: (ne.lng() + sw.lng()) / 2 };
        const latSpan = Math.abs(ne.lat() - sw.lat());
        const lngSpan = Math.abs(ne.lng() - sw.lng());
        const maxSpan = Math.max(latSpan, lngSpan);
        const half = maxSpan / 2;
        resultBounds = {
          north: center.lat + half, south: center.lat - half,
          east: center.lng + half, west: center.lng - half,
        };
        rect.setBounds(resultBounds);
        isRestoringRef.current = false;
      } else {
        resultBounds = { north: ne.lat(), south: sw.lat(), east: ne.lng(), west: sw.lng() };
      }

      onChangeRef.current(resultBounds);
    };

    listenersRef.current = [
      google.maps.event.addListener(rect, "bounds_changed", emitChange),
    ];

    return () => {
      for (const l of listenersRef.current) google.maps.event.removeListener(l);
      listenersRef.current = [];
      rect.setMap(null);
      rectRef.current = null;
    };
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (rectRef.current) rectRef.current.setOptions({ fillColor: color, strokeColor: color });
  }, [color]);

  return null;
}

function EditableCircleOverlay({
  center,
  radius,
  color,
  onChange,
}: {
  center: LatLngLiteral;
  radius: number;
  color: string;
  onChange: (data: { center: LatLngLiteral; radius: number }) => void;
}) {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const onChangeRef = useRef(onChange);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!map) return;
    const circle = new google.maps.Circle({
      center, radius,
      fillColor: color, fillOpacity: 0.28,
      strokeColor: color, strokeOpacity: 0.95,
      strokeWeight: 3, draggable: true, editable: true,
      clickable: false, zIndex: 40,
    });
    circle.setMap(map);
    circleRef.current = circle;

    const emitChange = () => {
      const c = circle.getCenter();
      const r = circle.getRadius();
      if (!c) return;
      onChangeRef.current({ center: { lat: c.lat(), lng: c.lng() }, radius: r });
    };

    listenersRef.current = [
      google.maps.event.addListener(circle, "center_changed", emitChange),
      google.maps.event.addListener(circle, "radius_changed", emitChange),
    ];

    return () => {
      for (const l of listenersRef.current) google.maps.event.removeListener(l);
      listenersRef.current = [];
      circle.setMap(null);
      circleRef.current = null;
    };
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (circleRef.current) circleRef.current.setOptions({ fillColor: color, strokeColor: color });
  }, [color]);

  return null;
}

function FitBoundsHandler({
  geojson,
  signal,
}: {
  geojson: PolygonGeoJson | null;
  signal: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !geojson || signal === 0) return;
    const bounds = new google.maps.LatLngBounds();
    for (const coord of geojson.coordinates[0]) {
      bounds.extend({ lat: coord[1], lng: coord[0] });
    }
    if (!bounds.isEmpty()) map.fitBounds(bounds, 72);
  }, [map, geojson, signal]);

  return null;
}

function MapCenterReporter({
  onCenterChange,
}: {
  onCenterChange?: (center: LatLngLiteral) => void;
}) {
  const map = useMap();
  const onCenterChangeRef = useRef(onCenterChange);

  useEffect(() => {
    onCenterChangeRef.current = onCenterChange;
  }, [onCenterChange]);

  useEffect(() => {
    if (!map || !onCenterChange) return;

    const report = () => {
      const center = map.getCenter();
      if (!center) return;
      onCenterChangeRef.current?.({ lat: center.lat(), lng: center.lng() });
    };

    report();
    const listener = google.maps.event.addListener(map, "idle", report);

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, onCenterChange]);

  return null;
}

function MapZoomReporter({
  onZoomChange,
}: {
  onZoomChange?: (zoom: number) => void;
}) {
  const map = useMap();
  const onZoomChangeRef = useRef(onZoomChange);

  useEffect(() => {
    onZoomChangeRef.current = onZoomChange;
  }, [onZoomChange]);

  useEffect(() => {
    if (!map || !onZoomChange) return;

    const report = () => {
      const zoom = map.getZoom();
      if (zoom == null) return;
      onZoomChangeRef.current?.(zoom);
    };

    report();
    const listener = google.maps.event.addListener(map, "idle", report);

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, onZoomChange]);

  return null;
}

interface ZonaGeoMapProps {
  zonas: ZonaGeografica[];
  selectedZonaId: number | null;
  editableZonaId: number | null;
  drawingMode: boolean;
  draftInfo: DraftInfo | null;
  draftColor: string;
  focusGeojson: PolygonGeoJson | null;
  focusSignal: number;
  onZonaClick: (zona: ZonaGeografica) => void;
  onDrawingComplete: (geojson: PolygonGeoJson) => void;
  onDraftChange: (draft: DraftInfo) => void;
  onEditableGeometryChange: (geojson: PolygonGeoJson) => void;
  onViewportCenterChange?: (center: LatLngLiteral) => void;
  onViewportZoomChange?: (zoom: number) => void;
  onMapReady?: () => void;
  hasActiveDraft?: boolean;
}

export default function ZonaGeoMap({
  zonas,
  selectedZonaId,
  editableZonaId,
  drawingMode,
  draftInfo,
  draftColor,
  focusGeojson,
  focusSignal,
  onZonaClick,
  onDrawingComplete,
  onDraftChange,
  onEditableGeometryChange,
  onViewportCenterChange,
  onViewportZoomChange,
  onMapReady,
  hasActiveDraft,
}: ZonaGeoMapProps) {
  const selectedStroke = themeColor("--color-warning", "#f59e0b");

  return (
    <div className="map-surface h-full w-full overflow-hidden rounded-ds-lg">
      <APIProvider
        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
        libraries={GOOGLE_MAPS_LIBRARIES}
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
          {zonas.filter((z) => z.id !== editableZonaId).map((z) => (
            <Polygon
              key={z.id}
              paths={zonaToPaths(z)}
              strokeColor={z.id === selectedZonaId ? selectedStroke : z.color}
              strokeOpacity={hasActiveDraft ? 0.4 : 0.85}
              strokeWeight={z.id === selectedZonaId ? 3 : hasActiveDraft ? 1.5 : 2}
              fillColor={z.color}
              fillOpacity={hasActiveDraft ? 0.06 : z.id === selectedZonaId ? 0.25 : 0.12}
              editable={z.id === editableZonaId}
              draggable={z.id === editableZonaId}
              clickable={true}
              onClick={() => onZonaClick(z)}
              zIndex={z.id === selectedZonaId ? 10 : 1}
            />
          ))}

          <MapCenterReporter onCenterChange={onViewportCenterChange} />
          <MapZoomReporter onZoomChange={onViewportZoomChange} />
          <DrawingHandler active={drawingMode} onPolygonComplete={onDrawingComplete} />
          <FitBoundsHandler geojson={focusGeojson} signal={focusSignal} />

          {draftInfo?.kind === "polygon" && (
            <EditablePolygonOverlay
              geojson={draftInfo.geojson}
              color={draftColor}
              onChange={(geojson) => onDraftChange({ kind: "polygon", geojson })}
            />
          )}
          {(draftInfo?.kind === "rectangle" || draftInfo?.kind === "square") && (
            <EditableRectangleOverlay
              kind={draftInfo.kind}
              bounds={draftInfo.bounds}
              color={draftColor}
              onChange={(bounds) => onDraftChange({ kind: draftInfo.kind, bounds })}
            />
          )}
          {draftInfo?.kind === "circle" && (
            <EditableCircleOverlay
              center={draftInfo.center}
              radius={draftInfo.radius}
              color={draftColor}
              onChange={(data) => onDraftChange({ kind: "circle", center: data.center, radius: data.radius })}
            />
          )}

          {editableZonaId && (
            (() => {
              const zona = zonas.find((z) => z.id === editableZonaId);
              if (!zona || zona.geojson.type !== "Polygon") return null;
              return (
                <EditablePolygonOverlay
                  geojson={zona.geojson}
                  color={zona.color}
                  onChange={onEditableGeometryChange}
                />
              );
            })()
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
