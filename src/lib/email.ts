import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { resend, FROM_EMAIL } from "./resend";
import { InviteUserEmail } from "@/emails/invite-user";
import { BienvenidaGoogleEmail } from "@/emails/bienvenida-google";
import { TicketAdminEmail } from "@/emails/ticket-admin";
import { TicketRespuestaEmail } from "@/emails/ticket-respuesta";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://masteriberica.digital";

// ── Invitacion por contraseña ────────────────────────────────────────────────

export async function sendInviteEmail(params: {
  to: string;
  nombre: string;
  invitadoPor: string;
  actionUrl: string;
}) {
  const html = renderToStaticMarkup(
    createElement(InviteUserEmail, {
      nombre: params.nombre,
      invitadoPor: params.invitadoPor,
      actionUrl: params.actionUrl,
    })
  );

  return resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: "Bienvenido a Metria CRM — Activa tu cuenta",
    html,
  });
}

// ── Bienvenida Solo Google ───────────────────────────────────────────────────

export async function sendBienvenidaGoogleEmail(params: {
  to: string;
  nombre: string;
  correo: string;
}) {
  const html = renderToStaticMarkup(
    createElement(BienvenidaGoogleEmail, {
      nombre: params.nombre,
      correo: params.correo,
      baseUrl: BASE_URL,
    })
  );

  return resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: "Bienvenido a Metria CRM",
    html,
  });
}

// ── Nuevo ticket → admins ────────────────────────────────────────────────────

export async function sendTicketAdminEmail(params: {
  to: string[];
  ticketId: number;
  nombreUsuario: string;
  tipo: string;
  asunto: string;
  descripcion: string;
  prioridad: string;
}) {
  if (params.to.length === 0) return;

  const html = renderToStaticMarkup(
    createElement(TicketAdminEmail, {
      ticketId: params.ticketId,
      nombreUsuario: params.nombreUsuario,
      tipo: params.tipo,
      asunto: params.asunto,
      descripcion: params.descripcion,
      prioridad: params.prioridad,
      baseUrl: BASE_URL,
    })
  );

  return resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: `[Soporte Metria] #${params.ticketId} — ${params.tipo}: ${params.asunto}`,
    html,
  });
}

// ── Respuesta a ticket → usuario ─────────────────────────────────────────────

export async function sendTicketRespuestaEmail(params: {
  to: string;
  nombreUsuario: string;
  ticketId: number;
  asunto: string;
  respuesta: string;
  estado: string;
}) {
  const html = renderToStaticMarkup(
    createElement(TicketRespuestaEmail, {
      nombreUsuario: params.nombreUsuario,
      ticketId: params.ticketId,
      asunto: params.asunto,
      respuesta: params.respuesta,
      estado: params.estado,
      baseUrl: BASE_URL,
    })
  );

  return resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: `Re: Ticket #${params.ticketId} — ${params.asunto}`,
    html,
  });
}
