"use client";

import { useMemo, useState, useCallback } from "react";
import { Search, Shield, Filter, Info } from "lucide-react";
import type { AccessResource, ResourceType } from "@/lib/access-control/resources";
import type { UserRole } from "@/lib/roles";
import { useToast, Toaster } from "@/components/ui/toast";
import { toggleAccessRuleAction } from "./actions";

const ALL_ROLES: UserRole[] = ["Administrador", "Director", "Responsable", "Agente"];

const ROLE_LABELS: Record<UserRole, string> = {
  Administrador: "Admin",
  Director: "Director",
  Responsable: "Resp.",
  Agente: "Agente",
};

const TYPE_LABELS: Record<string, string> = {
  page: "Páginas",
  feature: "Funciones",
  action: "Acciones",
};

const TYPE_ORDER: ResourceType[] = ["page", "feature"];

interface Props {
  resources: AccessResource[];
  rulesByRole: Record<UserRole, string[]>;
  currentUserId: number;
}

export function ControlAccesoClient({ resources, rulesByRole }: Props) {
  const { toast, toasts } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ResourceType | "all">("all");
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [localRules, setLocalRules] = useState<Record<UserRole, Set<string>>>(() => {
    const map: Record<string, Set<string>> = {};
    for (const role of ALL_ROLES) {
      map[role] = new Set(rulesByRole[role] ?? []);
    }
    return map as Record<UserRole, Set<string>>;
  });

  const filtered = useMemo(() => {
    return resources
      .filter((r) => TYPE_ORDER.includes(r.type as ResourceType))
      .filter((r) => {
        if (typeFilter !== "all" && r.type !== typeFilter) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          r.label.toLowerCase().includes(q) ||
          r.key.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
        );
      });
  }, [resources, search, typeFilter]);

  const handleToggle = useCallback(
    async (role: UserRole, resource: AccessResource) => {
      const currentlyDenied = localRules[role].has(resource.key);
      const enable = currentlyDenied;

      const key = `${role}-${resource.key}`;
      setSaving((prev) => ({ ...prev, [key]: true }));

      const result = await toggleAccessRuleAction(role, resource.key, resource.type, enable);

      if (result.ok) {
        setLocalRules((prev) => {
          const next = { ...prev };
          const nextSet = new Set(next[role]);
          if (enable) {
            nextSet.delete(resource.key);
          } else {
            nextSet.add(resource.key);
          }
          next[role] = nextSet;
          return next;
        });
        toast(enable ? "Permiso restablecido" : "Acceso restringido");
      } else {
        toast(result.error ?? "Error al guardar", "error");
      }

      setSaving((prev) => ({ ...prev, [key]: false }));
    },
    [localRules, toast]
  );

  const countDenied = useMemo(() => {
    const counts: Record<UserRole, number> = { Administrador: 0, Director: 0, Responsable: 0, Agente: 0 };
    for (const role of ALL_ROLES) {
      counts[role] = localRules[role].size;
    }
    return counts;
  }, [localRules]);

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Control de Acceso</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Configura qué páginas y funciones puede ver o usar cada rol
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ALL_ROLES.map((role) => (
            <span
              key={role}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{
                backgroundColor: "var(--color-surface)",
                color: "var(--color-text-secondary)",
              }}
            >
              {ROLE_LABELS[role]}
              {countDenied[role] > 0 && (
                <span className="text-danger">{countDenied[role]}</span>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div className="text-sm text-text-secondary">
          <strong className="text-text-primary">Importante:</strong> Esta configuración es una capa adicional de
          restricción. No sustituye los permisos de seguridad del sistema ni las políticas RLS de la base de datos.
          Solo puede <strong>restringir</strong> el acceso, nunca conceder permisos que el sistema actual no permita.
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/60" />
          <input
            type="text"
            placeholder="Buscar páginas o funciones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input h-10 pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {[
            { value: "all", label: "Todo" },
            { value: "page", label: "Páginas" },
            { value: "feature", label: "Funciones" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value as ResourceType | "all")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                typeFilter === f.value
                  ? "bg-surface text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Filter className="mr-1.5 inline-block h-3.5 w-3.5" />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="min-w-[200px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Recurso
              </th>
              {ALL_ROLES.map((role) => (
                <th
                  key={role}
                  className="w-[90px] px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-secondary"
                >
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-text-secondary">
                  {search
                    ? "No se encontraron recursos con ese filtro"
                    : "No hay recursos disponibles"}
                </td>
              </tr>
            )}

            {filtered.map((resource) => {
              const isDisabledForAdmin =
                resource.key === "configuracion" ||
                (resource.critical && resource.defaultRoles.length === 1 && resource.defaultRoles[0] === "Administrador");

              return (
                <tr key={resource.key} className="transition-colors hover:bg-background/50">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary">
                            {resource.label}
                          </span>
                          {resource.critical && (
                            <Shield className="h-3.5 w-3.5 shrink-0 text-accent" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-text-secondary">{resource.description}</p>
                        <span
                          className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            resource.type === "page"
                              ? "bg-primary/10 text-primary"
                              : "bg-accent/10 text-accent"
                          }`}
                        >
                          {TYPE_LABELS[resource.type] ?? resource.type}
                        </span>
                      </div>
                    </div>
                  </td>

                  {ALL_ROLES.map((role) => {
                    const denied = localRules[role].has(resource.key);
                    const baseDenied = !resource.defaultRoles.includes(role);
                    const isSaving = saving[`${role}-${resource.key}`] ?? false;

                    const canToggle =
                      role !== "Administrador" || !isDisabledForAdmin;

                    return (
                      <td key={role} className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {baseDenied && (
                            <span
                              className="rounded px-1 py-0.5 text-[9px] font-semibold uppercase leading-none text-danger/70"
                            >
                              base
                            </span>
                          )}

                          <button
                            onClick={() => canToggle && handleToggle(role, resource)}
                            disabled={!canToggle || isSaving}
                            className={`relative h-6 w-10 rounded-full transition-all duration-200 ${
                              isSaving
                                ? "cursor-wait opacity-50"
                                : !canToggle
                                ? "cursor-not-allowed opacity-30"
                                : ""
                            } ${
                              baseDenied
                                ? "bg-muted"
                                : denied
                                ? "bg-danger/40"
                                : "bg-primary/30"
                            }`}
                          >
                            <span
                              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                denied ? "translate-x-4" : "translate-x-0"
                              } ${!canToggle || baseDenied ? "opacity-60" : ""}`}
                            />
                          </button>

                          <span
                            className={`text-[10px] font-medium leading-none ${
                              baseDenied
                                ? "text-danger/50"
                                : denied
                                ? "text-danger"
                                : "text-success"
                            }`}
                          >
                            {baseDenied ? "N/A" : denied ? "No" : "Sí"}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-text-secondary">
        <Shield className="h-4 w-4 shrink-0 text-accent" />
        Los iconos de escudo indican funciones críticas. El indicador &ldquo;base&rdquo; significa
        que el sistema actual ya deniega ese permiso para ese rol, independientemente de esta
        configuración.
      </div>

      <Toaster toasts={toasts} />
    </>
  );
}
