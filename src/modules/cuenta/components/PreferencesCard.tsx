"use client";

import { Globe, Clock, CalendarDays } from "lucide-react";

export default function PreferencesCard() {
  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Globe className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              Preferencias
            </h2>
            <p className="text-xs text-text-secondary">
              Idioma, zona horaria y formato regional
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border">
        <PrefRow
          icon={<Globe className="h-4 w-4" />}
          label="Idioma"
          value="Español (ES)"
        />
        <PrefRow
          icon={<Clock className="h-4 w-4" />}
          label="Zona horaria"
          value="Europe/Madrid (GMT+1)"
        />
        <PrefRow
          icon={<CalendarDays className="h-4 w-4" />}
          label="Formato de fecha"
          value="DD/MM/YYYY"
        />
      </div>

      <div className="px-5 py-3">
        <p className="text-xs text-text-secondary/60">
          Estas opciones se configuran automaticamente segun tu region.
        </p>
      </div>
    </div>
  );
}

function PrefRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-text-secondary">
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
        <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          {label}
        </span>
        <span className="text-sm font-medium text-text-primary">{value}</span>
      </div>
    </div>
  );
}
