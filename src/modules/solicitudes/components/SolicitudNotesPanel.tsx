"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  MessageSquarePlus,
  PhoneCall,
  Pin,
  PinOff,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { cn } from "@/lib/design-system";
import {
  createSolicitudNote,
  fetchSolicitudNotes,
  type SolicitudNote,
  type SolicitudNoteTag,
  updateSolicitudNoteMetadata,
} from "@/modules/solicitudes/services/notes.service";

type Props = {
  pedidoId: number;
  currentUserId: number | null;
  legacyNotes: string | null;
};

type QuickAction = {
  id: string;
  label: string;
  text: string;
  icon: ElementType;
  tags?: SolicitudNoteTag[];
  pinned?: boolean;
};

const PAGE_SIZE = 12;

const QUICK_ACTIONS: QuickAction[] = [
  { id: "llamado", label: "Llamado cliente", text: "Llamado cliente. Pendiente de confirmar siguiente paso.", icon: PhoneCall },
  { id: "interesado", label: "Cliente interesado", text: "Cliente interesado. Encaja con la busqueda y quiere recibir opciones.", icon: CheckCircle2, tags: ["importante"] },
  { id: "documentacion", label: "Pendiente documentacion", text: "Pendiente documentacion para avanzar con la operacion.", icon: FileText, tags: ["documentacion"] },
  { id: "visita", label: "Visita agendada", text: "Visita agendada. Revisar disponibilidad y confirmar asistencia.", icon: CalendarCheck, tags: ["importante"] },
  { id: "no_contesta", label: "No contesta", text: "No contesta. Reintentar contacto en el proximo seguimiento.", icon: PhoneCall },
  { id: "seguimiento", label: "Seguimiento pendiente", text: "Seguimiento pendiente. Definir proxima accion comercial.", icon: Clock3 },
];

const TAG_OPTIONS: Array<{ id: SolicitudNoteTag; label: string; className: string }> = [
  { id: "importante", label: "Relevante", className: "bg-primary/10 text-primary" },
  { id: "hipoteca", label: "Hipoteca", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/35 dark:text-blue-300" },
  { id: "urgencia", label: "Urgencia alta", className: "bg-danger/10 text-danger" },
  { id: "documentacion", label: "Documentacion", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/35 dark:text-amber-300" },
  { id: "venta_previa", label: "Vende primero", className: "bg-violet-100 text-violet-700 dark:bg-violet-900/35 dark:text-violet-300" },
];

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function authorName(note: SolicitudNote) {
  return [note.agente?.nombre, note.agente?.apellidos].filter(Boolean).join(" ").trim() || "Metria CRM";
}

function useAutoResize(value: string) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  return ref;
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function NoteBadge({ tag }: { tag: SolicitudNoteTag }) {
  const meta = TAG_OPTIONS.find((option) => option.id === tag);
  if (!meta) return null;
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.className)}>{meta.label}</span>;
}

const NoteItem = memo(function NoteItem({
  note,
  busy,
  onTogglePinned,
  onToggleTag,
}: {
  note: SolicitudNote;
  busy: boolean;
  onTogglePinned: (note: SolicitudNote) => void;
  onToggleTag: (note: SolicitudNote, tag: SolicitudNoteTag) => void;
}) {
  const tags = note.metadata.tags ?? [];

  return (
    <li className="relative flex gap-3">
      <span
        className={cn(
          "relative z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
          note.metadata.pinned
            ? "border-danger/20 bg-danger/10 text-danger"
            : "border-border bg-surface text-text-secondary",
        )}
      >
        {note.metadata.pinned ? <Pin className="h-4 w-4" /> : <MessageSquarePlus className="h-4 w-4" />}
      </span>

      <article
        className={cn(
          "min-w-0 flex-1 rounded-lg border bg-surface px-4 py-3 shadow-sm",
          note.metadata.pinned ? "border-danger/25 bg-danger/5" : "border-border",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-text-primary">{note.titulo}</p>
              {note.metadata.pinned && (
                <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
                  Fijada
                </span>
              )}
              {tags.map((tag) => <NoteBadge key={tag} tag={tag} />)}
            </div>
            <p className="mt-0.5 text-xs text-text-secondary">
              {formatDateTime(note.created_at)} · {authorName(note)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onTogglePinned(note)}
            disabled={busy}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-background hover:text-primary disabled:opacity-50"
            title={note.metadata.pinned ? "Desfijar nota" : "Fijar nota"}
          >
            {note.metadata.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </button>
        </div>

        {note.descripcion && (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-primary">
            {note.descripcion}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
          {TAG_OPTIONS.map((tag) => {
            const active = tags.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onToggleTag(note, tag.id)}
                disabled={busy}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50",
                  active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-background text-text-secondary hover:border-primary/30 hover:text-primary",
                )}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      </article>
    </li>
  );
});

export default function SolicitudNotesPanel(props: Props) {
  return <SolicitudNotesPanelInner key={props.pedidoId} {...props} />;
}

function SolicitudNotesPanelInner({ pedidoId, currentUserId, legacyNotes }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [createdNotes, setCreatedNotes] = useState<SolicitudNote[]>([]);
  const [loadedMoreNotes, setLoadedMoreNotes] = useState<SolicitudNote[]>([]);
  const [noteOverrides, setNoteOverrides] = useState<Record<number, SolicitudNote>>({});
  const [draft, setDraft] = useState("");
  const [selectedTags, setSelectedTags] = useState<SolicitudNoteTag[]>([]);
  const [pinDraft, setPinDraft] = useState(false);
  const [search, setSearch] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [paginationHasMore, setPaginationHasMore] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyNoteId, setBusyNoteId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useAutoResize(draft);

  const initialNotesQuery = useQuery({
    queryKey: ["solicitud-notes", pedidoId],
    queryFn: () => fetchSolicitudNotes(supabase, pedidoId, PAGE_SIZE + 1, 0),
  });

  const initialRows = useMemo(
    () => (initialNotesQuery.data ?? []).slice(0, PAGE_SIZE),
    [initialNotesQuery.data],
  );
  const loading = initialNotesQuery.isLoading;
  const loadError = initialNotesQuery.error;
  const initialHasMore = (initialNotesQuery.data?.length ?? 0) > PAGE_SIZE;
  const hasMore = paginationHasMore ?? initialHasMore;
  const notes = useMemo(() => {
    const serverNotes = [...initialRows, ...loadedMoreNotes].map((note) => noteOverrides[note.id] ?? note);
    return [...createdNotes, ...serverNotes];
  }, [createdNotes, initialRows, loadedMoreNotes, noteOverrides]);

  const loadMoreNotes = useCallback(async () => {
    setLoadingMore(true);
    setError(null);
    try {
      const offset = initialRows.length + loadedMoreNotes.length;
      const rows = await fetchSolicitudNotes(supabase, pedidoId, PAGE_SIZE + 1, offset);
      const visibleRows = rows.slice(0, PAGE_SIZE);
      setPaginationHasMore(rows.length > PAGE_SIZE);
      setLoadedMoreNotes((prev) => [...prev, ...visibleRows]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las notas.");
    } finally {
      setLoadingMore(false);
    }
  }, [initialRows.length, loadedMoreNotes.length, pedidoId, supabase]);

  const filteredNotes = useMemo(() => {
    const term = normalizeSearch(search);
    const sorted = [...notes].sort((a, b) => {
      const pinnedDiff = Number(Boolean(b.metadata.pinned)) - Number(Boolean(a.metadata.pinned));
      if (pinnedDiff !== 0) return pinnedDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    if (!term) return sorted;
    return sorted.filter((note) => {
      const haystack = [
        note.titulo,
        note.descripcion,
        authorName(note),
        ...(note.metadata.tags ?? []),
      ].join(" ").toLowerCase();
      return haystack.includes(term);
    });
  }, [notes, search]);

  const pinnedCount = notes.filter((note) => note.metadata.pinned).length;

  function toggleDraftTag(tag: SolicitudNoteTag) {
    setSelectedTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  }

  async function saveNote(input?: { text: string; quickAction?: QuickAction }) {
    const text = (input?.text ?? draft).trim();
    if (!text) return;

    setSaving(true);
    setError(null);
    try {
      const created = await createSolicitudNote(supabase, {
        pedidoId,
        currentUserId,
        text,
        pinned: input?.quickAction?.pinned ?? pinDraft,
        tags: input?.quickAction?.tags ?? selectedTags,
        quickAction: input?.quickAction?.label,
      });
      setCreatedNotes((prev) => [created, ...prev]);
      if (!input?.quickAction) {
        setDraft("");
        setSelectedTags([]);
        setPinDraft(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la nota.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePinned(note: SolicitudNote) {
    setBusyNoteId(note.id);
    setError(null);
    try {
      const updated = await updateSolicitudNoteMetadata(supabase, note, { pinned: !note.metadata.pinned });
      setNoteOverrides((prev) => ({ ...prev, [updated.id]: updated }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la nota.");
    } finally {
      setBusyNoteId(null);
    }
  }

  async function toggleNoteTag(note: SolicitudNote, tag: SolicitudNoteTag) {
    const currentTags = note.metadata.tags ?? [];
    const nextTags = currentTags.includes(tag)
      ? currentTags.filter((item) => item !== tag)
      : [...currentTags, tag];

    setBusyNoteId(note.id);
    setError(null);
    try {
      const updated = await updateSolicitudNoteMetadata(supabase, note, { tags: nextTags });
      setNoteOverrides((prev) => ({ ...prev, [updated.id]: updated }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la etiqueta.");
    } finally {
      setBusyNoteId(null);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text-primary">Seguimiento comercial</h3>
              {pinnedCount > 0 && (
                <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
                  {pinnedCount} fijada{pinnedCount === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-text-secondary">Notas, contexto clave y proxima accion del cliente.</p>
          </div>
          <div className="flex h-8 min-w-[190px] items-center gap-2 rounded-lg border border-border bg-background px-2.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar notas"
              className="min-w-0 flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-secondary"
            />
          </div>
        </div>
      </div>

      {legacyNotes?.trim() && (
        <div className="border-b border-border bg-background/70 px-4 py-3">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Contexto base</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-text-primary">{legacyNotes}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 px-4 py-4">
        <div className="rounded-lg border border-border bg-background p-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Nueva nota</label>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") void saveNote();
            }}
            rows={3}
            placeholder="Ej: Cliente vende primero, hipoteca preaprobada, interesado en Sant Feliu. Proximo paso: enviar 3 opciones antes del viernes."
            className="mt-2 max-h-[220px] min-h-[96px] w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm leading-6 text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-primary"
          />

          <div className="mt-3 flex flex-wrap gap-1.5">
            {TAG_OPTIONS.map((tag) => {
              const active = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleDraftTag(tag.id)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-surface text-text-secondary hover:border-primary/30 hover:text-primary",
                  )}
                >
                  <Tag className="h-3 w-3" />
                  {tag.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPinDraft((value) => !value)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                pinDraft
                  ? "border-danger/30 bg-danger/10 text-danger"
                  : "border-border bg-surface text-text-secondary hover:border-danger/25 hover:text-danger",
              )}
            >
              <Pin className="h-3 w-3" />
              Fijar
            </button>
          </div>

          {(error || loadError) && (
            <p className="mt-3 flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
              <AlertTriangle className="h-3.5 w-3.5" />
              {error ?? (loadError instanceof Error ? loadError.message : "No se pudieron cargar las notas.")}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-text-secondary">Ctrl + Enter guarda la nota.</p>
            <button
              type="button"
              onClick={() => void saveNote()}
              disabled={saving || !draft.trim()}
              className="inline-flex h-8 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquarePlus className="h-3.5 w-3.5" />}
              Guardar nota
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Notas rapidas</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => void saveNote({ text: action.text, quickAction: action })}
                  disabled={saving}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-text-secondary transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:opacity-50"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="max-h-[520px] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-background px-5 py-10 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-primary/70" />
              <p className="mt-3 text-sm font-semibold text-text-primary">
                {notes.length === 0 ? "Sin seguimiento todavia" : "No hay notas con esa busqueda"}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-text-secondary">
                {notes.length === 0
                  ? "Anade la primera nota comercial para dejar claro contexto, objeciones y proximo paso."
                  : "Prueba con otra palabra clave o etiqueta."}
              </p>
            </div>
          ) : (
            <ol className="relative space-y-4 before:absolute before:bottom-0 before:left-4 before:top-1 before:w-px before:bg-border">
              {filteredNotes.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  busy={busyNoteId === note.id}
                  onTogglePinned={togglePinned}
                  onToggleTag={toggleNoteTag}
                />
              ))}
            </ol>
          )}
        </div>

        {hasMore && !search && (
          <div className="flex justify-center border-t border-border pt-3">
            <button
              type="button"
              onClick={() => void loadMoreNotes()}
              disabled={loadingMore}
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold text-text-secondary transition-colors hover:bg-background hover:text-primary disabled:opacity-50"
            >
              {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Ver mas notas
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
