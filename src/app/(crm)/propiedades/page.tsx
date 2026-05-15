export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserContext } from "@/lib/current-user";
import PageHeader from "@/components/layout/page-header";
import PropiedadesClient from "./propiedades-client";

// ─── Tipos de datos para la vista de listado ─────────────────────────────────

export type PropiedadRow = {
  id: number;
  planta: string | null;
  puerta: string | null;
  propietario: string | null;
  telefono: string | null;
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
  publicar_en_web: boolean;
  estado_publicacion_web: string;
  web_destacada: boolean;
  ficha_completa: boolean;
  calidad_ficha_score: number;
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
};

export type ZonaOption = { id: number; nombre: string };
export type AgenteOption = { id: number; nombre: string };

export default async function PropiedadesPage() {
  const yo = await getCurrentUserContext();
  if (!yo) redirect("/login");

  const supabase = await createClient();
  const isAdmin = yo.role === "Administrador";
  const dataClient = isAdmin ? createAdminClient() : supabase;

  // ── Construir filtros de acceso según rol ─────────────────────────────
  let fincaIdFilter: number[] | null = null;
  let agentIdFilter: number[] | null = null;

  const isManager = yo.role === "Administrador" || yo.role === "Director";

  if (!isManager) {
    const { data: accesos } = await supabase
      .from("zona_acceso")
      .select("zona_id")
      .eq("usuario_id", yo.id);
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

    if (yo.role === "Agente") {
      agentIdFilter = [yo.id];
    } else if (yo.role === "Responsable") {
      agentIdFilter = [yo.id, ...(yo.supervisedAgentIds ?? [])];
    }
  }

  // ── Query de propiedades con joins ────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = dataClient
    .from("propiedades")
    .select(`
      id, planta, puerta, propietario, telefono, estado, honorarios, precio,
      current_commercial_cycle_id, has_sale_history, last_sold_at,
      titulo, descripcion, tipo_operacion, latitud, longitud,
      publicar_en_web, estado_publicacion_web, web_destacada,
      ficha_completa, calidad_ficha_score, created_at, updated_at,
      agente_asignado, finca_id, empresa_id,
      fincas(id, numero, sectores(id, numero, zona(id, nombre))),
      agente:usuarios!propiedades_agente_asignado_fkey(id, nombre, apellidos)
    `)
    .order("created_at", { ascending: false })
    .limit(500);

  if (fincaIdFilter !== null) {
    if (fincaIdFilter.length === 0) {
      query = query.eq("id", -1); // sin acceso
    } else {
      query = query.in("finca_id", fincaIdFilter);
    }
  }
  if (agentIdFilter !== null) {
    query = query.in("agente_asignado", agentIdFilter);
  }

  const { data: rawData, error: loadError } = await query;

  // ── Normalizar filas ──────────────────────────────────────────────────
  type RawRow = {
    id: number;
    planta: string | null;
    puerta: string | null;
    propietario: string | null;
    telefono: string | null;
    estado: string | null;
    honorarios: number | null;
    precio: number | null;
    current_commercial_cycle_id: number | null;
    has_sale_history: boolean | null;
    last_sold_at: string | null;
    titulo: string | null;
    descripcion: string | null;
    tipo_operacion: string | null;
    latitud: number | null;
    longitud: number | null;
    publicar_en_web: boolean;
    estado_publicacion_web: string;
    web_destacada: boolean;
    ficha_completa: boolean;
    calidad_ficha_score: number;
    created_at: string;
    updated_at: string | null;
    agente_asignado: number | null;
    finca_id: number | null;
    empresa_id: number | null;
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
  };

  const propiedades: PropiedadRow[] = ((rawData ?? []) as RawRow[]).map((r) => ({
    id:                     r.id,
    planta:                 r.planta,
    puerta:                 r.puerta,
    propietario:            r.propietario,
    telefono:               r.telefono,
    estado:                 r.estado,
    honorarios:             r.honorarios,
    precio:                 r.precio,
    current_commercial_cycle_id: r.current_commercial_cycle_id ?? null,
    has_sale_history:       r.has_sale_history ?? false,
    last_sold_at:           r.last_sold_at,
    titulo:                 r.titulo,
    descripcion:            r.descripcion,
    tipo_operacion:         r.tipo_operacion,
    latitud:                r.latitud,
    longitud:               r.longitud,
    publicar_en_web:        r.publicar_en_web ?? false,
    estado_publicacion_web: r.estado_publicacion_web ?? "no_preparada",
    web_destacada:          r.web_destacada ?? false,
    ficha_completa:         r.ficha_completa ?? false,
    calidad_ficha_score:    r.calidad_ficha_score ?? 0,
    created_at:             r.created_at,
    updated_at:             r.updated_at,
    agente_asignado:        r.agente_asignado,
    finca_id:               r.finca_id,
    empresa_id:             r.empresa_id,
    zona_nombre:            r.fincas?.sectores?.zona?.nombre ?? null,
    zona_id:                r.fincas?.sectores?.zona?.id ?? null,
    sector_numero:          r.fincas?.sectores?.numero ?? null,
    sector_id:              r.fincas?.sectores?.id ?? null,
    finca_numero:           r.fincas?.numero ?? null,
    agente_nombre:          r.agente ? `${r.agente.nombre} ${r.agente.apellidos}`.trim() : null,
  }));

  // ── Opciones de filtro ─────────────────────────────────────────────────
  const zonas: ZonaOption[] = Array.from(
    new Map(
      propiedades
        .filter((p) => p.zona_id && p.zona_nombre)
        .map((p) => [p.zona_id!, { id: p.zona_id!, nombre: p.zona_nombre! }])
    ).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const agentes: AgenteOption[] = Array.from(
    new Map(
      propiedades
        .filter((p) => p.agente_asignado && p.agente_nombre)
        .map((p) => [p.agente_asignado!, { id: p.agente_asignado!, nombre: p.agente_nombre! }])
    ).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <>
      <PageHeader
        title="Propiedades"
        description="Gestion centralizada de todos los inmuebles de la empresa."
      />
      <PropiedadesClient
        propiedades={propiedades}
        zonas={zonas}
        agentes={agentes}
        isManager={isManager}
        currentUserId={yo.id}
        loadError={loadError?.message ?? null}
      />
    </>
  );
}
