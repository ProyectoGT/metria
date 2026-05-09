"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-browser";
import { queryKeys } from "@/lib/query-keys";
import { eventBus } from "@/lib/event-bus";
import type { Usuario } from "@/types";

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchUsuarios(empresaId: number): Promise<Usuario[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("usuarios")
    .select(
      "id, nombre, apellidos, correo, rol, estado, avatar_url, empresa_id, equipo_id, auth_id, created_at, supervisor_id"
    )
    .eq("empresa_id", empresaId)
    .order("nombre", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as Usuario[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseUsuariosOptions {
  empresaId:    number;
  initialData?: Usuario[];
}

export function useUsuarios({ empresaId, initialData }: UseUsuariosOptions) {
  return useQuery({
    queryKey:  queryKeys.usuarios.list(empresaId),
    queryFn:   () => fetchUsuarios(empresaId),
    initialData,
    staleTime: 1000 * 60 * 10,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

type CreateUsuarioAction = (data: {
  nombre:    string;
  apellidos: string;
  correo:    string;
  rol:       string;
  equipoId?: number;
}) => Promise<{ id: number }>;

export function useCreateUsuario(serverAction: CreateUsuarioAction) {
  return useMutation({
    mutationFn: serverAction,
    onSuccess: (result) => {
      eventBus.emit({ type: "user.updated", payload: { usuarioId: result.id } });
    },
  });
}

type DeleteUsuarioAction = (id: number) => Promise<void>;

export function useDeleteUsuario(serverAction: DeleteUsuarioAction) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: serverAction,

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.usuarios.all() });
      const snapshots = qc.getQueriesData<Usuario[]>({ queryKey: queryKeys.usuarios.all() });
      qc.setQueriesData<Usuario[]>(
        { queryKey: queryKeys.usuarios.all() },
        (old) => old?.filter((u) => u.id !== id) ?? []
      );
      return { snapshots };
    },

    onError: (_err, _id, context) => {
      context?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },

    onSuccess: (_data, id) => {
      eventBus.emit({ type: "user.updated", payload: { usuarioId: id } });
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.usuarios.all() });
    },
  });
}
