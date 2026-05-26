import { Calendar } from "lucide-react";
import { calculateNextBackupRun } from "../utils/scheduleCalculator";
import type { BackupScheduleType } from "../types/backup.types";

type Props = {
  scheduleType: BackupScheduleType;
  scheduleConfig: Record<string, unknown>;
  timezone: string;
  enabled?: boolean;
};

export default function BackupNextRunPreview({ scheduleType, scheduleConfig, timezone, enabled = true }: Props) {
  const { nextRun, error } = calculateNextBackupRun(
    { schedule_type: scheduleType, schedule_config: scheduleConfig, timezone, enabled },
    new Date(),
  );

  if (!enabled) {
    return (
      <p className="flex items-center gap-2 text-xs text-text-secondary">
        <Calendar className="h-3.5 w-3.5" />
        El perfil esta pausado. Activalo para programar ejecuciones.
      </p>
    );
  }

  if (error) {
    return (
      <p className="flex items-center gap-2 text-xs text-danger">
        <Calendar className="h-3.5 w-3.5" />
        {error}
      </p>
    );
  }

  if (!nextRun) {
    return (
      <p className="flex items-center gap-2 text-xs text-text-secondary">
        <Calendar className="h-3.5 w-3.5" />
        Completa la configuracion para ver la proxima ejecucion.
      </p>
    );
  }

  const formatted = nextRun.toLocaleString("es-ES", {
    timeZone: timezone || "Europe/Madrid",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <p className="flex items-center gap-2 text-xs text-text-secondary">
      <Calendar className="h-3.5 w-3.5 text-primary" />
      Proxima ejecucion:{" "}
      <span className="font-medium text-text-primary">{formatted}</span>
    </p>
  );
}
