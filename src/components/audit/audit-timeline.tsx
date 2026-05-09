"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";
import { Clock, User, ArrowRight } from "lucide-react";

type AuditEntry = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor: { id: number; nombre: string; apellidos: string; email: string } | null;
};

const ACTION_LABELS: Record<string, string> = {
  "tarea.creada": "Tarea creada",
  "tarea.editada": "Tarea editada",
  "tarea.completada": "Tarea completada",
  "tarea.eliminada": "Tarea eliminada",
  "agenda.creada": "Actividad creada",
  "agenda.editada": "Actividad editada",
  "agenda.completada": "Actividad completada",
  "agenda.archivada": "Actividad archivada",
  "propiedad.editada": "Propiedad editada",
  "contacto.editado": "Contacto editado",
  "usuario.creado": "Usuario creado",
  "usuario.editado": "Usuario editado",
  "permiso.cambiado": "Permiso modificado",
  "sesion.iniciada": "Inicio de sesion",
  "sesion.cerrada": "Cierre de sesion",
};

const ACTION_ICONS: Record<string, string> = {
  "tarea.creada": "➕",
  "tarea.editada": "✏️",
  "tarea.completada": "✅",
  "tarea.eliminada": "🗑️",
  "agenda.creada": "📅",
  "agenda.editada": "✏️",
  "agenda.completada": "✅",
  "agenda.archivada": "📦",
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function actionIcon(action: string): string {
  return ACTION_ICONS[action] ?? "📋";
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditTimeline({
  entityType,
  entityId,
  compact,
}: {
  entityType?: string;
  entityId?: string | number;
  compact?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    fetchIdRef.current += 1;
    const id = fetchIdRef.current;
    const limit = compact ? 10 : 50;
    supabase
      .from("audit_log")
      .select("*, actor:actor_id!inner(id, nombre, apellidos, email)")
      .order("created_at", { ascending: false })
      .limit(limit)
      .then(({ data: raw }) => {
        if (id !== fetchIdRef.current) return;
        setEntries((raw ?? []) as unknown as AuditEntry[]);
        setLoading(false);
      });
  }, [entityType, entityId, compact, supabase]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse flex gap-3 p-3 rounded-xl bg-background">
            <div className="w-8 h-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-48 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
        <Clock className="h-8 w-8 mb-2" />
        <p className="text-sm">No hay cambios registrados</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry, i) => (
        <div key={entry.id} className="flex gap-3 p-3 rounded-xl hover:bg-background transition-colors">
          <div className="flex flex-col items-center">
            <span className="text-lg">{actionIcon(entry.action)}</span>
            {i < entries.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-text-primary">
                {actionLabel(entry.action)}
              </span>
              {entry.actor && (
                <span className="text-xs text-text-secondary flex items-center gap-1 truncate">
                  <User className="h-3 w-3 inline shrink-0" />
                  {entry.actor.nombre} {entry.actor.apellidos}
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary mt-0.5">{formatTime(entry.created_at)}</p>
            {entry.before && entry.after && !compact && (
              <div className="mt-1.5 space-y-0.5">
                {Object.keys(entry.after).map((key) => {
                  const bv = entry.before?.[key];
                  const av = entry.after?.[key];
                  if (bv === undefined && av === undefined) return null;
                  const bStr = bv != null ? String(bv) : "—";
                  const aStr = av != null ? String(av) : "—";
                  if (bStr === aStr) return null;
                  return (
                    <div key={key} className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <span className="font-medium text-text-primary min-w-[80px]">{key}:</span>
                      <span className="line-through text-danger/70 truncate max-w-[120px]">{bStr}</span>
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <span className="text-success truncate max-w-[120px]">{aStr}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AuditTimelineCard({
  title,
  entityType,
  entityId,
  compact,
}: {
  title?: string;
  entityType: string;
  entityId: string | number;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">{title ?? "Historial de cambios"}</h3>
      </div>
      <div className="p-2">
        <AuditTimeline entityType={entityType} entityId={entityId} compact={compact} />
      </div>
    </div>
  );
}
