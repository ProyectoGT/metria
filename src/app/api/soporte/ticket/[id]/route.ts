import { createClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendTicketRespuestaEmail } from "@/lib/email";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const ticketId = parseInt(id);
  if (isNaN(ticketId)) {
    return Response.json({ error: "ID invalido" }, { status: 400 });
  }

  const body = await request.json();
  const { estado, respuesta, respondido_por_nombre } = body;

  const updates: Record<string, unknown> = {
    estado,
    updated_at: new Date().toISOString(),
  };

  const hasRespuesta = respuesta && respuesta.trim();
  if (hasRespuesta) {
    updates.respuesta = respuesta.trim();
    updates.respondido_por_nombre = respondido_por_nombre ?? null;
    updates.respondido_at = new Date().toISOString();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminClient = createAdminClient() as any;

  const { data: ticket, error } = await adminClient
    .from("tickets_soporte")
    .update(updates)
    .eq("id", ticketId)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Enviar email al usuario si hay respuesta y tiene correo registrado
  if (hasRespuesta && ticket.user_id && process.env.RESEND_API_KEY) {
    const { data: usuario } = await adminClient
      .from("usuarios")
      .select("correo, nombre")
      .eq("id", ticket.user_id)
      .maybeSingle();

    if (usuario?.correo) {
      sendTicketRespuestaEmail({
        to: usuario.correo,
        nombreUsuario: usuario.nombre ?? "Usuario",
        ticketId: ticket.id,
        asunto: ticket.asunto,
        respuesta: respuesta.trim(),
        estado,
      }).catch(() => {});
    }
  }

  return Response.json({ ticket });
}
