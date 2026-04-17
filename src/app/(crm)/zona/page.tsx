import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import ZonasClient from "./zonas-client";

export default async function ZonaPage() {
  const supabase = await createClient();
  const user = await getCurrentUserContext();
  const role = user?.role ?? "Agente";
  const userId = user?.id ?? 0;
  const isManager = role === "Administrador" || role === "Director";

  const [{ data: allZonas }, { data: usuariosData }, { data: accesosData }] = await Promise.all([
    supabase
      .from("zona")
      .select("id, nombre, sectores(id, numero, fincas(id, propiedades(id)))")
      .order("nombre"),
    // Solo admins/directores necesitan la lista de usuarios para gestionar accesos
    isManager
      ? supabase
          .from("usuarios")
          .select("id, nombre, apellidos, rol")
          .in("rol", ["Responsable", "Agente"])
          .eq("estado", "active")
          .order("nombre")
      : Promise.resolve({ data: [] }),
    // Todos necesitan los accesos para filtrar (Responsable/Agente) o gestionar (Admin/Director)
    supabase.from("zona_acceso").select("zona_id, usuario_id"),
  ]);

  // Filtrar zonas según rol
  let zonas = allZonas ?? [];
  if (!isManager) {
    const zonasPermitidas = new Set(
      (accesosData ?? [])
        .filter((a) => a.usuario_id === userId)
        .map((a) => a.zona_id),
    );
    zonas = zonas.filter((z) => zonasPermitidas.has(z.id));
  }

  return (
    <ZonasClient
      initialZonas={(zonas as Parameters<typeof ZonasClient>[0]["initialZonas"]) ?? []}
      canDeleteZonas={user?.canDeleteZonas ?? false}
      canDeleteSectores={user?.canDeleteSectores ?? false}
      canManageAccess={isManager}
      usuarios={(usuariosData ?? []) as { id: number; nombre: string; apellidos: string; rol: string }[]}
      initialAccesos={(accesosData ?? []) as { zona_id: number; usuario_id: number }[]}
    />
  );
}
