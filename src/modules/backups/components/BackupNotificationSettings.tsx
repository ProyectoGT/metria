import { MailCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function BackupNotificationSettings() {
  return (
    <Card padding="lg">
      <div className="flex items-start gap-3">
        <MailCheck className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-semibold text-text-primary">Notificaciones</p>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            El servicio usa Resend cuando hay clave configurada. Los emails nunca incluyen secretos,
            tokens ni enlaces publicos a backups; solo apuntan al panel interno protegido.
          </p>
        </div>
      </div>
    </Card>
  );
}
