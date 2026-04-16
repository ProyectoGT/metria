import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export type SearchResult = {
  id: string;
  type: "propiedad" | "finca" | "sector" | "zona" | "solicitud" | "usuario" | "ticket" | "tarea";
  label: string;
  sublabel?: string;
  href: string;
};

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const ctx = request.nextUrl.searchParams.get("ctx") ?? "general";

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createClient();
  const results: SearchResult[] = [];

  // ── Zona / Sectores / Fincas / Propiedades ──────────────────────
  if (ctx === "zona" || ctx === "general") {
    const [
      { data: zonas },
      { data: sectores },
      { data: fincas },
      { data: propiedades },
    ] = await Promise.all([
      supabase
        .from("zona")
        .select("id, nombre")
        .ilike("nombre", `%${q}%`)
        .limit(5),
      supabase
        .from("sectores")
        .select("id, numero, zona_id")
        .ilike("numero::text", `%${q}%`)
        .limit(5),
      supabase
        .from("fincas")
        .select("id, numero, sector_id, sectores(id, zona_id)")
        .ilike("numero", `%${q}%`)
        .limit(5),
      supabase
        .from("propiedades")
        .select("id, propietario, planta, puerta, estado, fincas(id, numero, sectores(id, numero, zona_id))")
        .or(`propietario.ilike.%${q}%`)
        .limit(ctx === "zona" ? 10 : 5),
    ]);

    for (const z of zonas ?? []) {
      results.push({
        id: `zona-${z.id}`,
        type: "zona",
        label: z.nombre,
        href: `/zona/${z.id}`,
      });
    }

    for (const s of sectores ?? []) {
      results.push({
        id: `sector-${s.id}`,
        type: "sector",
        label: `Sector ${s.numero}`,
        href: `/zona/${s.zona_id}/sector/${s.id}`,
      });
    }

    type FincaRow = {
      id: number;
      numero: string;
      sector_id: number;
      sectores: { id: number; zona_id: number } | null;
    };
    for (const f of (fincas ?? []) as unknown as FincaRow[]) {
      if (!f.sectores) continue;
      results.push({
        id: `finca-${f.id}`,
        type: "finca",
        label: `Finca ${f.numero}`,
        href: `/zona/${f.sectores.zona_id}/sector/${f.sectores.id}/finca/${f.id}`,
      });
    }

    type PropRow = {
      id: number;
      propietario: string | null;
      planta: string | null;
      puerta: string | null;
      estado: string | null;
      fincas: { id: number; numero: string; sectores: { id: number; numero: number; zona_id: number } | null } | null;
    };
    for (const p of (propiedades ?? []) as unknown as PropRow[]) {
      if (!p.fincas?.sectores) continue;
      results.push({
        id: `prop-${p.id}`,
        type: "propiedad",
        label: p.propietario?.trim() || `Propiedad #${p.id}`,
        sublabel: `Finca ${p.fincas.numero}${p.planta ? ` · Planta ${p.planta}` : ""}${p.puerta ? ` Puerta ${p.puerta}` : ""}`,
        href: `/zona/${p.fincas.sectores.zona_id}/sector/${p.fincas.sectores.id}/finca/${p.fincas.id}`,
      });
    }
  }

  // ── Solicitudes ─────────────────────────────────────────────────
  if (ctx === "solicitudes" || ctx === "general") {
    const { data: pedidos } = await supabase
      .from("pedidos")
      .select("id, nombre_cliente, tipo_propiedad, origen, referencia")
      .or(`nombre_cliente.ilike.%${q}%,tipo_propiedad.ilike.%${q}%,origen.ilike.%${q}%,referencia.ilike.%${q}%`)
      .limit(ctx === "solicitudes" ? 10 : 5);

    for (const p of pedidos ?? []) {
      results.push({
        id: `pedido-${p.id}`,
        type: "solicitud",
        label: p.nombre_cliente || `Solicitud #${p.id}`,
        sublabel: [p.tipo_propiedad, p.origen].filter(Boolean).join(" · ") || undefined,
        href: "/solicitudes",
      });
    }
  }

  // ── Usuarios ────────────────────────────────────────────────────
  if (ctx === "usuarios" || ctx === "general") {
    const { data: usuarios } = await supabase
      .from("usuarios")
      .select("id, nombre, apellidos, correo, rol")
      .or(`nombre.ilike.%${q}%,apellidos.ilike.%${q}%,correo.ilike.%${q}%,rol.ilike.%${q}%`)
      .limit(ctx === "usuarios" ? 10 : 5);

    for (const u of usuarios ?? []) {
      results.push({
        id: `usuario-${u.id}`,
        type: "usuario",
        label: [u.nombre, u.apellidos].filter(Boolean).join(" ") || u.correo || `Usuario #${u.id}`,
        sublabel: [u.rol, u.correo].filter(Boolean).join(" · ") || undefined,
        href: "/usuarios",
      });
    }
  }

  // ── Tickets de soporte ──────────────────────────────────────────
  if (ctx === "soporte" || ctx === "general") {
    const { data: tickets } = await supabase
      .from("tickets_soporte")
      .select("id, asunto, estado, tipo, nombre_usuario")
      .or(`asunto.ilike.%${q}%,tipo.ilike.%${q}%,nombre_usuario.ilike.%${q}%,descripcion.ilike.%${q}%`)
      .limit(ctx === "soporte" ? 10 : 5);

    for (const t of tickets ?? []) {
      results.push({
        id: `ticket-${t.id}`,
        type: "ticket",
        label: t.asunto || `Ticket #${t.id}`,
        sublabel: [t.tipo, t.estado, t.nombre_usuario].filter(Boolean).join(" · ") || undefined,
        href: "/soporte",
      });
    }
  }

  // ── Tareas / Órdenes del día ────────────────────────────────────
  if (ctx === "general") {
    const { data: tareas } = await supabase
      .from("tareas")
      .select("id, titulo, fecha, prioridad")
      .ilike("titulo", `%${q}%`)
      .limit(4);

    for (const t of tareas ?? []) {
      results.push({
        id: `tarea-${t.id}`,
        type: "tarea",
        label: t.titulo,
        sublabel: t.fecha ? new Date(t.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : undefined,
        href: "/ordenes",
      });
    }
  }

  return NextResponse.json({ results: results.slice(0, 20) });
}
