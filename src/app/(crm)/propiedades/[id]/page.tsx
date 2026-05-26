import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserContext } from "@/lib/current-user";
import PageHeader from "@/components/layout/page-header";
import PropiedadDetailClient from "./propiedad-detail-client";
import { getZonaPermissionLevel, hasZonaPermission, roleHasGlobalPropertyDelete, roleHasGlobalPropertyWrite } from "@/lib/zona-access";

const PROPERTY_DETAIL_SELECT = `
  id, planta, puerta, propietario, telefono, propietario_secundario, telefono_secundario, estado, honorarios, precio,
  current_commercial_cycle_id, has_sale_history, last_sold_at,
  titulo, descripcion, tipo_operacion, latitud, longitud, notas, fecha_visita, contactado,
  publicar_en_web, estado_publicacion_web, web_titulo, web_descripcion,
  web_precio_visible, web_destacada, web_ultima_sincronizacion, web_error_sync,
  ficha_completa, calidad_ficha_score, faltantes_ficha,
  created_at, updated_at, agente_asignado, created_by_user_id, finca_id, empresa_id,
  fincas(id, numero, sectores(id, numero, zona(id, nombre))),
  agente:usuarios!propiedades_agente_asignado_fkey(id, nombre, apellidos),
  creador:usuarios!propiedades_created_by_user_id_fkey(id, nombre, apellidos)
`;

const PROPERTY_DETAIL_SELECT_LEGACY = `
  id, planta, puerta, propietario, telefono, estado, honorarios, precio,
  current_commercial_cycle_id, has_sale_history, last_sold_at,
  titulo, descripcion, tipo_operacion, latitud, longitud, notas, fecha_visita, contactado,
  publicar_en_web, estado_publicacion_web, web_titulo, web_descripcion,
  web_precio_visible, web_destacada, web_ultima_sincronizacion, web_error_sync,
  ficha_completa, calidad_ficha_score, faltantes_ficha,
  created_at, updated_at, agente_asignado, finca_id, empresa_id,
  fincas(id, numero, sectores(id, numero, zona(id, nombre))),
  agente:usuarios!propiedades_agente_asignado_fkey(id, nombre, apellidos)
`;

function shouldRetryWithoutCreator(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST200" ||
    error.code === "PGRST204" ||
    message.includes("created_by_user_id") ||
    message.includes("propiedades_created_by_user_id_fkey") ||
    message.includes("could not find a relationship") ||
    message.includes("column")
  );
}

function getBackHref(referer: string | null, currentPath: string) {
  if (!referer) return "/propiedades";

  try {
    const url = new URL(referer);
    if (url.pathname === currentPath) return "/propiedades";
    if (
      url.pathname.startsWith("/dashboard") ||
      url.pathname.startsWith("/zona") ||
      url.pathname.startsWith("/propiedades")
    ) {
      return `${url.pathname}${url.search}`;
    }
  } catch {
    return "/propiedades";
  }

  return "/propiedades";
}

export type PropiedadDetail = {
  id: number;
  planta: string | null;
  puerta: string | null;
  propietario: string | null;
  telefono: string | null;
  propietario_secundario: string | null;
  telefono_secundario: string | null;
  estado: string | null;
  honorarios: number | null;
  precio: number | null;
  current_commercial_cycle_id: number | null;
  has_sale_history: boolean;
  last_sold_at: string | null;
  titulo: string | null;
  descripcion: string | null;
  tipo_operacion: string | null;
  latitud: number | null;
  longitud: number | null;
  notas: string | null;
  fecha_visita: string | null;
  contactado: boolean | null;
  publicar_en_web: boolean;
  estado_publicacion_web: string;
  web_titulo: string | null;
  web_descripcion: string | null;
  web_precio_visible: boolean;
  web_destacada: boolean;
  web_ultima_sincronizacion: string | null;
  web_error_sync: string | null;
  ficha_completa: boolean;
  calidad_ficha_score: number;
  faltantes_ficha: string[];
  created_at: string;
  updated_at: string | null;
  agente_asignado: number | null;
  finca_id: number | null;
  empresa_id: number | null;
  // joins
  zona_nombre: string | null;
  zona_id: number | null;
  sector_numero: string | null;
  sector_id: number | null;
  finca_numero: string | null;
  agente_nombre: string | null;
  agente_id: number | null;
  creador_nombre: string | null;
  creador_id: number | null;
  has_encargo_data: boolean;
  commercial_cycles: CommercialHistoryCycle[];
};

export type CommercialHistoryCycle = {
  id: number;
  status: string;
  started_at: string;
  closed_at: string | null;
  closed_reason: string | null;
  initial_status: string | null;
  final_status: string | null;
  opened_by_name: string | null;
  closed_by_name: string | null;
  sale: {
    sold_at: string | null;
    sale_price: number | null;
    commission_amount: number | null;
    buyer_name: string | null;
    buyer_phone: string | null;
    notes: string | null;
  } | null;
  status_changes: Array<{
    from_status: string | null;
    to_status: string;
    changed_at: string;
    changed_by_name: string | null;
    notes: string | null;
  }>;
  counts: {
    archivos: number;
    visitas: number;
    notas: number;
  };
};

export default async function PropiedadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const propiedadId = Number(id);
  if (isNaN(propiedadId)) notFound();
  const currentPath = `/propiedades/${id}`;
  const requestHeaders = await headers();
  const backHref = getBackHref(requestHeaders.get("referer"), currentPath);

  const yo = await getCurrentUserContext();
  if (!yo) redirect("/login");

  const supabase = yo.role === "Administrador" ? createAdminClient() : await createClient();

  const result = await supabase
    .from("propiedades")
    .select(PROPERTY_DETAIL_SELECT)
    .eq("id", propiedadId)
    .maybeSingle();

  const legacyResult = !result.data && shouldRetryWithoutCreator(result.error)
    ? await supabase
        .from("propiedades")
        .select(PROPERTY_DETAIL_SELECT_LEGACY)
        .eq("id", propiedadId)
        .maybeSingle()
    : null;

  const raw = result.data ?? legacyResult?.data ?? null;
  const loadError = legacyResult?.error ?? result.error;

  if (!raw && loadError && process.env.NODE_ENV !== "production") {
    console.warn("[propiedades/detail] No se pudo cargar la ficha", {
      propiedadId,
      message: loadError.message,
      code: loadError.code,
    });
  }

  if (!raw) notFound();

  const [
    { count: archivosCount },
    { count: visitasCount },
    { count: notasCount },
    { data: agentes },
    { data: cyclesRaw },
    { data: salesRaw },
    { data: historyRaw },
    { data: cycleArchivosRaw },
    { data: cycleVisitasRaw },
    { data: cycleNotasRaw },
  ] = await Promise.all([
    supabase.from("archivos").select("id", { count: "exact", head: true }).eq("propiedad_id", propiedadId),
    supabase.from("encargo_visitas").select("id", { count: "exact", head: true }).eq("propiedad_id", propiedadId),
    supabase.from("encargo_notas").select("id", { count: "exact", head: true }).eq("propiedad_id", propiedadId),
    supabase.from("usuarios").select("id, nombre, apellidos, rol").order("nombre"),
    supabase
      .from("propiedad_ciclos_comerciales")
      .select("id, status, started_at, closed_at, closed_reason, initial_status, final_status, opened_by_user_id, closed_by_user_id")
      .eq("propiedad_id", propiedadId)
      .order("started_at", { ascending: false }),
    supabase
      .from("propiedad_registros_venta")
      .select("ciclo_comercial_id, sold_at, sale_price, commission_amount, buyer_name, buyer_phone, notes")
      .eq("propiedad_id", propiedadId)
      .order("sold_at", { ascending: false }),
    supabase
      .from("propiedad_estado_historial")
      .select("ciclo_comercial_id, from_status, to_status, changed_at, changed_by_user_id, notes")
      .eq("propiedad_id", propiedadId)
      .order("changed_at", { ascending: true }),
    supabase.from("archivos").select("ciclo_comercial_id").eq("propiedad_id", propiedadId),
    supabase.from("encargo_visitas").select("ciclo_comercial_id").eq("propiedad_id", propiedadId),
    supabase.from("encargo_notas").select("ciclo_comercial_id").eq("propiedad_id", propiedadId),
  ]);

  const hasEncargoData = Boolean((archivosCount ?? 0) + (visitasCount ?? 0) + (notasCount ?? 0));

  type RawDetail = typeof raw & {
    fincas: {
      id: number;
      numero: string | null;
      sectores: {
        id: number;
        numero: string | null;
        zona: { id: number; nombre: string } | null;
      } | null;
    } | null;
    agente: { id: number; nombre: string; apellidos: string } | null;
    creador?: { id: number; nombre: string; apellidos: string } | null;
    propietario_secundario?: string | null;
    telefono_secundario?: string | null;
    current_commercial_cycle_id?: number | null;
    has_sale_history?: boolean | null;
    last_sold_at?: string | null;
  };

  const r = raw as unknown as RawDetail;
  const usuariosById = new Map((agentes ?? []).map((u) => [u.id, `${u.nombre} ${u.apellidos}`.trim()]));
  const saleByCycleId = new Map(
    (salesRaw ?? [])
      .filter((sale) => sale.ciclo_comercial_id != null)
      .map((sale) => [sale.ciclo_comercial_id!, sale])
  );
  const countByCycle = (rows: Array<{ ciclo_comercial_id: number | null } | null> | null | undefined) => {
    const counts = new Map<number, number>();
    for (const row of rows ?? []) {
      if (row?.ciclo_comercial_id == null) continue;
      counts.set(row.ciclo_comercial_id, (counts.get(row.ciclo_comercial_id) ?? 0) + 1);
    }
    return counts;
  };
  const archivosByCycle = countByCycle(cycleArchivosRaw);
  const visitasByCycle = countByCycle(cycleVisitasRaw);
  const notasByCycle = countByCycle(cycleNotasRaw);
  const statusChangesByCycle = new Map<number, CommercialHistoryCycle["status_changes"]>();
  for (const change of historyRaw ?? []) {
    if (change.ciclo_comercial_id == null) continue;
    const list = statusChangesByCycle.get(change.ciclo_comercial_id) ?? [];
    list.push({
      from_status: change.from_status,
      to_status: change.to_status,
      changed_at: change.changed_at,
      changed_by_name: change.changed_by_user_id ? (usuariosById.get(change.changed_by_user_id) ?? null) : null,
      notes: change.notes,
    });
    statusChangesByCycle.set(change.ciclo_comercial_id, list);
  }
  const commercialCycles: CommercialHistoryCycle[] = (cyclesRaw ?? []).map((cycle) => {
    const sale = saleByCycleId.get(cycle.id) ?? null;
    return {
      id: cycle.id,
      status: cycle.status,
      started_at: cycle.started_at,
      closed_at: cycle.closed_at,
      closed_reason: cycle.closed_reason,
      initial_status: cycle.initial_status,
      final_status: cycle.final_status,
      opened_by_name: cycle.opened_by_user_id ? (usuariosById.get(cycle.opened_by_user_id) ?? null) : null,
      closed_by_name: cycle.closed_by_user_id ? (usuariosById.get(cycle.closed_by_user_id) ?? null) : null,
      sale: sale ? {
        sold_at: sale.sold_at,
        sale_price: sale.sale_price,
        commission_amount: sale.commission_amount,
        buyer_name: sale.buyer_name,
        buyer_phone: sale.buyer_phone,
        notes: sale.notes,
      } : null,
      status_changes: statusChangesByCycle.get(cycle.id) ?? [],
      counts: {
        archivos: archivosByCycle.get(cycle.id) ?? 0,
        visitas: visitasByCycle.get(cycle.id) ?? 0,
        notas: notasByCycle.get(cycle.id) ?? 0,
      },
    };
  });

  const propiedad: PropiedadDetail = {
    id:                        r.id,
    planta:                    r.planta,
    puerta:                    r.puerta,
    propietario:               r.propietario,
    telefono:                  r.telefono,
    propietario_secundario:    r.propietario_secundario ?? null,
    telefono_secundario:       r.telefono_secundario ?? null,
    estado:                    r.estado,
    honorarios:                r.honorarios,
    precio:                    r.precio,
    current_commercial_cycle_id: r.current_commercial_cycle_id ?? null,
    has_sale_history:          r.has_sale_history ?? false,
    last_sold_at:              r.last_sold_at ?? null,
    titulo:                    r.titulo,
    descripcion:               r.descripcion,
    tipo_operacion:            r.tipo_operacion,
    latitud:                   r.latitud,
    longitud:                  r.longitud,
    notas:                     r.notas,
    fecha_visita:              r.fecha_visita,
    contactado:                r.contactado,
    publicar_en_web:           r.publicar_en_web ?? false,
    estado_publicacion_web:    r.estado_publicacion_web ?? "no_preparada",
    web_titulo:                r.web_titulo,
    web_descripcion:           r.web_descripcion,
    web_precio_visible:        r.web_precio_visible ?? true,
    web_destacada:             r.web_destacada ?? false,
    web_ultima_sincronizacion: r.web_ultima_sincronizacion,
    web_error_sync:            r.web_error_sync,
    ficha_completa:            r.ficha_completa ?? false,
    calidad_ficha_score:       r.calidad_ficha_score ?? 0,
    faltantes_ficha:           (r.faltantes_ficha ?? []) as string[],
    created_at:                r.created_at,
    updated_at:                r.updated_at,
    agente_asignado:           r.agente_asignado,
    finca_id:                  r.finca_id,
    empresa_id:                r.empresa_id,
    zona_nombre:               r.fincas?.sectores?.zona?.nombre ?? null,
    zona_id:                   r.fincas?.sectores?.zona?.id ?? null,
    sector_numero:             r.fincas?.sectores?.numero ?? null,
    sector_id:                 r.fincas?.sectores?.id ?? null,
    finca_numero:              r.fincas?.numero ?? null,
    agente_nombre:             r.agente ? `${r.agente.nombre} ${r.agente.apellidos}`.trim() : null,
    agente_id:                 r.agente?.id ?? null,
    creador_nombre:            r.creador ? `${r.creador.nombre} ${r.creador.apellidos}`.trim() : null,
    creador_id:                r.creador?.id ?? null,
    has_encargo_data:          hasEncargoData,
    commercial_cycles:         commercialCycles,
  };

  const displayTitle = propiedad.titulo
    ?? [propiedad.propietario, propiedad.planta ? `Pl. ${propiedad.planta}` : null].filter(Boolean).join(" — ")
    ?? `Propiedad #${propiedad.id}`;

  const zonaHref = propiedad.zona_id && propiedad.sector_id && propiedad.finca_id
    ? `/zona/${propiedad.zona_id}/sector/${propiedad.sector_id}/finca/${propiedad.finca_id}`
    : null;
  const zonaPermission = await getZonaPermissionLevel(supabase, propiedad.zona_id, yo.id);
  const canEditProperty =
    roleHasGlobalPropertyWrite(yo.role) ||
    hasZonaPermission(zonaPermission, "write") ||
    propiedad.agente_id === yo.id ||
    propiedad.creador_id === yo.id ||
    (yo.role === "Responsable" && propiedad.agente_id != null && yo.supervisedAgentIds.includes(propiedad.agente_id));
  const canDeleteProperty =
    roleHasGlobalPropertyDelete(yo.role) ||
    hasZonaPermission(zonaPermission, "admin");

  return (
    <>
      <PageHeader
        title={displayTitle}
        description={propiedad.zona_nombre ? `${propiedad.zona_nombre} — Ficha de propiedad` : "Ficha de propiedad"}
      />
      <PropiedadDetailClient
        propiedad={propiedad}
        isManager={yo.role === "Administrador" || yo.role === "Director"}
        canEditProperty={canEditProperty}
        canDeleteProperty={canDeleteProperty}
        zonaHref={zonaHref}
        backHref={backHref}
        agentes={(agentes ?? []).filter((a) => a.rol !== "Administrador")}
        currentUserId={yo.id}
        currentUserName={`${yo.nombre} ${yo.apellidos}`.trim()}
      />
    </>
  );
}
