import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { getUserOrdenAction } from "@/app/(crm)/zona/actions";
import FincasClient from "./fincas-client";
import { notFound } from "next/navigation";

export default async function SectorDetailPage({
  params,
}: {
  params: Promise<{ zonaId: string; sectorId: string }>;
}) {
  const { zonaId, sectorId } = await params;
  const supabase = await createClient();

  const [user, { data: zona }, { data: sector }, ordenFincas] = await Promise.all([
    getCurrentUserContext(),
    supabase.from("zona").select("id, nombre").eq("id", Number(zonaId)).single(),
    supabase
      .from("sectores")
      .select("id, numero, fincas(id, numero)")
      .eq("id", Number(sectorId))
      .single(),
    getUserOrdenAction("fincas"),
  ]);

  if (!zona || !sector) notFound();

  const fincaIds = (sector.fincas ?? []).map((f) => f.id);

  // Cuenta propiedades visibles por finca con el mismo alcance que el listado interior,
  // de modo que el contador de la tarjeta coincide con lo que vera el usuario al entrar.
  const propiedadesPerFinca: Record<number, number> = {};

  if (fincaIds.length > 0) {
    const conteoQuery = supabase
      .from("propiedades")
      .select("id, finca_id")
      .in("finca_id", fincaIds);

    const { data: propiedadesConteo } = await conteoQuery;
    for (const p of propiedadesConteo ?? []) {
      if (p.finca_id != null) {
        propiedadesPerFinca[p.finca_id] = (propiedadesPerFinca[p.finca_id] ?? 0) + 1;
      }
    }
  }

  const fincas = (sector.fincas ?? [])
    .map((f) => ({
      ...f,
      propiedades: Array.from({ length: propiedadesPerFinca[f.id] ?? 0 }, (_, i) => ({ id: i })),
      posicion: ordenFincas[f.id] ?? null,
    }))
    .sort((a, b) => {
      const ap = a.posicion, bp = b.posicion;
      if (ap != null && bp != null) return ap - bp;
      if (ap != null) return -1;
      if (bp != null) return 1;
      const na = parseFloat(String(a.numero)), nb = parseFloat(String(b.numero));
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return String(a.numero).localeCompare(String(b.numero), "es", { numeric: true });
    });

  return (
    <FincasClient
      zonaId={zona.id}
      zonaNombre={zona.nombre}
      sectorId={sector.id}
      sectorNumero={sector.numero}
      initialFincas={fincas as Parameters<typeof FincasClient>[0]["initialFincas"]}
      canDeleteFincas={user?.canDeleteFincas ?? false}
    />
  );
}
