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
    if (a.posicion != null && b.posicion != null) return a.posicion - b.posicion;
    if (a.posicion != null) return -1;
    if (b.posicion != null) return 1;
    const na = parseFloat(String(a.numero));
    const nb = parseFloat(String(b.numero));
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
