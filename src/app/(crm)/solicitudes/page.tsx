import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { canViewIdealistaLeads } from "@/lib/roles";
import { filterReadablePedidos } from "@/lib/pedidos-access";
import PageHeader from "@/components/layout/page-header";
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

  const user = await getCurrentUserContext();
  const canViewIdealista = canViewIdealistaLeads(user?.role ?? "Agente");

  const [{ data: pedidos }, { data: agentes }, { data: leads }] = await Promise.all([
    supabase.from("pedidos").select("*").order("id", { ascending: false }),
    supabase.from("usuarios").select("id, nombre, apellidos, rol").order("nombre"),
    canViewIdealista
      ? supabase
          .from("idealista_leads")
          .select("*")
          .order("fecha_contacto", { ascending: false })
      : Promise.resolve({ data: [] }),
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
  const pedidosVisibles = filterReadablePedidos(pedidos ?? [], user);

  return (
    <>
      <PageHeader title="Solicitudes" description="Gestion de solicitudes y leads de clientes" />
      <SolicitudesTabs
        defaultTab={canViewIdealista && tab === "idealista" ? "idealista" : "solicitudes"}
        nuevosLeads={nuevosLeads}
        showIdealista={canViewIdealista}
        solicitudesContent={
          <PedidosClient
            initialPedidos={pedidosVisibles}
            agentes={agentesFiltrados}
            currentUserId={user?.id ?? null}
            currentUserRole={user?.role ?? null}
          />
        }
        idealistaContent={
          canViewIdealista ? (
            <IdealistaClient
              initialLeads={(leads ?? []) as Parameters<typeof IdealistaClient>[0]["initialLeads"]}
              gmailConnected={gmailConnected}
            />
          ) : null
        }
      />
    </>
  );
}
