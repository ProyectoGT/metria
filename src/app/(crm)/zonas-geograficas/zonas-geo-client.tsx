"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Plus, X, AlertTriangle, MapPin, Circle, Pentagon, Square, RectangleHorizontal, MousePointer2, Save, Trash2, Crosshair, Layers } from "lucide-react";
import { useToast, Toaster } from "@/components/ui/toast";
import { canDrawZones, canEditZoneGeometry, canDeleteZonasGeograficas } from "@/lib/roles";
import {
  createZonaGeografica,
  updateZonaGeografica,
  updateZonaGeometria,
  archiveZonaGeografica,
  deleteZonaGeografica,
  listZonasGeograficas,
} from "@/modules/zonas-geograficas/services/actions";
import ZonaGeoDrawer from "@/modules/zonas-geograficas/components/ZonaGeoDrawer";
import ZonaGeoListPanel from "@/modules/zonas-geograficas/components/ZonaGeoListPanel";
import type { ZonaGeografica } from "@/modules/zonas-geograficas/services/types";
import type { ZonaGeoFormData } from "@/modules/zonas-geograficas/services/types";
import type { UserRole } from "@/lib/roles";

const ZonaGeoMap = dynamic(
  () => import("@/modules/zonas-geograficas/components/ZonaGeoMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-2xl border border-border bg-surface">
        <div className="flex flex-col items-center gap-2 text-sm text-text-secondary">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          Cargando mapa...
        </div>
      </div>
    ),
  },
);

type PageMode = "idle" | "drawing" | "editing-geometry";
type ZoneShapeType = "manual" | "rectangle" | "circle" | "square" | "polygon";

interface PendingDraw {
  geojson: { type: "Polygon"; coordinates: number[][][] };
}

const SHAPE_OPTIONS: Array<{ value: ZoneShapeType; label: string; icon: React.ElementType }> = [
  { value: "manual", label: "Manual", icon: MousePointer2 },
  { value: "rectangle", label: "Rectangulo", icon: RectangleHorizontal },
  { value: "circle", label: "Circulo", icon: Circle },
  { value: "square", label: "Cuadrado", icon: Square },
  { value: "polygon", label: "Poligono", icon: Pentagon },
];

const DEFAULT_SHAPE_CENTER = { lat: 41.365795, lng: 2.053508 };

function metersToLat(meters: number) {
  return meters / 111_320;
}

function metersToLng(meters: number, lat: number) {
  return meters / (111_320 * Math.cos((lat * Math.PI) / 180));
}

function polygonGeojson(points: Array<{ lat: number; lng: number }>) {
  const coords = points.map((p) => [p.lng, p.lat]);
  coords.push(coords[0]);
  return { type: "Polygon" as const, coordinates: [coords] };
}

function buildPresetShapeGeojson(shape: Exclude<ZoneShapeType, "manual">, center = DEFAULT_SHAPE_CENTER) {
  if (shape === "rectangle" || shape === "square") {
    const halfWidth = shape === "square" ? 240 : 360;
    const halfHeight = shape === "square" ? 240 : 220;
    const dLat = metersToLat(halfHeight);
    const dLng = metersToLng(halfWidth, center.lat);
    return polygonGeojson([
      { lat: center.lat - dLat, lng: center.lng - dLng },
      { lat: center.lat - dLat, lng: center.lng + dLng },
      { lat: center.lat + dLat, lng: center.lng + dLng },
      { lat: center.lat + dLat, lng: center.lng - dLng },
    ]);
  }

  const sides = shape === "circle" ? 48 : 6;
  const radius = shape === "circle" ? 320 : 300;
  const points = Array.from({ length: sides }, (_, index) => {
    const angle = (Math.PI * 2 * index) / sides - Math.PI / 2;
    return {
      lat: center.lat + metersToLat(Math.sin(angle) * radius),
      lng: center.lng + metersToLng(Math.cos(angle) * radius, center.lat),
    };
  });
  return polygonGeojson(points);
}

export default function ZonasGeoClient({
  initialZonas,
  currentUserRole,
}: {
  initialZonas: ZonaGeografica[];
  currentUserId: number;
  currentUserRole: UserRole;
}) {
  const { toasts, toast } = useToast();
  const [zonas, setZonas] = useState<ZonaGeografica[]>(initialZonas);
  const [loading, setLoading] = useState(false);
  const [pageMode, setPageMode] = useState<PageMode>("idle");
  const [selectedZonaId, setSelectedZonaId] = useState<number | null>(null);
  const [editableZonaId, setEditableZonaId] = useState<number | null>(null);
  const [drawerMode, setDrawerMode] = useState<"create" | "detail" | "edit" | null>(null);
  const [pendingDraw, setPendingDraw] = useState<PendingDraw | null>(null);
  const [geometryDraft, setGeometryDraft] = useState<PendingDraw["geojson"] | null>(null);
  const [selectedShape, setSelectedShape] = useState<ZoneShapeType>("manual");
  const [focusSignal, setFocusSignal] = useState(0);
  const [mapCenter, setMapCenter] = useState(DEFAULT_SHAPE_CENTER);
  const [isSaving, setIsSaving] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const [formData, setFormData] = useState<ZonaGeoFormData>({
    nombre: "",
    descripcion: "",
    color: "#2563eb",
    tipo: "personalizada",
  });

  const userCanDraw = canDrawZones(currentUserRole);
  const userCanEdit = canEditZoneGeometry(currentUserRole);
  const userCanArchive = canDeleteZonasGeograficas(currentUserRole);

  const selectedZona = zonas.find((z) => z.id === selectedZonaId) ?? null;
  const focusGeojson =
    pendingDraw
      ? geometryDraft
      : selectedZona?.geojson.type === "Polygon"
        ? selectedZona.geojson
        : null;

  const refreshZonas = useCallback(async () => {
    setLoading(true);
    try {
      const updated = await listZonasGeograficas();
      setZonas(updated);
    } catch {
      toast("Error al cargar zonas.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleDrawingComplete = useCallback(
    (geojson: { type: "Polygon"; coordinates: number[][][] }) => {
      setPendingDraw({ geojson });
      setGeometryDraft(geojson);
      setPageMode("idle");
      setFormData({
        nombre: "",
        descripcion: "",
        color: "#2563eb",
        tipo: "personalizada",
      });
      setDrawerMode("create");
      setFocusSignal((value) => value + 1);
    },
    [],
  );

  const handleZonaClick = useCallback(
    (zona: ZonaGeografica) => {
      setSelectedZonaId(zona.id);
      setDrawerMode("detail");
      setEditableZonaId(null);
      setPageMode("idle");
    },
    [],
  );

  const handleSelectFromList = useCallback(
    (zona: ZonaGeografica) => {
      setSelectedZonaId(zona.id);
      setDrawerMode("detail");
      setEditableZonaId(null);
      setPageMode("idle");
    },
    [],
  );

  const handleSaveNew = useCallback(async () => {
    const draft = geometryDraft ?? pendingDraw?.geojson;
    if (!draft) return;
    if (!formData.nombre.trim()) {
      toast("El nombre es obligatorio.", "error");
      return;
    }
    setIsSaving(true);
    const result = await createZonaGeografica({
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim() || undefined,
      color: formData.color,
      tipo: formData.tipo,
      geojson: draft,
    });
    if (!result.ok) {
      toast(result.error ?? "Error al crear zona.", "error");
      setIsSaving(false);
      return;
    }
    toast("Zona creada correctamente.");
    setDrawerMode(null);
    setPendingDraw(null);
    setIsSaving(false);
    await refreshZonas();
  }, [pendingDraw, geometryDraft, formData, toast, refreshZonas]);

  const handleSaveEdit = useCallback(async () => {
    if (!selectedZona) return;
    if (!formData.nombre.trim()) {
      toast("El nombre es obligatorio.", "error");
      return;
    }
    setIsSaving(true);
    const result = await updateZonaGeografica(selectedZona.id, {
      nombre: formData.nombre.trim() || undefined,
      descripcion: formData.descripcion.trim() || undefined,
      color: formData.color,
      tipo: formData.tipo,
    });
    if (!result.ok) {
      toast(result.error ?? "Error al actualizar.", "error");
      setIsSaving(false);
      return;
    }
    toast("Zona actualizada.");
    setDrawerMode("detail");
    setIsSaving(false);
    await refreshZonas();
  }, [selectedZona, formData, toast, refreshZonas]);

  const handleStartEdit = useCallback(() => {
    if (!selectedZona) return;
    setFormData({
      nombre: selectedZona.nombre,
      descripcion: selectedZona.descripcion ?? "",
      color: selectedZona.color,
      tipo: selectedZona.tipo,
    });
    setDrawerMode("edit");
  }, [selectedZona]);

  const handleEditGeometry = useCallback(() => {
    setDrawerMode(null);
    setTimeout(() => {
      if (selectedZonaId) {
        setEditableZonaId(selectedZonaId);
        setPageMode("editing-geometry");
      }
    }, 200);
  }, [selectedZonaId]);

  const handleFinishGeometryEdit = useCallback(async () => {
    if (selectedZona && geometryDraft) {
      setIsSaving(true);
      const result = await updateZonaGeometria(selectedZona.id, geometryDraft);
      setIsSaving(false);
      if (!result.ok) {
        toast(result.error ?? "Error al guardar geometria.", "error");
        return;
      }
      toast("Geometria actualizada.");
      await refreshZonas();
    }
    setGeometryDraft(null);
    setEditableZonaId(null);
    setPageMode("idle");
    setDrawerMode("detail");
  }, [selectedZona, geometryDraft, toast, refreshZonas]);

  const handleArchive = useCallback(async () => {
    if (!selectedZona) return;
    const confirmed = window.confirm(
      "Archivar esta zona? Se ocultara del mapa pero los datos se conservan.",
    );
    if (!confirmed) return;
    const result = await archiveZonaGeografica(selectedZona.id);
    if (!result.ok) {
      toast(result.error ?? "Error al archivar.", "error");
      return;
    }
    toast("Zona archivada.");
    setDrawerMode(null);
    setSelectedZonaId(null);
    await refreshZonas();
  }, [selectedZona, toast, refreshZonas]);

  const handleDelete = useCallback(async () => {
    if (!selectedZona) return;
    const confirmed = window.confirm(
      "Eliminar esta zona permanentemente? Esta accion no se puede deshacer.",
    );
    if (!confirmed) return;
    const result = await deleteZonaGeografica(selectedZona.id);
    if (!result.ok) {
      toast(result.error ?? "Error al eliminar.", "error");
      return;
    }
    toast("Zona eliminada.");
    setDrawerMode(null);
    setSelectedZonaId(null);
    await refreshZonas();
  }, [selectedZona, toast, refreshZonas]);

  const handleCloseDrawer = useCallback(() => {
    setDrawerMode(null);
    setPendingDraw(null);
    setGeometryDraft(null);
  }, []);

  const handleStartDrawing = useCallback(() => {
    setPageMode("drawing");
    setSelectedShape("manual");
    setDrawerMode(null);
    setSelectedZonaId(null);
    setEditableZonaId(null);
    setPendingDraw(null);
    setGeometryDraft(null);
  }, []);

  const handleCreatePresetShape = useCallback((shape: Exclude<ZoneShapeType, "manual">) => {
    const geojson = buildPresetShapeGeojson(shape, mapCenter);
    setSelectedShape(shape);
    setPendingDraw({ geojson });
    setGeometryDraft(geojson);
    setPageMode("idle");
    setDrawerMode("create");
    setSelectedZonaId(null);
    setEditableZonaId(null);
    setFormData({
      nombre: "",
      descripcion: "",
      color: "#2563eb",
      tipo: "personalizada",
    });
    toast("Forma insertada. Arrastra vertices o mueve la figura para ajustarla.");
    setFocusSignal((value) => value + 1);
  }, [mapCenter, toast]);

  const handleCancelDrawing = useCallback(() => {
    setPageMode("idle");
    setPendingDraw(null);
    setGeometryDraft(null);
  }, []);

  const handleRemoveDraft = useCallback(() => {
    setPendingDraw(null);
    setGeometryDraft(null);
    setDrawerMode(null);
    setPageMode("idle");
  }, []);

  const handleCenterCurrentZone = useCallback(() => {
    if (!focusGeojson) return;
    setFocusSignal((value) => value + 1);
  }, [focusGeojson]);

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col">
      {/* ── Premium glassmorphism toolbar ──────────────────────── */}
      <div className="shrink-0 border-b border-border/50 bg-background/70 px-4 py-3 backdrop-blur-xl md:px-6 md:py-4">
        {/* Row 1: Title + counter + primary action */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-text-primary md:text-xl">
                Zonas geográficas
              </h1>
              <p className="mt-0.5 text-sm leading-snug text-text-secondary/70">
                Gestiona áreas comerciales y zonas personalizadas del mapa
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {mapReady && (
              <span className="hidden text-xs tabular-nums text-text-secondary/50 sm:block">
                {zonas.length} zona{zonas.length !== 1 ? "s" : ""}
              </span>
            )}
            {userCanDraw && pageMode === "idle" && !pendingDraw && (
              <button
                onClick={handleStartDrawing}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:brightness-110 active:scale-[0.97]"
              >
                <Plus className="h-4 w-4" />
                Dibujar zona
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Segmented control — shape type selector */}
        {userCanDraw && pageMode !== "editing-geometry" && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-0.5 rounded-xl bg-muted p-0.5">
              {SHAPE_OPTIONS.map(({ value, label, icon: Icon }) => {
                const isActive = selectedShape === value && (pageMode === "drawing" || pendingDraw);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => value === "manual" ? handleStartDrawing() : handleCreatePresetShape(value)}
                    className={[
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                      isActive
                        ? "bg-surface text-text-primary shadow-sm"
                        : "text-text-secondary/60 hover:text-text-primary",
                    ].join(" ")}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="ml-auto flex items-center gap-1">
              {focusGeojson && (
                <button
                  onClick={handleCenterCurrentZone}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-secondary/60 transition-colors hover:bg-muted hover:text-text-primary"
                >
                  <Crosshair className="h-3.5 w-3.5" />
                  Centrar
                </button>
              )}
              {pendingDraw && (
                <button
                  onClick={handleRemoveDraft}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-danger/70 transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </button>
              )}
            </div>
          </div>
        )}

        {/* Row 3: Contextual status bars */}
        {pageMode === "drawing" && (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/5 px-4 py-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-accent" />
            <span className="flex-1 text-sm leading-snug text-text-primary">
              Dibuja un polígono en el mapa. Haz doble clic para finalizar el trazo.
            </span>
            <button
              onClick={handleCancelDrawing}
              className="inline-flex items-center gap-1 rounded-lg bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary shadow-sm transition-colors hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
              Cancelar
            </button>
          </div>
        )}

        {pageMode === "editing-geometry" && (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
            <Layers className="h-4 w-4 shrink-0 text-primary" />
            <span className="flex-1 text-sm leading-snug text-text-primary">
              Arrastra los vértices para ajustar la forma. Guarda los cambios cuando termines.
            </span>
            <button
              onClick={() => {
                setGeometryDraft(null);
                setEditableZonaId(null);
                setPageMode("idle");
                setDrawerMode("detail");
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary shadow-sm transition-colors hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
              Cancelar
            </button>
            <button
              onClick={handleFinishGeometryEdit}
              disabled={isSaving}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        )}

        {pendingDraw && drawerMode === "create" && (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-success/20 bg-success/5 px-4 py-2.5">
            <Crosshair className="h-4 w-4 shrink-0 text-success" />
            <span className="flex-1 text-sm leading-snug text-text-primary">
              Forma lista. Puedes ajustar los vértices en el mapa y guardar la zona desde el panel lateral.
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
      </div>

      {/* ── Map + Zone list ─────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 gap-4 p-4 md:p-6">
        {/* Map */}
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <ZonaGeoMap
            zonas={zonas}
            selectedZonaId={selectedZonaId}
            editableZonaId={editableZonaId}
            drawingMode={pageMode === "drawing"}
            draftGeojson={pendingDraw ? geometryDraft : null}
            draftColor={formData.color}
            focusGeojson={focusGeojson}
            focusSignal={focusSignal}
            onZonaClick={handleZonaClick}
            onDrawingComplete={handleDrawingComplete}
            onDraftGeometryChange={setGeometryDraft}
            onEditableGeometryChange={setGeometryDraft}
            onViewportCenterChange={setMapCenter}
            onMapReady={() => setMapReady(true)}
          />
        </div>

        {/* Zone list */}
        <div className="hidden w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm lg:flex">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Layers className="h-3.5 w-3.5 text-text-secondary/60" />
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">
              Zonas
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ZonaGeoListPanel
              zonas={zonas}
              selectedZonaId={selectedZonaId}
              onSelectZona={handleSelectFromList}
              loading={loading && zonas.length === 0}
            />
          </div>
        </div>
      </div>

      <Toaster toasts={toasts} />

      {/* ── Drawer ──────────────────────────────────────────────── */}
      <ZonaGeoDrawer
        open={drawerMode !== null}
        onClose={handleCloseDrawer}
        mode={
          drawerMode === "create"
            ? "create"
            : drawerMode === "edit"
              ? "edit"
              : "detail"
        }
        zona={selectedZona}
        formData={formData}
        onFormChange={setFormData}
        onSave={drawerMode === "create" ? handleSaveNew : handleSaveEdit}
        onEditGeometry={handleEditGeometry}
        onArchive={handleArchive}
        onDelete={handleDelete}
        onStartEdit={handleStartEdit}
        isSaving={isSaving}
        canEdit={userCanEdit}
        canArchive={userCanArchive}
      />
    </div>
  );
}
