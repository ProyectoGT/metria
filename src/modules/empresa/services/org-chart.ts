// Tipos y helpers para la página de organigrama de empresa.
// La jerarquía se construye desde supervisor_id en la tabla usuarios.

export type OrgUserEstado = "active" | "invited" | "disabled";

export type OrgUser = {
  id: number;
  nombre: string;
  apellidos: string;
  correo: string;
  rol: string;
  estado: OrgUserEstado;
  supervisorId: number | null;
  equipoId: number | null;
  equipoNombre: string | null;
};

export type OrgNode = OrgUser & {
  agentes: OrgUser[];       // agentes directamente supervisados
};

export type OrgTree = {
  admins: OrgUser[];
  directores: OrgUser[];
  responsables: OrgNode[];
  agentesHuerfanos: OrgUser[]; // agentes sin supervisor asignado
};

// Construye el árbol a partir de la lista plana de usuarios
export function buildOrgTree(users: OrgUser[]): OrgTree {
  const admins: OrgUser[] = [];
  const directores: OrgUser[] = [];
  const responsableMap = new Map<number, OrgNode>();
  const agentesHuerfanos: OrgUser[] = [];

  // Primer paso: clasificar por rol
  for (const u of users) {
    const rol = u.rol?.toLowerCase();
    if (rol === "administrador" || rol === "admin") {
      admins.push(u);
    } else if (rol === "director") {
      directores.push(u);
    } else if (rol === "responsable") {
      responsableMap.set(u.id, { ...u, agentes: [] });
    }
  }

  // Segundo paso: asignar agentes a responsables
  for (const u of users) {
    const rol = u.rol?.toLowerCase();
    if (rol !== "agente") continue;

    if (u.supervisorId && responsableMap.has(u.supervisorId)) {
      responsableMap.get(u.supervisorId)!.agentes.push(u);
    } else {
      agentesHuerfanos.push(u);
    }
  }

  const compareName = (a: OrgUser, b: OrgUser) =>
    `${a.nombre} ${a.apellidos}`.localeCompare(`${b.nombre} ${b.apellidos}`, "es");

  return {
    admins: [...admins].sort(compareName),
    directores: [...directores].sort(compareName),
    responsables: [...responsableMap.values()]
      .sort(compareName)
      .map((r) => ({ ...r, agentes: [...r.agentes].sort(compareName) })),
    agentesHuerfanos: [...agentesHuerfanos].sort(compareName),
  };
}

// Aplica filtros sobre una lista plana de usuarios
export type OrgFilters = {
  search: string;
  rol: string;
  estado: string;
  supervisorId: string; // "" = todos
};

export function applyOrgFilters(users: OrgUser[], filters: OrgFilters): OrgUser[] {
  const q = filters.search.toLowerCase().trim();
  return users.filter((u) => {
    if (q) {
      const fullName = `${u.nombre} ${u.apellidos}`.toLowerCase();
      if (!fullName.includes(q) && !u.correo.toLowerCase().includes(q)) return false;
    }
    if (filters.rol && u.rol?.toLowerCase() !== filters.rol.toLowerCase()) return false;
    if (filters.estado && u.estado !== filters.estado) return false;
    if (filters.supervisorId) {
      if (filters.supervisorId === "none") {
        if (u.supervisorId !== null) return false;
      } else {
        if (String(u.supervisorId) !== filters.supervisorId) return false;
      }
    }
    return true;
  });
}

export const ESTADO_LABEL: Record<OrgUserEstado, string> = {
  active: "Activo",
  invited: "Invitado",
  disabled: "Inactivo",
};

export const ESTADO_STYLE: Record<OrgUserEstado, string> = {
  active: "bg-success/15 text-success",
  invited: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  disabled: "bg-muted text-text-secondary",
};

export const ROL_STYLE: Record<string, string> = {
  Administrador: "bg-danger/10 text-danger",
  Director: "bg-primary/10 text-primary",
  Responsable: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  Agente: "bg-success/10 text-success",
};
