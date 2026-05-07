"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { validatePropertyForWeb } from "@/lib/propiedades/validate-property-for-web";
import { canUseFeature } from "@/lib/access-control/can-access";

// ─── Helpers internos ─────────────────────────────────────────────────────────

async function getAuthContext() {
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autenticado");
  return yo;
}

function isManager(role: string) {
  return role === "Administrador" || role === "Director";
}

// ─── Actualizar metadatos de la propiedad (titulo, descripcion, precio) ──────

export async function updatePropiedadMetaAction(data: {
  propiedadId: number;
  titulo?: string | null;
  descripcion?: string | null;
  precio?: number | null;
  tipo_operacion?: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const yo = await getAuthContext();

  const { error } = await supabase
    .from("propiedades")
    .update({
      titulo:         data.titulo,
      descripcion:    data.descripcion,
      precio:         data.precio,
      tipo_operacion: data.tipo_operacion,
    })
    .eq("id", data.propiedadId)
    .eq("empresa_id", yo.empresaId ?? -1);

  if (error) throw new Error(error.message);
  revalidatePath("/propiedades");
  revalidatePath(`/propiedades/${data.propiedadId}`);
}

// ─── Actualizar campos de publicación web ────────────────────────────────────

export async function updateWebPublicationAction(data: {
  propiedadId: number;
  publicar_en_web?: boolean;
  web_titulo?: string | null;
  web_descripcion?: string | null;
  web_precio_visible?: boolean;
  web_destacada?: boolean;
}): Promise<void> {
  const supabase = await createClient();
  const yo = await getAuthContext();

  if (!isManager(yo.role)) throw new Error("Sin permisos para gestionar publicacion web");
  if (!(await canUseFeature(yo, "properties.web_publish"))) throw new Error("Accion deshabilitada por control de acceso");

  const { error } = await supabase
    .from("propiedades")
    .update({
      ...(data.publicar_en_web    !== undefined && { publicar_en_web:    data.publicar_en_web }),
      ...(data.web_titulo         !== undefined && { web_titulo:         data.web_titulo }),
      ...(data.web_descripcion    !== undefined && { web_descripcion:    data.web_descripcion }),
      ...(data.web_precio_visible !== undefined && { web_precio_visible: data.web_precio_visible }),
      ...(data.web_destacada      !== undefined && { web_destacada:      data.web_destacada }),
    })
    .eq("id", data.propiedadId)
    .eq("empresa_id", yo.empresaId ?? -1);

  if (error) throw new Error(error.message);
  revalidatePath("/propiedades");
  revalidatePath(`/propiedades/${data.propiedadId}`);
}

// ─── Preparar para publicación web (valida + marca estado) ───────────────────

export type PrepareForWebResult = {
  success: boolean;
  score: number;
  faltantes: string[];
  mensaje: string;
};

export async function prepareForWebAction(
  propiedadId: number
): Promise<PrepareForWebResult> {
  const supabase = await createClient();
  const yo = await getAuthContext();

  if (!isManager(yo.role)) throw new Error("Sin permisos");
  if (!(await canUseFeature(yo, "properties.web_publish"))) throw new Error("Accion deshabilitada por control de acceso");

  const { data: prop, error: fetchError } = await supabase
    .from("propiedades")
    .select("titulo, descripcion, precio, honorarios, tipo_operacion, propietario, estado, agente_asignado, finca_id, latitud, longitud, telefono")
    .eq("id", propiedadId)
    .eq("empresa_id", yo.empresaId ?? -1)
    .single();

  if (fetchError || !prop) throw new Error("Propiedad no encontrada");

  const validation = validatePropertyForWeb(prop);

  if (!validation.completa) {
    await supabase
      .from("propiedades")
      .update({
        calidad_ficha_score: validation.score,
        faltantes_ficha:     validation.faltantes,
        ficha_completa:      false,
      })
      .eq("id", propiedadId);

    revalidatePath(`/propiedades/${propiedadId}`);

    return {
      success:  false,
      score:    validation.score,
      faltantes: validation.faltantes,
      mensaje:  "La ficha no esta completa para publicar en web",
    };
  }

  await supabase
    .from("propiedades")
    .update({
      estado_publicacion_web: "lista_para_publicar",
      ficha_completa:          true,
      calidad_ficha_score:     100,
      faltantes_ficha:         [],
    })
    .eq("id", propiedadId);

  revalidatePath("/propiedades");
  revalidatePath(`/propiedades/${propiedadId}`);

  return {
    success:  true,
    score:    100,
    faltantes: [],
    mensaje:  "Propiedad marcada como lista para publicar en web",
  };
}

// ─── Recalcular calidad de ficha ─────────────────────────────────────────────

export async function recalcularFichaAction(propiedadId: number): Promise<void> {
  const supabase = await createClient();
  const yo = await getAuthContext();

  const { data: prop } = await supabase
    .from("propiedades")
    .select("titulo, descripcion, precio, honorarios, tipo_operacion, propietario, estado, agente_asignado, finca_id, latitud, longitud, telefono")
    .eq("id", propiedadId)
    .eq("empresa_id", yo.empresaId ?? -1)
    .single();

  if (!prop) return;

  const { score, completa, faltantes } = validatePropertyForWeb(prop);

  await supabase
    .from("propiedades")
    .update({
      calidad_ficha_score: score,
      ficha_completa:      completa,
      faltantes_ficha:     faltantes,
    })
    .eq("id", propiedadId);

  revalidatePath(`/propiedades/${propiedadId}`);
}
