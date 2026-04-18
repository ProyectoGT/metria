import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase";
import { rateLimiter, getIp } from "@/lib/rate-limiter";
import { CreateTicketSchema } from "@/lib/validations/ticket";
import { sendTicketAdminEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    await rateLimiter.consume(getIp(request.headers as Headers));
  } catch {
    return Response.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  try {
    // Verificar autenticación
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const raw = await request.json();
    const parsed = CreateTicketSchema.safeParse(raw);

    if (!parsed.success) {
      return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const { tipo, asunto, descripcion, prioridad, nombre_usuario, user_id } = parsed.data;

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = admin as any;

    // Insertar ticket
    const { data: ticket, error: insertError } = await adminAny
      .from("tickets_soporte")
      .insert({
        user_id: user_id ?? null,
        nombre_usuario: nombre_usuario?.trim() || "Usuario",
        tipo,
        asunto: asunto.trim(),
        descripcion: descripcion.trim(),
        prioridad: prioridad ?? "media",
        estado: "abierto",
      })
      .select()
      .single();

    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 });
    }

    // Notificar a administradores de soporte
    if (process.env.RESEND_API_KEY) {
      const { data: contactos } = await adminAny
        .from("contactos_soporte")
        .select("email")
        .not("email", "is", null);

      const adminEmails = (contactos ?? [])
        .filter((c: { email: string | null }) => c.email)
        .map((c: { email: string }) => c.email);

      sendTicketAdminEmail({
        to: adminEmails,
        ticketId: ticket.id,
        nombreUsuario: nombre_usuario || "Usuario",
        tipo,
        asunto,
        descripcion,
        prioridad: prioridad ?? "media",
      }).catch(() => {});
    }

    return Response.json({ ticket }, { status: 201 });
  } catch {
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
