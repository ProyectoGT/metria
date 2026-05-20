"use client";

import { Search, X } from "lucide-react";
import type { OrgUser, OrgFilters } from "@/modules/empresa/services/org-chart";

type Props = {
  filters: OrgFilters;
  onChange: (f: OrgFilters) => void;
  supervisores: Pick<OrgUser, "id" | "nombre" | "apellidos">[];
};

const ROLES = ["Administrador", "Director", "Responsable", "Agente"];
const ESTADOS = [
  { value: "active", label: "Activo" },
  { value: "invited", label: "Invitado" },
  { value: "disabled", label: "Inactivo" },
];

export default function OrgFilters({ filters, onChange, supervisores }: Props) {
  const hasFilters =
    filters.search || filters.rol || filters.estado || filters.supervisorId;

  function set(key: keyof OrgFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  function clear() {
    onChange({ search: "", rol: "", estado: "", supervisorId: "" });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Nombre o correo..."
          className="input pl-9 text-sm w-52"
        />
      </div>

      {/* Rol */}
      <select
        value={filters.rol}
        onChange={(e) => set("rol", e.target.value)}
        className="input w-auto text-sm"
      >
        <option value="">Todos los rangos</option>
        {ROLES.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      {/* Estado */}
      <select
        value={filters.estado}
        onChange={(e) => set("estado", e.target.value)}
        className="input w-auto text-sm"
      >
        <option value="">Todos los estados</option>
        {ESTADOS.map((e) => (
          <option key={e.value} value={e.value}>{e.label}</option>
        ))}
      </select>

      {/* Responsable */}
      {supervisores.length > 0 && (
        <select
          value={filters.supervisorId}
          onChange={(e) => set("supervisorId", e.target.value)}
          className="input w-auto text-sm"
        >
          <option value="">Todos los responsables</option>
          <option value="none">Sin responsable</option>
          {supervisores.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {s.nombre} {s.apellidos}
            </option>
          ))}
        </select>
      )}

      {/* Limpiar */}
      {hasFilters && (
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface hover:text-danger"
        >
          <X className="h-4 w-4" />
          Limpiar
        </button>
      )}
    </div>
  );
}
