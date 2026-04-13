import { createClient } from "@/lib/supabase";
import FincasClient from "./fincas-client";
import { notFound } from "next/navigation";

export default async function SectorDetailPage({
  params,
}: {
  params: Promise<{ zonaId: string; sectorId: string }>;
}) {
  const { zonaId, sectorId } = await params;
  const supabase = await createClient();

  const [{ data: zona }, { data: sector }] = await Promise.all([
    supabase.from("zona").select("id, nombre").eq("id", zonaId).single(),
    supabase
      .from("sectores")
      .select("id, numero, fincas(id, numero, propiedades(id))")
      .eq("id", sectorId)
      .single(),
  ]);

  if (!zona || !sector) notFound();

  const fincas = (sector.fincas ?? []).sort((a, b) => a.numero - b.numero);

  return (
    <FincasClient
      zonaId={zona.id}
      zonaNombre={zona.nombre}
      sectorId={sector.id}
      sectorNumero={sector.numero}
      initialFincas={fincas as Parameters<typeof FincasClient>[0]["initialFincas"]}
    />
  );
}
