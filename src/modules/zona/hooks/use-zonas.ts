"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-browser";
import { queryKeys } from "@/lib/query-keys";
import { eventBus } from "@/lib/event-bus";
import type { Zona } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ZonaWithStats extends Zona {
  sectores?: Array<{
    id:      number;
    numero:  number;
    fincas?: Array<{ id: number; propiedades?: Array<{ id: number }> }>;
  }>;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

// Zona table has id, nombre, posicion only. RLS scopes by empresa.
async function fetchZonas(): Promise<ZonaWithStats[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("zona")
    .select(`
      id, nombre, posicion,
      sectores(id, numero,
        fincas(id, propiedades(id))
      )
    `)
    .order("posicion", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as unknown as ZonaWithStats[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseZonasOptions {
  empresaId:    number; // Used only for cache key uniqueness
  initialData?: ZonaWithStats[];
}

export function useZonas({ empresaId, initialData }: UseZonasOptions) {
  return useQuery({
    queryKey:  queryKeys.zonas.list(empresaId),
    queryFn:   fetchZonas,
    initialData,
    staleTime: 1000 * 60 * 10,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

type DeleteZonaAction = (id: number) => Promise<void>;

export function useDeleteZona(serverAction: DeleteZonaAction) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: serverAction,

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.zonas.all() });
      const snapshots = qc.getQueriesData<ZonaWithStats[]>({ queryKey: queryKeys.zonas.all() });
      qc.setQueriesData<ZonaWithStats[]>(
        { queryKey: queryKeys.zonas.all() },
        (old) => old?.filter((z) => z.id !== id) ?? []
      );
      return { snapshots };
    },

    onError: (_err, _id, context) => {
      context?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },

    onSuccess: (_data, id) => {
      eventBus.emit({ type: "zona.updated", payload: { zonaId: id } });
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.zonas.all() });
    },
  });
}
