"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-browser";
import { queryKeys } from "@/lib/query-keys";
import type { Pedido } from "@/types";

// ─── Fetch ────────────────────────────────────────────────────────────────────

interface SolicitudesParams {
  empresaId:    number;
  search?:      string;
  agentId?:     number | null;
  tipoPropiedad?: string | null;
}

async function fetchSolicitudes(params: SolicitudesParams): Promise<Pedido[]> {
  const supabase = createClient();

  let query = supabase
    .from("pedidos")
    .select(
      "id, nombre_cliente, telefono, tipo_propiedad, modalidad, presupuesto, habitaciones, banos, garaje, notas, empresa_id, owner_user_id, referencia, zona_deseada, created_at"
    )
    .eq("empresa_id", params.empresaId)
    .order("created_at", { ascending: false });

  if (params.tipoPropiedad) query = query.eq("tipo_propiedad", params.tipoPropiedad);
  if (params.agentId)       query = query.eq("owner_user_id", params.agentId);
  if (params.search) {
    query = query.or(
      `nombre_cliente.ilike.%${params.search}%,notas.ilike.%${params.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Pedido[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseSolicitudesOptions {
  params:       SolicitudesParams;
  initialData?: Pedido[];
}

export function useSolicitudes({ params, initialData }: UseSolicitudesOptions) {
  return useQuery({
    queryKey: queryKeys.solicitudes.list(params as unknown as Record<string, unknown>),
    queryFn:  () => fetchSolicitudes(params),
    initialData,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

type UpdateSolicitudAction = (args: {
  id: number;
  changes: Partial<Pedido>;
}) => Promise<void>;

export function useUpdateSolicitud(serverAction: UpdateSolicitudAction) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: serverAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.solicitudes.all() });
    },
  });
}

type DeleteSolicitudAction = (id: number) => Promise<void>;

export function useDeleteSolicitud(serverAction: DeleteSolicitudAction) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: serverAction,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.solicitudes.all() });
      queryClient.setQueriesData<Pedido[]>(
        { queryKey: queryKeys.solicitudes.all() },
        (old) => old?.filter((p) => p.id !== id) ?? []
      );
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.solicitudes.all() });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.solicitudes.all() });
    },
  });
}
