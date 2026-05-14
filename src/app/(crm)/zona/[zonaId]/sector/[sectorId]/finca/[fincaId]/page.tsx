import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { getUserOrdenAction } from "@/app/(crm)/zona/actions";
import PageHeader from "@/components/layout/page-header";
import Breadcrumb from "@/components/ui/breadcrumb";
import { notFound } from "next/navigation";
import PropiedadesClient from "./propiedades-client";

export default async function FincaDetailPage({
  params,
}: {
  params: Promise<{ zonaId: string; sectorId: string; fincaId: string }>;
}) {
  const { zonaId, sectorId, fincaId } = await params;
  const supabase = await createClient();
  const user = await getCurrentUserContext();
  const isAgente = user?.role === "Agente";

  const propQuery = supabase
    .from("propiedades")
    .select("*, usuarios:usuarios!propiedades_agente_asignado_fkey(id, nombre, apellidos, rol), creador:usuarios!propiedades_created_by_user_id_fkey(id, nombre, apellidos, rol)")
    .eq("finca_id", Number(fincaId))
    .order("planta")
    .order("puerta");

  const [
    { data: zona },
    { data: sector },
    { data: finca },
    { data: propiedadesRaw },
    { data: agentes },
    ordenPropiedades,
  ] = await Promise.all([
    supabase.from("zona").select("id, nombre").eq("id", Number(zonaId)).single(),
    supabase.from("sectores").select("id, numero").eq("id", Number(sectorId)).single(),
    supabase.from("fincas").select("id, numero").eq("id", Number(fincaId)).single(),
    isAgente
      ? propQuery.or(`agente_asignado.eq.${user.id},owner_user_id.eq.${user.id}`)
      : propQuery,
    supabase.from("usuarios").select("id, nombre, apellidos, rol").order("nombre"),
    getUserOrdenAction("propiedades"),
  ]);

  if (!zona || !sector || !finca) notFound();

  // Convierte el valor de planta en un número de orden semántico para edificios:
  // sótano < bajo < entresuelo < 1 < 2 ... < ático
  function plantaRank(planta: string | null): number {
    const s = (planta ?? "").trim().toLowerCase();
    if (!s) return 500;
    if (/^s[oó]t/.test(s) || s === "ss" || s === "sb" || s === "s") return -200;
    if (/^(b[aá]j|baj[ao]|b\.?j\.?$|bj$|b$|bajo$|bajos$|baixo$)/.test(s)) return -100;
    if (/^(e\.?n\.?$|en$|entre|entres)/.test(s)) return 0;
    if (/^(at[ií]|[áa]t\.?$|[áa]tico|penthouse|ph$)/.test(s)) return 9000;
    // número puro o con sufijo (1, 2, 3A, 10...)
    const num = parseFloat(s);
    if (!isNaN(num)) return num * 100;
    // intenta extraer primer número del string (ej. "3B" → 300)
    const match = s.match(/^(\d+)/);
    if (match) return parseFloat(match[1]) * 100;
    // fallback alfabético desplazado al final
    return 5000 + s.charCodeAt(0);
  }

  const propiedades = (propiedadesRaw ?? [])
    .map((p) => ({ ...p, posicion: ordenPropiedades[p.id] ?? null }))
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
        currentUserRole={user?.role ?? "Agente"}
        currentUserId={user?.id ?? 0}
        supervisedAgentIds={user?.supervisedAgentIds ?? []}
      />
    </>
  );
}
