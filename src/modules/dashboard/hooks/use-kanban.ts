"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-browser";
import { queryKeys } from "@/lib/query-keys";
import type { KanbanData, KanbanCardData, KanbanColumnData } from "@/lib/mock/dashboard";

// ─── Fetch function (browser Supabase) ───────────────────────────────────────

interface KanbanQueryParams {
  empresaId:  number;
  userId:     number;
  agentIds?:  number[];
}

async function fetchKanbanBoard(params: KanbanQueryParams): Promise<KanbanData> {
  const supabase = createClient();
  const { empresaId, userId, agentIds } = params;

  const userScope = agentIds?.length ? agentIds : [userId];

  // Tareas pendientes/en_progreso asignadas al scope
  const { data: tareas, error } = await supabase
    .from("tareas")
    .select(`
      id, titulo, prioridad, fecha, estado, resultado,
      tarea_usuarios!inner(usuario_id, usuarios(nombre, apellidos))
    `)
    .in("tarea_usuarios.usuario_id", userScope)
    .eq("empresa_id", empresaId)
    .in("estado", ["pendiente", "en_progreso"])
    .is("archived_at", null)
    .order("fecha", { ascending: true, nullsFirst: false });

  if (error) throw error;

  // Build column map from tareas
  const pendientes: KanbanCardData[] = [];
  const enProgreso: KanbanCardData[] = [];

  for (const t of tareas ?? []) {
    const assignedUsers = (
      (t.tarea_usuarios as Array<{ usuarios: { nombre: string | null; apellidos: string | null } | null } | null>) ?? []
    ).map((tu) => `${tu?.usuarios?.nombre ?? ""} ${tu?.usuarios?.apellidos ?? ""}`.trim()).filter(Boolean);

    const card: KanbanCardData = {
      id:       `tarea-${t.id}`,
      source:   "tarea",
      dbId:     t.id,
      title:    t.titulo,
      priority: (t.prioridad as "alta" | "media" | "baja") ?? "media",
      dueDate:  t.fecha ?? undefined,
      resultado: t.resultado as string | null,
      isCompleted: t.estado === "completado",
      assignedUsers,
    };

    if (t.estado === "en_progreso") enProgreso.push(card);
    else pendientes.push(card);
  }

  const columns: KanbanColumnData[] = [
    { id: "pendiente",   title: "Pendiente",   fixed: true,  cards: pendientes },
    { id: "en_progreso", title: "En progreso", fixed: false, cards: enProgreso },
    { id: "completado",  title: "Completado",  fixed: true,  cards: [] },
  ];

  return { columns };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseKanbanOptions {
  params:      KanbanQueryParams;
  initialData?: KanbanData;
}

export function useKanban({ params, initialData }: UseKanbanOptions) {
  const queryKey = queryKeys.kanban.board(params as unknown as Record<string, unknown>);

  const query = useQuery({
    queryKey,
    queryFn:     () => fetchKanbanBoard(params),
    initialData,
    staleTime:   1000 * 30, // Kanban se renue rápido (30 s)
  });

  return query;
}

// ─── Mutation: mover tarjeta entre columnas (optimistic) ─────────────────────

interface MoveCardArgs {
  cardId:    string;
  dbId:      number;
  source:    "tarea" | "agenda";
  fromCol:   string;
  toCol:     string;
  params:    KanbanQueryParams;
}

// Server action wrapper — el import real vendrá del server action del dashboard
type MoveCardServerAction = (args: {
  dbId: number;
  source: "tarea" | "agenda";
  newEstado: string;
}) => Promise<void>;

export function useKanbanMoveCard(serverAction: MoveCardServerAction) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dbId, source, toCol }: MoveCardArgs) =>
      serverAction({ dbId, source, newEstado: toCol }),

    onMutate: async ({ cardId, fromCol, toCol, params }) => {
      const qk = queryKeys.kanban.board(params as unknown as Record<string, unknown>);

      // Cancelar refetches en vuelo para evitar sobreescritura
      await queryClient.cancelQueries({ queryKey: qk });

      // Guardar snapshot para rollback
      const snapshot = queryClient.getQueryData<KanbanData>(qk);

      // Actualización optimista
      queryClient.setQueryData<KanbanData>(qk, (old) => {
        if (!old) return old;
        let movedCard: KanbanCardData | undefined;

        const columns = old.columns.map((col) => {
          if (col.id === fromCol) {
            const filtered = col.cards.filter((c) => {
              if (c.id === cardId) { movedCard = c; return false; }
              return true;
            });
            return { ...col, cards: filtered };
          }
          return col;
        });

        if (movedCard) {
          const updated = { ...movedCard, isCompleted: toCol === "completado" };
          return {
            columns: columns.map((col) =>
              col.id === toCol ? { ...col, cards: [...col.cards, updated] } : col
            ),
          };
        }

        return { columns };
      });

      return { snapshot, qk };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(context.qk, context.snapshot);
      }
    },

    onSettled: (_data, _err, { params }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.board(params as unknown as Record<string, unknown>) });
      // Kanban y ordenes comparten tareas
      queryClient.invalidateQueries({ queryKey: queryKeys.ordenes.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tareas.all() });
    },
  });
}

// ─── Mutation: crear tarjeta ──────────────────────────────────────────────────

type CreateCardServerAction = (data: {
  titulo: string;
  prioridad: string;
  fecha?: string;
  estado?: string;
  assignedUserIds?: number[];
}) => Promise<{ id: number }>;

export function useKanbanCreateCard(serverAction: CreateCardServerAction) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: serverAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tareas.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.ordenes.all() });
    },
  });
}

// ─── Mutation: completar tarjeta ──────────────────────────────────────────────

type CompleteCardServerAction = (args: {
  dbId: number;
  source: "tarea" | "agenda";
  resultado?: string | null;
}) => Promise<void>;

export function useKanbanCompleteCard(serverAction: CompleteCardServerAction) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: serverAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tareas.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.ordenes.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.agenda.all() });
    },
  });
}
