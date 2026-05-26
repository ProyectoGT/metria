"use client";

import type { BackupScheduleType } from "../types/backup.types";

const TIMEZONES = ["Europe/Madrid", "Europe/London", "UTC", "America/New_York", "America/Los_Angeles"];

const WEEKDAYS = [
  { value: "monday", label: "Lunes" },
  { value: "tuesday", label: "Martes" },
  { value: "wednesday", label: "Miercoles" },
  { value: "thursday", label: "Jueves" },
  { value: "friday", label: "Viernes" },
  { value: "saturday", label: "Sabado" },
  { value: "sunday", label: "Domingo" },
];

type Props = {
  scheduleType: BackupScheduleType;
  scheduleConfig: Record<string, unknown>;
  timezone: string;
  onScheduleTypeChange: (type: BackupScheduleType) => void;
  onScheduleConfigChange: (config: Record<string, unknown>) => void;
  onTimezoneChange: (tz: string) => void;
};

export default function BackupScheduleEditor({
  scheduleType,
  scheduleConfig,
  timezone,
  onScheduleTypeChange,
  onScheduleConfigChange,
  onTimezoneChange,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-secondary">Frecuencia</label>
          <select
            className="input"
            value={scheduleType}
            onChange={(e) => {
              onScheduleTypeChange(e.target.value as BackupScheduleType);
              onScheduleConfigChange({});
            }}
          >
            <option value="hourly">Cada hora</option>
            <option value="every_x_hours">Cada X horas</option>
            <option value="daily">Diario</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
            <option value="custom" disabled>Personalizado (proximamente)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-secondary">Zona horaria</label>
          <select
            className="input"
            value={timezone}
            onChange={(e) => onTimezoneChange(e.target.value)}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
      </div>

      {scheduleType === "every_x_hours" && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-secondary">Intervalo en horas</label>
          <input
            type="number"
            className="input w-32"
            min={1}
            max={23}
            value={typeof scheduleConfig.hours === "number" ? scheduleConfig.hours : ""}
            placeholder="p.ej. 6"
            onChange={(e) =>
              onScheduleConfigChange({ hours: parseInt(e.target.value) || 0 })
            }
          />
          <p className="text-xs text-text-secondary">Entre 1 y 23 horas.</p>
        </div>
      )}

      {(scheduleType === "daily" || scheduleType === "weekly" || scheduleType === "monthly") && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-secondary">Hora de ejecucion</label>
          <input
            type="time"
            className="input w-36"
            value={typeof scheduleConfig.hour === "string" ? scheduleConfig.hour : "03:00"}
            onChange={(e) =>
              onScheduleConfigChange({ ...scheduleConfig, hour: e.target.value })
            }
          />
        </div>
      )}

      {scheduleType === "weekly" && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-secondary">Dia de la semana</label>
          <select
            className="input"
            value={typeof scheduleConfig.day === "string" ? scheduleConfig.day : ""}
            onChange={(e) =>
              onScheduleConfigChange({ ...scheduleConfig, day: e.target.value })
            }
          >
            <option value="">Selecciona un dia</option>
            {WEEKDAYS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      )}

      {scheduleType === "monthly" && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-secondary">Dia del mes</label>
          <input
            type="number"
            className="input w-24"
            min={1}
            max={28}
            value={typeof scheduleConfig.monthDay === "number" ? scheduleConfig.monthDay : ""}
            placeholder="p.ej. 1"
            onChange={(e) =>
              onScheduleConfigChange({ ...scheduleConfig, monthDay: parseInt(e.target.value) || 0 })
            }
          />
          <p className="text-xs text-text-secondary">Entre 1 y 28 para garantizar compatibilidad con todos los meses.</p>
        </div>
      )}

      {scheduleType === "custom" && (
        <div className="rounded-lg border border-border bg-muted px-4 py-3">
          <p className="text-sm text-text-secondary">
            La frecuencia personalizada (expresion cron) estara disponible en una proxima version.
          </p>
        </div>
      )}
    </div>
  );
}
