"use client";

import { useState } from "react";
import { AlertTriangle, DatabaseBackup, History, RotateCcw, Settings, ShieldCheck, WandSparkles } from "lucide-react";
import { Tab, Tabs } from "@/components/ui/tabs";
import { Card, SectionCard } from "@/components/ui/card";
import Badge from "@/components/ui/badge";
import type { BackupAuditEvent, BackupHealth, BackupProfile, BackupRun } from "../types/backup.types";
import BackupHealthCard from "./BackupHealthCard";
import ManualBackupWizard from "./ManualBackupWizard";
import BackupProfilesList from "./BackupProfilesList";
import BackupHistoryTable from "./BackupHistoryTable";
import RestoreWizard from "./RestoreWizard";
import BackupAuditLog from "./BackupAuditLog";
import BackupDestinationCard from "./BackupDestinationCard";
import BackupRetentionEditor from "./BackupRetentionEditor";
import BackupNotificationSettings from "./BackupNotificationSettings";

type Props = {
  health: BackupHealth;
  runs: BackupRun[];
  profiles: BackupProfile[];
  auditEvents: BackupAuditEvent[];
  canCreateIncremental: boolean;
};

export default function BackupsDashboard({ health, runs, profiles, auditEvents, canCreateIncremental }: Props) {
  const [tab, setTab] = useState("overview");

  return (
    <div className="space-y-5">
      <Tabs value={tab} onChange={setTab} variant="pill" className="w-full flex-wrap">
        <Tab value="overview" label="Vista general" icon={<ShieldCheck className="h-4 w-4" />} />
        <Tab value="manual" label="Crear copia manual" icon={<DatabaseBackup className="h-4 w-4" />} />
        <Tab value="automations" label="Automatizaciones" icon={<WandSparkles className="h-4 w-4" />} />
        <Tab value="history" label="Historial" count={runs.length} icon={<History className="h-4 w-4" />} />
        <Tab value="restore" label="Restaurar" icon={<RotateCcw className="h-4 w-4" />} />
        <Tab value="audit" label="Auditoria" count={auditEvents.length} icon={<ShieldCheck className="h-4 w-4" />} />
        <Tab value="settings" label="Configuracion" icon={<Settings className="h-4 w-4" />} />
      </Tabs>

      {tab === "overview" && (
        <div className="space-y-5">
          <BackupHealthCard health={health} />
          <SectionCard title="Alertas inteligentes" description="Riesgos detectados en la proteccion actual.">
            {health.openAlerts.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
                <ShieldCheck className="h-5 w-5 text-success" />
                No hay alertas abiertas.
              </div>
            ) : (
              <div className="space-y-2">
                {health.openAlerts.map((alert) => (
                  <div key={`${alert.level}-${alert.message}`} className="flex gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-text-primary">{alert.message}</p>
                        <Badge variant={alert.level === "critical" ? "danger" : "warning"}>{alert.level}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">{alert.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {tab === "manual" && <ManualBackupWizard canCreateIncremental={canCreateIncremental} />}
      {tab === "automations" && <BackupProfilesList profiles={profiles} />}
      {tab === "history" && <BackupHistoryTable runs={runs} />}
      {tab === "restore" && <RestoreWizard runs={runs} />}
      {tab === "audit" && <BackupAuditLog events={auditEvents} />}
      {tab === "settings" && (
        <div className="space-y-4">
          <BackupDestinationCard />
          <BackupRetentionEditor />
          <BackupNotificationSettings />
          <Card padding="lg">
            <p className="text-sm font-semibold text-text-primary">Integridad obligatoria</p>
            <div className="mt-3 grid gap-2 text-sm text-text-secondary md:grid-cols-2">
              <Rule text="Ningun backup es valido hasta estar verificado." />
              <Rule text="Ningun incremental existe sin copia total previa." />
              <Rule text="Ningun restore toca produccion sin backup previo." />
              <Rule text="Ningun secreto se expone en frontend." />
              <Rule text="Toda accion sensible queda auditada." />
              <Rule text="Storage y base de datos se verifican por separado." />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Rule({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface-raised px-3 py-2">
      <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
      {text}
    </div>
  );
}
