import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import {
  mockAgentOfMonth,
  emptyRendimiento,
  type SummaryData,
  type SummaryType,
  type PropertyListing,
  type AgentMetrics,
  type Rendimiento,
  type KanbanData,
  type OrdenDiaAgente,
  type KanbanPriority,
} from "@/lib/mock/dashboard";
import SummaryPanel from "@/components/dashboard/SummaryPanel";
import KanbanBoard from "@/components/dashboard/KanbanBoard";
import OrdenDiaPanel from "@/components/dashboard/OrdenDiaPanel";
import AgentOfMonth from "@/components/dashboard/AgentOfMonth";
import AgentPerformanceTable from "@/components/dashboard/AgentPerformanceTable";
import MyActivity from "@/components/dashboard/MyActivity";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

function formatDateEs() {
  return new Date()
    .toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .replace(/^./, (c) => c.toUpperCase());
}

function normalizePriority(p: string | null): KanbanPriority {
  if (p === "alta" || p === "media" || p === "baja") return p;
  return "media";
}

function normalizeNullablePriority(p: string | null): KanbanPriority | null {
  if (p === null) return null;
  if (p === "alta" || p === "media" || p === "baja") return p;
  return "media";
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();

  const role = yo?.role ?? "Agente";
  const userName = yo?.nombre ?? "Usuario";
  const userId = yo?.id ?? 0;
  const fullName = yo ? `${yo.nombre} ${yo.apellidos}`.trim() : "Usuario";
  const anioActual = new Date().getFullYear();

  // ─── 1. Summary counts (paralelo) ────────────────────────────────────────
  const [
    { count: noticiasCount },
    { count: investigacionesCount },
    { count: encargosCount },
    { count: pedidosCount },
    { data: noticiasList },
    { data: investigacionesList },
    { data: encargosList },
    { data: pedidosList },
    { data: todosAgentes },
    { data: rendimientoData },
    { data: tareasData },
  ] = await Promise.all([
    supabase.from("propiedades").select("*", { count: "exact", head: true }),
    supabase.from("propiedades").select("*", { count: "exact", head: true }).ilike("estado", "investig%"),
    supabase.from("propiedades").select("*", { count: "exact", head: true }).ilike("estado", "encarg%"),
    supabase.from("pedidos").select("*", { count: "exact", head: true }),

    // Listings
    supabase
      .from("propiedades")
      .select(
        "id, planta, puerta, propietario, estado, fincas(numero, sectores(numero)), usuarios:usuarios!propiedades_agente_asignado_fkey(nombre, apellidos)",
      )
      .order("id", { ascending: false })
      .limit(50),
    supabase
      .from("propiedades")
      .select(
        "id, planta, puerta, propietario, estado, fincas(numero, sectores(numero)), usuarios:usuarios!propiedades_agente_asignado_fkey(nombre, apellidos)",
      )
      .ilike("estado", "investig%")
      .order("id", { ascending: false })
      .limit(50),
    supabase
      .from("propiedades")
      .select(
        "id, planta, puerta, propietario, estado, fincas(numero, sectores(numero)), usuarios:usuarios!propiedades_agente_asignado_fkey(nombre, apellidos)",
      )
      .ilike("estado", "encarg%")
      .order("id", { ascending: false })
      .limit(50),
    supabase
      .from("pedidos")
      .select(
        "id, nombre_cliente, tipo_propiedad, zona:zona_deseada(nombre), usuarios:usuarios!pedidos_owner_user_id_fkey(nombre, apellidos)",
      )
      .order("id", { ascending: false })
      .limit(50),

    // Agentes y rendimiento (anual: mes=0)
    supabase
      .from("usuarios")
      .select("id, nombre, apellidos, puesto")
      .order("nombre"),
    supabase.from("rendimiento").select("*").eq("anio", anioActual).eq("mes", 0),

    // Tareas pendientes (todas, filtramos abajo por rol)
    supabase
      .from("tareas")
      .select("id, titulo, prioridad, fecha, estado, owner_user_id")
      .eq("estado", "pendiente")
      .order("fecha", { ascending: true, nullsFirst: false }),
  ]);

  // ─── 2. Map summary data ──────────────────────────────────────────────────
  const summary: SummaryData = {
    noticias: noticiasCount ?? 0,
    investigaciones: investigacionesCount ?? 0,
    encargos: encargosCount ?? 0,
    pedidosActivos: pedidosCount ?? 0,
  };

  // Helper: map propiedad row → PropertyListing
  type PropRow = {
    id: number;
    planta: string | null;
    puerta: string | null;
    propietario: string | null;
    estado: string | null;
    fincas: { numero: number; sectores: { numero: number } | null } | null;
    usuarios: { nombre: string | null; apellidos: string | null } | null;
  };

  function mapPropiedad(p: PropRow): PropertyListing {
    const planta = p.planta ?? "";
    const puerta = p.puerta ?? "";
    const nombre = p.propietario?.trim()
      ? p.propietario
      : planta || puerta
        ? `Planta ${planta}${puerta ? ` ${puerta}` : ""}`.trim()
        : `Propiedad #${p.id}`;
    const finca = p.fincas?.numero != null ? `Finca ${p.fincas.numero}` : "—";
    const sector = p.fincas?.sectores?.numero != null ? `Sector ${p.fincas.sectores.numero}` : "—";
    const agente = p.usuarios
      ? `${p.usuarios.nombre ?? ""} ${p.usuarios.apellidos ?? ""}`.trim() || "Sin asignar"
      : "Sin asignar";
    return {
      id: String(p.id),
      nombre,
      sector,
      finca,
      estado: p.estado ?? "—",
      agente,
    };
  }

  type PedidoRow = {
    id: number;
    nombre_cliente: string;
    tipo_propiedad: string | null;
    zona: { nombre: string | null } | null;
    usuarios: { nombre: string | null; apellidos: string | null } | null;
  };

  function mapPedido(p: PedidoRow): PropertyListing {
    return {
      id: String(p.id),
      nombre: p.nombre_cliente,
      sector: p.zona?.nombre ?? "—",
      finca: p.tipo_propiedad ?? "—",
      estado: "Activo",
      agente: p.usuarios
        ? `${p.usuarios.nombre ?? ""} ${p.usuarios.apellidos ?? ""}`.trim() || "Sin asignar"
        : "Sin asignar",
    };
  }

  const listings: Record<SummaryType, PropertyListing[]> = {
    noticias: ((noticiasList ?? []) as unknown as PropRow[]).map(mapPropiedad),
    investigaciones: ((investigacionesList ?? []) as unknown as PropRow[]).map(mapPropiedad),
    encargos: ((encargosList ?? []) as unknown as PropRow[]).map(mapPropiedad),
    pedidosActivos: ((pedidosList ?? []) as unknown as PedidoRow[]).map(mapPedido),
  };

  // ─── 3. Agents filtered by role ──────────────────────────────────────────
  let visibleAgentes = todosAgentes ?? [];
  if (role === "Responsable") {
    const allowed = new Set([userId, ...(yo?.supervisedAgentIds ?? [])]);
    visibleAgentes = visibleAgentes.filter((a) => allowed.has(a.id));
  } else if (role === "Agente") {
    visibleAgentes = visibleAgentes.filter((a) => a.id === userId);
  }

  const agentMetrics: AgentMetrics[] = visibleAgentes.map((a) => {
    const r = (rendimientoData ?? []).find((x) => x.agente_id === a.id);
    const rendimiento: Rendimiento = r
      ? {
          facturado: r.facturado,
          objetivo_facturado: r.objetivo_facturado,
          encargos: r.encargos,
          objetivo_encargos: r.objetivo_encargos,
          ventas: r.ventas,
          objetivo_ventas: r.objetivo_ventas,
          contactos: r.contactos,
          objetivo_contactos: r.objetivo_contactos,
        }
      : emptyRendimiento();
    return {
      id: String(a.id),
      nombre: `${a.nombre} ${a.apellidos}`.trim(),
      rendimiento,
    };
  });

  const ownMetrics =
    agentMetrics.find((a) => a.id === String(userId))?.rendimiento ?? emptyRendimiento();

  // ─── 4. Kanban personal: solo "Tareas pendientes" del usuario ────────────
  const myTareas = (tareasData ?? []).filter((t) => t.owner_user_id === userId);
  const kanbanData: KanbanData = {
    columns: [
      {
        id: "pendientes",
        title: "Tareas pendientes",
        fixed: true,
        cards: myTareas.map((t) => ({
          id: String(t.id),
          title: t.titulo,
          priority: normalizePriority(t.prioridad),
          dueDate: t.fecha ?? undefined,
          assignedBy: null,
        })),
      },
    ],
  };

  // ─── 5. Orden del día por agente (managers only) ─────────────────────────
  const showOrdenDia =
    role === "Administrador" || role === "Director" || role === "Responsable";

  const ordenDiaAgentes: OrdenDiaAgente[] = showOrdenDia
    ? visibleAgentes.map((a) => ({
        id: a.id,
        nombre: `${a.nombre} ${a.apellidos}`.trim(),
        tareas: (tareasData ?? [])
          .filter((t) => t.owner_user_id === a.id)
          .map((t) => ({
            id: t.id,
            titulo: t.titulo,
            prioridad: normalizeNullablePriority(t.prioridad),
            fecha: t.fecha,
          })),
      }))
    : [];

  // ─── 6. Role gates for sections ──────────────────────────────────────────
  const showAgentPerformance =
    role === "Administrador" || role === "Director" || role === "Responsable";
  const showMyActivity = role === "Agente";

  return (
    <div className="flex flex-col gap-8">
      {/* 1 — Saludo */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          {getGreeting()}, {userName}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{formatDateEs()}</p>
      </div>

      {/* 2 — Summary panel */}
      <SummaryPanel summary={summary} listings={listings} />

      {/* 3 — Kanban personal */}
      <section>
        <div className="mb-4">
          <h2 className="font-semibold text-text-primary">Mis tareas</h2>
          <p className="text-sm text-text-secondary">
            Organiza tu trabajo arrastrando las tarjetas entre columnas.
          </p>
        </div>
        <KanbanBoard
          initialData={kanbanData}
          role={role}
          currentUserId={String(userId)}
          agents={agentMetrics.map((a) => ({ id: a.id, nombre: a.nombre }))}
        />
      </section>

      {/* 4 — Orden del día por agente (managers) */}
      {showOrdenDia && <OrdenDiaPanel agentes={ordenDiaAgentes} />}

      {/* 5 — Agente del mes (mock: no existe tabla en BD) */}
      <AgentOfMonth
        initialData={mockAgentOfMonth}
        role={role}
        currentUserName={fullName}
        agents={agentMetrics.map((a) => ({ id: a.id, nombre: a.nombre }))}
      />

      {/* 6 — Rendimiento / Mi actividad */}
      {showAgentPerformance && <AgentPerformanceTable agents={agentMetrics} />}
      {showMyActivity && <MyActivity rendimiento={ownMetrics} />}
    </div>
  );
}
