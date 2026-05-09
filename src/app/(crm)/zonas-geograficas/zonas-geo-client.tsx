"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Plus, X, AlertTriangle, MapPin } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import { useToast, Toaster } from "@/components/ui/toast";
import { canDrawZones, canEditZoneGeometry, canDeleteZonasGeograficas } from "@/lib/roles";
import {
  createZonaGeografica,
  updateZonaGeografica,
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

interface PendingDraw {
  geojson: { type: "Polygon"; coordinates: number[][][] };
}

export default function ZonasGeoClient({
  initialZonas,
  currentUserId,
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
  const [isSaving, setIsSaving] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const initialLoadDone = useRef(false);

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
      setPageMode("idle");
      setFormData({
        nombre: "",
        descripcion: "",
        color: "#2563eb",
        tipo: "personalizada",
      });
      setDrawerMode("create");
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
    if (!pendingDraw) return;
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
      geojson: pendingDraw.geojson,
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
  }, [pendingDraw, formData, toast, refreshZonas]);

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
    setEditableZonaId(null);
    setPageMode("idle");
    setDrawerMode("detail");
  }, []);

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
  }, []);

  const handleStartDrawing = useCallback(() => {
    setPageMode("drawing");
    setDrawerMode(null);
    setSelectedZonaId(null);
    setEditableZonaId(null);
    setPendingDraw(null);
  }, []);

  const handleCancelDrawing = useCallback(() => {
    setPageMode("idle");
  }, []);

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col gap-4">
      {/* ── Header ──────────────────────────────────────────────── */}
      <PageHeader
        title="Zonas Geograficas"
        description={
          mapReady
            ? `${zonas.length} zona${zonas.length !== 1 ? "s" : ""} en el mapa`
            : "Cargando..."
        }
        actions={
          userCanDraw && pageMode === "idle" ? (
            <button
              onClick={handleStartDrawing}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Dibujar zona
            </button>
          ) : undefined
        }
      />

      {/* ── Status bars ─────────────────────────────────────────── */}
      {pageMode === "drawing" && (
        <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-accent" />
          <span className="flex-1 text-sm text-text-primary">
            Dibuja un poligono en el mapa. Usa los controles de Google Maps
            para deshacer puntos o finalizar el dibujo.
          </span>
          <button
            onClick={handleCancelDrawing}
            className="flex items-center gap-1 rounded-lg bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
            Cancelar
          </button>
        </div>
      )}

      {pageMode === "editing-geometry" && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          <span className="flex-1 text-sm text-text-primary">
            Arrastra los vertices para editar la geometria. Haz clic en
            &quot;Terminar&quot; cuando hayas acabado.
          </span>
          <button
            onClick={handleFinishGeometryEdit}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
          >
            <X className="h-3.5 w-3.5" />
            Terminar
          </button>
        </div>
      )}

      {/* ── Map + Zone list ─────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Map */}
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <ZonaGeoMap
            zonas={zonas}
            selectedZonaId={selectedZonaId}
            editableZonaId={editableZonaId}
            drawingMode={pageMode === "drawing"}
            onZonaClick={handleZonaClick}
            onDrawingComplete={handleDrawingComplete}
            onMapReady={() => setMapReady(true)}
          />
        </div>

        {/* Zone list */}
        <div className="flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-4 py-3">
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
