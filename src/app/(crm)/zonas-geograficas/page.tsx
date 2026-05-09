import { getCurrentUserContext } from "@/lib/current-user";
import { listZonasGeograficas } from "@/modules/zonas-geograficas/services/actions";
import ZonasGeoClient from "./zonas-geo-client";

export default async function ZonasGeograficasPage() {
  const yo = await getCurrentUserContext();
  const zonas = await listZonasGeograficas();

  return (
    <ZonasGeoClient
      initialZonas={zonas}
      currentUserId={yo?.id ?? 0}
      currentUserRole={yo?.role ?? "Agente"}
    />
  );
}
