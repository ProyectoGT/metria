"use server";

import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import {
  generateFichaPropiedad,
  generateResumenPedido,
  generateEncargo,
  type DocumentType,
  type PropiedadDocData,
  type PedidoDocData,
} from "@/lib/document-templates";

export type GenerateDocumentInput =
  | { tipo: "ficha_propiedad" | "encargo_venta" | "encargo_alquiler"; propiedadId: number }
  | { tipo: "resumen_pedido"; pedidoId: number };

export type GenerateDocumentResult =
  | { ok: true; html: string; documentoId: number }
  | { ok: false; error: string };

export async function generateDocumentAction(
  input: GenerateDocumentInput
): Promise<GenerateDocumentResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any;
  const yo = await getCurrentUserContext();
  if (!yo) return { ok: false, error: "No autenticado" };

  try {
    let html = "";
    let propiedadId: number | null = null;
    let pedidoId: number | null = null;

    // ── Documentos de propiedad ────────────────────────────────────────────────
    if (input.tipo === "ficha_propiedad" || input.tipo === "encargo_venta" || input.tipo === "encargo_alquiler") {
      const { data: prop, error: propErr } = await supabase
        .from("propiedades")
        .select(`
          id, planta, puerta, propietario, telefono, estado, fecha_visita, honorarios, notas,
          fincas(
            numero,
            sectores(
              numero,
              zona(nombre)
            )
          ),
          agente:usuarios!propiedades_agente_asignado_fkey(nombre, apellidos, correo)
        `)
        .eq("id", input.propiedadId)
        .single();

      if (propErr || !prop) return { ok: false, error: "Propiedad no encontrada" };

      type FincaJoin = { numero: string | null; sectores: { numero: number | null; zona: { nombre: string | null } | null } | null } | null;
      type AgenteJoin = { nombre: string | null; apellidos: string | null; correo: string | null } | null;
      const finca = prop.fincas as FincaJoin;
      const agente = prop.agente as AgenteJoin;

      const data: PropiedadDocData = {
        id: prop.id,
        planta: prop.planta,
        puerta: prop.puerta,
        propietario: prop.propietario,
        telefono: prop.telefono,
        estado: prop.estado,
        fecha_visita: prop.fecha_visita,
        honorarios: prop.honorarios,
        notas: prop.notas,
        finca: finca?.numero ?? null,
        sector: finca?.sectores?.numero != null ? `Sector ${finca.sectores.numero}` : null,
        zona: finca?.sectores?.zona?.nombre ?? null,
        agente_nombre: agente ? `${agente.nombre ?? ""} ${agente.apellidos ?? ""}`.trim() || null : null,
        agente_correo: agente?.correo ?? null,
      };

      if (input.tipo === "ficha_propiedad") html = generateFichaPropiedad(data);
      else if (input.tipo === "encargo_venta") html = generateEncargo(data, "venta");
      else html = generateEncargo(data, "alquiler");

      propiedadId = prop.id;
    }

    // ── Documentos de pedido ───────────────────────────────────────────────────
    if (input.tipo === "resumen_pedido") {
      const { data: ped, error: pedErr } = await supabase
        .from("pedidos")
        .select(`
          id, nombre_cliente, telefono, tipo_propiedad, presupuesto,
          modalidad, habitaciones, banos, garaje, altura_deseada,
          caracteristicas, notas, origen,
          zona:zona_deseada(nombre),
          agente:usuarios!pedidos_owner_user_id_fkey(nombre, apellidos, correo)
        `)
        .eq("id", input.pedidoId)
        .single();

      if (pedErr || !ped) return { ok: false, error: "Pedido no encontrado" };

      type ZonaJoin = { nombre: string | null } | null;
      type AgenteJoin = { nombre: string | null; apellidos: string | null; correo: string | null } | null;
      const zona = ped.zona as ZonaJoin;
      const agente = ped.agente as AgenteJoin;

      const data: PedidoDocData = {
        id: ped.id,
        nombre_cliente: ped.nombre_cliente,
        telefono: ped.telefono,
        tipo_propiedad: ped.tipo_propiedad,
        zona_nombre: zona?.nombre ?? null,
        presupuesto: ped.presupuesto,
        modalidad: ped.modalidad,
        habitaciones: ped.habitaciones,
        banos: ped.banos,
        garaje: ped.garaje,
        altura_deseada: ped.altura_deseada,
        caracteristicas: ped.caracteristicas,
        notas: ped.notas,
        origen: ped.origen,
        agente_nombre: agente ? `${agente.nombre ?? ""} ${agente.apellidos ?? ""}`.trim() || null : null,
        agente_correo: agente?.correo ?? null,
      };

      html = generateResumenPedido(data);
      pedidoId = ped.id;
    }

    // ── Guardar registro en documentos_generados ───────────────────────────────
    const { data: docRow, error: docErr } = await supabase
      .from("documentos_generados")
      .insert({
        empresa_id: yo.empresaId,
        propiedad_id: propiedadId,
        pedido_id: pedidoId,
        tipo_documento: input.tipo,
        generado_por: yo.id,
      })
      .select("id")
      .single();

    if (docErr) return { ok: false, error: `Error guardando registro: ${docErr.message}` };

    // ── Registrar en timeline ──────────────────────────────────────────────────
    const TIPO_LABEL: Record<DocumentType, string> = {
      ficha_propiedad: "Ficha de propiedad",
      resumen_pedido: "Resumen de pedido",
      encargo_venta: "Encargo de venta",
      encargo_alquiler: "Encargo de alquiler",
    };

    const timelinePayload: Record<string, unknown> = {
      empresa_id: yo.empresaId,
      agente_id: yo.id,
      tipo_evento: "documento_generado",
      titulo: `Documento generado: ${TIPO_LABEL[input.tipo]}`,
      descripcion: `Se genero el documento "${TIPO_LABEL[input.tipo]}" desde el CRM.`,
      metadata: {
        source: "document_generator",
        documento_id: docRow.id,
        tipo_documento: input.tipo,
      },
    };

    if (propiedadId) timelinePayload.propiedad_id = propiedadId;
    if (pedidoId) timelinePayload.pedido_id = pedidoId;

    await supabase.from("contacto_timeline_events").insert(timelinePayload);

    return { ok: true, html, documentoId: docRow.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}
