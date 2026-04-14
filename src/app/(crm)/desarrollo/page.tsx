import { createClient } from "@/lib/supabase";
import PageHeader from "@/components/layout/page-header";
import DesarrolloClient from "./desarrollo-client";

export default async function DesarrolloPage() {
  const supabase = await createClient();
  const anioActual = new Date().getFullYear();

  // Rol del usuario actual
  const { data: { user } } = await supabase.auth.getUser();
  const { data: yo } = await supabase
    .from("usuarios")
    .select("puesto")
    .eq("auth_id", user?.id ?? "")
    .single();

  const canEdit = ["Admin", "Director", "Responsable"].includes(yo?.puesto ?? "");

  // Todos los agentes
  const { data: agentes } = await supabase
    .from("usuarios")
    .select("id, nombre, apellidos, puesto")
    .order("nombre");

  // Rendimiento anual del año actual (mes = 0)
  const { data: rendimiento } = await supabase
    .from("rendimiento")
    .select("*")
    .eq("anio", anioActual)
    .eq("mes", 0);

  // Total propiedades = Noticias
  const { count: totalNoticias } = await supabase
    .from("propiedades")
    .select("*", { count: "exact", head: true });

  const agentesConStats = (agentes ?? []).map((a) => ({
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
