"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-browser";
import { queryKeys } from "@/lib/query-keys";
import { eventBus } from "@/lib/event-bus";
import type { Propiedad } from "@/types";

// ─── Fetch ────────────────────────────────────────────────────────────────────

interface PropiedadesParams {
  empresaId: number;
  search?:   string;
  estado?:   string | null;
  agentId?:  number | null;
  fincaId?:  number | null;
}

async function fetchPropiedades(params: PropiedadesParams): Promise<Propiedad[]> {
  const supabase = createClient();

  let query = supabase
    .from("propiedades")
    .select(
      "id, titulo, estado, precio, descripcion, agente_asignado, owner_user_id, empresa_id, finca_id, created_at, updated_at, tipo_operacion, planta, puerta"
    )
    .eq("empresa_id", params.empresaId)
    .order("created_at", { ascending: false });

  if (params.estado)  query = query.ilike("estado", `${params.estado}%`);
  if (params.agentId) query = query.eq("agente_asignado", params.agentId);
  if (params.fincaId) query = query.eq("finca_id", params.fincaId);
  if (params.search)  query = query.ilike("titulo", `%${params.search}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Propiedad[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UsePropiedadesOptions {
  params:       PropiedadesParams;
  initialData?: Propiedad[];
}

export function usePropiedades({ params, initialData }: UsePropiedadesOptions) {
  return useQuery({
    queryKey:  queryKeys.propiedades.list(params as unknown as Record<string, unknown>),
    queryFn:   () => fetchPropiedades(params),
    initialData,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Mutation ─────────────────────────────────────────────────────────────────

type UpdatePropiedadAction = (args: {
  id:      number;
  changes: Partial<Propiedad>;
}) => Promise<void>;

export function useUpdatePropiedad(serverAction: UpdatePropiedadAction) {
  return useMutation({
    mutationFn: serverAction,
    onSuccess: (_data, { id }) => {
      eventBus.emit({ type: "property.updated", payload: { propiedadId: id } });
    },
  });
}
