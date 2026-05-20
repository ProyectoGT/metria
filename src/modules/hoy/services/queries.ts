/* eslint-disable @typescript-eslint/no-explicit-any */

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserContext } from "@/lib/current-user";
import { localDateKey } from "@/lib/local-date-time";
import type { HoyData, HoyItem, HoySection, HoyItemKind, HoyPriority } from "./types";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function hoyItem(
  id: string,
  kind: HoyItemKind,
  title: string,
  priority: HoyPriority = "media",
  opts?: Partial<HoyItem>,
): HoyItem {
  return { id, kind, title, priority, ...opts };
}

export const loadHoyData = cache(async (): Promise<HoyData | null> => {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return null;

  const supabase: any = await createAdminClient();
  const today = localDateKey();
  const todayMinus7 = daysAgo(7);
  const todayPlus7 = daysFromNow(7);
  const empresaId = currentUser.empresaId;

  // ── Base filters ─────────────────────────────────────────────────────────
  const baseAgendaFilter = (q: any): any =>
    q.is("archived_at", null).eq("empresa_id", empresaId);

  const baseTareaFilter = (q: any): any =>
    q.is("archived_at", null).eq("empresa_id", empresaId);

  const basePropiedadFilter = (q: any): any =>
    q.eq("empresa_id", empresaId);

  const basePedidoFilter = (q: any): any =>
    q.eq("empresa_id", empresaId);

  // ── 1. Tareas de hoy ────────────────────────────────────────────────────
  const { data: tareasHoy } = await baseTareaFilter(
    supabase
      .from("tareas")
      .select("*, tarea_usuarios!left(usuario_id)")
      .eq("fecha", today),
  );

  // ── 2. Agenda de hoy ────────────────────────────────────────────────────
  const { data: agendaHoy } = await baseAgendaFilter(
    supabase
      .from("agenda")
      .select("*, agenda_usuarios!left(usuario_id)")
      .eq("event_date", today),
  );

  // ── 3. Tareas vencidas ─────────────────────────────────────────────────
  const { data: tareasVencidas } = await baseTareaFilter(
    supabase
      .from("tareas")
      .select("*, tarea_usuarios!left(usuario_id)")
      .lt("fecha", today)
      .neq("estado", "completado"),
  );

  // ── 4. Próximas acciones (7 días) ──────────────────────────────────────
  const { data: proximasAcciones } = await baseAgendaFilter(
    supabase
      .from("agenda")
      .select("*, agenda_usuarios!left(usuario_id)")
      .gt("event_date", today)
      .lte("event_date", todayPlus7),
  );

  // ── 5. Propiedades sin seguimiento ─────────────────────────────────────
  const { data: propsSinSeg } = await basePropiedadFilter(
    supabase
      .from("propiedades")
      .select("id, propietario, estado, fecha_visita, contactado, contactado_hasta, agente_asignado, finca_id, created_at")
      .is("contactado", false)
      .limit(30),
  );

  // ── 6. Pedidos activos ─────────────────────────────────────────────────
  const { data: pedidos } = await basePedidoFilter(
    supabase
      .from("pedidos")
      .select("id, nombre_cliente, telefono, tipo_propiedad, presupuesto, origen, created_at, owner_user_id")
      .limit(30),
  );

  // ── 7. Alertas: tickets activos ────────────────────────────────────────
  const { data: tickets } = await supabase
    .from("tickets_soporte")
    .select("id, asunto, descripcion, prioridad, estado, created_at")
    .neq("estado", "resuelto")
    .limit(10);

  // ── 8. Alertas: recordatorios próximos ─────────────────────────────────
  const { data: recordatorios } = await supabase
    .from("agenda_notificaciones")
    .select("*, agenda!inner(description, event_date, time)")
    .is("cancelled_at", null)
    .is("notified_at", null)
    .eq("empresa_id", empresaId)
    .limit(20);

  // ── 9. Actividad reciente (timeline) ────────────────────────────────────
  const { data: actividadReciente } = await supabase
    .from("contacto_timeline_events")
    .select("id, tipo_evento, titulo, descripcion, created_at, propiedad_id, pedido_id, contacto_id, agente_id")
    .gte("created_at", todayMinus7)
    .order("created_at", { ascending: false })
    .limit(20);

  // ── 10. Emails recientes ────────────────────────────────────────────────
  const { data: emailsRecientes } = await supabase
    .from("email_messages")
    .select("id, subject, from_name, direction, sent_at, commercial_priority")
    .gte("sent_at", todayMinus7)
    .order("sent_at", { ascending: false })
    .limit(10);

  // ── Construir secciones ─────────────────────────────────────────────────
  const sections: HoySection[] = [];

  // ── Vencido ──────────────────────────────────────────────────────────
  const tareasVencidasItems: HoyItem[] = ((tareasVencidas ?? []) as any[])
    .filter((t: any) => {
      if (currentUser.canViewAllAgents) return true;
      const userIds = t.tarea_usuarios?.map((u: any) => u.usuario_id) ?? [];
      return userIds.includes(currentUser.id) || t.owner_user_id === currentUser.id;
    })
    .slice(0, 15)
    .map((t: any) => {
      const userIds = t.tarea_usuarios?.map((u: any) => u.usuario_id) ?? [];
      return hoyItem(`tarea-v-${t.id}`, "tarea_vencida", t.titulo, (t.prioridad as HoyPriority) ?? "media", {
        description: `Vencida el ${t.fecha ?? "—"}`,
        dueDate: t.fecha ?? undefined,
        entityType: "tarea",
        entityId: t.id,
        assignedUserId: t.agente_asignado ?? userIds[0] ?? undefined,
        isCompleted: t.estado === "completado",
      });
    });

  if (tareasVencidasItems.length > 0) {
    sections.push({ id: "vencido", title: "Vencido", icon: "AlertTriangle", items: tareasVencidasItems, count: tareasVencidasItems.length });
  }

  // ── Hoy ─────────────────────────────────────────────────────────────
  const hoyItems: HoyItem[] = [];

  ((tareasHoy ?? []) as any[])
    .filter((t: any) => {
      if (currentUser.canViewAllAgents) return true;
      const userIds = t.tarea_usuarios?.map((u: any) => u.usuario_id) ?? [];
      return userIds.includes(currentUser.id) || t.owner_user_id === currentUser.id;
    })
    .slice(0, 10)
    .forEach((t: any) => {
      const userIds = t.tarea_usuarios?.map((u: any) => u.usuario_id) ?? [];
      hoyItems.push(hoyItem(`tarea-h-${t.id}`, "tarea_hoy", t.titulo, (t.prioridad as HoyPriority) ?? "media", {
        dueDate: t.fecha ?? undefined,
        entityType: "tarea",
        entityId: t.id,
        assignedUserId: userIds[0] ?? undefined,
        isCompleted: t.estado === "completado",
      }));
    });

  ((agendaHoy ?? []) as any[])
    .filter((a: any) => {
      if (currentUser.canViewAllAgents) return true;
      const userIds = a.agenda_usuarios?.map((u: any) => u.usuario_id) ?? [];
      return userIds.includes(currentUser.id) || a.owner_user_id === currentUser.id;
    })
    .slice(0, 15)
    .forEach((a: any) => {
      const userIds = a.agenda_usuarios?.map((u: any) => u.usuario_id) ?? [];
      hoyItems.push(hoyItem(`agenda-h-${a.id}`, "agenda_hoy", a.description ?? "(sin descripción)", (a.priority as HoyPriority) ?? "media", {
        description: a.tipo ? `Tipo: ${a.tipo}` : undefined,
        dueDate: a.event_date ?? undefined,
        time: a.time ?? undefined,
        entityType: "agenda",
        entityId: a.id,
        assignedUserId: userIds[0] ?? undefined,
        isCompleted: a.completed ?? false,
      }));
    });

  if (hoyItems.length > 0) {
    sections.push({ id: "hoy", title: "Hoy", icon: "Sun", items: hoyItems, count: hoyItems.length });
  }

  // ── Próximos ────────────────────────────────────────────────────────
  const proximosItems: HoyItem[] = ((proximasAcciones ?? []) as any[])
    .filter((a: any) => {
      if (currentUser.canViewAllAgents) return true;
      const userIds = a.agenda_usuarios?.map((u: any) => u.usuario_id) ?? [];
      return userIds.includes(currentUser.id) || a.owner_user_id === currentUser.id;
    })
    .slice(0, 15)
    .map((a: any) => {
      const userIds = a.agenda_usuarios?.map((u: any) => u.usuario_id) ?? [];
      return hoyItem(`prox-${a.id}`, "proxima_accion", a.description ?? "(sin descripción)", (a.priority as HoyPriority) ?? "media", {
        description: a.tipo ? `${a.tipo} · ${a.event_date}` : a.event_date,
        dueDate: a.event_date ?? undefined,
        time: a.time ?? undefined,
        entityType: "agenda",
        entityId: a.id,
        assignedUserId: userIds[0] ?? undefined,
      });
    });

  if (proximosItems.length > 0) {
    sections.push({ id: "proximos", title: "Próximos 7 días", icon: "CalendarDays", items: proximosItems, count: proximosItems.length });
  }

  // ── Seguimientos ────────────────────────────────────────────────────
  const seguimientosItems: HoyItem[] = [];

  ((propsSinSeg ?? []) as any[]).slice(0, 15).forEach((p: any) => {
    seguimientosItems.push(hoyItem(`prop-${p.id}`, "propiedad_sin_seguimiento", p.propietario ?? `Propiedad #${p.id}`, "media", {
      description: `Estado: ${p.estado ?? "sin estado"} · Última visita: ${p.fecha_visita ?? "nunca"}`,
      entityType: "propiedad",
      entityId: p.id,
    }));
  });

  if (seguimientosItems.length > 0) {
    sections.push({ id: "seguimientos", title: "Seguimientos", icon: "RefreshCw", items: seguimientosItems, count: seguimientosItems.length });
  }

  // ── Pedidos ─────────────────────────────────────────────────────────
  const pedidosItems: HoyItem[] = ((pedidos ?? []) as any[]).slice(0, 10).map((p: any) =>
    hoyItem(`ped-${p.id}`, "pedido_sin_movimiento", p.nombre_cliente ?? "Cliente sin nombre", "media", {
      description: `${p.tipo_propiedad ?? "—"} · ${p.presupuesto ? `${p.presupuesto}€` : "sin presupuesto"}`,
      entityType: "pedido",
      entityId: p.id,
      assignedUserId: p.owner_user_id ?? undefined,
    }),
  );
  if (pedidosItems.length > 0) {
    sections.push({ id: "pedidos", title: "Pedidos activos", icon: "ClipboardList", items: pedidosItems, count: pedidosItems.length });
  }

  // ── Alertas ─────────────────────────────────────────────────────────
  const alertasItems: HoyItem[] = [];

  ((tickets ?? []) as any[]).slice(0, 10).forEach((t: any) => {
    alertasItems.push(hoyItem(`ticket-${t.id}`, "alerta_ticket", t.asunto, (t.prioridad as HoyPriority) ?? "media", {
      description: t.descripcion?.slice(0, 120) ?? "Ticket abierto",
      entityType: "soporte",
      entityId: t.id,
    }));
  });

  ((recordatorios ?? []) as any[])
    .filter((r: any) => r.empresa_id === empresaId)
    .slice(0, 10)
    .forEach((r: any) => {
      alertasItems.push(hoyItem(`reminder-${r.id}`, "alerta_recordatorio", r.agenda?.description ?? "Recordatorio", "media", {
        description: `Programado: ${r.agenda?.event_date ?? "—"} ${r.agenda?.time ?? ""}`,
        dueDate: r.agenda?.event_date ?? undefined,
        entityType: "agenda",
        entityId: r.agenda_id,
      }));
    });

  if (alertasItems.length > 0) {
    sections.push({ id: "alertas", title: "Alertas", icon: "Bell", items: alertasItems, count: alertasItems.length });
  }

  // ── Actividad reciente ──────────────────────────────────────────────
  const actividadItems: HoyItem[] = [];

  ((actividadReciente ?? []) as any[]).slice(0, 10).forEach((e: any) => {
    actividadItems.push(hoyItem(`act-${e.id}`, "actividad_reciente", e.titulo ?? e.tipo_evento ?? "Actividad", "baja", {
      description: e.descripcion?.slice(0, 120) ?? "",
      entityType: e.propiedad_id ? "propiedad" : e.pedido_id ? "pedido" : undefined,
      entityId: e.propiedad_id ?? e.pedido_id ?? e.contacto_id ?? undefined,
    }));
  });

  ((emailsRecientes ?? []) as any[]).slice(0, 10).forEach((e: any) => {
    actividadItems.push(hoyItem(`email-${e.id}`, "actividad_reciente", e.subject ?? "(sin asunto)", e.commercial_priority ? "alta" : "baja", {
      description: `De: ${e.from_name ?? "—"} · ${e.direction === "inbound" ? "Recibido" : "Enviado"}`,
      entityType: "email",
      entityId: e.id,
    }));
  });

  if (actividadItems.length > 0) {
    sections.push({ id: "actividad", title: "Actividad reciente", icon: "Activity", items: actividadItems, count: actividadItems.length });
  }

  const hoyData: HoyData = {
    sections,
    currentUserId: currentUser.id,
    currentUserName: `${currentUser.nombre} ${currentUser.apellidos}`,
    currentUserRole: currentUser.role,
    dateLabel: new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  };

  return hoyData;
});
