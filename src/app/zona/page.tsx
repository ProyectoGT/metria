import { createClient } from "@/lib/supabase";
import ZonasClient from "./zonas-client";

export default async function ZonaPage() {
  const supabase = await createClient();
  const { data: zonas } = await supabase
    .from("zona")
    .select("*, sectores(id, fincas(id, propiedades(id)))")
    .order("nombre");

  return <ZonasClient initialZonas={(zonas as Parameters<typeof ZonasClient>[0]["initialZonas"]) ?? []} />;
}
