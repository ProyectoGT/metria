# Plan: Formas nativas en Zonas Geográficas (Rectangle, Circle, Polygon)

**Objetivo:** Reemplazar edición por vértices en rectángulo, cuadrado y círculo por controles nativos de Google Maps (`google.maps.Rectangle`, `google.maps.Circle`). Solo polígono/manual conserva edición por vértices.

---

## Archivos a modificar

### 1. `src/modules/zonas-geograficas/components/ZonaGeoMap.tsx`

**Nuevos tipos exportados:**
```typescript
export type PolygonGeoJson = { type: "Polygon"; coordinates: number[][][] };
export type LatLngBoundsLiteral = { north: number; south: number; east: number; west: number };
export type LatLngLiteral = { lat: number; lng: number };

export type DraftInfo =
  | { kind: "polygon"; geojson: PolygonGeoJson }
  | { kind: "rectangle"; bounds: LatLngBoundsLiteral }
  | { kind: "square"; bounds: LatLngBoundsLiteral }
  | { kind: "circle"; center: LatLngLiteral; radius: number };
```

**Nuevo componente `EditableRectangleOverlay`:**
- Usa `google.maps.Rectangle` con `draggable: true, editable: true`
- Escucha `bounds_changed`
- Si `kind === "square"`: fuerza 1:1 con flag `isRestoringRef` para evitar re-entrada
- Actualiza color vía `setOptions` en efecto separado
- Dependencia `[map]` en efecto principal (no se recrea con cada cambio de bounds)

```tsx
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
  }, [map]);

  useEffect(() => {
    if (rectRef.current) rectRef.current.setOptions({ fillColor: color, strokeColor: color });
  }, [color]);

  return null;
}
```

**Nuevo componente `EditableCircleOverlay`:**
- Usa `google.maps.Circle` con `draggable: true, editable: true`
- Escucha `center_changed` + `radius_changed`
- El handle de radio es el único control visible (no hay puntos de polígono)

```tsx
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
  }, [map]);

  useEffect(() => {
    if (circleRef.current) circleRef.current.setOptions({ fillColor: color, strokeColor: color });
  }, [color]);

  return null;
}
```

**Actualizar `ZonaGeoMapProps`:**
```typescript
interface ZonaGeoMapProps {
  zonas: ZonaGeografica[];
  selectedZonaId: number | null;
  editableZonaId: number | null;
  drawingMode: boolean;
  draftInfo: DraftInfo | null;                              // reemplaza draftGeojson
  draftColor: string;
  focusGeojson: PolygonGeoJson | null;
  focusSignal: number;
  onZonaClick: (zona: ZonaGeografica) => void;
  onDrawingComplete: (geojson: PolygonGeoJson) => void;
  onDraftChange: (draft: DraftInfo) => void;                // reemplaza onDraftGeometryChange
  onEditableGeometryChange: (geojson: PolygonGeoJson) => void;
  onViewportCenterChange?: (center: LatLngLiteral) => void;
  onViewportZoomChange?: (zoom: number) => void;
  onMapReady?: () => void;
  hasActiveDraft?: boolean;
}
```

**Actualizar render condicional de draft (dentro del `<Map>`):**
```tsx
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
    onChange={(bounds) => onDraftChange({ kind: draftInfo!.kind, bounds })}
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
```

Mantener `EditablePolygonOverlay` para el caso `editableZonaId` (editar geometría de zonas existentes).

---

### 2. `src/app/(crm)/zonas-geograficas/zonas-geo-client.tsx`

**Eliminar:**
- `interface PendingDraw`
- `pendingDraw` state
- `geometryDraft` state (solo para creación; conservar para edición-geometría)

**Añadir:**
```typescript
import type { DraftInfo, PolygonGeoJson, LatLngBoundsLiteral, LatLngLiteral } from "@/modules/zonas-geograficas/components/ZonaGeoMap";
import { useMemo } from "react";  // añadir al import existente
```

```typescript
const [draftGeometry, setDraftGeometry] = useState<DraftInfo | null>(null);
```

**Funciones de conversión (al inicio del componente o fuera de él):**
```typescript
function boundsToGeoJson(bounds: LatLngBoundsLiteral): PolygonGeoJson {
  return {
    type: "Polygon",
    coordinates: [[
      [bounds.west, bounds.south],
      [bounds.east, bounds.south],
      [bounds.east, bounds.north],
      [bounds.west, bounds.north],
      [bounds.west, bounds.south],
    ]],
  };
}

function circleToGeoJson(center: LatLngLiteral, radius: number): PolygonGeoJson {
  const sides = 32;
  const points: number[][] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    const lat = center.lat + (Math.sin(angle) * radius) / 111320;
    const lng = center.lng + (Math.cos(angle) * radius) / (111320 * Math.cos(center.lat * Math.PI / 180));
    points.push([lng, lat]);
  }
  points.push(points[0]);
  return { type: "Polygon", coordinates: [points] };
}
```

**Actualizar calculados:**
```typescript
const hasValidGeometry = !!draftGeometry || (pageMode === "editing-geometry" && !!geometryDraft);

const focusGeojson = useMemo(() => {
  if (draftGeometry) {
    if (draftGeometry.kind === "polygon") return draftGeometry.geojson;
    if (draftGeometry.kind === "rectangle" || draftGeometry.kind === "square") return boundsToGeoJson(draftGeometry.bounds);
    if (draftGeometry.kind === "circle") return circleToGeoJson(draftGeometry.center, draftGeometry.radius);
  }
  if (selectedZona?.geojson.type === "Polygon") return selectedZona.geojson;
  return null;
}, [draftGeometry, selectedZona]);
```

**Actualizar `handleDrawingComplete`:**
```typescript
const handleDrawingComplete = useCallback(
  (geojson: PolygonGeoJson) => {
    setSelectedShape("manual");
    setDraftGeometry({ kind: "polygon", geojson });
    setPageMode("idle");
    setFormData({ nombre: "", descripcion: "", color: "#2563eb", tipo: "personalizada" });
    setDrawerMode("create");
    setFocusSignal((v) => v + 1);
  },
  [],
);
```

**Actualizar `handleSaveNew`:**
```typescript
const handleSaveNew = useCallback(async () => {
  if (!draftGeometry) return;
  if (!formData.nombre.trim()) {
    toast("El nombre es obligatorio.", "error");
    return;
  }

  let geojson: PolygonGeoJson;
  if (draftGeometry.kind === "polygon") {
    geojson = draftGeometry.geojson;
  } else if (draftGeometry.kind === "rectangle" || draftGeometry.kind === "square") {
    geojson = boundsToGeoJson(draftGeometry.bounds);
  } else {
    geojson = circleToGeoJson(draftGeometry.center, draftGeometry.radius);
  }

  setIsSaving(true);
  const result = await createZonaGeografica({
    nombre: formData.nombre.trim(),
    descripcion: formData.descripcion.trim() || undefined,
    color: formData.color,
    tipo: formData.tipo,
    geojson,
  });
  if (!result.ok) {
    toast(result.error ?? "Error al crear zona.", "error");
    setIsSaving(false);
    return;
  }
  toast("Zona creada correctamente.");
  setDrawerMode(null);
  setDraftGeometry(null);
  setIsSaving(false);
  await refreshZonas();
}, [draftGeometry, formData, toast, refreshZonas]);
```

**Actualizar `handleCreatePresetShape`:**
```typescript
const handleCreatePresetShape = useCallback((shape: Exclude<ZoneShapeType, "manual">) => {
  const scale = getZoomScale(viewportZoom);

  let draft: DraftInfo;

  if (shape === "rectangle" || shape === "square") {
    const halfW = (shape === "square" ? 240 : 360) * scale;
    const halfH = (shape === "square" ? 240 : 220) * scale;
    const dLat = metersToLat(halfH);
    const dLng = metersToLng(halfW, mapCenter.lat);
    draft = {
      kind: shape === "square" ? "square" : "rectangle",
      bounds: {
        north: mapCenter.lat + dLat, south: mapCenter.lat - dLat,
        east: mapCenter.lng + dLng, west: mapCenter.lng - dLng,
      },
    };
  } else if (shape === "circle") {
    draft = { kind: "circle", center: mapCenter, radius: 320 * scale };
  } else {
    const geojson = buildPresetShapeGeojson(shape, mapCenter, viewportZoom);
    draft = { kind: "polygon", geojson };
  }

  setSelectedShape(shape);
  setDraftGeometry(draft);
  setPageMode("idle");
  setDrawerMode("create");
  setSelectedZonaId(null);
  setEditableZonaId(null);
  setFormData({ nombre: "", descripcion: "", color: "#2563eb", tipo: "personalizada" });
  setFocusSignal((v) => v + 1);
}, [mapCenter, viewportZoom]);
```

**Actualizar handlers de cancelación/limpieza:**
```typescript
const handleCloseDrawer = useCallback(() => {
  setDrawerMode(null);
  setDraftGeometry(null);
}, []);

const handleStartDrawing = useCallback(() => {
  setPageMode("drawing");
  setSelectedShape("manual");
  setDrawerMode(null);
  setSelectedZonaId(null);
  setEditableZonaId(null);
  setDraftGeometry(null);
}, []);

const handleCancelDrawing = useCallback(() => {
  setPageMode("idle");
  setDraftGeometry(null);
}, []);

const handleRemoveDraft = useCallback(() => {
  setDraftGeometry(null);
  setDrawerMode(null);
  setPageMode("idle");
}, []);
```

**Actualizar JSX — referencias a `pendingDraw`:**
| Antes | Después |
|-------|---------|
| `!pendingDraw` | `!draftGeometry` |
| `pageMode === "drawing" \|\| pendingDraw` | `pageMode === "drawing" \|\| !!draftGeometry` |
| `pendingDraw &&` | `draftGeometry &&` |
| `hasActiveDraft={!!pendingDraw \|\| ...}` | `hasActiveDraft={!!draftGeometry \|\| ...}` |
| `draftGeojson={pendingDraw ? geometryDraft : null}` | `draftInfo={draftGeometry}` |
| `onDraftGeometryChange={setGeometryDraft}` | `onDraftChange={(d) => setDraftGeometry(d)}` |

**Actualizar status bar (línea 501-516):**
```tsx
{draftGeometry && drawerMode === "create" && (
  <div className="mt-3 flex items-center gap-3 rounded-xl border border-success/20 bg-success/5 px-4 py-2.5">
    <Crosshair className="h-4 w-4 shrink-0 text-success" />
    <span className="flex-1 text-sm leading-snug text-text-primary">
      <span className="font-medium capitalize">{selectedShape}</span> lista.
      Arrastra y redimensiona la forma en el mapa para ajustarla, luego completa los datos en el panel lateral.
    </span>
    <button
      onClick={handleRemoveDraft}
      className="inline-flex items-center gap-1 rounded-lg bg-surface px-3 py-1.5 text-xs font-medium text-danger shadow-sm transition-colors hover:bg-danger/10"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Descartar
    </button>
  </div>
)}
```

---

### 3. `src/modules/zonas-geograficas/components/ZonaGeoDrawer.tsx`

**Actualizar texto del banner de estado** (línea 121):
```tsx
<span className="ml-1.5 text-text-secondary">
  — Arrastra y redimensiona la forma en el mapa
</span>
```

(El banner solo se muestra en modo create, el texto ya no debe mencionar "vértices" para formas simples)

---

## Resumen de nueva UX por tipo de forma

| Forma | Representación en edición | Controles | ¿Vértices visibles? |
|-------|--------------------------|-----------|-------------------|
| Rectángulo | `google.maps.Rectangle` | Arrastrar entero + resize corners | No |
| Cuadrado | `google.maps.Rectangle` (forzado 1:1) | Arrastrar entero + resize manteniendo proporción | No |
| Círculo | `google.maps.Circle` | Arrastrar entero + handle de radio | No |
| Polígono (preset) | `google.maps.Polygon` | Arrastrar + editar vértices | Sí |
| Manual | `google.maps.Polygon` (DrawingManager) | Dibujar + editar vértices | Sí |

## Flujo de guardado

```
[Usuario crea forma] → DraftGeometry (tipo nativo)
[Usuario ajusta en mapa] → overlay nativo notifica cambios → estado actualizado
[Usuario hace clic en Guardar] → conversión a PolygonGeoJson → createZonaGeografica()
[BD guarda como GeoJSON Polygon] → renderizado futuro como Polygon existente
```
