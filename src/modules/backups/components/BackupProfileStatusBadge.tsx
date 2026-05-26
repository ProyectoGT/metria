import Badge from "@/components/ui/badge";
import type { BackupProfile } from "../types/backup.types";

type Props = {
  profile: Pick<BackupProfile, "enabled" | "last_status">;
};

export default function BackupProfileStatusBadge({ profile }: Props) {
  if (!profile.enabled) {
    return <Badge variant="muted">Pausado</Badge>;
  }
  if (profile.last_status === "config_error") {
    return <Badge variant="danger">Config. invalida</Badge>;
  }
  if (profile.last_status === "failed") {
    return <Badge variant="danger">Fallo</Badge>;
  }
  if (profile.last_status === "running") {
    return <Badge variant="warning">Ejecutando</Badge>;
  }
  if (profile.last_status === "verified") {
    return <Badge variant="success">Activo</Badge>;
  }
  return <Badge variant="primary">Activo</Badge>;
}
