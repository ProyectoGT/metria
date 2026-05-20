import { createClient } from "@/lib/supabase";
import type { CurrentUserContext } from "@/lib/current-user";
import { calculatePropertyMatches } from "@/modules/matching/services";
import type { MatchPedido, MatchPropiedad } from "@/modules/matching/services";

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export type OpportunityReason =
  | "pedido_sin_actividad"       // pedido activo sin tarea/agenda en X días
  | "match_sin_seguimiento"      // pedido con match alto pero sin interacción
  | "propiedad_con_interesados"  // propiedad con matches pero sin actividad
  | "tarea_vencida_clave"        // tarea vencida ligada a pedido/propiedad relevante
  | "contacto_sin_convertir";    // contacto creado sin pedido asociado

export type ImpactLevel = "alto" | "medio" | "bajo";

export type LostOpportunityEntity = {
  type: "pedido" | "propiedad" | "tarea" | "contacto";
  id: number;
  label: string;
  url: string;
};

export type LostOpportunity = {
  id: string;
  razon: OpportunityReason;
  titulo: string;
  descripcion: string;
  impacto: ImpactLevel;
  impacto_estimado: string;           // texto legible, p.ej. "Honorarios: 15.000 €"
  entidad: LostOpportunityEntity;
  agente_id: number | null;
  agente_nombre: string | null;
  ultima_actividad: string | null;    // ISO date string
  dias_inactivo: number;
  accion_recomendada: string;
};

// ─── Constantes ────────────────────────────────────────────────────────────────

const PEDIDO_SIN_ACTIVIDAD_DIAS = 14;
const MATCH_SIN_SEGUIMIENTO_DIAS = 7;
const PROPIEDAD_CON_INTERESADOS_DIAS = 14;
const CONTACTO_SIN_CONVERTIR_DIAS = 21;

// ─── Helpers internos ──────────────────────────────────────────────────────────

function toTime(v: string | null | undefined) {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function elapsed(ms: number): number {
  return Math.floor((Date.now() - ms) / 86_400_000);
}

function allowedAgentIds(user: CurrentUserContext): number[] | null {
  if (user.role === "Administrador" || user.role === "Director") return null;
  if (user.role === "Responsable") return [user.id, ...user.supervisedAgentIds];
  return [user.id];
}

function pedidoLabel(nombre_cliente: string, id: number) {
  return nombre_cliente?.trim() || `Pedido #${id}`;
}

function propLabel(p: { propietario: string | null; planta: string | null; puerta: string | null; id: number }) {
  if (p.propietario?.trim()) return p.propietario.trim();
  const parts = [p.planta && `Planta ${p.planta}`, p.puerta && `Puerta ${p.puerta}`].filter(Boolean);
  return parts.length ? parts.join(" ") : `Propiedad #${p.id}`;
}

function impactFromHonorarios(honorarios: number | null): { impacto: ImpactLevel; texto: string } {
  if (!honorarios || honorarios <= 0) return { impacto: "bajo", texto: "Honorarios no especificados" };
  if (honorarios >= 10_000) return { impacto: "alto", texto: `Honorarios: ${honorarios.toLocaleString("es-ES")} €` };
  if (honorarios >= 4_000) return { impacto: "medio", texto: `Honorarios: ${honorarios.toLocaleString("es-ES")} €` };
  return { impacto: "bajo", texto: `Honorarios: ${honorarios.toLocaleString("es-ES")} €` };
}

function impactFromPresupuesto(presupuesto: number | null): { impacto: ImpactLevel; texto: string } {
  if (!presupuesto || presupuesto <= 0) return { impacto: "bajo", texto: "Presupuesto no especificado" };
  const comision = presupuesto * 0.03;
  if (comision >= 9_000) return { impacto: "alto", texto: `Comision estimada: ${Math.round(comision).toLocaleString("es-ES")} €` };
  if (comision >= 3_000) return { impacto: "medio", texto: `Comision estimada: ${Math.round(comision).toLocaleString("es-ES")} €` };
  return { impacto: "bajo", texto: `Comision estimada: ${Math.round(comision).toLocaleString("es-ES")} €` };
}

// ─── Función principal ─────────────────────────────────────────────────────────

export async function detectLostOpportunities(
  user: CurrentUserContext,
): Promise<LostOpportunity[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any;
  const allowedIds = allowedAgentIds(user);
  const opportunities: LostOpportunity[] = [];

  // ── Carga de datos en paralelo ─────────────────────────────────────────────

  let pedidosQ = supabase
    .from("pedidos")
    .select("id,nombre_cliente,tipo_propiedad,zona_busqueda,presupuesto,modalidad,habitaciones,banos,garaje,altura_deseada,notas,owner_user_id,created_at")
    .order("id", { ascending: false })
    .limit(100);
  if (allowedIds) pedidosQ = pedidosQ.in("owner_user_id", allowedIds.length ? allowedIds : [-1]);

  let propiedadesQ = supabase
    .from("propiedades")
    .select("id,propietario,planta,puerta,estado,honorarios,finca_id,agente_asignado,owner_user_id,created_at,fincas(id,numero,sectores(id,numero,zona_id,zona(id,nombre)))")
    .not("estado", "ilike", "vendid%")
    .order("id", { ascending: false })
    .limit(150);
  if (allowedIds) propiedadesQ = propiedadesQ.in("agente_asignado", allowedIds.length ? allowedIds : [-1]);

  let contactosQ = supabase
    .from("contactos")
    .select("id,nombre,apellidos,tipo,estado,owner_user_id,created_at")
    .is("archived_at", null)
    .in("tipo", ["comprador", "cliente"])
    .lt("created_at", daysAgo(CONTACTO_SIN_CONVERTIR_DIAS).toISOString());
  if (user.empresaId) contactosQ = contactosQ.eq("empresa_id", user.empresaId);
  if (allowedIds) contactosQ = contactosQ.in("owner_user_id", allowedIds.length ? allowedIds : [-1]);

  let tareasQ = supabase
    .from("tareas")
    .select("id,titulo,prioridad,fecha,estado,owner_user_id")
    .is("archived_at", null)
    .not("fecha", "is", null)
    .lt("fecha", new Date().toISOString())
    .neq("estado", "completado")
    .limit(40);
  if (allowedIds) tareasQ = tareasQ.in("owner_user_id", allowedIds.length ? allowedIds : [-1]);

  const [
    { data: pedidosData },
    { data: propiedadesData },
    { data: contactosData },
    { data: tareasData },
    { data: agentesData },
  ] = await Promise.all([
    pedidosQ,
    propiedadesQ,
    contactosQ,
    tareasQ,
    supabase.from("usuarios").select("id,nombre,apellidos").order("nombre"),
  ]);

  type PedidoRow = MatchPedido & { owner_user_id: number | null; created_at: string | null; presupuesto: number | null };
  type PropRow = MatchPropiedad & { agente_asignado: number | null; owner_user_id: number | null; created_at: string | null; honorarios: number | null };
  type ContactoRow = { id: number; nombre: string; apellidos: string | null; tipo: string; estado: string; owner_user_id: number | null; created_at: string };
  type TareaRow = { id: number; titulo: string; prioridad: string | null; fecha: string | null; estado: string; owner_user_id: number | null };
  type AgenteRow = { id: number; nombre: string; apellidos: string };

  const pedidos = (pedidosData ?? []) as PedidoRow[];
  const propiedades = (propiedadesData ?? []) as PropRow[];
  const contactos = (contactosData ?? []) as ContactoRow[];
  const tareas = (tareasData ?? []) as TareaRow[];
  const agentes = (agentesData ?? []) as AgenteRow[];

  const agenteMap = new Map(agentes.map((a) => [a.id, `${a.nombre} ${a.apellidos}`.trim()]));

  const pedidoIds = pedidos.map((p) => p.id);
  const propIds = propiedades.map((p) => p.id);
  const contactoIds = contactos.map((c) => c.id);

  // ── Actividad reciente en timeline ─────────────────────────────────────────

  const [{ data: pedidoTimeline }, { data: propTimeline }, { data: contactoTimeline }] = await Promise.all([
    pedidoIds.length
      ? supabase.from("contacto_timeline_events").select("pedido_id,created_at").in("pedido_id", pedidoIds)
      : Promise.resolve({ data: [] }),
    propIds.length
      ? supabase.from("contacto_timeline_events").select("propiedad_id,created_at").in("propiedad_id", propIds)
      : Promise.resolve({ data: [] }),
    contactoIds.length
      ? supabase.from("contacto_timeline_events").select("contacto_id,created_at").in("contacto_id", contactoIds)
      : Promise.resolve({ data: [] }),
  ]);

  const lastPedidoActivity = new Map<number, number>();
  for (const e of (pedidoTimeline ?? []) as Array<{ pedido_id: number | null; created_at: string }>) {
    if (e.pedido_id) lastPedidoActivity.set(e.pedido_id, Math.max(lastPedidoActivity.get(e.pedido_id) ?? 0, toTime(e.created_at)));
  }

  const lastPropActivity = new Map<number, number>();
  for (const e of (propTimeline ?? []) as Array<{ propiedad_id: number | null; created_at: string }>) {
    if (e.propiedad_id) lastPropActivity.set(e.propiedad_id, Math.max(lastPropActivity.get(e.propiedad_id) ?? 0, toTime(e.created_at)));
  }

  const lastContactoActivity = new Map<number, number>();
  for (const e of (contactoTimeline ?? []) as Array<{ contacto_id: number | null; created_at: string }>) {
    if (e.contacto_id) lastContactoActivity.set(e.contacto_id, Math.max(lastContactoActivity.get(e.contacto_id) ?? 0, toTime(e.created_at)));
  }

  // ── Pedidos con matches de contacto_timeline ────────────────────────────────
  // Necesitamos saber qué pedidos tienen tarea/agenda reciente (no solo timeline)
  const [{ data: pedidoTareasData }, { data: pedidoAgendaData }] = await Promise.all([
    pedidoIds.length
      ? supabase
          .from("tareas")
          .select("owner_user_id,created_at")
          .is("archived_at", null)
          .in("owner_user_id", pedidoIds.length ? pedidoIds : [-1])
          .gte("created_at", daysAgo(PEDIDO_SIN_ACTIVIDAD_DIAS).toISOString())
      : Promise.resolve({ data: [] }),
    Promise.resolve({ data: [] }), // agenda no se filtra por pedido_id, usamos solo timeline
  ]);
  void pedidoTareasData;
  void pedidoAgendaData;

  // ── Regla 1: Pedido activo sin actividad en timeline X días ───────────────

  const trackedPedidoIds = new Set<string>();
  for (const pedido of pedidos) {
    const last = lastPedidoActivity.get(pedido.id) ?? toTime(pedido.created_at);
    const days = elapsed(last);
    if (days < PEDIDO_SIN_ACTIVIDAD_DIAS) continue;
    const key = `pedido-sin-actividad-${pedido.id}`;
    if (trackedPedidoIds.has(key)) continue;
    trackedPedidoIds.add(key);

    const { impacto, texto } = impactFromPresupuesto(pedido.presupuesto);
    opportunities.push({
      id: key,
      razon: "pedido_sin_actividad",
      titulo: `Retomar contacto con ${pedidoLabel(pedido.nombre_cliente, pedido.id)}`,
      descripcion: `Pedido activo sin actividad registrada en los ultimos ${days} dias.`,
      impacto,
      impacto_estimado: texto,
      entidad: { type: "pedido", id: pedido.id, label: pedidoLabel(pedido.nombre_cliente, pedido.id), url: "/solicitudes" },
      agente_id: pedido.owner_user_id,
      agente_nombre: pedido.owner_user_id ? (agenteMap.get(pedido.owner_user_id) ?? null) : null,
      ultima_actividad: last ? new Date(last).toISOString() : pedido.created_at,
      dias_inactivo: days,
      accion_recomendada: "Llamar al cliente y registrar el resultado en el timeline.",
    });
  }

  // ── Regla 2: Pedido con match alto pero sin seguimiento reciente ──────────

  const propiedadesAvailableForMatch = propiedades.filter(
    (p) => p.estado && !["vendido", "encargo"].includes(p.estado.toLowerCase())
  );

  for (const pedido of pedidos.slice(0, 30)) {
    const last = lastPedidoActivity.get(pedido.id) ?? toTime(pedido.created_at);
    const days = elapsed(last);
    if (days < MATCH_SIN_SEGUIMIENTO_DIAS) continue;

    const [topMatch] = calculatePropertyMatches(pedido, propiedadesAvailableForMatch, { minScore: 70, limit: 1 });
    if (!topMatch) continue;

    const key = `match-sin-seguimiento-${pedido.id}`;
    if (trackedPedidoIds.has(key)) continue;
    trackedPedidoIds.add(key);

    const { impacto, texto } = impactFromPresupuesto(pedido.presupuesto);
    opportunities.push({
      id: key,
      razon: "match_sin_seguimiento",
      titulo: `Proponer ${propLabel(topMatch.propiedad as { propietario: string | null; planta: string | null; puerta: string | null; id: number })} a ${pedidoLabel(pedido.nombre_cliente, pedido.id)}`,
      descripcion: `Match ${topMatch.score}% sin seguimiento en ${days} dias. ${topMatch.razones.slice(0, 2).join(". ")}.`,
      impacto: impacto === "bajo" ? "medio" : impacto,
      impacto_estimado: texto,
      entidad: { type: "pedido", id: pedido.id, label: pedidoLabel(pedido.nombre_cliente, pedido.id), url: "/solicitudes" },
      agente_id: pedido.owner_user_id,
      agente_nombre: pedido.owner_user_id ? (agenteMap.get(pedido.owner_user_id) ?? null) : null,
      ultima_actividad: last ? new Date(last).toISOString() : pedido.created_at,
      dias_inactivo: days,
      accion_recomendada: `Presentar la propiedad ${propLabel(topMatch.propiedad as { propietario: string | null; planta: string | null; puerta: string | null; id: number })} al cliente y concertar visita.`,
    });
  }

  // ── Regla 3: Propiedad con interesados (matches) sin actividad ────────────

  for (const prop of propiedades.slice(0, 60)) {
    const last = Math.max(lastPropActivity.get(prop.id) ?? 0, toTime(prop.created_at));
    const days = elapsed(last);
    if (days < PROPIEDAD_CON_INTERESADOS_DIAS) continue;

    // ¿Tiene al menos un pedido con match >= 60?
    const matches = calculatePropertyMatches({ id: 0, nombre_cliente: "", tipo_propiedad: null, zona_busqueda: null, presupuesto: null, modalidad: null, habitaciones: null, banos: null, garaje: null, altura_deseada: null, notas: null }, [prop], { minScore: 0, limit: 1 });
    void matches; // el match real es pedido→propiedad, calculamos inverso

    // Buscar si algún pedido tiene score >= 60 con esta propiedad
    const interesados = pedidos
      .slice(0, 30)
      .map((p) => calculatePropertyMatches(p, [prop], { minScore: 60, limit: 1 }))
      .filter((m) => m.length > 0);

    if (interesados.length === 0) continue;

    const key = `propiedad-con-interesados-${prop.id}`;
    const { impacto, texto } = impactFromHonorarios(prop.honorarios);
    opportunities.push({
      id: key,
      razon: "propiedad_con_interesados",
      titulo: `Reactivar ${propLabel(prop)} — ${interesados.length} pedido${interesados.length > 1 ? "s" : ""} compatible${interesados.length > 1 ? "s" : ""}`,
      descripcion: `La propiedad lleva ${days} dias sin actividad pero hay pedidos con match alto.`,
      impacto,
      impacto_estimado: texto,
      entidad: { type: "propiedad", id: prop.id, label: propLabel(prop), url: "/zona" },
      agente_id: prop.agente_asignado,
      agente_nombre: prop.agente_asignado ? (agenteMap.get(prop.agente_asignado) ?? null) : null,
      ultima_actividad: last ? new Date(last).toISOString() : prop.created_at,
      dias_inactivo: days,
      accion_recomendada: "Contactar al propietario para confirmar disponibilidad y proponer la propiedad a los interesados.",
    });
  }

  // ── Regla 4: Tarea vencida con prioridad alta ─────────────────────────────

  for (const tarea of tareas) {
    if (tarea.prioridad !== "alta") continue;
    const days = tarea.fecha ? elapsed(toTime(tarea.fecha)) : 0;
    if (days < 1) continue;
    opportunities.push({
      id: `tarea-vencida-clave-${tarea.id}`,
      razon: "tarea_vencida_clave",
      titulo: `Tarea vencida: ${tarea.titulo}`,
      descripcion: `Tarea de prioridad alta con fecha vencida hace ${days} dia${days > 1 ? "s" : ""}.`,
      impacto: "alto",
      impacto_estimado: "Bloqueo de seguimiento comercial",
      entidad: { type: "tarea", id: tarea.id, label: tarea.titulo, url: "/dashboard" },
      agente_id: tarea.owner_user_id,
      agente_nombre: tarea.owner_user_id ? (agenteMap.get(tarea.owner_user_id) ?? null) : null,
      ultima_actividad: tarea.fecha,
      dias_inactivo: days,
      accion_recomendada: "Completar o reprogramar la tarea para desbloquear el seguimiento.",
    });
  }

  // ── Regla 5: Contacto tipo comprador/cliente sin convertir en pedido ──────

  for (const contacto of contactos) {
    const last = lastContactoActivity.get(contacto.id) ?? toTime(contacto.created_at);
    const days = elapsed(last);
    if (days < CONTACTO_SIN_CONVERTIR_DIAS) continue;

    const fullName = [contacto.nombre, contacto.apellidos].filter(Boolean).join(" ");
    opportunities.push({
      id: `contacto-sin-convertir-${contacto.id}`,
      razon: "contacto_sin_convertir",
      titulo: `Convertir contacto en pedido: ${fullName}`,
      descripcion: `Contacto de tipo "${contacto.tipo}" creado hace mas de ${days} dias sin pedido ni seguimiento.`,
      impacto: "medio",
      impacto_estimado: "Posible lead desaprovechado",
      entidad: { type: "contacto", id: contacto.id, label: fullName, url: "/contactos" },
      agente_id: contacto.owner_user_id,
      agente_nombre: contacto.owner_user_id ? (agenteMap.get(contacto.owner_user_id) ?? null) : null,
      ultima_actividad: last ? new Date(last).toISOString() : contacto.created_at,
      dias_inactivo: days,
      accion_recomendada: "Llamar al contacto y crear un pedido si muestra interes activo.",
    });
  }

  // ── Ordenar: impacto alto primero, luego por dias inactivo desc ────────────

  const impactRank: Record<ImpactLevel, number> = { alto: 0, medio: 1, bajo: 2 };
  return opportunities
    .sort((a, b) => impactRank[a.impacto] - impactRank[b.impacto] || b.dias_inactivo - a.dias_inactivo)
    .slice(0, 15);
}
