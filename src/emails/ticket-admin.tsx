import * as React from "react";
import { BaseEmail, EmailButton, EmailText, EmailHeading } from "./base";

interface TicketAdminEmailProps {
  ticketId: number;
  nombreUsuario: string;
  tipo: string;
  asunto: string;
  descripcion: string;
  prioridad: string;
  baseUrl: string;
}

const PRIORIDAD: Record<string, { label: string; color: string; bg: string; border: string }> = {
  alta:  { label: "Alta",  color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  media: { label: "Media", color: "#d97706", bg: "#fff7ed", border: "#fed7aa" },
  baja:  { label: "Baja",  color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
};

export function TicketAdminEmail({
  ticketId, nombreUsuario, tipo, asunto, descripcion, prioridad, baseUrl,
}: TicketAdminEmailProps) {
  const p = PRIORIDAD[prioridad] ?? PRIORIDAD.media;

  return (
    <BaseEmail previewText={`Ticket #${ticketId} — ${tipo}: ${asunto}`}>
      {/* Icon */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ display: "inline-block", width: 56, height: 56, borderRadius: "50%", backgroundColor: "#fef2f2", lineHeight: "56px", textAlign: "center" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: "middle" }}>
            <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM13 14H11V12H13V14ZM13 10H11V6H13V10Z" fill="#dc2626"/>
          </svg>
        </div>
      </div>

      <EmailHeading>Nuevo ticket de soporte</EmailHeading>
      <EmailText style={{ textAlign: "center" }}>
        Se ha abierto un nuevo ticket que requiere atencion.
      </EmailText>

      {/* Ticket details */}
      <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: "#f8fafc", borderRadius: 8, border: "1px solid #e4e4e7", marginBottom: 20 }}>
        <tbody>
          <tr>
            <td style={{ padding: "16px 20px" }}>
              <table width="100%" cellPadding={0} cellSpacing={0}>
                <tbody>
                  <tr>
                    <td style={{ fontSize: 13, color: "#71717a", paddingBottom: 8, width: 90, verticalAlign: "top" }}>Ticket</td>
                    <td style={{ fontSize: 14, fontWeight: 700, color: "#09090b", paddingBottom: 8 }}>#{ticketId}</td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: 13, color: "#71717a", paddingBottom: 8, verticalAlign: "top" }}>De</td>
                    <td style={{ fontSize: 14, fontWeight: 600, color: "#09090b", paddingBottom: 8 }}>{nombreUsuario}</td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: 13, color: "#71717a", paddingBottom: 8, verticalAlign: "top" }}>Tipo</td>
                    <td style={{ fontSize: 13, color: "#374151", paddingBottom: 8 }}>{tipo}</td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: 13, color: "#71717a", paddingBottom: 8, verticalAlign: "top" }}>Prioridad</td>
                    <td style={{ paddingBottom: 8 }}>
                      <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 12, backgroundColor: p.bg, color: p.color, border: `1px solid ${p.border}`, fontSize: 12, fontWeight: 700 }}>
                        {p.label}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: 13, color: "#71717a", verticalAlign: "top" }}>Asunto</td>
                    <td style={{ fontSize: 14, fontWeight: 600, color: "#09090b" }}>{asunto}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Description */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <p style={{ margin: "0 0 10px", fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
          Descripcion del problema
        </p>
        <p style={{ margin: 0, fontSize: 14, color: "#374151", whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
          {descripcion}
        </p>
      </div>

      <div style={{ textAlign: "center" }}>
        <EmailButton href={`${baseUrl}/soporte`}>Ver ticket en el CRM →</EmailButton>
      </div>

      <EmailText style={{ fontSize: 13, color: "#a1a1aa", textAlign: "center" }}>
        Responde al ticket desde el panel de administracion del CRM.
      </EmailText>
    </BaseEmail>
  );
}
