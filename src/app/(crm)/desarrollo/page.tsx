import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { getPeriodRange, mergeRendimientoRowsAnual } from "@/lib/desarrollo-metrics";
import PageHeader from "@/components/layout/page-header";
import DesarrolloClient from "./desarrollo-client";

export default async function DesarrolloPage() {
  const supabase = await createClient();
  const anioActual = new Date().getFullYear();
  const periodRange = getPeriodRange(anioActual, 0);

  const yo = await getCurrentUserContext();
  const role = yo?.role ?? "Agente";
  const userId = yo?.id ?? 0;
  const isManager = role === "Administrador" || role === "Director";

  // Resolver fincas accesibles para filtrar noticias por zona (igual que dashboard)
  let fincaIdFilter: number[] | null = null;
  if (!isManager) {
    const { data: accesos } = await supabase
      .from("zona_acceso")
      .select("zona_id")
      .eq("usuario_id", userId);
    const zonaIds = (accesos ?? []).map((a) => a.zona_id);
    if (zonaIds.length > 0) {
      const { data: sectoresData } = await supabase
        .from("sectores")
        .select("fincas(id)")
        .in("zona_id", zonaIds);
      type SW = { fincas: { id: number }[] | null };
      fincaIdFilter = ((sectoresData ?? []) as unknown as SW[]).flatMap(
        (s) => (Array.isArray(s.fincas) ? s.fincas.map((f) => f.id) : [])
      );
    } else {
      fincaIdFilter = [];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyPropFilters(query: any): any {
    if (fincaIdFilter === null) return query;
    if (fincaIdFilter.length === 0) return query.eq("id", -1);
    return query.in("finca_id", fincaIdFilter);
  }

  const [
    { data: todosAgentes },
    { data: rendimiento },
    { data: actividad },
    { count: totalNoticias },
  ] = await Promise.all([
    supabase.from("usuarios").select("id, nombre, apellidos, rol").order("nombre"),
    // Cargar todos los meses del año para calcular objetivos anuales correctamente
    supabase.from("rendimiento").select("*").eq("anio", anioActual).gte("mes", 1).lte("mes", 12),
    supabase
      .from("actividad_desarrollo")
      .select("agente_id, metric, value")
      .gte("occurred_at", periodRange.from)
      .lt("occurred_at", periodRange.to),
    (() => {
      let q = applyPropFilters(
        supabase
          .from("propiedades")
          .select("*", { count: "exact", head: true })
          .ilike("estado", "noticia"),
      );
      if (role === "Agente") q = q.eq("agente_asignado", userId);
      return q;
    })(),
  ]);

  // Filtrar agentes según rol — los Administradores no aparecen en desarrollo
  let agentes = (todosAgentes ?? []).filter(
    (a) => a.rol?.toLowerCase() !== "administrador" && a.rol?.toLowerCase() !== "admin",
  );
  if (role === "Responsable") {
    const allowed = new Set([userId, ...(yo?.supervisedAgentIds ?? [])]);
    agentes = agentes.filter((a) => allowed.has(a.id));
  } else if (role === "Agente") {
    agentes = agentes.filter((a) => a.id === userId);
  }
  // Admin / Director: sin filtro (excepto admins excluidos arriba)

  const canManageObjectives = (yo?.canViewAllAgents ?? false) && isManager;

  const statsMap = mergeRendimientoRowsAnual({
    agentes,
    objetivos: rendimiento ?? [],
    actividades: actividad ?? [],
    anio: anioActual,
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
        role={role}
      />
    </>
  );
}
