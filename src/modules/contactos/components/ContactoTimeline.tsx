"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Home,
  Loader2,
  MessageSquareText,
  NotebookPen,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

export type TimelineSubject =
  | { type: "contacto"; id: number; title: string }
  | { type: "pedido"; id: number; title: string };

export type TimelineEvent = {
  id: number | string;
  empresa_id?: number | null;
  contacto_id?: number | null;
  pedido_id?: number | null;
  propiedad_id?: number | null;
  agente_id?: number | null;
  tipo_evento: string;
  titulo: string;
  descripcion: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  synthetic?: boolean;
  agente?: { nombre: string | null; apellidos: string | null } | null;
};

type Props = {
  subject: TimelineSubject;
  currentUserId: number | null;
  initialEvents?: TimelineEvent[];
};

const EVENT_META: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  nota_manual: {
    label: "Nota",
    icon: NotebookPen,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/35 dark:text-amber-300",
  },
  tarea: {
    label: "Tarea",
    icon: ClipboardList,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/35 dark:text-blue-300",
  },
  agenda: {
    label: "Agenda",
    icon: CalendarDays,
    className: "bg-violet-100 text-violet-700 dark:bg-violet-900/35 dark:text-violet-300",
  },
  propiedad: {
    label: "Propiedad",
    icon: Home,
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-300",
  },
  cambio_estado: {
    label: "Estado",
    icon: RefreshCw,
    className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/35 dark:text-cyan-300",
  },
  documento: {
    label: "Documento",
    icon: FileText,
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  interaccion: {
    label: "Interaccion",
    icon: MessageSquareText,
    className: "bg-rose-100 text-rose-700 dark:bg-rose-900/35 dark:text-rose-300",
  },
  contacto: {
    label: "Contacto",
    icon: UserRound,
    className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/35 dark:text-indigo-300",
  },
  pedido: {
    label: "Solicitud",
    icon: ClipboardList,
    className: "bg-green-100 text-green-700 dark:bg-green-900/35 dark:text-green-300",
  },
};

function eventMeta(type: string) {
  return EVENT_META[type] ?? {
    label: type.replace(/_/g, " "),
    icon: MessageSquareText,
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function agentName(event: TimelineEvent) {
  const value = [event.agente?.nombre, event.agente?.apellidos].filter(Boolean).join(" ").trim();
  return value || null;
}

function sortEvents(rows: TimelineEvent[]) {
  return [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export default function ContactoTimeline({ subject, currentUserId, initialEvents = [] }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadEvents() {
    setLoading(true);
    setError(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = (supabase as any)
      .from("contacto_timeline_events")
      .select("id,empresa_id,contacto_id,pedido_id,propiedad_id,agente_id,tipo_evento,titulo,descripcion,metadata,created_at,agente:usuarios!contacto_timeline_events_agente_id_fkey(nombre,apellidos)")
      .order("created_at", { ascending: false });

    const filtered =
      subject.type === "contacto"
        ? query.eq("contacto_id", subject.id)
        : query.eq("pedido_id", subject.id);

    const { data, error: loadError } = await filtered;
    if (loadError) {
      setError(loadError.message);
      setEvents(sortEvents(initialEvents));
    } else {
      setEvents(sortEvents([...(data ?? []), ...initialEvents] as TimelineEvent[]));
    }
    setLoading(false);
  }

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject.type, subject.id]);

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    const text = note.trim();
    if (!text) return;

    setSaving(true);
    setError(null);

    const payload = {
      contacto_id: subject.type === "contacto" ? subject.id : null,
      pedido_id: subject.type === "pedido" ? subject.id : null,
      agente_id: currentUserId,
      tipo_evento: "nota_manual",
      titulo: "Nota manual",
      descripcion: text,
      metadata: { source: "timeline_panel" },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: insertError } = await (supabase as any)
      .from("contacto_timeline_events")
      .insert(payload)
      .select("id,empresa_id,contacto_id,pedido_id,propiedad_id,agente_id,tipo_evento,titulo,descripcion,metadata,created_at,agente:usuarios!contacto_timeline_events_agente_id_fkey(nombre,apellidos)")
      .single();

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setNote("");
    if (data) setEvents((prev) => [data as TimelineEvent, ...prev]);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-base font-semibold text-text-primary">Timeline</h3>
        <p className="mt-0.5 truncate text-sm text-text-secondary">{subject.title}</p>
      </div>

      <form onSubmit={handleAddNote} className="border-b border-border bg-background/60 px-5 py-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Nota manual
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Registra una llamada, comentario o siguiente paso..."
          className="input resize-none text-sm"
        />
        {error && <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={saving || !note.trim()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Guardar nota
          </button>
        </div>
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center">
            <MessageSquareText className="mx-auto h-8 w-8 text-text-secondary/50" />
            <p className="mt-3 text-sm text-text-secondary">Todavia no hay actividad registrada.</p>
          </div>
        ) : (
          <ol className="relative space-y-4 before:absolute before:bottom-0 before:left-4 before:top-1 before:w-px before:bg-border">
            {events.map((event) => {
              const meta = eventMeta(event.tipo_evento);
              const Icon = meta.icon;
              const by = agentName(event);
              return (
                <li key={`${event.synthetic ? "synthetic" : "event"}-${event.id}`} className="relative flex gap-3">
                  <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.className}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-3">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-medium text-text-primary">{event.titulo}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.className}`}>
                        {meta.label}
                      </span>
                    </div>
                    {event.descripcion && (
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                        {event.descripcion}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary">
                      <span>{formatDate(event.created_at)}</span>
                      {by && <span>{by}</span>}
                      {event.propiedad_id && <span>Propiedad #{event.propiedad_id}</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
