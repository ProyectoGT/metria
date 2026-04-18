import * as React from "react";
import { BaseEmail, EmailButton, EmailText, EmailHeading } from "./base";

interface TicketRespuestaEmailProps {
  nombreUsuario: string;
  ticketId: number;
  asunto: string;
  respuesta: string;
  estado: string;
  baseUrl: string;
}

const ESTADO_LABEL: Record<string, string> = {
  abierto: "Abierto",
  en_progreso: "En progreso",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

const ESTADO_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  abierto: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  en_progreso: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  resuelto: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  cerrado: { bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" },
};

export function TicketRespuestaEmail({
  nombreUsuario, ticketId, asunto, respuesta, estado, baseUrl,
}: TicketRespuestaEmailProps) {
  const estadoLabel = ESTADO_LABEL[estado] ?? estado;
  const colors = ESTADO_COLOR[estado] ?? ESTADO_COLOR.abierto;

  return (
    <BaseEmail previewText={`Respuesta a tu ticket #${ticketId}: ${asunto}`}>
      {/* Icon */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ display: "inline-block", width: 56, height: 56, borderRadius: "50%", backgroundColor: "#eff6ff", lineHeight: "56px", textAlign: "center" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: "middle" }}>
            <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z" fill="#2563eb"/>
          </svg>
        </div>
      </div>

      <EmailHeading>Tu ticket ha sido actualizado</EmailHeading>
      <EmailText style={{ textAlign: "center" }}>Hola <strong>{nombreUsuario}</strong>,</EmailText>
      <EmailText style={{ textAlign: "center" }}>
        El equipo de soporte ha respondido a tu ticket.
      </EmailText>

      {/* Ticket info */}
      <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: "#f8fafc", borderRadius: 8, border: "1px solid #e4e4e7", marginBottom: 20 }}>
        <tbody>
          <tr>
            <td style={{ padding: "16px 20px" }}>
              <table width="100%" cellPadding={0} cellSpacing={0}>
                <tbody>
                  <tr>
                    <td style={{ fontSize: 13, color: "#71717a", paddingBottom: 6, width: 90 }}>Ticket</td>
                    <td style={{ fontSize: 13, fontWeight: 600, color: "#09090b", paddingBottom: 6 }}>#{ticketId}</td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: 13, color: "#71717a", paddingBottom: 6 }}>Asunto</td>
                    <td style={{ fontSize: 13, color: "#09090b", paddingBottom: 6 }}>{asunto}</td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: 13, color: "#71717a" }}>Estado</td>
                    <td style={{ paddingTop: 2 }}>
                      <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 12, backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, fontSize: 12, fontWeight: 700 }}>
                        {estadoLabel}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Response */}
      <div style={{ backgroundColor: "#f0f9ff", border: "1px solid #bae6fd", borderLeft: "4px solid #0ea5e9", borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <p style={{ margin: "0 0 8px", fontSize: 11, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
          Respuesta del equipo de soporte
        </p>
        <p style={{ margin: 0, fontSize: 14, color: "#0c4a6e", whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
          {respuesta}
        </p>
      </div>

      <div style={{ textAlign: "center" }}>
        <EmailButton href={`${baseUrl}/soporte`}>Ver mi ticket</EmailButton>
      </div>

      <EmailText style={{ fontSize: 13, color: "#a1a1aa", textAlign: "center" }}>
        Si tienes mas preguntas, puedes abrir un nuevo ticket desde el CRM.
      </EmailText>
    </BaseEmail>
  );
}
