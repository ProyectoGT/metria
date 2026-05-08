"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  Trash2,
  Archive,
  Pencil,
  Save,
  X,
  Clock,
  User,
} from "lucide-react";
import Drawer from "@/components/ui/drawer";
import { DEFAULT_ZONA_COLORS, ZONA_TIPOS } from "@/lib/zonas-geograficas/types";
import type { ZonaGeografica } from "@/lib/zonas-geograficas/types";
import type { ZonaGeoFormData } from "@/lib/zonas-geograficas/types";

interface ZonaGeoDrawerProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "detail" | "edit";
  zona?: ZonaGeografica | null;
  formData: ZonaGeoFormData;
  onFormChange: (data: ZonaGeoFormData) => void;
  onSave: () => void;
  onEditGeometry: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  isSaving: boolean;
  canEdit: boolean;
  canArchive: boolean;
}

export default function ZonaGeoDrawer({
  open,
  onClose,
  mode,
  zona,
  formData,
  onFormChange,
  onSave,
  onEditGeometry,
  onArchive,
  onDelete,
  onStartEdit,
  isSaving,
  canEdit,
  canArchive,
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
            isSaving={isSaving}
            mode={mode}
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
  isSaving,
  mode,
}: {
  formData: ZonaGeoFormData;
  onChange: (d: ZonaGeoFormData) => void;
  onSave: () => void;
  isSaving: boolean;
  mode: "create" | "edit";
}) {
  return (
    <>
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

      <button
        onClick={onSave}
        disabled={isSaving || !formData.nombre.trim()}
        className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        <Save className="h-4 w-4" />
        {isSaving
          ? "Guardando..."
          : mode === "create"
            ? "Guardar zona"
            : "Actualizar zona"}
      </button>
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
