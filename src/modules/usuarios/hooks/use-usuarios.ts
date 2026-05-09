"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-browser";
import { queryKeys } from "@/lib/query-keys";
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
    queryKey: queryKeys.usuarios.list(empresaId),
    queryFn:  () => fetchUsuarios(empresaId),
    initialData,
    staleTime: 1000 * 60 * 10,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

type CreateUsuarioAction = (data: {
  nombre: string;
  apellidos: string;
  correo: string;
  rol: string;
  equipoId?: number;
}) => Promise<{ id: number }>;

export function useCreateUsuario(serverAction: CreateUsuarioAction) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: serverAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.usuarios.all() });
    },
  });
}

type DeleteUsuarioAction = (id: number) => Promise<void>;

export function useDeleteUsuario(serverAction: DeleteUsuarioAction) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: serverAction,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.usuarios.all() });
      queryClient.setQueriesData<Usuario[]>(
        { queryKey: queryKeys.usuarios.all() },
        (old) => old?.filter((u) => u.id !== id) ?? []
      );
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.usuarios.all() });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.usuarios.all() });
    },
  });
}
