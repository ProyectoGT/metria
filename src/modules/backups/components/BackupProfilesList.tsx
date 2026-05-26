"use client";

import { useState, useTransition } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Copy,
  Pencil,
  Play,
  Plus,
  Trash2,
  Pause,
} from "lucide-react";
import Badge from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import type { BackupProfile } from "../types/backup.types";
import BackupProfileStatusBadge from "./BackupProfileStatusBadge";
import BackupProfileForm from "./BackupProfileForm";
import { describeSchedule } from "../utils/scheduleCalculator";
import { backupTypeLabel, formatDateTime } from "../utils/backupFormatters";
import {
  toggleBackupProfileAction,
  duplicateBackupProfileAction,
  deleteBackupProfileAction,
} from "@/app/(crm)/backups/actions";

type Props = {
  profiles: BackupProfile[];
  canManage: boolean;
};

export default function BackupProfilesList({ profiles: initialProfiles, canManage }: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [showForm, setShowForm] = useState(false);
  const [editProfile, setEditProfile] = useState<BackupProfile | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function refreshFromServer() {
    window.location.reload();
  }

  function handleToggle(profile: BackupProfile) {
    startTransition(async () => {
      const result = await toggleBackupProfileAction(profile.id, !profile.enabled);
      if (result.ok) {
        setProfiles((prev) =>
          prev.map((p) => (p.id === profile.id ? { ...p, enabled: !profile.enabled } : p)),
        );
        toast(result.message);
      } else {
        toast(result.message, "error");
      }
    });
  }

  function handleDuplicate(profile: BackupProfile) {
    startTransition(async () => {
      const result = await duplicateBackupProfileAction(profile.id);
      if (result.ok) {
        toast(result.message);
        refreshFromServer();
      } else {
        toast(result.message, "error");
      }
    });
  }

  function handleDelete(profileId: string) {
    setDeletingId(profileId);
  }

  function confirmDelete(profileId: string) {
    startTransition(async () => {
      const result = await deleteBackupProfileAction(profileId);
      setDeletingId(null);
      if (result.ok) {
        setProfiles((prev) => prev.filter((p) => p.id !== profileId));
        toast(result.message);
      } else {
        toast(result.message, "error");
      }
    });
  }

  const enabledCount = profiles.filter((p) => p.enabled).length;
  const pausedCount = profiles.filter((p) => !p.enabled).length;
  const errorCount = profiles.filter((p) => p.last_status === "config_error" || p.last_status === "failed").length;

  return (
    <div className="space-y-5">
      {/* Stats row */}
      {profiles.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {enabledCount} activo{enabledCount !== 1 ? "s" : ""}
          </span>
          {pausedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-text-secondary">
              {pausedCount} pausado{pausedCount !== 1 ? "s" : ""}
            </span>
          )}
          {errorCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1 text-xs font-medium text-danger">
              {errorCount} con error
            </span>
          )}
        </div>
      )}

      {/* Lista de perfiles */}
      {profiles.length === 0 ? (
        <EmptyState
          variant="compact"
          icon={<CalendarClock className="h-8 w-8" />}
          title="Todavia no hay automatizaciones configuradas"
          description="Crea una programacion para que Metria ejecute copias de seguridad de forma periodica."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {profiles.map((profile) => (
            <Card key={profile.id} padding="md" className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">{profile.name}</p>
                  {profile.description && (
                    <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">{profile.description}</p>
                  )}
                </div>
                <BackupProfileStatusBadge profile={profile} />
              </div>

              <div className="grid gap-1.5 text-xs text-text-secondary">
                <span>
                  <span className="font-medium text-text-primary">Tipo:</span>{" "}
                  {backupTypeLabel(profile.backup_type)}
                </span>
                <span>
                  <span className="font-medium text-text-primary">Frecuencia:</span>{" "}
                  {describeSchedule(profile.schedule_type, profile.schedule_config, profile.timezone)}
                </span>
                {profile.next_run_at && profile.enabled && (
                  <span>
                    <span className="font-medium text-text-primary">Proxima:</span>{" "}
                    {formatDateTime(profile.next_run_at)}
                  </span>
                )}
                {profile.last_run_at && (
                  <span>
                    <span className="font-medium text-text-primary">Ultima:</span>{" "}
                    {formatDateTime(profile.last_run_at)}
                  </span>
                )}
              </div>

              {profile.last_status === "config_error" && (
                <div className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
                  Configuracion invalida — el scheduler no puede ejecutar este perfil.
                </div>
              )}

              {canManage && (
                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditProfile(profile);
                      setShowForm(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-muted"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle(profile)}
                    disabled={isPending}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium disabled:opacity-50 ${
                      profile.enabled
                        ? "border-warning/40 bg-warning/10 text-amber-700 hover:bg-warning/20"
                        : "border-success/40 bg-success/10 text-success hover:bg-success/20"
                    }`}
                  >
                    {profile.enabled ? (
                      <>
                        <Pause className="h-3.5 w-3.5" />
                        Pausar
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        Activar
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(profile)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-muted disabled:opacity-50"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Duplicar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(profile.id)}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg border border-danger/30 px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Boton crear */}
      {canManage && (
        <button
          type="button"
          onClick={() => {
            setEditProfile(undefined);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm font-medium text-text-secondary transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          Nueva automatizacion
        </button>
      )}

      {/* Perfiles sugeridos (solo si no hay ninguno) */}
      {profiles.length === 0 && canManage && (
        <div>
          <p className="mb-3 text-sm font-semibold text-text-primary">Sugerencias de configuracion</p>
          <div className="grid gap-3 lg:grid-cols-2">
            {SUGGESTED_PROFILES.map((s) => (
              <Card key={s.name} padding="md" className="space-y-2">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{s.name}</p>
                    <p className="mt-0.5 text-xs leading-5 text-text-secondary">{s.description}</p>
                    <Badge className="mt-2" variant="muted">Sugerido — no activo</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modal de confirmacion de borrado */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card padding="lg" className="w-full max-w-sm space-y-4">
            <p className="text-sm font-semibold text-text-primary">Eliminar automatizacion</p>
            <p className="text-sm text-text-secondary">
              Esta accion es permanente. Los backups ya realizados no se veran afectados.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => confirmDelete(deletingId)}
                disabled={isPending}
                className="flex-1 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:bg-danger/80 disabled:opacity-50"
              >
                {isPending ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal del formulario */}
      {showForm && (
        <BackupProfileForm
          profile={editProfile}
          onClose={() => {
            setShowForm(false);
            setEditProfile(undefined);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditProfile(undefined);
            refreshFromServer();
          }}
        />
      )}
    </div>
  );
}

const SUGGESTED_PROFILES = [
  {
    name: "Backup total semanal",
    description: "Copia total los domingos a las 03:00 con retencion de 12 semanas.",
  },
  {
    name: "Backup diario critico",
    description: "Copia diaria a las 03:00 para base de datos y configuracion.",
  },
];
