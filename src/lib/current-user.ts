import { cache } from "react";
import { createClient } from "@/lib/supabase";
import {
  canDeleteFincas,
  canDeletePropiedades,
  canDeleteSectores,
  canDeleteZonas,
  canManageConfirmationPassword,
  canViewAllAgents,
  canViewSupervisedAgents,
  normalizeUserRole,
  type UserRole,
} from "@/lib/roles";
import {
  mapDbRoleToCanonical,
  can,
  type Role as CanonicalRole,
  type Action,
  type Module,
} from "@/lib/access-control";

export type CurrentUserContext = {
  id: number;
  authId: string | null;
  email: string | null;
  nombre: string;
  apellidos: string;
  role: UserRole;
  canonicalRole: CanonicalRole;
  empresaId: number | null;
  equipoId: number | null;
  canDeletePropiedades: boolean;
  canDeleteFincas: boolean;
  canDeleteSectores: boolean;
  canDeleteZonas: boolean;
  canManageConfirmationPassword: boolean;
  canViewAllAgents: boolean;
  supervisedAgentIds: number[];
  can: (action: Action, module: Module) => boolean;
};

// cache() deduplicates calls within the same render request — no extra DB queries
// when multiple Server Components call getCurrentUserContext() on the same page.
export const getCurrentUserContext = cache(async (): Promise<CurrentUserContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profileSelect = "id, nombre, apellidos, rol, correo, auth_id, empresa_id, equipo_id";

  let profile:
    | {
        id: number;
        nombre: string;
        apellidos: string;
        correo: string;
        auth_id: string | null;
        rol?: string | null;
        empresa_id?: number | null;
        equipo_id?: number | null;
      }
    | null
    | undefined = null;

  const { data: byAuthId } = await supabase
    .from("usuarios")
    .select(profileSelect)
    .eq("auth_id", user.id)
    .maybeSingle();

  profile = byAuthId;

  if (!profile && user.email) {
    const { data: byEmail } = await supabase
      .from("usuarios")
      .select(profileSelect)
      .eq("correo", user.email)
      .maybeSingle();

    profile = byEmail;
  }

  if (!profile) return null;

  const role = normalizeUserRole(profile.rol);
  const canonicalRole = mapDbRoleToCanonical(profile.rol);

  let supervisedAgentIds: number[] = [];
  if (canViewSupervisedAgents(role)) {
    const { data: supervised } = await supabase
      .from("usuarios")
      .select("id")
      .eq("supervisor_id", profile.id);
    supervisedAgentIds = (supervised ?? []).map((u) => u.id);
  }

  const ctx = {
    id: profile.id,
    authId: profile.auth_id,
    email: user.email ?? profile.correo ?? null,
    nombre: profile.nombre,
    apellidos: profile.apellidos,
    role,
    canonicalRole,
    empresaId: profile.empresa_id ?? null,
    equipoId: profile.equipo_id ?? null,
    canDeletePropiedades: canDeletePropiedades(role),
    canDeleteFincas: canDeleteFincas(role),
    canDeleteSectores: canDeleteSectores(role),
    canDeleteZonas: canDeleteZonas(role),
    canManageConfirmationPassword: canManageConfirmationPassword(role),
    canViewAllAgents: canViewAllAgents(role),
    supervisedAgentIds,
    can: (action: Action, module: Module) => can(ctx, action, module),
  };

  return ctx;
});
