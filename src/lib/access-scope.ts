export const ACCESS_SCOPES = ["private", "team", "company"] as const;

export type AccessScope = (typeof ACCESS_SCOPES)[number];

export const ACCESS_SCOPE_LABELS: Record<AccessScope, string> = {
  private: "Privado",
  team: "Equipo",
  company: "Empresa",
};

export const ACCESS_SCOPE_BADGES: Record<AccessScope, string> = {
  private: "bg-slate-100 text-slate-700",
  team: "bg-blue-100 text-blue-700",
  company: "bg-emerald-100 text-emerald-700",
};

export function normalizeAccessScope(value: string | null | undefined): AccessScope {
  if (value === "team" || value === "company") {
    return value;
  }

  return "private";
}
