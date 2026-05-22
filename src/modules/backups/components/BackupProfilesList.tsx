import { CalendarClock, CheckCircle2, PauseCircle } from "lucide-react";
import Badge from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import type { BackupProfile } from "../types/backup.types";
import { RECOMMENDED_BACKUP_PROFILES } from "../services/backupProfilesService";
import { backupTypeLabel, formatDateTime } from "../utils/backupFormatters";

export default function BackupProfilesList({ profiles }: { profiles: BackupProfile[] }) {
  return (
    <div className="space-y-5">
      {profiles.length === 0 ? (
        <EmptyState
          variant="compact"
          icon={<CalendarClock className="h-8 w-8" />}
          title="No hay automatizaciones activas"
          description="La estructura ya esta preparada para perfiles programados y retencion."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {profiles.map((profile) => (
            <Card key={profile.id} padding="md" className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{profile.name}</p>
                  <p className="mt-1 text-xs text-text-secondary">{profile.description}</p>
                </div>
                <Badge variant={profile.enabled ? "success" : "muted"}>{profile.enabled ? "Activo" : "Inactivo"}</Badge>
              </div>
              <div className="grid gap-2 text-xs text-text-secondary sm:grid-cols-2">
                <span>Tipo: {backupTypeLabel(profile.backup_type)}</span>
                <span>Frecuencia: {profile.schedule_type}</span>
                <span>Zona: {profile.timezone}</span>
                <span>Actualizado: {formatDateTime(profile.updated_at)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div>
        <p className="mb-3 text-sm font-semibold text-text-primary">Perfiles recomendados</p>
        <div className="grid gap-3 lg:grid-cols-2">
          {RECOMMENDED_BACKUP_PROFILES.map((profile) => (
            <Card key={profile.name} padding="md">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-primary">
                  {profile.backup_type === "full" ? <CheckCircle2 className="h-5 w-5" /> : <PauseCircle className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{profile.name}</p>
                  <p className="mt-1 text-xs leading-5 text-text-secondary">{profile.description}</p>
                  <Badge className="mt-3" variant="muted">Sugerido, no activo</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
