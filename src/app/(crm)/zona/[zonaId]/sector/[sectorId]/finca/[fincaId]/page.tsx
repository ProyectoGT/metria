import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { getUserOrdenAction } from "@/app/(crm)/zona/actions";
import PageHeader from "@/components/layout/page-header";
import Breadcrumb from "@/components/ui/breadcrumb";
import { notFound } from "next/navigation";
import PropiedadesClient from "./propiedades-client";
import { getZonaPermissionLevel, hasZonaPermission, roleHasGlobalPropertyDelete, roleHasGlobalPropertyWrite } from "@/lib/zona-access";

export default async function FincaDetailPage({
  params,
}: {
  params: Promise<{ zonaId: string; sectorId: string; fincaId: string }>;
}) {
  const { zonaId, sectorId, fincaId } = await params;
  const supabase = await createClient();
  const user = await getCurrentUserContext();

  const propQuery = supabase
    .from("propiedades")
    .select("*, usuarios:usuarios!propiedades_agente_asignado_fkey(id, nombre, apellidos, rol)")
    .eq("finca_id", Number(fincaId))
    .order("planta")
    .order("puerta");

  const [
    { data: zona },
    { data: sector },
    { data: finca },
    { data: propiedadesRaw, error: propError },
    { data: agentes },
    ordenPropiedades,
  ] = await Promise.all([
    supabase.from("zona").select("id, nombre").eq("id", Number(zonaId)).single(),
    supabase.from("sectores").select("id, numero").eq("id", Number(sectorId)).single(),
    supabase.from("fincas").select("id, numero").eq("id", Number(fincaId)).single(),
    propQuery,
    supabase.from("usuarios").select("id, nombre, apellidos, rol").order("nombre"),
    getUserOrdenAction("propiedades"),
  ]);

  if (propError) {
    console.error("[FincaDetailPage] Error cargando propiedades:", propError.message, { fincaId });
  }

  if (!zona || !sector || !finca) notFound();

  const zonaPermission = user
    ? await getZonaPermissionLevel(supabase, Number(zonaId), user.id)
    : null;
  const canWriteByZone = hasZonaPermission(zonaPermission, "write");
  const canDeleteByZone = hasZonaPermission(zonaPermission, "admin");

  const propiedadIds = (propiedadesRaw ?? []).map((p) => p.id);
  const encargoDataPropiedadIds = new Set<number>();

  type UsuarioBasico = { id: number; nombre: string; apellidos: string; rol: string | null };
  const creadoresMap: Record<number, UsuarioBasico> = {};

  if (propiedadIds.length > 0) {
    const [{ data: archivos }, { data: visitas }, { data: notas }] = await Promise.all([
      supabase.from("archivos").select("propiedad_id").in("propiedad_id", propiedadIds),
      supabase.from("encargo_visitas").select("propiedad_id").in("propiedad_id", propiedadIds),
      supabase.from("encargo_notas").select("propiedad_id").in("propiedad_id", propiedadIds),
    ]);

    for (const row of [...(archivos ?? []), ...(visitas ?? []), ...(notas ?? [])]) {
      if (row.propiedad_id != null) encargoDataPropiedadIds.add(row.propiedad_id);
    }

    // Lookup de creadores usando created_by_user_id.
    // El campo existe tras la migración 20260514000004; si aún no se aplicó,
    // el valor es undefined y el array queda vacío sin errores.
    const creadorIds = [
      ...new Set(
        (propiedadesRaw ?? [])
          .map((p) => (p as typeof p & { created_by_user_id?: number | null }).created_by_user_id)
          .filter((id): id is number => typeof id === "number")
      ),
    ];

    if (creadorIds.length > 0) {
      const { data: creadores } = await supabase
        .from("usuarios")
        .select("id, nombre, apellidos, rol")
        .in("id", creadorIds);
      for (const u of creadores ?? []) creadoresMap[u.id] = u;
    }
  }

  // Convierte el valor de planta en un número de orden semántico para edificios:
  // sótano < bajo < entresuelo < 1 < 2 ... < ático
  function plantaRank(planta: string | null): number {
    const s = (planta ?? "").trim().toLowerCase();
    if (!s) return 500;
    if (/^s[oó]t/.test(s) || s === "ss" || s === "sb" || s === "s") return -200;
    if (/^(b[aá]j|baj[ao]|b\.?j\.?$|bj$|b$|bajo$|bajos$|baixo$)/.test(s)) return -100;
    if (/^(e\.?n\.?$|en$|entre|entres)/.test(s)) return 0;
    if (/^(at[ií]|[áa]t\.?$|[áa]tico|penthouse|ph$)/.test(s)) return 9000;
    const num = parseFloat(s);
    if (!isNaN(num)) return num * 100;
    const match = s.match(/^(\d+)/);
    if (match) return parseFloat(match[1]) * 100;
    return 5000 + s.charCodeAt(0);
  }

  const propiedades = (propiedadesRaw ?? [])
    .map((p) => {
      const raw = p as typeof p & { created_by_user_id?: number | null };
      const creadorId = raw.created_by_user_id;
      return {
        ...p,
        creador: creadorId != null ? (creadoresMap[creadorId] ?? null) : null,
        has_encargo_data: encargoDataPropiedadIds.has(p.id),
        posicion: ordenPropiedades[p.id] ?? null,
      };
    })
    .sort((a, b) => {
      const ap = a.posicion, bp = b.posicion;
      if (ap != null && bp != null) return ap - bp;
      if (ap != null) return -1;
      if (bp != null) return 1;
      const ra = plantaRank(a.planta), rb = plantaRank(b.planta);
      if (ra !== rb) return ra - rb;
      return String(a.puerta ?? "").localeCompare(String(b.puerta ?? ""), "es", { numeric: true });
    });

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Zonas", href: "/zona" },
          { label: zona.nombre, href: `/zona/${zonaId}` },
          {
            label: `Sector ${sector.numero}`,
            href: `/zona/${zonaId}/sector/${sectorId}`,
          },
          { label: `Finca ${finca.numero}` },
        ]}
      />
      <PageHeader
        title={`Finca ${finca.numero}`}
        description={`${propiedades.length} propiedades registradas`}
      />
      <PropiedadesClient
        fincaId={Number(fincaId)}
        initialPropiedades={propiedades}
        agentes={agentes ?? []}
        canDeletePropiedades={user?.canDeletePropiedades ?? false}
        canCreatePropiedades={Boolean(user && (roleHasGlobalPropertyWrite(user.role) || canWriteByZone))}
        canEditZonaPropiedades={Boolean(user && (roleHasGlobalPropertyWrite(user.role) || canWriteByZone))}
        canDeleteZonaPropiedades={Boolean(user && (roleHasGlobalPropertyDelete(user.role) || canDeleteByZone))}
        currentUserRole={user?.role ?? "Agente"}
        currentUserId={user?.id ?? 0}
        supervisedAgentIds={user?.supervisedAgentIds ?? []}
      />
    </>
  );
}
