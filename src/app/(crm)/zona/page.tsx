import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { getUserOrdenAction } from "@/app/(crm)/zona/actions";
import ZonasClient from "./zonas-client";

export default async function ZonaPage() {
  const supabase = await createClient();
  const user = await getCurrentUserContext();
  const role = user?.role ?? "Agente";
  const userId = user?.id ?? 0;
  const isManager = role === "Administrador" || role === "Director";

  const [{ data: allZonas }, { data: usuariosData }, { data: accesosData }, ordenZonas, ordenSectores] = await Promise.all([
    supabase
      .from("zona")
      .select("id, nombre, sectores(id, numero, fincas(id, propiedades(id, contactado)))")
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
    getUserOrdenAction("zona"),
    getUserOrdenAction("sectores"),
  ]);

  // Filtrar zonas según rol y aplicar orden personal
  let zonas = (allZonas ?? []).map((z) => ({
    ...z,
    posicion: ordenZonas[z.id] ?? null,
    sectores: (z.sectores ?? []).map((s) => ({ ...s, posicion: ordenSectores[s.id] ?? null })),
  }));
  zonas.sort((a, b) => {
    if (a.posicion != null && b.posicion != null) return a.posicion - b.posicion;
    if (a.posicion != null) return -1;
    if (b.posicion != null) return 1;
    return a.nombre.localeCompare(b.nombre);
  });
  zonas = zonas.map((z) => ({
    ...z,
    sectores: [...z.sectores].sort((a, b) => {
      if (a.posicion != null && b.posicion != null) return a.posicion - b.posicion;
      if (a.posicion != null) return -1;
      if (b.posicion != null) return 1;
      return a.numero - b.numero;
    }),
  }));
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
