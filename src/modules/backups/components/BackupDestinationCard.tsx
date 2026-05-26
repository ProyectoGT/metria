import { CheckCircle2, Cloud, HardDrive, Lock } from "lucide-react";
import Badge from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function BackupDestinationCard() {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-text-primary">Destinos disponibles</p>
      <div className="grid gap-3 md:grid-cols-3">
        <Card padding="md" className="space-y-3">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold text-text-primary">Supabase Storage privado</p>
          </div>
          <p className="text-xs leading-5 text-text-secondary">
            Destino principal. Bucket <span className="font-mono">backups-privado</span> sin URLs publicas. Acceso solo via panel interno con autenticacion.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success"><CheckCircle2 className="mr-1 inline h-3 w-3" />Activo</Badge>
            <Badge variant="muted">Cifrado en transit</Badge>
          </div>
        </Card>

        <Card padding="md" className="space-y-3 opacity-70">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-text-secondary" />
            <p className="text-sm font-semibold text-text-primary">S3 / almacenamiento externo</p>
          </div>
          <p className="text-xs leading-5 text-text-secondary">
            Doble destino con proveedores S3 compatibles (AWS, Cloudflare R2, etc.). Requiere credenciales en variables de entorno.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="muted">Requiere config.</Badge>
          </div>
        </Card>

        <Card padding="md" className="space-y-3">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-text-secondary" />
            <p className="text-sm font-semibold text-text-primary">Descarga cifrada</p>
          </div>
          <p className="text-xs leading-5 text-text-secondary">
            Descarga directa del backup para custodia offline. Requiere reautenticacion y los enlaces caducan automaticamente.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="warning"><Lock className="mr-1 inline h-3 w-3" />Con reautenticacion</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}
