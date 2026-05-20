import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";

export type SolicitudNoteTag = "importante" | "hipoteca" | "urgencia" | "documentacion" | "venta_previa";

export type SolicitudNoteMetadata = {
  source?: string;
  pinned?: boolean;
  tags?: SolicitudNoteTag[];
  quickAction?: string;
};

export type SolicitudNote = {
  id: number;
  pedido_id: number | null;
  agente_id: number | null;
  tipo_evento: string;
  titulo: string;
  descripcion: string | null;
  metadata: SolicitudNoteMetadata;
  created_at: string;
  agente: { nombre: string | null; apellidos: string | null } | null;
};

const NOTE_SELECT =
  "id,pedido_id,agente_id,tipo_evento,titulo,descripcion,metadata,created_at,agente:usuarios!contacto_timeline_events_agente_id_fkey(nombre,apellidos)";

function normalizeMetadata(value: Json | null): SolicitudNoteMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, Json>;
  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter((tag): tag is SolicitudNoteTag =>
        typeof tag === "string" &&
        ["importante", "hipoteca", "urgencia", "documentacion", "venta_previa"].includes(tag)
      )
    : [];

  return {
    source: typeof raw.source === "string" ? raw.source : undefined,
    pinned: typeof raw.pinned === "boolean" ? raw.pinned : false,
    tags,
    quickAction: typeof raw.quickAction === "string" ? raw.quickAction : undefined,
  };
}

function normalizeNote(row: {
  id: number;
  pedido_id: number | null;
  agente_id: number | null;
  tipo_evento: string;
  titulo: string;
  descripcion: string | null;
  metadata: Json;
  created_at: string;
  agente: { nombre: string | null; apellidos: string | null } | null;
}): SolicitudNote {
  return {
    ...row,
    metadata: normalizeMetadata(row.metadata),
  };
}

export async function fetchSolicitudNotes(
  supabase: SupabaseClient<Database>,
  pedidoId: number,
  limit: number,
  offset: number,
) {
  const { data, error } = await supabase
    .from("contacto_timeline_events")
    .select(NOTE_SELECT)
    .eq("pedido_id", pedidoId)
    .eq("tipo_evento", "nota_manual")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data ?? []).map((row) => normalizeNote(row));
}

export async function createSolicitudNote(
  supabase: SupabaseClient<Database>,
  input: {
    pedidoId: number;
    currentUserId: number | null;
    text: string;
    tags?: SolicitudNoteTag[];
    pinned?: boolean;
    quickAction?: string;
  },
) {
  const metadata: SolicitudNoteMetadata = {
    source: "solicitud_notes_panel",
    pinned: input.pinned ?? false,
    tags: input.tags ?? [],
    quickAction: input.quickAction,
  };

  const { data, error } = await supabase
    .from("contacto_timeline_events")
    .insert({
      pedido_id: input.pedidoId,
      agente_id: input.currentUserId,
      tipo_evento: "nota_manual",
      titulo: input.quickAction ?? "Nota comercial",
      descripcion: input.text,
      metadata,
    })
    .select(NOTE_SELECT)
    .single();

  if (error) throw error;
  return normalizeNote(data);
}

export async function updateSolicitudNoteMetadata(
  supabase: SupabaseClient<Database>,
  note: SolicitudNote,
  metadata: SolicitudNoteMetadata,
) {
  const nextMetadata: SolicitudNoteMetadata = {
    ...note.metadata,
    ...metadata,
  };

  const { data, error } = await supabase
    .from("contacto_timeline_events")
    .update({ metadata: nextMetadata })
    .eq("id", note.id)
    .select(NOTE_SELECT)
    .single();

  if (error) throw error;
  return normalizeNote(data);
}
