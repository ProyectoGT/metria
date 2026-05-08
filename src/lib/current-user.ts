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

export type CurrentUserContext = {
  id: number;
  authId: string | null;
  email: string | null;
  nombre: string;
  apellidos: string;
  role: UserRole;
  avatarUrl: string | null;
  empresaId: number | null;
  equipoId: number | null;
  canDeletePropiedades: boolean;
  canDeleteFincas: boolean;
  canDeleteSectores: boolean;
  canDeleteZonas: boolean;
  canManageConfirmationPassword: boolean;
  canViewAllAgents: boolean;
  supervisedAgentIds: number[];
};

// cache() deduplicates calls within the same render request — no extra DB queries
// when multiple Server Components call getCurrentUserContext() on the same page.
export const getCurrentUserContext = cache(async (): Promise<CurrentUserContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentUser = user;

  // Si getUser falla (transitorio), intentar con getSession (local, sin HTTP)
  if (!currentUser) {
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user ?? null;
  }

  if (!currentUser) return null;

  const profileSelect = "id, nombre, apellidos, rol, correo, auth_id, avatar_url, empresa_id, equipo_id";

  let profile:
    | {
        id: number;
        nombre: string;
        apellidos: string;
        correo: string;
        auth_id: string | null;
        avatar_url: string | null;
        rol?: string | null;
        empresa_id?: number | null;
        equipo_id?: number | null;
      }
    | null
    | undefined = null;

  const { data: byAuthId } = await supabase
    .from("usuarios")
    .select(profileSelect)
    .eq("auth_id", currentUser.id)
    .maybeSingle();

  profile = byAuthId;

  if (!profile && currentUser.email) {
    const { data: byEmail } = await supabase
      .from("usuarios")
      .select(profileSelect)
      .ilike("correo", currentUser.email)
      .maybeSingle();

    profile = byEmail;
  }

  if (!profile) return null;

  const role = normalizeUserRole(profile.rol);

  let supervisedAgentIds: number[] = [];
  if (canViewSupervisedAgents(role)) {
    const { data: supervised } = await supabase
      .from("usuarios")
      .select("id")
      .eq("supervisor_id", profile.id);
    supervisedAgentIds = (supervised ?? []).map((u) => u.id);
  }

  return {
    id: profile.id,
    authId: profile.auth_id,
    email: currentUser.email ?? profile.correo ?? null,
    nombre: profile.nombre,
    apellidos: profile.apellidos,
    role,
    avatarUrl: profile.avatar_url,
    empresaId: profile.empresa_id ?? null,
    equipoId: profile.equipo_id ?? null,
    canDeletePropiedades: canDeletePropiedades(role),
    canDeleteFincas: canDeleteFincas(role),
    canDeleteSectores: canDeleteSectores(role),
    canDeleteZonas: canDeleteZonas(role),
    canManageConfirmationPassword: canManageConfirmationPassword(role),
    canViewAllAgents: canViewAllAgents(role),
    supervisedAgentIds,
  };
});
