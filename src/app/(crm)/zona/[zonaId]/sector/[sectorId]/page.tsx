import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import FincasClient from "./fincas-client";
import { notFound } from "next/navigation";

export default async function SectorDetailPage({
  params,
}: {
  params: Promise<{ zonaId: string; sectorId: string }>;
}) {
  const { zonaId, sectorId } = await params;
  const supabase = await createClient();

  const [user, { data: zona }, { data: sector }] = await Promise.all([
    getCurrentUserContext(),
    supabase.from("zona").select("id, nombre").eq("id", Number(zonaId)).single(),
    supabase
      .from("sectores")
      .select("id, numero, fincas(id, numero, posicion, propiedades(id))")
      .eq("id", Number(sectorId))
      .single(),
  ]);

  if (!zona || !sector) notFound();

  const fincas = (sector.fincas ?? []).sort((a, b) => {
    const ap = a.posicion, bp = b.posicion;
    if (ap != null && bp != null) return ap - bp;
    if (ap != null) return -1;
    if (bp != null) return 1;
    // orden natural: numérico primero, luego alfanumérico
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
