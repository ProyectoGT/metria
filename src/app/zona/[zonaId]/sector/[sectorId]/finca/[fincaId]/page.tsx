import { createClient } from "@/lib/supabase";
import Header from "@/components/layout/header";
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

  const [
    { data: zona },
    { data: sector },
    { data: finca },
    { data: propiedades },
    { data: agentes },
  ] = await Promise.all([
    supabase.from("zona").select("id, nombre").eq("id", zonaId).single(),
    supabase
      .from("sectores")
      .select("id, numero")
      .eq("id", sectorId)
      .single(),
    supabase.from("fincas").select("id, numero").eq("id", fincaId).single(),
    supabase
      .from("propiedades")
      .select("*, usuarios(id, nombre, apellidos)")
      .eq("finca_id", fincaId)
      .order("planta")
      .order("puerta"),
    supabase.from("usuarios").select("id, nombre, apellidos").order("nombre"),
  ]);

  if (!zona || !sector || !finca) notFound();

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
      <Header
        title={`Finca ${finca.numero}`}
        description={`${propiedades?.length ?? 0} propiedades registradas`}
      />
      <PropiedadesClient
        fincaId={Number(fincaId)}
        initialPropiedades={propiedades ?? []}
        agentes={agentes ?? []}
      />
    </>
  );
}
