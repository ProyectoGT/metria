import type { BackupRun } from "../types/backup.types";
import { backupTypeLabel, formatBytes, formatDuration } from "../utils/backupFormatters";

type BackupNotificationInput = {
  run: BackupRun;
  recipients: string[];
  actorName: string;
};

async function sendMail(args: { to: string[]; subject: string; html: string }) {
  if (args.to.length === 0) return;
  if (!process.env.RESEND_API_KEY) return;

  const { resend, FROM_EMAIL } = await import("@/lib/resend");
  await resend.emails.send({
    from: FROM_EMAIL,
    to: args.to,
    subject: args.subject,
    html: args.html,
  });
}

function row(label: string, value: string) {
  return `<tr><td style="padding:6px 12px;color:#64748b">${label}</td><td style="padding:6px 12px;font-weight:600;color:#0f172a">${value}</td></tr>`;
}

export async function notifyBackupCompleted({ run, recipients, actorName }: BackupNotificationInput): Promise<void> {
  await sendMail({
    to: recipients,
    subject: "[Metria] Copia de seguridad completada correctamente",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.5">
        <h2>Se ha completado una copia de seguridad.</h2>
        <table>
          ${row("Tipo", backupTypeLabel(run.backup_type))}
          ${row("Estado", "Verificada")}
          ${row("Duracion", formatDuration(run.duration_ms))}
          ${row("Tamano", formatBytes(run.size_bytes))}
          ${row("Destino", "Panel interno protegido")}
          ${row("Ejecutada por", actorName)}
        </table>
        <p>No se requiere accion.</p>
      </div>
    `,
  });
}

export async function notifyBackupFailed({ run, recipients }: BackupNotificationInput): Promise<void> {
  await sendMail({
    to: recipients,
    subject: "[Metria] Error en copia de seguridad",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.5">
        <h2>No se ha podido completar la copia de seguridad.</h2>
        <table>
          ${row("Tipo", backupTypeLabel(run.backup_type))}
          ${row("Error", run.error_message ?? "Error no especificado")}
          ${row("Reintento automatico", "Gestionado por cola de jobs")}
          ${row("Accion recomendada", "Revisar el historial interno de backups")}
        </table>
      </div>
    `,
  });
}
