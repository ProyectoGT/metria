import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase";
import { requirePageAccess } from "@/lib/access-control/route-guard";
import { canViewIdealistaLeads } from "@/lib/roles";
import { filterReadablePedidos } from "@/lib/pedidos-access";
import PedidosClient from "./solicitudes-client";
import IdealistaClient from "./idealista-client";
import SolicitudesTabs from "./solicitudes-tabs";

const PEDIDOS_SELECT = "id,nombre_cliente,telefono,tipo_propiedad,zona_busqueda,presupuesto,modalidad,habitaciones,banos,altura_deseada,garaje,origen,referencia,notas,visibility,visibility_agente_ids,owner_user_id,empresa_id,equipo_id";
const IDEALISTA_SELECT = "id,gmail_message_id,nombre,email_contacto,telefono,mensaje,referencia,url_propiedad,titulo_propiedad,asunto,fecha_contacto,estado,notas,created_at";

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

  const user = await requirePageAccess("solicitudes");
  const canViewIdealista = canViewIdealistaLeads(user.role);

  let pedidosQuery = supabase
    .from("pedidos")
    .select(PEDIDOS_SELECT)
    .order("id", { ascending: false });
  if (user.empresaId != null) {
    pedidosQuery = pedidosQuery.eq("empresa_id", user.empresaId);
  }

  const [{ data: pedidos }, { data: agentes }, { data: leads }] = await Promise.all([
    pedidosQuery,
    supabase.from("usuarios").select("id, nombre, apellidos, rol").order("nombre"),
    canViewIdealista
      ? supabase
          .from("idealista_leads")
          .select(IDEALISTA_SELECT)
          .order("fecha_contacto", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const role = user.role;
  const userId = user.id;
  const supervisedIds = new Set([userId, ...(user.supervisedAgentIds ?? [])]);

  const agentesFiltrados = (agentes ?? []).filter((a) => {
    if (role === "Administrador" || role === "Director") return true;
    if (role === "Responsable") return supervisedIds.has(a.id);
    return a.id === userId;
  });

  const nuevosLeads = (leads ?? []).filter((l) => l.estado === "nuevo").length;
  const pedidosVisibles = filterReadablePedidos(pedidos ?? [], user);

  return (
    <>
      <SolicitudesTabs
        defaultTab={canViewIdealista && tab === "idealista" ? "idealista" : "solicitudes"}
        nuevosLeads={nuevosLeads}
        showIdealista={canViewIdealista}
        solicitudesContent={
          <PedidosClient
            initialPedidos={pedidosVisibles}
            agentes={agentesFiltrados}
            currentUserId={user.id ?? null}
            currentUserRole={user.role ?? null}
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
