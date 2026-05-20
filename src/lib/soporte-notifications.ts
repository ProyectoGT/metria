import { createAdminClient } from "@/lib/supabase-admin";

type NotificationTipo =
  | "nuevo_ticket"
  | "cambio_estado"
  | "nueva_respuesta_admin"
  | "nueva_respuesta_usuario"
  | "ticket_asignado";

type NotifyPayload = {
  ticketId: number;
  empresaId: number;
  tipo: NotificationTipo;
  mensaje: string;
  usuarioIds: number[];
};

export async function createSoporteNotification(payload: NotifyPayload) {
  const { ticketId, empresaId, tipo, mensaje, usuarioIds } = payload;
  if (usuarioIds.length === 0) return;

  const supabase = createAdminClient();
  const rows = usuarioIds.map((uid) => ({
    ticket_id: ticketId,
    usuario_id: uid,
    empresa_id: empresaId,
    tipo,
    mensaje,
  }));

  const { error } = await supabase.from("soporte_notificaciones").upsert(rows, {
    onConflict: "ticket_id, usuario_id, tipo",
    ignoreDuplicates: true,
  });

  if (error) {
    console.error("[soporte-notifications] Error creating notifications:", error);
  }
}

export async function markNotificationAsRead(notificacionId: number) {
  const supabase = createAdminClient();
  await supabase
    .from("soporte_notificaciones")
    .update({ leido: true })
    .eq("id", notificacionId);
}

export async function markAllNotificationsAsRead(usuarioId: number) {
  const supabase = createAdminClient();
  await supabase
    .from("soporte_notificaciones")
    .update({ leido: true })
    .eq("usuario_id", usuarioId)
    .eq("leido", false);
}

export async function getAdminUserIds(empresaId: number): Promise<number[]> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("usuarios")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("rol", "Administrador")
    .eq("estado", "active");
  return (data ?? []).map((u: { id: number }) => u.id);
}
