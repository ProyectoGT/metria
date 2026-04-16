import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase";

export async function POST(request: Request) {
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

    const body = await request.json();
    const { tipo, asunto, descripcion, prioridad, nombre_usuario, user_id } =
      body as {
        tipo: string;
        asunto: string;
        descripcion: string;
        prioridad: string;
        nombre_usuario: string;
        user_id: number | null;
      };

    if (!tipo || !asunto?.trim() || !descripcion?.trim()) {
      return Response.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

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

    // Enviar email a administradores (requiere RESEND_API_KEY y RESEND_FROM_EMAIL)
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (resendKey && fromEmail) {
      const { data: contactos } = await adminAny
        .from("contactos_soporte")
        .select("email, nombre, apellidos")
        .not("email", "is", null);

      const adminEmails = (contactos ?? [])
        .filter((c: { email: string | null }) => c.email)
        .map((c: { email: string }) => c.email);

      if (adminEmails.length > 0) {
        const prioridadLabel =
          { alta: "Alta", media: "Media", baja: "Baja" }[prioridad] ??
          prioridad;
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: adminEmails,
            subject: `[Soporte Metria] #${ticket.id} – ${tipo}: ${asunto}`,
            html: `
              <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
                <div style="background: #2563eb; padding: 24px 32px; border-radius: 12px 12px 0 0;">
                  <h1 style="margin: 0; color: white; font-size: 20px;">Nuevo ticket de soporte #${ticket.id}</h1>
                </div>
                <div style="background: #f9fafb; padding: 24px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; font-size: 13px; color: #6b7280; width: 120px; vertical-align: top;">De</td>
                      <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${nombre_usuario || "Usuario desconocido"}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-size: 13px; color: #6b7280; vertical-align: top;">Tipo</td>
                      <td style="padding: 8px 0; font-size: 14px;">${tipo}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-size: 13px; color: #6b7280; vertical-align: top;">Prioridad</td>
                      <td style="padding: 8px 0; font-size: 14px;">${prioridadLabel}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-size: 13px; color: #6b7280; vertical-align: top;">Asunto</td>
                      <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${asunto}</td>
                    </tr>
                  </table>
                  <div style="margin-top: 16px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
                    <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Descripción</p>
                    <p style="margin: 0; font-size: 14px; white-space: pre-wrap; color: #374151;">${descripcion}</p>
                  </div>
                  ${
                    baseUrl
                      ? `<div style="margin-top: 20px;">
                    <a href="${baseUrl}/soporte" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
                      Ver en Metria CRM →
                    </a>
                  </div>`
                      : ""
                  }
                </div>
              </div>
            `,
          }),
        }).catch(() => {
          // El email falla silenciosamente — el ticket ya está guardado en BD
        });
      }
    }

    return Response.json({ ticket }, { status: 201 });
  } catch {
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
