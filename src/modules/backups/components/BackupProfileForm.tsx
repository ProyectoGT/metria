import { Card } from "@/components/ui/card";

export default function BackupProfileForm() {
  return (
    <Card padding="md">
      <p className="text-sm font-semibold text-text-primary">Formulario de perfil preparado</p>
      <p className="mt-1 text-sm text-text-secondary">
        La edicion de automatizaciones queda reservada para la fase de scheduler y reintentos.
      </p>
    </Card>
  );
}
