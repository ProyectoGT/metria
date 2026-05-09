"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-browser";
import { queryKeys } from "@/lib/query-keys";
import type { Zona } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ZonaWithStats extends Zona {
  sectores?: Array<{
    id: number;
    numero: number;
    fincas?: Array<{ id: number; propiedades?: Array<{ id: number }> }>;
  }>;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

// Zona table only has id, nombre, posicion — RLS scopes it to the current user's empresa
async function fetchZonas(): Promise<ZonaWithStats[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("zona")
    .select(`
      id, nombre, posicion,
      sectores(id, numero,
        fincas(id,
          propiedades(id)
        )
      )
    `)
    .order("posicion", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as unknown as ZonaWithStats[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
// empresaId is passed for cache key uniqueness only; RLS handles filtering

interface UseZonasOptions {
  empresaId:    number;
  initialData?: ZonaWithStats[];
}

export function useZonas({ empresaId, initialData }: UseZonasOptions) {
  return useQuery({
    queryKey: queryKeys.zonas.list(empresaId),
    queryFn:  fetchZonas,
    initialData,
    staleTime: 1000 * 60 * 10,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

type DeleteZonaAction = (id: number) => Promise<void>;

export function useDeleteZona(serverAction: DeleteZonaAction) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: serverAction,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.zonas.all() });
      queryClient.setQueriesData<ZonaWithStats[]>(
        { queryKey: queryKeys.zonas.all() },
        (old) => old?.filter((z) => z.id !== id) ?? []
      );
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.zonas.all() });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.zonas.all() });
    },
  });
}
