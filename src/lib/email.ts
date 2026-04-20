import { resend, FROM_EMAIL } from "./resend";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://masteriberica.digital";

const HEADER = `
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
<tr><td style="background-color:#000000;padding:28px 40px;text-align:center;">
  <img src="https://masteriberica.digital/logo-bg-master-iberica.png" alt="Master Iberica" height="44" style="height:44px;width:auto;display:inline-block;" />
</td></tr>
<tr><td style="padding:40px 40px 32px;">`;

const FOOTER = `
</td></tr>
<tr><td style="background-color:#fafafa;border-top:1px solid #e4e4e7;padding:20px 40px;text-align:center;">
  <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
    &copy; 2026 Master Iberica &middot; CRM Interno<br/>Este es un correo automatico, por favor no respondas a este mensaje.
  </p>
</td></tr>
</table></td></tr></table>`;

function wrap(body: string) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head><body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${HEADER}${body}${FOOTER}</body></html>`;
}

function btn(href: string, label: string, color = "#2563eb") {
  return `<div style="text-align:center;margin:24px 0;"><a href="${href}" style="display:inline-block;background-color:${color};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">${label}</a></div>`;
}

function icon(svgPath: string, bgColor: string) {
  return `<div style="text-align:center;margin-bottom:24px;"><div style="display:inline-block;width:56px;height:56px;border-radius:50%;background-color:${bgColor};line-height:56px;text-align:center;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;">${svgPath}</svg></div></div>`;
}

function infoBox(title: string, items: string[], bg = "#f8fafc", border = "#e4e4e7", textColor = "#52525b") {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:${bg};border-radius:8px;border:1px solid ${border};margin-bottom:24px;"><tr><td style="padding:20px 24px;"><p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#3f3f46;text-transform:uppercase;letter-spacing:0.05em;">${title}</p>${items.map((i) => `<p style="margin:4px 0;font-size:13px;color:${textColor};line-height:1.5;">${i}</p>`).join("")}</td></tr></table>`;
}

function alertBox(title: string, body: string, bg: string, border: string, titleColor: string, bodyColor: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:${bg};border-radius:8px;border:1px solid ${border};margin-bottom:24px;"><tr><td style="padding:16px 20px;"><p style="margin:0 0 6px;font-size:13px;font-weight:600;color:${titleColor};">${title}</p><p style="margin:0;font-size:13px;color:${bodyColor};line-height:1.5;">${body}</p></td></tr></table>`;
}

function fallbackUrl(url: string) {
  return `<hr style="border:none;border-top:1px solid #e4e4e7;margin:28px 0;"/><p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;line-height:1.5;">Si el boton no funciona, copia y pega este enlace:<br/><span style="color:#2563eb;word-break:break-all;">${url}</span></p>`;
}

// ── Invitacion por contraseña ─────────────────────────────────────────────────

export async function sendInviteEmail(params: {
  to: string; nombre: string; invitadoPor: string; actionUrl: string;
}) {
  const html = wrap(`
    ${icon('<path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#2563eb"/>', "#eff6ff")}
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#09090b;text-align:center;">¡Bienvenido al CRM!</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#71717a;text-align:center;line-height:1.6;">Hola <strong>${params.nombre}</strong>, <strong>${params.invitadoPor}</strong> te ha dado acceso al CRM de <strong style="color:#09090b;">Master Iberica</strong>. Haz clic en el boton para establecer tu contrasena.</p>
    ${btn(params.actionUrl, "Activar mi cuenta")}
    ${infoBox("¿Que puedes hacer?", ["✓ &nbsp;Gestionar propiedades y fincas", "✓ &nbsp;Consultar y crear solicitudes", "✓ &nbsp;Gestionar tu agenda y tareas diarias", "✓ &nbsp;Acceder al modulo de desarrollo"])}
    <p style="margin:0;font-size:13px;color:#a1a1aa;text-align:center;line-height:1.5;">El enlace expira en <strong>24 horas</strong>. Si no esperabas esta invitacion, ignoralo.</p>
    ${fallbackUrl(params.actionUrl)}
  `);

  return resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: "Bienvenido a Metria CRM — Activa tu cuenta",
    html,
  });
}

// ── Verificación acceso Google ────────────────────────────────────────────────

export async function sendVerificacionGoogleEmail(params: {
  to: string; nombre: string; correo: string; verificationUrl: string;
}) {
  const html = wrap(`
    ${icon('<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>', "#f0fdf4")}
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#09090b;text-align:center;">Activa tu acceso al CRM</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#71717a;text-align:center;line-height:1.6;">Hola <strong>${params.nombre}</strong>, se te ha dado acceso a <strong style="color:#09090b;">Metria CRM</strong>. Haz clic en el boton para verificar y activar tu cuenta.</p>
    ${btn(params.verificationUrl, "Verificar y activar mi cuenta", "#22c55e")}
    ${infoBox("Tras activar tu cuenta", ["1. &nbsp;Vuelve a la pagina de acceso del CRM", "2. &nbsp;Haz clic en 'Continuar con Google'", `3. &nbsp;Selecciona la cuenta <strong>${params.correo}</strong>`, "4. &nbsp;¡Listo! Ya puedes usar el sistema"])}
    ${alertBox("Enlace de verificacion", "Este enlace es valido durante 7 dias. Si no solicitaste este acceso, ignoralo.", "#fef9c3", "#fde047", "#713f12", "#713f12")}
    ${fallbackUrl(params.verificationUrl)}
  `);

  return resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: "Activa tu acceso a Metria CRM",
    html,
  });
}

// ── Nuevo ticket → admins ─────────────────────────────────────────────────────

const PRIORIDAD_BADGE: Record<string, string> = {
  alta:  `<span style="display:inline-block;padding:2px 10px;border-radius:12px;background-color:#fef2f2;color:#dc2626;border:1px solid #fecaca;font-size:12px;font-weight:700;">Alta</span>`,
  media: `<span style="display:inline-block;padding:2px 10px;border-radius:12px;background-color:#fff7ed;color:#d97706;border:1px solid #fed7aa;font-size:12px;font-weight:700;">Media</span>`,
  baja:  `<span style="display:inline-block;padding:2px 10px;border-radius:12px;background-color:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;font-size:12px;font-weight:700;">Baja</span>`,
};

export async function sendTicketAdminEmail(params: {
  to: string[]; ticketId: number; nombreUsuario: string;
  tipo: string; asunto: string; descripcion: string; prioridad: string;
}) {
  if (params.to.length === 0) return;

  const badge = PRIORIDAD_BADGE[params.prioridad] ?? PRIORIDAD_BADGE.media;

  const html = wrap(`
    ${icon('<path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM13 14H11V12H13V14ZM13 10H11V6H13V10Z" fill="#dc2626"/>', "#fef2f2")}
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#09090b;text-align:center;">Nuevo ticket de soporte</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#71717a;text-align:center;">Se ha abierto un nuevo ticket que requiere atencion.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e4e4e7;margin-bottom:20px;">
      <tr><td style="padding:16px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:13px;color:#71717a;padding-bottom:8px;width:90px;vertical-align:top;">Ticket</td><td style="font-size:14px;font-weight:700;color:#09090b;padding-bottom:8px;">#${params.ticketId}</td></tr>
          <tr><td style="font-size:13px;color:#71717a;padding-bottom:8px;vertical-align:top;">De</td><td style="font-size:14px;font-weight:600;color:#09090b;padding-bottom:8px;">${params.nombreUsuario}</td></tr>
          <tr><td style="font-size:13px;color:#71717a;padding-bottom:8px;vertical-align:top;">Tipo</td><td style="font-size:13px;color:#374151;padding-bottom:8px;">${params.tipo}</td></tr>
          <tr><td style="font-size:13px;color:#71717a;padding-bottom:8px;vertical-align:top;">Prioridad</td><td style="padding-bottom:8px;">${badge}</td></tr>
          <tr><td style="font-size:13px;color:#71717a;vertical-align:top;">Asunto</td><td style="font-size:14px;font-weight:600;color:#09090b;">${params.asunto}</td></tr>
        </table>
      </td></tr>
    </table>
    <div style="background-color:#ffffff;border:1px solid #e4e4e7;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 10px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Descripcion</p>
      <p style="margin:0;font-size:14px;color:#374151;white-space:pre-wrap;line-height:1.6;">${params.descripcion}</p>
    </div>
    ${btn(`${BASE_URL}/soporte`, "Ver ticket en el CRM →", "#09090b")}
  `);

  return resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: `[Soporte Metria] #${params.ticketId} — ${params.tipo}: ${params.asunto}`,
    html,
  });
}

// ── Respuesta a ticket → usuario ──────────────────────────────────────────────

const ESTADO_BADGE: Record<string, string> = {
  abierto:     `<span style="display:inline-block;padding:2px 10px;border-radius:12px;background-color:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;font-size:12px;font-weight:700;">Abierto</span>`,
  en_progreso: `<span style="display:inline-block;padding:2px 10px;border-radius:12px;background-color:#fff7ed;color:#c2410c;border:1px solid #fed7aa;font-size:12px;font-weight:700;">En progreso</span>`,
  resuelto:    `<span style="display:inline-block;padding:2px 10px;border-radius:12px;background-color:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;font-size:12px;font-weight:700;">Resuelto</span>`,
  cerrado:     `<span style="display:inline-block;padding:2px 10px;border-radius:12px;background-color:#f4f4f5;color:#52525b;border:1px solid #e4e4e7;font-size:12px;font-weight:700;">Cerrado</span>`,
};

export async function sendTicketRespuestaEmail(params: {
  to: string; nombreUsuario: string; ticketId: number;
  asunto: string; respuesta: string; estado: string;
}) {
  const badge = ESTADO_BADGE[params.estado] ?? ESTADO_BADGE.abierto;

  const html = wrap(`
    ${icon('<path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z" fill="#2563eb"/>', "#eff6ff")}
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#09090b;text-align:center;">Tu ticket ha sido actualizado</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#71717a;text-align:center;">Hola <strong>${params.nombreUsuario}</strong>, el equipo de soporte ha respondido a tu ticket.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e4e4e7;margin-bottom:20px;">
      <tr><td style="padding:16px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:13px;color:#71717a;padding-bottom:8px;width:80px;">Ticket</td><td style="font-size:14px;font-weight:700;color:#09090b;padding-bottom:8px;">#${params.ticketId}</td></tr>
          <tr><td style="font-size:13px;color:#71717a;padding-bottom:8px;">Asunto</td><td style="font-size:13px;color:#09090b;padding-bottom:8px;">${params.asunto}</td></tr>
          <tr><td style="font-size:13px;color:#71717a;">Estado</td><td>${badge}</td></tr>
        </table>
      </td></tr>
    </table>
    <div style="background-color:#f0f9ff;border:1px solid #bae6fd;border-left:4px solid #0ea5e9;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:11px;color:#0369a1;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">Respuesta del equipo</p>
      <p style="margin:0;font-size:14px;color:#0c4a6e;white-space:pre-wrap;line-height:1.6;">${params.respuesta}</p>
    </div>
    ${btn(`${BASE_URL}/soporte`, "Ver mi ticket →")}
    <p style="margin:0;font-size:13px;color:#a1a1aa;text-align:center;">Si tienes mas preguntas, abre un nuevo ticket desde el CRM.</p>
  `);

  return resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: `Re: Ticket #${params.ticketId} — ${params.asunto}`,
    html,
  });
}
