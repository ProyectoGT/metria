import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { getPeriodRange, mergeRendimientoRows } from "@/lib/desarrollo-metrics";
import PageHeader from "@/components/layout/page-header";
import DesarrolloClient from "./desarrollo-client";

export default async function DesarrolloPage() {
  const supabase = await createClient();
  const anioActual = new Date().getFullYear();
  const periodRange = getPeriodRange(anioActual, 0);

  const [
    yo,
    { data: todosAgentes },
    { data: rendimiento },
    { data: actividad },
    { count: totalNoticias },
  ] = await Promise.all([
    getCurrentUserContext(),
    supabase.from("usuarios").select("id, nombre, apellidos, rol").order("nombre"),
    supabase.from("rendimiento").select("*").eq("anio", anioActual).eq("mes", 0),
    supabase
      .from("actividad_desarrollo")
      .select("agente_id, metric, value")
      .gte("occurred_at", periodRange.from)
      .lt("occurred_at", periodRange.to),
    supabase.from("propiedades").select("*", { count: "exact", head: true }),
  ]);

  // Filtrar agentes según rol — los Administradores no aparecen en desarrollo
  let agentes = (todosAgentes ?? []).filter(
    (a) => a.rol?.toLowerCase() !== "administrador" && a.rol?.toLowerCase() !== "admin",
  );
  if (yo?.role === "Responsable") {
    const allowed = new Set([yo.id, ...yo.supervisedAgentIds]);
    agentes = agentes.filter((a) => allowed.has(a.id));
  } else if (yo?.role === "Agente") {
    agentes = agentes.filter((a) => a.id === yo.id);
  }
  // Admin / Director: sin filtro (excepto admins excluidos arriba)

  const canManageObjectives = yo?.canViewAllAgents ?? false;

  const statsMap = mergeRendimientoRows({
    agentes,
    objetivos: rendimiento ?? [],
    actividades: actividad ?? [],
    anio: anioActual,
    mes: 0,
  });

  const agentesConStats = agentes.map((a) => ({
    ...a,
    rendimiento: statsMap[a.id] ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Desarrollo"
        description="Seguimiento de rendimiento y objetivos del equipo"
      />
      <DesarrolloClient
        agentes={agentesConStats}
        totalNoticias={totalNoticias ?? 0}
        canManageObjectives={canManageObjectives}
        defaultAnio={anioActual}
      />
    </>
  );
}
