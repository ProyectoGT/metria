export const ACCESS_SCOPES = ["private", "company", "team", "agents", "responsable"] as const;

export type AccessScope = (typeof ACCESS_SCOPES)[number];

export const ACCESS_SCOPE_LABELS: Record<AccessScope, string> = {
  private: "Privado",
  company: "Empresa",
  team: "Equipo",
  agents: "Agente",
  responsable: "Responsable",
};

export const ACCESS_SCOPE_BADGES: Record<AccessScope, string> = {
  private: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  company: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  team: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  agents: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
  responsable: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
};

export function normalizeAccessScope(value: string | null | undefined): AccessScope {
  if (value === "company" || value === "team" || value === "agents" || value === "responsable") {
    return value;
  }
  return "private";
}
