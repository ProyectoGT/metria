import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import ZonasClient from "./zonas-client";

export default async function ZonaPage() {
  const supabase = await createClient();
  const [user, { data: zonas }] = await Promise.all([
    getCurrentUserContext(),
    supabase
      .from("zona")
      .select("*, sectores(id, fincas(id, propiedades(id)))")
      .order("nombre"),
  ]);

  return (
    <ZonasClient
      initialZonas={
        (zonas as Parameters<typeof ZonasClient>[0]["initialZonas"]) ?? []
      }
      canDeleteZonas={user?.canDeleteZonas ?? false}
    />
  );
}
