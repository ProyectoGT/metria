"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-browser";
import { queryKeys } from "@/lib/query-keys";
import type { Contacto } from "@/types";

// ─── Fetch ────────────────────────────────────────────────────────────────────

interface ContactosParams {
  empresaId:  number;
  search?:    string;
  tipo?:      string | null;
  agentId?:   number | null;
}

async function fetchContactos(params: ContactosParams): Promise<Contacto[]> {
  const supabase = createClient();

  let query = supabase
    .from("contactos")
    .select(
      "id, nombre, apellidos, email, telefono, tipo, empresa_id, owner_user_id, created_at, estado, updated_at, visibility"
    )
    .eq("empresa_id", params.empresaId)
    .is("archived_at", null)
    .order("nombre", { ascending: true });

  if (params.tipo)    query = query.eq("tipo", params.tipo);
  if (params.agentId) query = query.eq("owner_user_id", params.agentId);
  if (params.search) {
    query = query.or(
      `nombre.ilike.%${params.search}%,apellidos.ilike.%${params.search}%,email.ilike.%${params.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Contacto[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseContactosOptions {
  params:       ContactosParams;
  initialData?: Contacto[];
}

export function useContactos({ params, initialData }: UseContactosOptions) {
  return useQuery({
    queryKey: queryKeys.contactos.list(params as unknown as Record<string, unknown>),
    queryFn:  () => fetchContactos(params),
    initialData,
    staleTime: 1000 * 60 * 5,
  });
}
