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

export async function getCurrentUserContext(): Promise<CurrentUserContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

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

  const profileSelect =
    "id, nombre, apellidos, rol, correo, auth_id, empresa_id, equipo_id";
  const fallbackSelect = "id, nombre, apellidos, correo, auth_id";

  const byAuthId = await supabase
    .from("usuarios")
    .select(profileSelect)
    .eq("auth_id", user.id)
    .maybeSingle();

  if (byAuthId.error && byAuthId.error.message.includes("column")) {
    const fallbackByAuthId = await supabase
      .from("usuarios")
      .select(fallbackSelect)
      .eq("auth_id", user.id)
      .maybeSingle();

    profile = fallbackByAuthId.data as typeof profile;
  } else {
    profile = byAuthId.data;
  }

  if (!profile && user.email) {
    const byEmail = await supabase
      .from("usuarios")
      .select(profileSelect)
      .eq("correo", user.email)
      .maybeSingle();

    if (byEmail.error && byEmail.error.message.includes("column")) {
      const fallbackByEmail = await supabase
        .from("usuarios")
        .select(fallbackSelect)
        .eq("correo", user.email)
        .maybeSingle();

      profile = fallbackByEmail.data as typeof profile;
    } else {
      profile = byEmail.data;
    }
  }

  if (!profile) {
    return null;
  }

  const role = normalizeUserRole(profile.rol);

  // Para Responsable: obtener IDs de los agentes que supervisa
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
    email: user.email ?? profile.correo ?? null,
    nombre: profile.nombre,
    apellidos: profile.apellidos,
    role,
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
}
