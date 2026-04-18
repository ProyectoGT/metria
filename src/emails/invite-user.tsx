import * as React from "react";
import { BaseEmail, EmailButton, EmailText, EmailHeading } from "./base";

interface InviteUserEmailProps {
  nombre: string;
  invitadoPor: string;
  actionUrl: string;
}

export function InviteUserEmail({ nombre, invitadoPor, actionUrl }: InviteUserEmailProps) {
  return (
    <BaseEmail previewText={`${invitadoPor} te ha invitado a Metria CRM`}>
      {/* Icon */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ display: "inline-block", width: 56, height: 56, borderRadius: "50%", backgroundColor: "#eff6ff", lineHeight: "56px", textAlign: "center" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: "middle" }}>
            <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#2563eb"/>
          </svg>
        </div>
      </div>

      <EmailHeading>¡Bienvenido al CRM!</EmailHeading>
      <EmailText style={{ textAlign: "center" }}>Hola <strong>{nombre}</strong>,</EmailText>
      <EmailText style={{ textAlign: "center" }}>
        <strong>{invitadoPor}</strong> te ha dado acceso al CRM de <strong>Master Iberica</strong>.
        Haz clic en el boton para establecer tu contrasena y comenzar.
      </EmailText>

      <div style={{ textAlign: "center" }}>
        <EmailButton href={actionUrl}>Activar mi cuenta</EmailButton>
      </div>

      {/* Features */}
      <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: "#f8fafc", borderRadius: 8, border: "1px solid #e4e4e7", marginBottom: 28 }}>
        <tbody>
          <tr>
            <td style={{ padding: "20px 24px" }}>
              <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "#3f3f46", textTransform: "uppercase", letterSpacing: "0.05em" }}>¿Que puedes hacer?</p>
              {["Gestionar propiedades y fincas", "Consultar y crear solicitudes", "Gestionar tu agenda y tareas diarias", "Acceder al modulo de desarrollo"].map((item) => (
                <p key={item} style={{ margin: "4px 0", fontSize: 13, color: "#52525b", lineHeight: "1.5" }}>✓ &nbsp;{item}</p>
              ))}
            </td>
          </tr>
        </tbody>
      </table>

      <EmailText style={{ fontSize: 13, color: "#a1a1aa", textAlign: "center" }}>
        El enlace de activacion expira en <strong>24 horas</strong>.<br />
        Si no esperabas esta invitacion, puedes ignorar este correo.
      </EmailText>

      <hr style={{ border: "none", borderTop: "1px solid #e4e4e7", margin: "28px 0" }} />

      <p style={{ margin: 0, fontSize: 12, color: "#a1a1aa", textAlign: "center", lineHeight: "1.5" }}>
        Si el boton no funciona, copia y pega este enlace:<br />
        <span style={{ color: "#2563eb", wordBreak: "break-all" }}>{actionUrl}</span>
      </p>
    </BaseEmail>
  );
}
