"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserContext } from "@/lib/current-user";
import { revalidatePath } from "next/cache";
import { createSoporteNotification, getAdminUserIds } from "@/lib/soporte-notifications";

// ─── Crear ticket ──────────────────────────────────────────────────────────────

export async function createTicketAction(formData: FormData) {
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autorizado");

  const tipo = formData.get("tipo") as string;
  const asunto = formData.get("asunto") as string;
  const descripcion = formData.get("descripcion") as string;
  const prioridad = (formData.get("prioridad") as string) || "media";

  if (!tipo?.trim() || !asunto?.trim() || !descripcion?.trim()) {
    throw new Error("Campos obligatorios: tipo, asunto, descripcion");
  }

  const supabase = createAdminClient();

  const { data: ticket, error } = await supabase
    .from("tickets_soporte")
    .insert({
      tipo: tipo.trim(),
      asunto: asunto.trim(),
      descripcion: descripcion.trim(),
      prioridad,
      user_id: yo.id,
      nombre_usuario: `${yo.nombre} ${yo.apellidos}`.trim() || yo.nombre || "Usuario",
      empresa_id: yo.empresaId ?? undefined,
    })
    .select()
    .single();

  if (error || !ticket) {
    console.error("[soporte] Error creando ticket:", error);
    throw new Error(error?.message ?? "Error al crear el ticket");
  }

  // Insertar primer mensaje
  await supabase.from("soporte_mensajes").insert({
    ticket_id: ticket.id,
    autor_id: yo.id,
    autor_nombre: `${yo.nombre} ${yo.apellidos}`.trim() || "Usuario",
    autor_rol: "usuario",
    contenido: descripcion.trim(),
  });

  // Notificar a administradores
  if (yo.empresaId) {
    const adminIds = await getAdminUserIds(yo.empresaId);
    if (adminIds.length > 0) {
      await createSoporteNotification({
        ticketId: ticket.id,
        empresaId: yo.empresaId,
        tipo: "nuevo_ticket",
        mensaje: `Nuevo ticket #${ticket.id}: ${asunto.trim()}`,
        usuarioIds: adminIds,
      });
    }
  }

  revalidatePath("/soporte");
  return { ticket };
}

// ─── Añadir respuesta (usuario o admin) ───────────────────────────────────────

export async function addReplyAction(ticketId: number, contenido: string) {
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autorizado");

  if (!contenido?.trim()) throw new Error("El mensaje no puede estar vacío");

  const supabase = createAdminClient();

  // Verificar que el ticket existe y no está archivado
  const { data: ticket } = await supabase
    .from("tickets_soporte")
    .select("id, user_id, empresa_id, archived_at")
    .eq("id", ticketId)
    .single();

  if (!ticket) throw new Error("Ticket no encontrado");
  if (ticket.archived_at) throw new Error("El ticket está archivado");

  // Verificar permisos
  const isAdmin = yo.role === "Administrador";
  const isOwner = ticket.user_id === yo.id;
  if (!isAdmin && !isOwner) throw new Error("No autorizado");

  const autorRol = isAdmin ? "admin" : "usuario";

  const { data: msg, error } = await supabase
    .from("soporte_mensajes")
    .insert({
      ticket_id: ticketId,
      autor_id: yo.id,
      autor_nombre: `${yo.nombre} ${yo.apellidos}`.trim() || "Usuario",
      autor_rol: autorRol,
      contenido: contenido.trim(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Actualizar ultima_respuesta_at si es admin
  if (isAdmin) {
    await supabase
      .from("tickets_soporte")
      .update({ ultima_respuesta_at: new Date().toISOString() })
      .eq("id", ticketId);
  }

  // Notificaciones
  const empresaId = ticket.empresa_id ?? yo.empresaId;
  if (empresaId) {
    if (isAdmin) {
      const adminIds = [ticket.user_id].filter(Boolean) as number[];
      if (adminIds.length > 0) {
        await createSoporteNotification({
          ticketId,
          empresaId,
          tipo: "nueva_respuesta_admin",
          mensaje: `Nueva respuesta en ticket #${ticketId}: ${contenido.trim().slice(0, 100)}`,
          usuarioIds: adminIds,
        });
      }
    } else {
      const adminIds = await getAdminUserIds(empresaId);
      if (adminIds.length > 0) {
        await createSoporteNotification({
          ticketId,
          empresaId,
          tipo: "nueva_respuesta_usuario",
          mensaje: `Nuevo mensaje en ticket #${ticketId}: ${contenido.trim().slice(0, 100)}`,
          usuarioIds: adminIds,
        });
      }
    }
  }

  revalidatePath("/soporte");
  return { mensaje: msg };
}

// ─── Cambiar estado ────────────────────────────────────────────────────────────

export async function updateTicketStatusAction(
  ticketId: number,
  nuevoEstado: string
) {
  const yo = await getCurrentUserContext();
  if (!yo || yo.role !== "Administrador") throw new Error("No autorizado");

  const estadosValidos = ["abierto", "en_proceso", "resuelto", "cerrado", "archivado"];
  if (!estadosValidos.includes(nuevoEstado)) {
    throw new Error(`Estado inválido: ${nuevoEstado}`);
  }

  const supabase = createAdminClient();

  const { data: ticket } = await supabase
    .from("tickets_soporte")
    .select("id, estado, empresa_id, user_id")
    .eq("id", ticketId)
    .single();

  if (!ticket) throw new Error("Ticket no encontrado");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: any = { estado: nuevoEstado };
  if (nuevoEstado === "archivado") {
    updatePayload.archived_at = new Date().toISOString();
  }
  if (nuevoEstado !== "archivado" && ticket.estado === "archivado") {
    updatePayload.archived_at = null;
  }

  const { error } = await supabase
    .from("tickets_soporte")
    .update(updatePayload)
    .eq("id", ticketId);

  if (error) throw new Error(error.message);

  // Mensaje de sistema
  await supabase.from("soporte_mensajes").insert({
    ticket_id: ticketId,
    autor_id: yo.id,
    autor_nombre: `${yo.nombre} ${yo.apellidos}`.trim() || "Administrador",
    autor_rol: "sistema",
    contenido: `Estado cambiado de "${ticket.estado}" a "${nuevoEstado}"`,
    es_sistema: true,
  });

  // Notificar al usuario creador
  const notifUserIds = [ticket.user_id].filter(Boolean) as number[];
  if (notifUserIds.length > 0 && ticket.empresa_id) {
    await createSoporteNotification({
      ticketId,
      empresaId: ticket.empresa_id,
      tipo: "cambio_estado",
      mensaje: `Ticket #${ticketId} cambió a "${nuevoEstado}"`,
      usuarioIds: notifUserIds,
    });
  }

  revalidatePath("/soporte");
  return { success: true };
}

// ─── Actualizar ticket (admin) ────────────────────────────────────────────────

export async function updateTicketAction(
  ticketId: number,
  data: {
    prioridad?: string;
    tipo?: string;
    asignado_a?: number | null;
    estado?: string;
  }
) {
  const yo = await getCurrentUserContext();
  if (!yo || yo.role !== "Administrador") throw new Error("No autorizado");

  const supabase = createAdminClient();

  if (data.asignado_a !== undefined && data.asignado_a) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminUser = await (supabase as any)
      .from("usuarios")
      .select("id, nombre, apellidos, empresa_id")
      .eq("id", data.asignado_a)
      .single();

    if (adminUser.data?.empresa_id) {
      await createSoporteNotification({
        ticketId,
        empresaId: adminUser.data.empresa_id,
        tipo: "ticket_asignado",
        mensaje: `Ticket #${ticketId} asignado a ${adminUser.data.nombre} ${adminUser.data.apellidos ?? ""}`,
        usuarioIds: [data.asignado_a],
      });
    }
  }

  const { error } = await supabase
    .from("tickets_soporte")
    .update({
      ...(data.prioridad ? { prioridad: data.prioridad } : {}),
      ...(data.tipo ? { tipo: data.tipo } : {}),
      ...(data.estado ? { estado: data.estado } : {}),
      ...(data.asignado_a !== undefined ? { asignado_a: data.asignado_a } : {}),
    } as never)
    .eq("id", ticketId);

  if (error) throw new Error(error.message);

  revalidatePath("/soporte");
  return { success: true };
}

// ─── Archivar/desarchivar ticket ──────────────────────────────────────────────

export async function toggleArchiveTicketAction(ticketId: number, archive: boolean) {
  const yo = await getCurrentUserContext();
  if (!yo || (yo.role !== "Administrador" && yo.role !== "Director")) {
    throw new Error("No autorizado");
  }

  const supabase = createAdminClient();

  if (archive) {
    const { error } = await supabase
      .from("tickets_soporte")
      .update({ archived_at: new Date().toISOString(), estado: "archivado" })
      .eq("id", ticketId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("tickets_soporte")
      .update({ archived_at: null, estado: "cerrado" })
      .eq("id", ticketId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/soporte");
  return { success: true };
}

// ─── Crear tarea desde ticket ─────────────────────────────────────────────────

export async function createTaskFromTicketAction(
  ticketId: number,
  title: string,
  asignadoA?: number | null
) {
  const yo = await getCurrentUserContext();
  if (!yo || yo.role !== "Administrador") throw new Error("No autorizado");

  const supabase = createAdminClient();

  const { data: ticket } = await supabase
    .from("tickets_soporte")
    .select("asunto, empresa_id")
    .eq("id", ticketId)
    .single();

  if (!ticket) throw new Error("Ticket no encontrado");

  const { error } = await supabase
    .from("tareas")
    .insert({
      titulo: title || `Soporte: ${ticket.asunto}`,
      owner_user_id: yo.id,
      empresa_id: ticket.empresa_id ?? yo.empresaId ?? undefined,
      estado: "pendiente",
      ...(asignadoA ? { agente_asignado: asignadoA } : {}),
    } as never);

  if (error) throw new Error(error.message);
  revalidatePath("/soporte");
  return { success: true };
}

// ─── Marcar notificación como leída ───────────────────────────────────────────

export async function markSoporteNotifReadAction(notifId: number) {
  const yo = await getCurrentUserContext();
  if (!yo) throw new Error("No autorizado");

  const supabase = createAdminClient();
  await supabase
    .from("soporte_notificaciones")
    .update({ leido: true })
    .eq("id", notifId)
    .eq("usuario_id", yo.id);
}

// ─── Obtener notificaciones no leídas ─────────────────────────────────────────

export async function getUnreadSoporteNotificationsAction() {
  const yo = await getCurrentUserContext();
  if (!yo) return [];

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("soporte_notificaciones")
    .select("id, ticket_id, tipo, mensaje, leido, created_at, empresa_id")
    .eq("usuario_id", yo.id)
    .eq("leido", false)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []).map((n) => ({
    ...n,
    href: `/soporte?ticket=${n.ticket_id}`,
  }));
}
