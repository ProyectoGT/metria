import { redirect } from "next/navigation";
import PageHeader from "@/components/layout/page-header";
import { getCurrentUserContext } from "@/lib/current-user";
import BackupsDashboard from "@/modules/backups/components/BackupsDashboard";
import { canCreateBackup, canReadBackups } from "@/modules/backups/services/backupPermissions";
import { listBackupAuditEvents } from "@/modules/backups/services/backupAuditQueryService";
import { listBackupProfiles } from "@/modules/backups/services/backupProfilesService";
import { getBackupHealth, getLastVerifiedFullBackup, listBackupRuns } from "@/modules/backups/services/backupRunsService";

export const dynamic = "force-dynamic";

export default async function BackupsPage() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser || !canReadBackups(currentUser)) redirect("/dashboard");

  const [runs, profiles, auditEvents, health, lastFull] = await Promise.all([
    listBackupRuns(currentUser),
    listBackupProfiles(currentUser),
    listBackupAuditEvents(currentUser),
    getBackupHealth(currentUser),
    getLastVerifiedFullBackup(currentUser),
  ]);

  return (
    <>
      <PageHeader
        title="Copias de seguridad"
        description="Centro de recuperacion, integridad y auditoria para datos criticos de Metria."
        actions={canCreateBackup(currentUser) ? undefined : <span className="text-xs text-text-secondary">Solo lectura</span>}
      />
      <BackupsDashboard
        health={health}
        runs={runs}
        profiles={profiles}
        auditEvents={auditEvents}
        canCreateIncremental={Boolean(lastFull)}
      />
    </>
  );
}
