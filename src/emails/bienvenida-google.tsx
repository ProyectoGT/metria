import * as React from "react";
import { BaseEmail, EmailButton, EmailText, EmailHeading } from "./base";

interface BienvenidaGoogleEmailProps {
  nombre: string;
  correo: string;
  baseUrl: string;
}

export function BienvenidaGoogleEmail({ nombre, correo, baseUrl }: BienvenidaGoogleEmailProps) {
  return (
    <BaseEmail previewText={`Acceso concedido a Metria CRM, ${nombre}`}>
      {/* Google icon */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ display: "inline-block", width: 56, height: 56, borderRadius: "50%", backgroundColor: "#f0fdf4", lineHeight: "56px", textAlign: "center" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: "middle" }}>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        </div>
      </div>

      <EmailHeading>Acceso concedido al CRM</EmailHeading>
      <EmailText style={{ textAlign: "center" }}>Hola <strong>{nombre}</strong>,</EmailText>
      <EmailText style={{ textAlign: "center" }}>
        Se te ha dado acceso a <strong>Metria CRM</strong> de Master Iberica.
        Puedes entrar usando tu cuenta de Google con el correo <strong>{correo}</strong>.
      </EmailText>

      <div style={{ textAlign: "center" }}>
        <EmailButton href={`${baseUrl}/login`}>Acceder al CRM</EmailButton>
      </div>

      {/* Instructions */}
      <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: "#f8fafc", borderRadius: 8, border: "1px solid #e4e4e7", marginBottom: 28 }}>
        <tbody>
          <tr>
            <td style={{ padding: "20px 24px" }}>
              <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "#3f3f46", textTransform: "uppercase", letterSpacing: "0.05em" }}>Como acceder</p>
              {[
                "Haz clic en el boton 'Acceder al CRM'",
                "Selecciona 'Continuar con Google'",
                "Elige la cuenta " + correo,
                "¡Listo! Ya puedes usar el sistema",
              ].map((item, i) => (
                <p key={i} style={{ margin: "4px 0", fontSize: 13, color: "#52525b", lineHeight: "1.5" }}>
                  {i + 1}. &nbsp;{item}
                </p>
              ))}
            </td>
          </tr>
        </tbody>
      </table>

      <EmailText style={{ fontSize: 13, color: "#a1a1aa", textAlign: "center" }}>
        Si tienes algun problema para acceder, contacta con el administrador del sistema.
      </EmailText>
    </BaseEmail>
  );
}
