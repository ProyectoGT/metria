import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
import { getCurrentUserContext } from "@/lib/current-user";
import PedidosClient from "./solicitudes-client";
import IdealistaClient from "./idealista-client";
import SolicitudesTabs from "./solicitudes-tabs";

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const { tab } = await searchParams;

  const gmailConnected = !!(
    cookieStore.get("gmail_access_token")?.value ||
    cookieStore.get("gmail_refresh_token")?.value
  );

  const [user, { data: pedidos }, { data: agentes }, { data: leads }] = await Promise.all([
    getCurrentUserContext(),
    supabase.from("pedidos").select("*").order("id", { ascending: false }),
    supabase.from("usuarios").select("id, nombre, apellidos, rol").order("nombre"),
    supabase
      .from("idealista_leads")
      .select("*")
      .order("fecha_contacto", { ascending: false }),
  ]);

  const role = user?.role ?? "Agente";
  const userId = user?.id ?? 0;
  const supervisedIds = new Set([userId, ...(user?.supervisedAgentIds ?? [])]);

  const agentesFiltrados = (agentes ?? []).filter((a) => {
    if (role === "Administrador" || role === "Director") return true;
    if (role === "Responsable") return supervisedIds.has(a.id);
    return a.id === userId;
  });

  const nuevosLeads = (leads ?? []).filter((l) => l.estado === "nuevo").length;

  return (
    <>
      <SolicitudesTabs
        defaultTab={tab === "idealista" ? "idealista" : "solicitudes"}
        nuevosLeads={nuevosLeads}
        solicitudesContent={
          <PedidosClient
            initialPedidos={pedidos ?? []}
            agentes={agentesFiltrados}
            currentUserId={user?.id ?? null}
            currentUserRole={user?.role ?? null}
          />
        }
        idealistaContent={
          <IdealistaClient
            initialLeads={(leads ?? []) as Parameters<typeof IdealistaClient>[0]["initialLeads"]}
            gmailConnected={gmailConnected}
          />
        }
      />
    </>
  );
}
