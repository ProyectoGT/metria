import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import PageHeader from "@/components/layout/page-header";
import PropiedadDetailClient from "./propiedad-detail-client";

export type PropiedadDetail = {
  id: number;
  planta: string | null;
  puerta: string | null;
  propietario: string | null;
  telefono: string | null;
  estado: string | null;
  honorarios: number | null;
  precio: number | null;
  titulo: string | null;
  descripcion: string | null;
  tipo_operacion: string | null;
  latitud: number | null;
  longitud: number | null;
  notas: string | null;
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
};

export default async function PropiedadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const propiedadId = Number(id);
  if (isNaN(propiedadId)) notFound();

  const yo = await getCurrentUserContext();
  if (!yo) redirect("/login");

  const supabase = await createClient();

  const { data: raw } = await supabase
    .from("propiedades")
    .select(`
      id, planta, puerta, propietario, telefono, estado, honorarios, precio,
      titulo, descripcion, tipo_operacion, latitud, longitud, notas,
      publicar_en_web, estado_publicacion_web, web_titulo, web_descripcion,
      web_precio_visible, web_destacada, web_ultima_sincronizacion, web_error_sync,
      ficha_completa, calidad_ficha_score, faltantes_ficha,
      created_at, updated_at, agente_asignado, finca_id, empresa_id,
      fincas(id, numero, sectores(id, numero, zona(id, nombre))),
      agente:usuarios!propiedades_agente_asignado_fkey(id, nombre, apellidos)
    `)
    .eq("id", propiedadId)
    .single();

  if (!raw) notFound();

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
  };

  const r = raw as unknown as RawDetail;

  const propiedad: PropiedadDetail = {
    id:                        r.id,
    planta:                    r.planta,
    puerta:                    r.puerta,
    propietario:               r.propietario,
    telefono:                  r.telefono,
    estado:                    r.estado,
    honorarios:                r.honorarios,
    precio:                    r.precio,
    titulo:                    r.titulo,
    descripcion:               r.descripcion,
    tipo_operacion:            r.tipo_operacion,
    latitud:                   r.latitud,
    longitud:                  r.longitud,
    notas:                     r.notas,
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
  };

  const displayTitle = propiedad.titulo
    ?? [propiedad.propietario, propiedad.planta ? `Pl. ${propiedad.planta}` : null].filter(Boolean).join(" — ")
    ?? `Propiedad #${propiedad.id}`;

  const zonaHref = propiedad.zona_id && propiedad.sector_id && propiedad.finca_id
    ? `/zona/${propiedad.zona_id}/sector/${propiedad.sector_id}/finca/${propiedad.finca_id}`
    : null;

  return (
    <>
      <PageHeader
        title={displayTitle}
        description={propiedad.zona_nombre ? `${propiedad.zona_nombre} — Ficha de propiedad` : "Ficha de propiedad"}
      />
      <PropiedadDetailClient
        propiedad={propiedad}
        isManager={yo.role === "Administrador" || yo.role === "Director"}
        zonaHref={zonaHref}
      />
    </>
  );
}
