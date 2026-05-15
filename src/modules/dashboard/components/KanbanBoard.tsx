"use client";

import { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { X, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import KanbanColumn from "./KanbanColumn";
import Drawer from "@/components/ui/drawer";
import ConfirmDialog from "@/components/ui/confirm-dialog";

// Lazy-load heavy drawers/modals — they're only needed after user interaction,
// not on initial board render. This reduces the initial JS bundle size.
const KanbanAddCard      = dynamic(() => import("./KanbanAddCard"),      { ssr: false });
const KanbanEditCard     = dynamic(() => import("./KanbanEditCard"),     { ssr: false });
const KanbanDetailDrawer = dynamic(() => import("./KanbanDetailDrawer"), { ssr: false });
const KanbanConvertCard  = dynamic(() => import("./KanbanConvertCard"),  { ssr: false });
import type { KanbanData, KanbanColumnData, KanbanCardData, KanbanPriority } from "@/lib/mock/dashboard";
import type { UserRole } from "@/lib/roles";
import type { ActivityType } from "@/lib/activity-options";
import {
  addKanbanColumnAction,
  completeAgendaAction,
  completeTareaAction,
  convertAgendaToTareaAction,
  convertTareaToAgendaFullAction,
  createAgendaAction,
  createTareaAction,
  deleteKanbanColumnAction,
  deleteTareaAction,
  archiveAgendaAction,
  updateAgendaAction,
  updateTareaAction,
} from "@/app/(crm)/dashboard/actions";
import { saveAgendaGoogleEventIdAction } from "@/app/(crm)/calendario/actions";
import { DEFAULT_ACTIVITY_TIME, localDateKey, splitLocalDateTime } from "@/lib/local-date-time";
import { useKanbanBoard, useMoveKanbanCard } from "@/modules/kanban/hooks/use-kanban-board";
import type { KanbanQueryParams } from "@/modules/kanban/types";

// ─── Modal state machine ──────────────────────────────────────────────────────
//
// All mutually-exclusive UI overlays (detail drawer, edit drawer, add-card
// drawer, confirm dialogs, resultado drawer, convert drawer) live in a single
// discriminated union.  This prevents impossible combinations like
// "editing AND converting simultaneously" and makes transitions explicit.
//
// Exception: "confirm_delete_from_detail" keeps the card data so the
// KanbanDetailDrawer can remain visible behind the ConfirmDialog, matching the
// original behaviour where both detailCard and confirmDeleteCard could be set.

type DeleteTarget = {
  type:      "column" | "card";
  columnId:  string;
  cardId?:   string;
  isAgenda?: boolean;
};

export type KanbanModalState =
  | { type: "idle" }
  | { type: "detail";                   columnId: string; card: KanbanCardData }
  | { type: "editing";                  columnId: string; card: KanbanCardData }
  | { type: "adding";                   columnId: string }
  | { type: "confirm_delete_from_detail"; columnId: string; card: KanbanCardData }
  | { type: "confirm_delete_target";    target: DeleteTarget }
  | { type: "resultado";                columnId: string; cardId: string; titulo: string; text: string }
  | { type: "converting";               card: KanbanCardData; sourceColId: string; destColId: string; sourceIndex: number; destIndex: number };

export type KanbanModalAction =
  | { type: "OPEN_DETAIL";                      columnId: string; card: KanbanCardData }
  | { type: "OPEN_EDITING";                     columnId: string; card: KanbanCardData }
  | { type: "OPEN_ADD_CARD";                    columnId: string }
  | { type: "REQUEST_DELETE_COLUMN";            columnId: string }
  | { type: "REQUEST_DELETE_CARD_FROM_DETAIL" }
  | { type: "OPEN_RESULTADO";                   columnId: string; cardId: string; titulo: string }
  | { type: "OPEN_CONVERTING";                  card: KanbanCardData; sourceColId: string; destColId: string; sourceIndex: number; destIndex: number }
  | { type: "CLOSE" }
  | { type: "SET_RESULTADO_TEXT";               text: string };

function kanbanModalReducer(state: KanbanModalState, action: KanbanModalAction): KanbanModalState {
  switch (action.type) {
    case "OPEN_DETAIL":
      return { type: "detail", columnId: action.columnId, card: action.card };

    case "OPEN_EDITING":
      return { type: "editing", columnId: action.columnId, card: action.card };

    case "OPEN_ADD_CARD":
      return { type: "adding", columnId: action.columnId };

    case "REQUEST_DELETE_COLUMN":
      return { type: "confirm_delete_target", target: { type: "column", columnId: action.columnId } };

    case "REQUEST_DELETE_CARD_FROM_DETAIL":
      // Transition is only valid when a detail drawer is open.
      // The card data is preserved so KanbanDetailDrawer can remain visible
      // underneath the ConfirmDialog (same behaviour as original code).
      if (state.type !== "detail") return state;
      return { type: "confirm_delete_from_detail", columnId: state.columnId, card: state.card };

    case "OPEN_RESULTADO":
      // text starts empty; the user fills it in before confirming
      return { type: "resultado", columnId: action.columnId, cardId: action.cardId, titulo: action.titulo, text: "" };

    case "OPEN_CONVERTING":
      return {
        type:        "converting",
        card:        action.card,
        sourceColId: action.sourceColId,
        destColId:   action.destColId,
        sourceIndex: action.sourceIndex,
        destIndex:   action.destIndex,
      };

    case "CLOSE":
      return { type: "idle" };

    case "SET_RESULTADO_TEXT":
      if (state.type !== "resultado") return state;
      return { ...state, text: action.text };

    default:
      return state;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

type NewKanbanCard = Omit<KanbanCardData, "id" | "source" | "dbId"> & {
  syncToGcal?: boolean;
};

type KanbanBoardProps = {
  initialData:    KanbanData;
  customColumns?: Array<{ id: string; title: string }>;
  role:           UserRole;
  currentUserId:  string;
  empresaId:      number | null;
  agents?:        Array<{ id: string; nombre: string }>;
  isGoogleCalendarConnected?: boolean;
};

function KanbanBoard({
  initialData,
  customColumns = [],
  role,
  currentUserId: _currentUserId,
  empresaId,
  agents = [],
  isGoogleCalendarConnected = false,
}: KanbanBoardProps) {
  const router = useRouter();
  const currentUserIdNum = useMemo(() => Number(_currentUserId), [_currentUserId]);
  const kanbanParams = useMemo<KanbanQueryParams | null>(() => {
    if (empresaId == null || Number.isNaN(currentUserIdNum)) return null;
    return {
      empresaId,
      userId:   currentUserIdNum,
      agentIds: agents.map((agent) => Number(agent.id)).filter((id) => !Number.isNaN(id)),
    };
  }, [agents, currentUserIdNum, empresaId]);

  const kanbanQuery   = useKanbanBoard(
    kanbanParams ?? { empresaId: 0, userId: 0 },
    { enabled: kanbanParams !== null, initialData },
  );
  const moveKanbanCard = useMoveKanbanCard();

  const [columns, setColumns] = useState<KanbanColumnData[]>(() => {
    const custom: KanbanColumnData[] = customColumns.map((c) => ({
      id: c.id, title: c.title, cards: [], fixed: false,
    }));
    return [...initialData.columns, ...custom];
  });

  // Modal state — replaces 8 individual useState calls (addingCardCol,
  // editingCard, detailCard, deleteTarget, confirmDeleteCard, resultadoModal,
  // resultadoText, convertingCard).
  const [modal, dispatchModal] = useReducer(kanbanModalReducer, { type: "idle" });

  // Column UI state — not modal, kept as separate useState
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColTitle,  setNewColTitle]  = useState("");
  const [mobileColIndex, setMobileColIndex] = useState(0);
  const newColInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    const custom: KanbanColumnData[] = customColumns.map((c) => ({
      id: c.id, title: c.title, cards: [], fixed: false,
    }));
    queueMicrotask(() => {
      if (!cancelled) setColumns([...(kanbanQuery.data?.columns ?? initialData.columns), ...custom]);
    });
    return () => { cancelled = true; };
  }, [customColumns, initialData.columns, kanbanQuery.data?.columns]);

  const findCard = useCallback((columnId: string, cardId: string) => {
    return columns.find((c) => c.id === columnId)?.cards.find((c) => c.id === cardId) ?? null;
  }, [columns]);

  const handleDragEnd = useCallback(function handleDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const moved = findCard(source.droppableId, draggableId);
    if (!moved) return;

    // Tarea → Orden del dia: abrir drawer completo de conversion
    if (moved.source === "tarea" && destination.droppableId === "en_progreso") {
      dispatchModal({
        type:        "OPEN_CONVERTING",
        card:        moved,
        sourceColId: source.droppableId,
        destColId:   destination.droppableId,
        sourceIndex: source.index,
        destIndex:   destination.index,
      });
      return;
    }

    const previousColumns = columns;

    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, cards: [...col.cards] }));
      const sourceCol = next.find((c) => c.id === source.droppableId);
      const destCol   = next.find((c) => c.id === destination.droppableId);
      if (!sourceCol || !destCol) return prev;
      const [card] = sourceCol.cards.splice(source.index, 1);
      destCol.cards.splice(destination.index, 0, card);
      return next;
    });

    // Agenda → Pendientes: conversion inmediata
    if (moved.source === "agenda" && destination.droppableId === "pendientes") {
      convertAgendaToTareaAction(moved.dbId, moved.assignedUserIds)
        .then(() => router.refresh())
        .catch(() => router.refresh());
      return;
    }

    if (kanbanParams) {
      moveKanbanCard.mutate(
        {
          cardId:    moved.id,
          dbId:      moved.dbId,
          source:    moved.source,
          fromCol:   source.droppableId,
          toCol:     destination.droppableId,
          toIndex:   destination.index,
          params:    kanbanParams,
          newEstado: destination.droppableId,
        },
        { onError: () => setColumns(previousColumns) },
      );
    }
  }, [columns, findCard, kanbanParams, moveKanbanCard, router]);

  const handleConfirmConvert = useCallback(async function handleConfirmConvert(data: {
    description:    string;
    tipo:           ActivityType;
    date:           string;
    time:           string;
    priority:       KanbanPriority;
    assignedUserIds: number[];
  }) {
    if (modal.type !== "converting") return;
    const { card, sourceColId, destColId, sourceIndex, destIndex } = modal;

    await convertTareaToAgendaFullAction(card.dbId, {
      description:    data.description,
      eventDate:      data.date,
      time:           data.time,
      priority:       data.priority,
      tipo:           data.tipo,
      assignedUserIds: data.assignedUserIds,
    });

    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, cards: [...col.cards] }));
      const sourceCol = next.find((c) => c.id === sourceColId);
      const destCol   = next.find((c) => c.id === destColId);
      if (!sourceCol || !destCol) return prev;
      const [movedCard] = sourceCol.cards.splice(sourceIndex, 1);
      destCol.cards.splice(destIndex, 0, { ...movedCard, source: "agenda" as const });
      return next;
    });

    dispatchModal({ type: "CLOSE" });
    router.refresh();
  }, [modal, router]);

  const handleCancelConvert = useCallback(() => {
    dispatchModal({ type: "CLOSE" });
  }, []);

  const requestDeleteColumn = useCallback((columnId: string) => {
    dispatchModal({ type: "REQUEST_DELETE_COLUMN", columnId });
  }, []);

  const handleDeleteColumn = useCallback((columnId: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== columnId));
    deleteKanbanColumnAction(columnId).catch(() => {});
  }, []);

  function handleStartAddColumn() {
    setNewColTitle("");
    setAddingColumn(true);
    setTimeout(() => newColInputRef.current?.focus(), 50);
  }

  async function handleConfirmAddColumn() {
    const title = newColTitle.trim();
    if (!title) { setAddingColumn(false); return; }
    const id    = `custom-${Date.now()}`;
    const orden = columns.length;
    setColumns((prev) => [...prev, { id, title, cards: [], fixed: false }]);
    setAddingColumn(false);
    setNewColTitle("");
    try {
      await addKanbanColumnAction({ col_id: id, titulo: title, orden });
    } catch {
      // La columna ya se añadio localmente; el error no bloquea la UX
    }
  }

  const handleAddCard = useCallback(async (columnId: string, newCard: NewKanbanCard) => {
    const { syncToGcal, ...cardData } = newCard;
    const isAgendaColumn = columnId === "en_progreso";
    const optimisticId   = `optimistic-${Date.now()}`;
    const optimisticCard: KanbanCardData = {
      ...cardData,
      id:           optimisticId,
      source:       isAgendaColumn ? "agenda" : "tarea",
      dbId:         -Date.now(),
      isCompleted:  false,
      fromOrdenDia: isAgendaColumn,
    };
    setColumns((prev) =>
      prev.map((col) => col.id === columnId ? { ...col, cards: [...col.cards, optimisticCard] } : col),
    );

    try {
      const assignedUserIds = newCard.assignedUserIds?.length ? newCard.assignedUserIds : undefined;
      const { date, time }  = splitLocalDateTime(newCard.dueDate);
      const created = isAgendaColumn
        ? await createAgendaAction({
            description:  newCard.title,
            eventDate:    date ?? localDateKey(),
            time:         time ?? DEFAULT_ACTIVITY_TIME,
            priority:     newCard.priority,
            tipo:         newCard.tipo ?? "actividad",
            assignedUserIds,
          })
        : await createTareaAction({
            titulo:       newCard.title,
            prioridad:    newCard.priority,
            assignedUserIds,
          });

      let gcalEventId: string | null = null;
      if (isAgendaColumn && isGoogleCalendarConnected && syncToGcal) {
        try {
          const gcalRes = await fetch("/api/google/events", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              summary:  newCard.title,
              date:     date ?? localDateKey(),
              time:     time ?? DEFAULT_ACTIVITY_TIME,
              agendaId: created.id,
            }),
          });
          if (gcalRes.ok) {
            const gcalData = await gcalRes.json();
            if (gcalData.id) {
              const syncResult = await saveAgendaGoogleEventIdAction(created.id, gcalData.id);
              if (syncResult.success) {
                gcalEventId = syncResult.data.gcal_event_id;
              }
            }
          }
        } catch {
          // La actividad ya existe en Metria; un fallo de Google no debe romper el tablero.
        }
      }

      const finalCard: KanbanCardData = {
        ...cardData,
        id:           `${isAgendaColumn ? "agenda" : "tarea"}-${created.id}`,
        source:       isAgendaColumn ? "agenda" : "tarea",
        dbId:         created.id,
        isCompleted:  false,
        fromOrdenDia: isAgendaColumn,
        gcalEventId,
      };
      setColumns((prev) =>
        prev.map((col) =>
          col.id === columnId
            ? { ...col, cards: col.cards.map((card) => card.id === optimisticId ? finalCard : card) }
            : col,
        ),
      );
      router.refresh();
    } catch {
      setColumns((prev) =>
        prev.map((col) =>
          col.id === columnId ? { ...col, cards: col.cards.filter((card) => card.id !== optimisticId) } : col,
        ),
      );
      router.refresh();
    }
  }, [isGoogleCalendarConnected, router]);

  // Stable — passes to memo(KanbanColumn), must not close over modal
  const handleOpenDetail = useCallback((columnId: string, card: KanbanCardData) => {
    dispatchModal({ type: "OPEN_DETAIL", columnId, card });
  }, []);

  // Stable setter — passed as onAddCard to every KanbanColumn.
  // Without useCallback this would be a new reference on every Board render,
  // breaking memo(KanbanColumn) even on unrelated state changes.
  const handleOpenAddCard = useCallback((colId: string) => {
    dispatchModal({ type: "OPEN_ADD_CARD", columnId: colId });
  }, []);

  const handleEditFromDetail = useCallback(() => {
    // Close detail first, then open editing after a short delay (150ms) so the
    // drawer exit animation has time to start before the edit drawer enters.
    if (modal.type !== "detail") return;
    const { columnId, card } = modal;
    dispatchModal({ type: "CLOSE" });
    setTimeout(() => dispatchModal({ type: "OPEN_EDITING", columnId, card }), 150);
  }, [modal]);

  const handleRequestDeleteFromDetail = useCallback(() => {
    // Reducer transitions detail → confirm_delete_from_detail only when state
    // is already "detail", so this is a no-op if called unexpectedly.
    dispatchModal({ type: "REQUEST_DELETE_CARD_FROM_DETAIL" });
  }, []);

  async function handleConfirmDeleteCard() {
    if (modal.type !== "confirm_delete_from_detail") return;
    const { columnId, card } = modal;
    dispatchModal({ type: "CLOSE" });

    try {
      if (card.source === "agenda") {
        await archiveAgendaAction(card.dbId);
      } else {
        await deleteTareaAction(card.dbId);
      }
      setColumns((prev) =>
        prev.map((col) =>
          col.id === columnId ? { ...col, cards: col.cards.filter((c) => c.id !== card.id) } : col,
        ),
      );
      router.refresh();
    } catch {
      router.refresh();
    }
  }

  const handleSaveEdit = useCallback((updates: {
    title:           string;
    priority:        KanbanPriority;
    dueDate?:        string;
    tipo?:           ActivityType;
    assignedUserIds?: number[];
  }) => {
    if (modal.type !== "editing") return;
    const { columnId, card } = modal;
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? { ...col, cards: col.cards.map((c) => c.id === card.id ? { ...c, ...updates } : c) }
          : col,
      ),
    );

    if (card.source === "tarea") {
      updateTareaAction(card.dbId, {
        titulo:          updates.title,
        prioridad:       updates.priority,
        assignedUserIds: updates.assignedUserIds,
      })
        .then(() => router.refresh())
        .catch(() => router.refresh());
      return;
    }

    const { date, time } = splitLocalDateTime(updates.dueDate ?? card.dueDate);
    updateAgendaAction(card.dbId, {
      description:     updates.title,
      priority:        updates.priority,
      tipo:            updates.tipo ?? card.tipo ?? "actividad",
      eventDate:       date ?? localDateKey(),
      time:            time ?? card.time ?? DEFAULT_ACTIVITY_TIME,
      assignedUserIds: updates.assignedUserIds,
    }).then(() => router.refresh()).catch(() => router.refresh());
  }, [modal, router]);

  // Stable — passed to memo(KanbanColumn) via onCompleteCard
  const handleCompleteCard = useCallback((columnId: string, cardId: string, card: KanbanCardData) => {
    if (card.source === "agenda") {
      dispatchModal({ type: "OPEN_RESULTADO", columnId, cardId, titulo: card.title });
      return;
    }

    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? { ...col, cards: col.cards.map((c) => c.id === cardId ? { ...c, isCompleted: true } : c) }
          : col,
      ),
    );
    completeTareaAction(card.dbId).then(() => router.refresh()).catch(() => router.refresh());
  }, [router]);

  function handleConfirmResultado() {
    if (modal.type !== "resultado") return;
    const { columnId, cardId, text } = modal;
    const card      = findCard(columnId, cardId);
    const resultado = text.trim();
    dispatchModal({ type: "CLOSE" });

    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? { ...col, cards: col.cards.map((c) => c.id === cardId ? { ...c, isCompleted: true, resultado: resultado || null } : c) }
          : col,
      ),
    );

    if (card?.source === "agenda") {
      completeAgendaAction(card.dbId, true, resultado || undefined).then(() => router.refresh()).catch(() => router.refresh());
    } else if (card?.source === "tarea") {
      completeTareaAction(card.dbId, resultado || undefined).then(() => router.refresh()).catch(() => router.refresh());
    }
  }

  function handleConfirmDelete() {
    if (modal.type !== "confirm_delete_target") return;
    const { target } = modal;
    if (target.type === "column") {
      handleDeleteColumn(target.columnId);
    } else if (target.type === "card" && target.cardId) {
      const card = findCard(target.columnId, target.cardId);
      setColumns((prev) =>
        prev.map((col) =>
          col.id === target.columnId
            ? { ...col, cards: col.cards.filter((c) => c.id !== target.cardId) }
            : col,
        ),
      );
      if (!target.isAgenda && card?.source === "tarea") {
        deleteTareaAction(card.dbId).then(() => router.refresh()).catch(() => router.refresh());
      }
      if (target.isAgenda && card?.source === "agenda") {
        archiveAgendaAction(card.dbId).then(() => router.refresh()).catch(() => router.refresh());
      }
    }
    dispatchModal({ type: "CLOSE" });
  }

  const isManager = role === "Administrador" || role === "Director";
  const isOwnerOrAssigned = useCallback((card: KanbanCardData) => {
    return card.assignedUserIds?.includes(currentUserIdNum) ?? false;
  }, [currentUserIdNum]);

  const canDeleteAgenda = useCallback((card: KanbanCardData) => {
    return isManager || isOwnerOrAssigned(card);
  }, [isManager, isOwnerOrAssigned]);

  // Pre-compute per-column stats used by the mobile tab selector.
  const mobileColumnStats = useMemo(
    () => columns.map((col) => {
      const activeCount = col.cards.filter((c) => !c.isCompleted).length;
      const total       = col.cards.length;
      return {
        id:         col.id,
        title:      col.title,
        activeCount,
        countLabel: activeCount === total ? String(activeCount) : `${activeCount}/${total}`,
      };
    }),
    [columns],
  );

  // Dev-only render tracker: hooks always called, logging only in dev.
  const devRenderCountRef = useRef(0);
  const devLastCommitRef = useRef<number | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const now = performance.now();
    const previous = devLastCommitRef.current;
    devLastCommitRef.current = now;
    devRenderCountRef.current += 1;
    if (devRenderCountRef.current <= 1 || previous == null) return;
    const delta = (now - previous).toFixed(1);
    console.debug(`[PERF] KanbanBoard commit #${devRenderCountRef.current} +${delta}ms`, {
      modalType: modal.type,
      columnsCount: columns.length,
      totalCards: columns.reduce((s, c) => s + c.cards.length, 0),
    });
  });

  // Convenience derivations used in the JSX — avoids repeating type checks
  const showDetail = modal.type === "detail" || modal.type === "confirm_delete_from_detail";
  const detailModalData = showDetail ? modal : null;

  return (
    <>
      {/* ── Mobile column selector (tabs) ──────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto px-1 pb-1 md:hidden" aria-label="Selector de columna">
        {mobileColumnStats.map((stat, i) => (
          <button
            key={stat.id}
            onClick={() => setMobileColIndex(i)}
            className={`touch-target shrink-0 rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
              mobileColIndex === i
                ? "bg-primary text-white shadow-sm"
                : "bg-surface text-text-secondary border border-border hover:bg-surface-raised"
            }`}
          >
            {stat.title}
            <span className={`ml-1.5 rounded-full px-1.5 py-px text-[10px] ${
              mobileColIndex === i ? "bg-white/20 text-white" : "bg-muted text-text-secondary"
            }`}>
              {stat.countLabel}
            </span>
          </button>
        ))}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Desktop columns */}
        <div className="@container hidden flex-row gap-3 overflow-x-auto overscroll-x-contain pb-2 md:flex">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onDeleteColumn={requestDeleteColumn}
              onAddCard={handleOpenAddCard}
              onCompleteCard={handleCompleteCard}
              onDetailCard={handleOpenDetail}
            />
          ))}

          {addingColumn ? (
            <div className="mt-0 hidden h-fit w-[calc((100cqi-3rem)/4)] min-w-[260px] shrink-0 flex-col gap-2 rounded-2xl border border-dashed border-border bg-surface p-3 md:flex">
              <input
                ref={newColInputRef}
                type="text"
                value={newColTitle}
                onChange={(e) => setNewColTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmAddColumn();
                  if (e.key === "Escape") setAddingColumn(false);
                }}
                placeholder="Nombre de la columna..."
                className="input text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmAddColumn}
                  className="pressable flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary-dark"
                >
                  Añadir
                </button>
                <button
                  type="button"
                  onClick={() => setAddingColumn(false)}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartAddColumn}
              className="pressable mt-0 hidden h-fit w-[calc((100cqi-3rem)/4)] min-w-[260px] shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface/50 px-4 py-6 text-sm font-medium text-text-secondary hover:border-primary/40 hover:bg-surface hover:text-primary md:flex"
            >
              <Plus className="h-4 w-4" />
              Nueva columna
            </button>
          )}
        </div>

        {/* Mobile: only show selected column (inside DragDropContext) */}
        <div className="md:hidden">
          {columns[mobileColIndex] && (
            <KanbanColumn
              column={columns[mobileColIndex]}
              onDeleteColumn={requestDeleteColumn}
              onAddCard={handleOpenAddCard}
              onCompleteCard={handleCompleteCard}
              onDetailCard={handleOpenDetail}
            />
          )}
        </div>
      </DragDropContext>

      {/* Drawer detalle de tarjeta */}
      {detailModalData && (
        <KanbanDetailDrawer
          card={detailModalData.card}
          open
          onClose={() => dispatchModal({ type: "CLOSE" })}
          onEdit={handleEditFromDetail}
          onDelete={handleRequestDeleteFromDetail}
          isManager={isManager}
          isOwnerOrAssigned={isOwnerOrAssigned(detailModalData.card)}
          canDelete={
            detailModalData.card.source === "tarea"
              ? (isManager || isOwnerOrAssigned(detailModalData.card))
              : canDeleteAgenda(detailModalData.card)
          }
        />
      )}

      {/* Convertir tarea → agenda (desde drag & drop) */}
      {modal.type === "converting" && (
        <KanbanConvertCard
          card={modal.card}
          onConfirm={handleConfirmConvert}
          onClose={handleCancelConvert}
          agents={agents}
          currentUserId={_currentUserId}
          role={role}
        />
      )}

      {/* Añadir tarjeta */}
      {modal.type === "adding" && (
        <KanbanAddCard
          role={role}
          agents={agents}
          currentUserId={_currentUserId}
          isGoogleCalendarConnected={isGoogleCalendarConnected}
          mode={modal.columnId === "en_progreso" ? "actividad" : "tarea"}
          onAdd={(card) => handleAddCard(modal.columnId, card)}
          onClose={() => dispatchModal({ type: "CLOSE" })}
        />
      )}

      {/* Editar tarjeta */}
      {modal.type === "editing" && (
        <KanbanEditCard
          card={modal.card}
          agents={agents}
          currentUserId={_currentUserId}
          onSave={(updates) => { handleSaveEdit(updates); dispatchModal({ type: "CLOSE" }); }}
          onClose={() => dispatchModal({ type: "CLOSE" })}
        />
      )}

      {/* Confirmacion eliminar tarjeta (desde detalle) */}
      {modal.type === "confirm_delete_from_detail" && (
        <ConfirmDialog
          open
          title="Eliminar actividad"
          description={
            modal.card.source === "agenda"
              ? "Esta actividad se archivara y desaparecera del tablero. Esta accion no se puede deshacer."
              : "Esta tarea se eliminara permanentemente. Esta accion no se puede deshacer."
          }
          confirmLabel="Eliminar"
          onCancel={() => dispatchModal({ type: "CLOSE" })}
          onConfirm={handleConfirmDeleteCard}
        />
      )}

      {/* Resultado al completar */}
      {modal.type === "resultado" && (
        <Drawer
          open
          onClose={() => dispatchModal({ type: "CLOSE" })}
          title="Como ha ido?"
          subtitle={modal.titulo}
          width="sm"
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => dispatchModal({ type: "CLOSE" })}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmResultado}
                className="pressable rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
              >
                Marcar como realizada
              </button>
            </div>
          }
        >
          <div className="space-y-4 p-6">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">
                Resultado / nota de lo realizado
              </label>
              <textarea
                autoFocus
                value={modal.text}
                onChange={(e) => dispatchModal({ type: "SET_RESULTADO_TEXT", text: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleConfirmResultado();
                  if (e.key === "Escape") dispatchModal({ type: "CLOSE" });
                }}
                placeholder="Ej: Llamada realizada, cliente interesado. Proxima visita el martes."
                rows={4}
                className="input w-full resize-none text-sm"
              />
              <p className="text-xs text-text-secondary">Opcional · Ctrl+Enter para confirmar</p>
            </div>
          </div>
        </Drawer>
      )}

      {/* Confirmacion eliminar tarjeta/columna (desde hover) */}
      {modal.type === "confirm_delete_target" && (
        <ConfirmDialog
          open
          title={modal.target.type === "column" ? "Eliminar columna" : "Eliminar actividad"}
          description={
            modal.target.type === "column"
              ? "Esta columna desaparecera de tu tablero. Las tareas dentro NO se eliminaran de la base de datos y quedaran sin columna asignada. ¿Seguro?"
              : modal.target.isAgenda
                ? "Esta actividad se archivara. ¿Quieres continuar?"
                : "¿Estas seguro de que quieres eliminar esta tarea? Esta accion no se puede deshacer."
          }
          confirmLabel="Eliminar"
          onCancel={() => dispatchModal({ type: "CLOSE" })}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
}

export default memo(KanbanBoard);
