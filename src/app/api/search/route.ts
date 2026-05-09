import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { rateLimiter, getIp } from "@/lib/rate-limiter";
import { SearchSchema } from "@/lib/validations/search";

export type SearchResult = {
  id: string;
  type: "propiedad" | "finca" | "sector" | "zona" | "solicitud" | "usuario" | "ticket" | "tarea" | "contacto" | "email" | "actividad";
  label: string;
  sublabel?: string;
  href: string;
  meta?: {
    completed?: boolean;
    priority?: string | null;
    estado?: string | null;
    dbId?: number;
  };
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
        href: `/propiedades/${p.id}`,
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
        href: `/solicitudes/${p.id}`,
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
  if (ctx === "contactos" || ctx === "general") {
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

  // ── Tareas ───────────────────────────────────────────────────────
  if (ctx === "general") {
    const { data: tareas } = await supabase
      .from("tareas")
      .select("id, titulo, fecha, prioridad, estado")
      .ilike("titulo", `%${q}%`)
      .is("archived_at", null)
      .limit(6);

    for (const t of tareas ?? []) {
      results.push({
        id: `tarea-${t.id}`,
        type: "tarea",
        label: t.titulo,
        sublabel: t.fecha
          ? `${new Date(t.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" })} · ${t.estado ?? "pendiente"}`
          : t.estado ?? "pendiente",
        href: "/ordenes",
        meta: { dbId: t.id, priority: t.prioridad, estado: t.estado, completed: t.estado === "completado" },
      });
    }
  }

  // ── Agenda (actividades / orden del dia) ─────────────────────────
  if (ctx === "general") {
    const { data: actividades } = await supabase
      .from("agenda")
      .select("id, description, event_date, time, priority, tipo, completed, owner_user_id")
      .is("archived_at", null)
      .or(`description.ilike.%${q}%,tipo.ilike.%${q}%`)
      .order("event_date", { ascending: false, nullsFirst: false })
      .limit(6);

    for (const a of actividades ?? []) {
      const dateStr = a.event_date
        ? new Date(a.event_date + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })
        : "";
      results.push({
        id: `actividad-${a.id}`,
        type: "actividad",
        label: a.description,
        sublabel: `${dateStr}${a.time ? ` ${a.time.slice(0, 5)}` : ""} · ${a.tipo ?? "actividad"}${a.completed ? " · Completada" : ""}`,
        href: "/ordenes",
        meta: { dbId: a.id, priority: a.priority, completed: a.completed },
      });
    }
  }

  if (ctx === "general") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: emails } = await (supabase as any)
      .from("email_messages")
      .select("id, subject, from_email, from_name, snippet, received_at, body_text")
      .or(`subject.ilike.%${q}%,from_email.ilike.%${q}%,from_name.ilike.%${q}%,snippet.ilike.%${q}%,body_text.ilike.%${q}%`)
      .order("received_at", { ascending: false, nullsFirst: false })
      .limit(5);

    for (const email of (emails ?? []) as Array<{ id: number; subject: string | null; from_email: string | null; from_name: string | null; snippet: string | null }>) {
      results.push({
        id: `email-${email.id}`,
        type: "email",
        label: email.subject || `Email #${email.id}`,
        sublabel: [email.from_name ?? email.from_email, email.snippet].filter(Boolean).join(" · ") || undefined,
        href: `/email?message=${email.id}`,
      });
    }
  }

  const finalResults = results.slice(0, 40);
  // Respuesta estándar (nuevo formato) + compatibilidad legacy
  return NextResponse.json({
    data: { results: finalResults },
    results: finalResults, // ← legacy: mantener hasta migrar clientes
  });
}
