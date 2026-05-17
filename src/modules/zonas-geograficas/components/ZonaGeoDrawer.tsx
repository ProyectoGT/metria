"use client";

import {
  MapPin,
  Trash2,
  Archive,
  Pencil,
  Save,
  Clock,
  User,
  X,
  Crosshair,
} from "lucide-react";
import Drawer from "@/components/ui/drawer";
import { DEFAULT_ZONA_COLORS, ZONA_TIPOS } from "@/modules/zonas-geograficas/services/types";
import type { ZonaGeografica } from "@/modules/zonas-geograficas/services/types";
import type { ZonaGeoFormData } from "@/modules/zonas-geograficas/services/types";

interface ZonaGeoDrawerProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "detail" | "edit";
  zona?: ZonaGeografica | null;
  formData: ZonaGeoFormData;
  onFormChange: (data: ZonaGeoFormData) => void;
  onSave: () => void;
  onCancel?: () => void;
  onEditGeometry: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  isSaving: boolean;
  canEdit: boolean;
  canArchive: boolean;
  hasValidGeometry?: boolean;
}

export default function ZonaGeoDrawer({
  open,
  onClose,
  mode,
  zona,
  formData,
  onFormChange,
  onSave,
  onCancel,
  onEditGeometry,
  onArchive,
  onDelete,
  onStartEdit,
  isSaving,
  canEdit,
  canArchive,
  hasValidGeometry,
}: ZonaGeoDrawerProps) {
  const title =
    mode === "create"
      ? "Nueva zona"
      : mode === "edit"
        ? "Editar zona"
        : zona?.nombre ?? "Zona";

  return (
    <Drawer open={open} onClose={onClose} title={title} width="md">
      <div className="flex flex-col gap-5 p-5">
        {(mode === "create" || mode === "edit") && (
          <CreateEditForm
            formData={formData}
            onChange={onFormChange}
            onSave={onSave}
            onCancel={onCancel}
            isSaving={isSaving}
            mode={mode}
            hasValidGeometry={hasValidGeometry}
          />
        )}

        {mode === "detail" && zona && (
          <DetailView
            zona={zona}
            canEdit={canEdit}
            canArchive={canArchive}
            onEdit={onStartEdit}
            onEditGeometry={onEditGeometry}
            onArchive={onArchive}
            onDelete={onDelete}
          />
        )}
      </div>
    </Drawer>
  );
}

function CreateEditForm({
  formData,
  onChange,
  onSave,
  onCancel,
  isSaving,
  mode,
  hasValidGeometry,
}: {
  formData: ZonaGeoFormData;
  onChange: (d: ZonaGeoFormData) => void;
  onSave: () => void;
  onCancel?: () => void;
  isSaving: boolean;
  mode: "create" | "edit";
  hasValidGeometry?: boolean;
}) {
  const saveDisabled = isSaving || !formData.nombre.trim() || (mode === "create" && !hasValidGeometry);

  return (
    <>
      {mode === "create" && (
        <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success/5 px-3 py-2.5">
          <Crosshair className="h-4 w-4 shrink-0 text-success" />
          <div className="min-w-0 flex-1 text-xs leading-snug text-text-primary">
            <span className="font-medium text-text-primary">Forma lista</span>
            <span className="ml-1.5 text-text-secondary">
              — Arrastra y redimensiona la forma en el mapa
            </span>
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-text-secondary">
          Nombre <span className="text-danger">*</span>
        </label>
        <input
          className="input"
          value={formData.nombre}
          onChange={(e) => onChange({ ...formData, nombre: e.target.value })}
          placeholder="Ej: Zona centro"
          autoFocus
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-text-secondary">
          Descripcion
        </label>
        <textarea
          className="input min-h-[72px]"
          value={formData.descripcion}
          onChange={(e) =>
            onChange({ ...formData, descripcion: e.target.value })
          }
          placeholder="Descripcion opcional de la zona"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-text-secondary">
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_ZONA_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ ...formData, color: c })}
              className={`h-8 w-8 rounded-full border-2 transition-all ${
                formData.color === c
                  ? "scale-110 border-text-primary"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-text-secondary">
          Tipo
        </label>
        <select
          className="input"
          value={formData.tipo}
          onChange={(e) => onChange({ ...formData, tipo: e.target.value })}
        >
          {ZONA_TIPOS.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 pt-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>
        )}
        <button
          onClick={onSave}
          disabled={saveDisabled}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Save className="h-4 w-4" />
          {isSaving
            ? "Guardando..."
            : mode === "create"
              ? "Guardar zona"
              : "Actualizar zona"}
        </button>
      </div>
    </>
  );
}

function DetailView({
  zona,
  canEdit,
  canArchive,
  onEdit,
  onEditGeometry,
  onArchive,
  onDelete,
}: {
  zona: ZonaGeografica;
  canEdit: boolean;
  canArchive: boolean;
  onEdit: () => void;
  onEditGeometry: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const vertexCount =
    zona.geojson.type === "Polygon"
      ? zona.geojson.coordinates[0].length - 1
      : 0;

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
        <span
          className="h-4 w-4 shrink-0 rounded-full"
          style={{ backgroundColor: zona.color }}
        />
        <span className="text-sm font-semibold text-text-primary">
          {zona.nombre}
        </span>
        <span className="ml-auto rounded-md bg-surface px-2 py-0.5 text-[10px] font-medium capitalize text-text-secondary">
          {zona.estado}
        </span>
      </div>

      {zona.descripcion && (
        <p className="text-sm leading-relaxed text-text-secondary">
          {zona.descripcion}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-surface p-4 text-xs">
        <div>
          <span className="text-text-secondary">Tipo</span>
          <p className="mt-0.5 font-medium capitalize text-text-primary">
            {zona.tipo}
          </p>
        </div>
        <div>
          <span className="text-text-secondary">Geometria</span>
          <p className="mt-0.5 font-medium text-text-primary">
            {zona.geojson.type === "Polygon"
              ? `Poligono (${vertexCount} vertices)`
              : "Multi-poligono"}
          </p>
        </div>
        <div>
          <span className="text-text-secondary">Creada</span>
          <p className="mt-0.5 flex items-center gap-1 font-medium text-text-primary">
            <Clock className="h-3 w-3" />
            {new Date(zona.created_at).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <div>
          <span className="text-text-secondary">Modificada</span>
          <p className="mt-0.5 flex items-center gap-1 font-medium text-text-primary">
            <Clock className="h-3 w-3" />
            {new Date(zona.updated_at).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <div>
          <span className="text-text-secondary">Creador</span>
          <p className="mt-0.5 flex items-center gap-1 font-medium text-text-primary">
            <User className="h-3 w-3" />
            #{zona.created_by}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-2">
        {canEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-muted"
          >
            <Pencil className="h-4 w-4" />
            Editar datos
          </button>
        )}
        {canEdit && (
          <button
            onClick={onEditGeometry}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-muted"
          >
            <MapPin className="h-4 w-4" />
            Editar geometria
          </button>
        )}
        {canArchive && (
          <button
            onClick={onArchive}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-warning transition-colors hover:bg-muted"
          >
            <Archive className="h-4 w-4" />
            Archivar zona
          </button>
        )}
        {canArchive && (
          <button
            onClick={onDelete}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-muted"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar zona
          </button>
        )}
      </div>
    </>
  );
}
