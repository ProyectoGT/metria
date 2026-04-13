import { createClient } from "@/lib/supabase";
import SectoresClient from "./sectores-client";
import { notFound } from "next/navigation";

export default async function ZonaDetailPage({
  params,
}: {
  params: Promise<{ zonaId: string }>;
}) {
  const { zonaId } = await params;
  const supabase = await createClient();

  const { data: zona } = await supabase
    .from("zona")
    .select("id, nombre, sectores(id, numero, fincas(id, propiedades(id)))")
    .eq("id", zonaId)
    .single();

  if (!zona) notFound();

  const sectores = (zona.sectores ?? []).sort((a, b) => a.numero - b.numero);

  return (
    <SectoresClient
      zonaId={zona.id}
      zonaNombre={zona.nombre}
      initialSectores={sectores as Parameters<typeof SectoresClient>[0]["initialSectores"]}
    />
  );
}
