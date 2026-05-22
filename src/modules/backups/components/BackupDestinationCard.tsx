import { Cloud, HardDrive } from "lucide-react";
import Badge from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function BackupDestinationCard() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Card padding="md">
        <Cloud className="h-5 w-5 text-primary" />
        <p className="mt-3 text-sm font-semibold text-text-primary">Supabase Storage privado</p>
        <p className="mt-1 text-xs leading-5 text-text-secondary">Destino principal recomendado. Sin URLs publicas permanentes.</p>
        <Badge className="mt-3" variant="success">Preparado</Badge>
      </Card>
      <Card padding="md">
        <Cloud className="h-5 w-5 text-text-secondary" />
        <p className="mt-3 text-sm font-semibold text-text-primary">S3 compatible externo</p>
        <p className="mt-1 text-xs leading-5 text-text-secondary">Modelo y configuracion preparados para doble destino.</p>
        <Badge className="mt-3" variant="muted">Proximamente</Badge>
      </Card>
      <Card padding="md">
        <HardDrive className="h-5 w-5 text-text-secondary" />
        <p className="mt-3 text-sm font-semibold text-text-primary">Descarga cifrada</p>
        <p className="mt-1 text-xs leading-5 text-text-secondary">Requiere reautenticacion y enlaces caducados.</p>
        <Badge className="mt-3" variant="warning">Controlado</Badge>
      </Card>
    </div>
  );
}
