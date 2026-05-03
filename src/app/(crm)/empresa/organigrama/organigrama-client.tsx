"use client";

import { useMemo, useState } from "react";
import { Network, Table2 } from "lucide-react";
import OrgFilters from "@/components/organigrama/OrgFilters";
import OrgChart from "@/components/organigrama/OrgChart";
import OrgTable from "@/components/organigrama/OrgTable";
import {
  buildOrgTree,
  applyOrgFilters,
  type OrgUser,
  type OrgFilters as Filters,
} from "@/lib/org-chart";

type Props = {
  users: OrgUser[];
};

type View = "organigrama" | "tabla";

const EMPTY_FILTERS: Filters = {
  search: "",
  rol: "",
  estado: "",
  supervisorId: "",
};

export default function OrganigramaClient({ users }: Props) {
  const [view, setView] = useState<View>("organigrama");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const supervisores = useMemo(
    () =>
      users
        .filter((u) => u.rol === "Responsable" || u.rol === "Director")
        .sort((a, b) =>
          `${a.nombre} ${a.apellidos}`.localeCompare(`${b.nombre} ${b.apellidos}`, "es")
        ),
    [users]
  );

  const filtered = useMemo(
    () => applyOrgFilters(users, filters),
    [users, filters]
  );

  const tree = useMemo(() => buildOrgTree(filtered), [filtered]);

  const totalActivos = users.filter((u) => u.estado === "active").length;
  const totalInactivos = users.filter((u) => u.estado === "disabled").length;

  return (
    <div className="space-y-6">

      {/* ── Resumen rápido ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Total", value: users.length, color: "bg-primary/10 text-primary" },
          { label: "Activos", value: totalActivos, color: "bg-success/10 text-success" },
          { label: "Inactivos", value: totalInactivos, color: "bg-muted text-text-secondary" },
          { label: "Responsables", value: users.filter((u) => u.rol === "Responsable").length, color: "bg-purple-500/10 text-purple-700 dark:text-purple-300" },
          { label: "Agentes", value: users.filter((u) => u.rol === "Agente").length, color: "bg-success/10 text-success" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${color}`}
          >
            <span className="font-bold text-lg leading-none">{value}</span>
            <span className="opacity-80">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Controles: filtros + toggle de vista ──────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <OrgFilters
          filters={filters}
          onChange={setFilters}
          supervisores={supervisores}
        />

        <div className="flex rounded-xl border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setView("organigrama")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "organigrama"
                ? "bg-primary text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Network className="h-4 w-4" />
            Organigrama
          </button>
          <button
            type="button"
            onClick={() => setView("tabla")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "tabla"
                ? "bg-primary text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Table2 className="h-4 w-4" />
            Tabla
          </button>
        </div>
      </div>

      {/* ── Contador de resultados ────────────────────────────────────── */}
      {filtered.length !== users.length && (
        <p className="text-sm text-text-secondary">
          Mostrando {filtered.length} de {users.length} usuarios
        </p>
      )}

      {/* ── Vista ──────────────────────────────────────────────────────── */}
      {view === "organigrama" ? (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <OrgChart tree={tree} />
        </div>
      ) : (
        <OrgTable users={filtered} allUsers={users} />
      )}
    </div>
  );
}
