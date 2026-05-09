"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-browser";
import { queryKeys } from "@/lib/query-keys";
import { eventBus } from "@/lib/event-bus";
import type { KanbanData, KanbanCardData, KanbanColumnData } from "@/lib/mock/dashboard";

// ─── Fetch function (browser Supabase) ───────────────────────────────────────

interface KanbanQueryParams {
  empresaId: number;
  userId:    number;
  agentIds?: number[];
}

async function fetchKanbanBoard(params: KanbanQueryParams): Promise<KanbanData> {
  const supabase = createClient();
  const userScope = params.agentIds?.length ? params.agentIds : [params.userId];

  const { data: tareas, error } = await supabase
    .from("tareas")
    .select(`
      id, titulo, prioridad, fecha, estado, resultado,
      tarea_usuarios!inner(usuario_id, usuarios(nombre, apellidos))
    `)
    .in("tarea_usuarios.usuario_id", userScope)
    .eq("empresa_id", params.empresaId)
    .in("estado", ["pendiente", "en_progreso"])
    .is("archived_at", null)
    .order("fecha", { ascending: true, nullsFirst: false });

  if (error) throw error;

  const pendientes: KanbanCardData[] = [];
  const enProgreso: KanbanCardData[] = [];

  for (const t of tareas ?? []) {
    const assignedUsers = (
      (t.tarea_usuarios as Array<{ usuarios: { nombre: string | null; apellidos: string | null } | null } | null>) ?? []
    )
      .map((tu) => `${tu?.usuarios?.nombre ?? ""} ${tu?.usuarios?.apellidos ?? ""}`.trim())
      .filter(Boolean);

    const card: KanbanCardData = {
      id:          `tarea-${t.id}`,
      source:      "tarea",
      dbId:        t.id,
      title:       t.titulo,
      priority:    (t.prioridad as "alta" | "media" | "baja") ?? "media",
      dueDate:     t.fecha ?? undefined,
      resultado:   t.resultado as string | null,
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

// ─── Query hook ───────────────────────────────────────────────────────────────

interface UseKanbanOptions {
  params:       KanbanQueryParams;
  initialData?: KanbanData;
}

export function useKanban({ params, initialData }: UseKanbanOptions) {
  return useQuery({
    queryKey:  queryKeys.kanban.board(params as unknown as Record<string, unknown>),
    queryFn:   () => fetchKanbanBoard(params),
    initialData,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  });
}

// ─── Mutation: move card (optimistic + rollback) ──────────────────────────────

interface MoveCardArgs {
  cardId:  string;
  dbId:    number;
  source:  "tarea" | "agenda";
  fromCol: string;
  toCol:   string;
  params:  KanbanQueryParams;
}

type MoveCardServerAction = (args: {
  dbId:      number;
  source:    "tarea" | "agenda";
  newEstado: string;
}) => Promise<void>;

export function useKanbanMoveCard(serverAction: MoveCardServerAction) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ dbId, source, toCol }: MoveCardArgs) =>
      serverAction({ dbId, source, newEstado: toCol }),

    // ── Optimistic update ─────────────────────────────────────────────────
    onMutate: async ({ cardId, fromCol, toCol, params }) => {
      const qk = queryKeys.kanban.board(params as unknown as Record<string, unknown>);
      await qc.cancelQueries({ queryKey: qk });
      const snapshot = qc.getQueryData<KanbanData>(qk);

      qc.setQueryData<KanbanData>(qk, (old) => {
        if (!old) return old;
        let movedCard: KanbanCardData | undefined;

        const columns = old.columns.map((col) => {
          if (col.id !== fromCol) return col;
          return {
            ...col,
            cards: col.cards.filter((c) => {
              if (c.id === cardId) { movedCard = c; return false; }
              return true;
            }),
          };
        });

        if (!movedCard) return { columns };

        const updated = { ...movedCard, isCompleted: toCol === "completado" };
        return {
          columns: columns.map((col) =>
            col.id === toCol ? { ...col, cards: [...col.cards, updated] } : col
          ),
        };
      });

      return { snapshot, qk };
    },

    // ── Rollback on error ─────────────────────────────────────────────────
    onError: (_err, _vars, context) => {
      if (context?.snapshot) qc.setQueryData(context.qk, context.snapshot);
    },

    // ── Emit event — sync engine handles all cross-view invalidation ──────
    onSuccess: (_data, { dbId, toCol }) => {
      eventBus.emit({ type: "task.moved", payload: { tareaId: dbId, fromCol: "", toCol } });
    },

    onSettled: (_data, _err, { params }) => {
      // Always refetch the specific board to confirm server state
      qc.invalidateQueries({
        queryKey: queryKeys.kanban.board(params as unknown as Record<string, unknown>),
      });
    },
  });
}

// ─── Mutation: create card ────────────────────────────────────────────────────

type CreateCardServerAction = (data: {
  titulo:           string;
  prioridad:        string;
  fecha?:           string;
  estado?:          string;
  assignedUserIds?: number[];
}) => Promise<{ id: number }>;

export function useKanbanCreateCard(
  serverAction: CreateCardServerAction,
  empresaId:    number
) {
  return useMutation({
    mutationFn: serverAction,
    onSuccess: (result) => {
      eventBus.emit({
        type:    "task.created",
        payload: { tareaId: result.id, empresaId },
      });
    },
  });
}

// ─── Mutation: complete card ──────────────────────────────────────────────────

type CompleteCardServerAction = (args: {
  dbId:      number;
  source:    "tarea" | "agenda";
  resultado?: string | null;
}) => Promise<void>;

export function useKanbanCompleteCard(serverAction: CompleteCardServerAction) {
  return useMutation({
    mutationFn: serverAction,
    onSuccess: (_data, { dbId, source }) => {
      if (source === "tarea") {
        eventBus.emit({ type: "task.completed", payload: { tareaId: dbId, source: "kanban" } });
      } else {
        eventBus.emit({ type: "calendar.event.completed", payload: { agendaId: dbId } });
      }
    },
  });
}

// ─── Mutation: delete card ────────────────────────────────────────────────────

type DeleteCardServerAction = (args: {
  dbId:   number;
  source: "tarea" | "agenda";
}) => Promise<void>;

export function useKanbanDeleteCard(serverAction: DeleteCardServerAction) {
  return useMutation({
    mutationFn: serverAction,
    onSuccess: (_data, { dbId, source }) => {
      if (source === "tarea") {
        eventBus.emit({ type: "task.deleted", payload: { tareaId: dbId } });
      } else {
        eventBus.emit({ type: "calendar.event.deleted", payload: { agendaId: dbId } });
      }
    },
  });
}
