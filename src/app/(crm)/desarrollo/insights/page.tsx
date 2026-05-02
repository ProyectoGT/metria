import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/current-user";
import { fetchInsights } from "@/lib/insights";
import PageHeader from "@/components/layout/page-header";
import InsightsClient from "./insights-client";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; agente?: string; zona?: string }>;
}) {
  const yo = await getCurrentUserContext();

  // Solo responsable/director/admin
  if (!yo || yo.role === "Agente") redirect("/desarrollo");

  const params = await searchParams;
  const anio = params.anio ? Number(params.anio) : new Date().getFullYear();
  const agenteId = params.agente ? Number(params.agente) : null;
  const zonaId = params.zona ? Number(params.zona) : null;

  const data = await fetchInsights(yo, { anio, agenteId, zonaId });

  return (
    <>
      <PageHeader
        title="Business Intelligence"
        description="Insights avanzados para direccion y responsables."
      />
      <InsightsClient
        data={data}
        currentAnio={anio}
        currentAgenteId={agenteId}
        currentZonaId={zonaId}
        role={yo.role}
      />
    </>
  );
}
