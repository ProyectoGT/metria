"use client";

import { useState } from "react";
import { Bell, Calendar, Clock, User, AlertCircle, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import type { KanbanCardData, KanbanPriority } from "@/lib/mock/dashboard";
import { normalizeTime, calcDurationMinutes, formatDuration, formatReminderLabel } from "@/lib/local-date-time";
import { ACTIVITY_TYPES } from "@/lib/activity-options";
import Drawer from "@/components/ui/drawer";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { AuditTimelineCard } from "@/components/audit/audit-timeline";

const priorityMeta: Record<KanbanPriority, { label: string; dot: string; text: string }> = {
  alta:  { label: "Alta",  dot: "bg-danger", text: "text-danger" },
  media: { label: "Media", dot: "bg-amber-400", text: "text-amber-700 dark:text-amber-300" },
  baja:  { label: "Baja",  dot: "bg-blue-400", text: "text-text-secondary" },
};

function formatDateTime(iso?: string) {
  if (!iso) return null;
  const [date, time] = iso.split("T");
  if (!date) return null;
  const [y, m, d] = date.split("-");
  const t = time?.slice(0, 5);
  return t ? `${d}/${m}/${y} ${t}` : `${d}/${m}/${y}`;
}

function tipoLabel(tipo?: string) {
  if (!tipo) return null;
  const found = ACTIVITY_TYPES.find((t) => t === tipo);
  return found ?? null;
}

type Props = {
  card: KanbanCardData;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isManager: boolean;
  isOwnerOrAssigned: boolean;
  canDelete: boolean;
};

export default function KanbanDetailDrawer({
  card,
  open,
  onClose,
  onEdit,
  onDelete,
  isManager,
  isOwnerOrAssigned,
  canDelete,
}: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isAgenda = card.source === "agenda";
  const priorityInfo = priorityMeta[card.priority];

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={card.title}
        subtitle={isAgenda ? "Orden del dia" : "Tarea pendiente"}
        width="md"
        headerActions={
          <div className="flex items-center gap-1">
            {(isManager || isOwnerOrAssigned) && (
              <button
                type="button"
                onClick={onEdit}
                className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
                aria-label="Editar"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-5 px-5 py-5">
          {/* Estado y prioridad */}
          <div className="rounded-ds-lg border border-border bg-surface-elevated p-4 shadow-layer-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${priorityInfo.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${priorityInfo.dot}`} />
              {priorityInfo.label}
            </span>
            {card.isCompleted && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Completada
              </span>
            )}
            {card.fromOrdenDia && !card.isCompleted && (
              <span className="text-xs font-semibold text-primary">
                Orden del dia
              </span>
            )}
            {isAgenda && card.tipo && (
              <span className="text-xs font-medium text-text-secondary">
                {tipoLabel(card.tipo) ?? card.tipo}
              </span>
            )}
            </div>
          </div>

          {/* Fecha y hora */}
          {card.dueDate && (
            <div className="space-y-2 rounded-ds-lg border border-border bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Planificacion</p>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                {(() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const d = new Date(card.dueDate.split("T")[0]);
                  d.setHours(0, 0, 0, 0);
                  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
                  const IconComponent = diff < 0 ? AlertCircle : Calendar;
                  const color = diff < 0 ? "text-danger" : diff === 0 ? "text-amber-600 dark:text-amber-400" : "text-text-secondary";
                  return (
                    <>
                      <IconComponent className={`h-4 w-4 ${color}`} />
                      <span className={color}>
                        {diff < 0 ? "Vencida · " : diff === 0 ? "Hoy · " : ""}
                        {formatDateTime(card.dueDate)}
                      </span>
                    </>
                  );
                })()}
              </div>
              {card.time && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>
                    {normalizeTime(card.time, "")}
                    {card.timeEnd && ` – ${normalizeTime(card.timeEnd, "")}`}
                    {(() => {
                      const d = calcDurationMinutes(card.time, card.timeEnd);
                      return d ? <span className="ml-1 rounded-full bg-surface-raised px-2 py-0.5 text-xs font-medium">{formatDuration(d)}</span> : null;
                    })()}
                  </span>
                </div>
              )}
              {card.reminderMinutesBefore != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Bell className="h-4 w-4 shrink-0 text-primary" />
                  <span className="font-medium text-primary">{formatReminderLabel(card.reminderMinutesBefore)}</span>
                </div>
              )}
            </div>
          )}

          {/* Usuarios asignados */}
          {(card.assignedUsers?.length || card.assignedUserIds?.length) && (
            <div className="space-y-2 rounded-ds-lg border border-border bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Asignado a</p>
              <div className="flex flex-wrap gap-1.5">
                {card.assignedUsers?.length ? (
                  card.assignedUsers.map((name, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-md bg-surface-raised px-2.5 py-1 text-xs font-medium text-text-primary">
                      <User className="h-3 w-3" />
                      {name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-text-secondary">
                    {card.assignedUserIds?.length} usuario{card.assignedUserIds!.length > 1 ? "s" : ""} asignado{card.assignedUserIds!.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Resultado si completada */}
          {card.isCompleted && card.resultado && (
            <div className="rounded-ds-lg border border-success/20 bg-success/8 px-4 py-3">
              <p className="text-xs font-semibold text-success">Resultado</p>
              <p className="mt-1 text-sm text-text-primary">{card.resultado}</p>
            </div>
          )}

          {/* Google Calendar link */}
          {card.gcalEventId && (
            <div className="rounded-ds-lg border border-blue-500/15 bg-blue-500/8 px-4 py-3">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Sincronizado con Google Calendar</p>
            </div>
          )}

          {/* Historial */}
          <AuditTimelineCard
            entityType={isAgenda ? "agenda" : "tarea"}
            entityId={card.dbId}
            compact
          />

          {/* Metadata */}
          <div className="rounded-ds-lg bg-surface-raised px-4 py-3 text-xs text-text-secondary">
            <p>
              {isAgenda ? "Actividad de calendario" : "Tarea pendiente"} · ID: {card.dbId}
            </p>
            {card.assignedBy && (
              <p className="mt-1">Creado por: {card.assignedBy}</p>
            )}
          </div>
        </div>
      </Drawer>

      {showDeleteConfirm && (
        <ConfirmDialog
          open
          title="Eliminar actividad"
          description={
            isAgenda
              ? "Esta actividad se archivara y desaparecera del tablero. Esta accion no se puede deshacer."
              : "Esta tarea se eliminara permanentemente. Esta accion no se puede deshacer."
          }
          confirmLabel="Eliminar"
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={() => { setShowDeleteConfirm(false); onDelete(); }}
        />
      )}
    </>
  );
}
