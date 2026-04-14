import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import PageHeader from "@/components/layout/page-header";
import DesarrolloClient from "./desarrollo-client";

export default async function DesarrolloPage() {
  const supabase = await createClient();
  const anioActual = new Date().getFullYear();

  const [yo, { data: todosAgentes }, { data: rendimiento }, { count: totalNoticias }] =
    await Promise.all([
      getCurrentUserContext(),
      supabase.from("usuarios").select("id, nombre, apellidos, rol").order("nombre"),
      supabase.from("rendimiento").select("*").eq("anio", anioActual).eq("mes", 0),
      supabase.from("propiedades").select("*", { count: "exact", head: true }),
    ]);

  // Filtrar agentes según rol
  let agentes = todosAgentes ?? [];
  if (yo?.role === "Responsable") {
    const allowed = new Set([yo.id, ...yo.supervisedAgentIds]);
    agentes = agentes.filter((a) => allowed.has(a.id));
  } else if (yo?.role === "Agente") {
    agentes = agentes.filter((a) => a.id === yo.id);
  }
  // Admin / Director: sin filtro

  const canEdit = yo
    ? yo.role === "Administrador" || yo.role === "Director" || yo.role === "Responsable"
    : false;

  const agentesConStats = agentes.map((a) => ({
    ...a,
    rendimiento: rendimiento?.find((r) => r.agente_id === a.id) ?? null,
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
        canEdit={canEdit}
        defaultAnio={anioActual}
      />
    </>
  );
}
