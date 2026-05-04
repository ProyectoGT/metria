import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { rateLimiter, getIp } from "@/lib/rate-limiter";
import { SearchSchema } from "@/lib/validations/search";
import { getCurrentUserContext } from "@/lib/current-user";
import { canAccessContactos } from "@/lib/roles";

export type SearchResult = {
  id: string;
  type: "propiedad" | "finca" | "sector" | "zona" | "solicitud" | "usuario" | "ticket" | "tarea" | "contacto";
  label: string;
  sublabel?: string;
  href: string;
};

export async function GET(request: NextRequest) {
  try {
    await rateLimiter.consume(getIp(request.headers));
  } catch {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const parsed = SearchSchema.safeParse({
    q: request.nextUrl.searchParams.get("q"),
    ctx: request.nextUrl.searchParams.get("ctx") ?? "general",
  });

  if (!parsed.success) {
    return NextResponse.json({ results: [] });
  }

  const { q, ctx } = parsed.data;

  const supabase = await createClient();
  const currentUser = await getCurrentUserContext();
  const canSearchContactos = canAccessContactos(currentUser?.role ?? "Agente");
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

    for (const t of (tickets ?? []) as Array<{ id: number; asunto: string | null; estado: string | null; tipo: string | null; nombre_usuario: string | null }>) {
      results.push({
        id: `ticket-${t.id}`,
        type: "ticket",
        label: t.asunto || `Ticket #${t.id}`,
        sublabel: [t.tipo, t.estado, t.nombre_usuario].filter(Boolean).join(" · ") || undefined,
        href: "/soporte",
      });
    }
  }

  // ── Contactos ────────────────────────────────────────────────────
  if (canSearchContactos && (ctx === "contactos" || ctx === "general")) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: contactos } = await (supabase as any)
      .from("contactos")
      .select("id, nombre, apellidos, empresa, tipo, email, telefono")
      .is("archived_at", null)
      .or(`nombre.ilike.%${q}%,apellidos.ilike.%${q}%,empresa.ilike.%${q}%,email.ilike.%${q}%,telefono.ilike.%${q}%`)
      .limit(ctx === "contactos" ? 10 : 5);

    for (const c of (contactos ?? []) as Array<{ id: number; nombre: string; apellidos: string | null; empresa: string | null; tipo: string | null; email: string | null; telefono: string | null }>) {
      const nombre = [c.nombre, c.apellidos].filter(Boolean).join(" ");
      results.push({
        id: `contacto-${c.id}`,
        type: "contacto",
        label: nombre || `Contacto #${c.id}`,
        sublabel: [c.tipo, c.empresa ?? c.email ?? c.telefono].filter(Boolean).join(" · ") || undefined,
        href: "/contactos",
      });
    }
  }

  // ── Tareas / Órdenes del día ────────────────────────────────────
  if (ctx === "general") {
    const { data: tareas } = await supabase
      .from("tareas")
      .select("id, titulo, fecha, prioridad")
      .ilike("titulo", `%${q}%`)
      .is("fecha", null)
      .is("archived_at", null)
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
