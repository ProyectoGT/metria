import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { redirect } from "next/navigation";
import PageHeader from "@/components/layout/page-header";
import ComunicacionesClient from "./comunicaciones-client";
import { getComunicacionesMetricsAction } from "@/app/(crm)/whatsapp/actions";
import { isApiEnabled } from "@/lib/whatsapp-api";

export default async function ComunicacionesPage() {
  const yo = await getCurrentUserContext();
  if (!yo) redirect("/login");

  const supabase = await createClient();

  // Cargar agentes para el filtro (director/admin ven todos)
  let agentes: Array<{ id: number; nombre: string; apellidos: string }> = [];
  if (yo.role === "Administrador" || yo.role === "Director") {
    const { data } = await supabase
      .from("usuarios")
      .select("id, nombre, apellidos")
      .eq("empresa_id", yo.empresaId ?? 0)
      .order("nombre");
    agentes = (data ?? []).filter((u): u is typeof u & { nombre: string; apellidos: string } =>
      typeof u.nombre === "string"
    );
  }

  const metrics = await getComunicacionesMetricsAction();
  const apiEnabled = isApiEnabled();

  return (
    <>
      <PageHeader
        title="Comunicaciones WhatsApp"
        description="Historial de mensajes comerciales enviados y recibidos"
      />
      <ComunicacionesClient
        metrics={metrics}
        agentes={agentes}
        currentUserRole={yo.role}
        currentUserId={yo.id}
        apiEnabled={apiEnabled}
      />
    </>
  );
}
