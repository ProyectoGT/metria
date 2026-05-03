import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/current-user";
import { fetchInsights } from "@/lib/insights";
import PageHeader from "@/components/layout/page-header";
import InsightsClient from "./insights-client";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{
    anio?: string;
    agente?: string;
    zona?: string;
    desde?: string;
    hasta?: string;
  }>;
}) {
  const yo = await getCurrentUserContext();

  // Guard de rol: solo Responsable, Director y Administrador
  if (!yo) redirect("/login");
  if (yo.role === "Agente") redirect("/desarrollo");

  const params = await searchParams;
  const anio = params.anio ? Number(params.anio) : new Date().getFullYear();
  const agenteId = params.agente ? Number(params.agente) : null;
  const zonaId = params.zona ? Number(params.zona) : null;
  const fechaDesde = params.desde ?? null;
  const fechaHasta = params.hasta ?? null;

  const data = await fetchInsights(yo, {
    anio,
    agenteId,
    zonaId,
    fechaDesde,
    fechaHasta,
  });

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
        currentDesde={fechaDesde}
        currentHasta={fechaHasta}
        role={yo.role}
      />
    </>
  );
}
