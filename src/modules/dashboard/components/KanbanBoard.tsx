"use client";

import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { X, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import KanbanColumn from "./KanbanColumn";
import Drawer from "@/components/ui/drawer";
import ConfirmDialog from "@/components/ui/confirm-dialog";

// Lazy-load heavy drawers/modals — they're only needed after user interaction,
// not on initial board render. This reduces the initial JS bundle size.
const KanbanAddCard     = dynamic(() => import("./KanbanAddCard"),     { ssr: false });
const KanbanEditCard    = dynamic(() => import("./KanbanEditCard"),    { ssr: false });
const KanbanDetailDrawer = dynamic(() => import("./KanbanDetailDrawer"), { ssr: false });
const KanbanConvertCard = dynamic(() => import("./KanbanConvertCard"), { ssr: false });
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
import { DEFAULT_ACTIVITY_TIME, localDateKey, splitLocalDateTime } from "@/lib/local-date-time";

type NewKanbanCard = Omit<KanbanCardData, "id" | "source" | "dbId">;

type KanbanBoardProps = {
  initialData: KanbanData;
  customColumns?: Array<{ id: string; title: string }>;
  role: UserRole;
  currentUserId: string;
  agents?: Array<{ id: string; nombre: string }>;
};

function KanbanBoard({
  initialData,
  customColumns = [],
  role,
  currentUserId: _currentUserId,
  agents = [],
}: KanbanBoardProps) {
  const router = useRouter();
  const [columns, setColumns] = useState<KanbanColumnData[]>(() => {
    const custom: KanbanColumnData[] = customColumns.map((c) => ({
      id: c.id,
      title: c.title,
      cards: [],
      fixed: false,
    }));
    return [...initialData.columns, ...custom];
  });
  const [addingCardCol, setAddingCardCol] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<{ columnId: string; card: KanbanCardData } | null>(null);
  const [detailCard, setDetailCard] = useState<{ columnId: string; card: KanbanCardData } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "column" | "card"; columnId: string; cardId?: string; isAgenda?: boolean } | null>(null);
  const [confirmDeleteCard, setConfirmDeleteCard] = useState<{ columnId: string; card: KanbanCardData } | null>(null);
  const [resultadoModal, setResultadoModal] = useState<{ columnId: string; cardId: string; titulo: string } | null>(null);
  const [resultadoText, setResultadoText] = useState("");
  const [convertingCard, setConvertingCard] = useState<{
    card: KanbanCardData;
    sourceColId: string;
    destColId: string;
    sourceIndex: number;
    destIndex: number;
  } | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");
  const newColInputRef = useRef<HTMLInputElement>(null);

  function findCard(columnId: string, cardId: string) {
    return columns.find((c) => c.id === columnId)?.cards.find((c) => c.id === cardId) ?? null;
  }

  const handleDragEnd = useCallback(function handleDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const moved = findCard(source.droppableId, draggableId);
    if (!moved) return;

    // Tarea → Orden del dia: abrir drawer completo de conversion
    if (moved.source === "tarea" && destination.droppableId === "en_progreso") {
      setConvertingCard({
        card: moved,
        sourceColId: source.droppableId,
        destColId: destination.droppableId,
        sourceIndex: source.index,
        destIndex: destination.index,
      });
      return;
    }

    // Movimiento local (misma columna o columna custom)
    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, cards: [...col.cards] }));
      const sourceCol = next.find((c) => c.id === source.droppableId);
      const destCol = next.find((c) => c.id === destination.droppableId);
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
    }
  }, [router]); // end handleDragEnd

  const handleConfirmConvert = useCallback(async function handleConfirmConvert(data: {
    description: string;
    tipo: ActivityType;
    date: string;
    time: string;
    priority: KanbanPriority;
    assignedUserIds: number[];
  }) {
    if (!convertingCard) return;
    const { card, sourceColId, destColId, sourceIndex, destIndex } = convertingCard;

    await convertTareaToAgendaFullAction(card.dbId, {
      description: data.description,
      eventDate: data.date,
      time: data.time,
      priority: data.priority,
      tipo: data.tipo,
      assignedUserIds: data.assignedUserIds,
    });

    // Solo actualizar estado local si la conversion fue exitosa
    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, cards: [...col.cards] }));
      const sourceCol = next.find((c) => c.id === sourceColId);
      const destCol = next.find((c) => c.id === destColId);
      if (!sourceCol || !destCol) return prev;
      const [movedCard] = sourceCol.cards.splice(sourceIndex, 1);
      destCol.cards.splice(destIndex, 0, { ...movedCard, source: "agenda" as const });
      return next;
    });

    setConvertingCard(null);
    router.refresh();
  }, [convertingCard, router]); // end handleConfirmConvert

  const handleCancelConvert = useCallback(() => {
    setConvertingCard(null);
  }, []);

  const requestDeleteColumn = useCallback((columnId: string) => {
    setDeleteTarget({ type: "column", columnId });
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
    const id = `custom-${Date.now()}`;
    const orden = columns.length;
    setColumns((prev) => [...prev, { id, title, cards: [], fixed: false }]);
    setAddingColumn(false);
    setNewColTitle("");
    try {
      await addKanbanColumnAction({ col_id: id, titulo: title, orden });
    } catch {
      // La columna ya se añadió localmente; el error no bloquea la UX
    }
  }

  const handleAddCard = useCallback(async (columnId: string, newCard: NewKanbanCard) => {
    const isAgendaColumn = columnId === "en_progreso";
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticCard: KanbanCardData = {
      ...newCard,
      id: optimisticId,
      source: isAgendaColumn ? "agenda" : "tarea",
      dbId: -Date.now(),
      isCompleted: false,
      fromOrdenDia: isAgendaColumn,
    };
    setColumns((prev) =>
      prev.map((col) => col.id === columnId ? { ...col, cards: [...col.cards, optimisticCard] } : col),
    );

    try {
      const assignedUserIds = newCard.assignedUserIds?.length ? newCard.assignedUserIds : undefined;
      const { date, time } = splitLocalDateTime(newCard.dueDate);
      const created = isAgendaColumn
        ? await createAgendaAction({
            description: newCard.title,
            eventDate: date ?? localDateKey(),
            time: time ?? DEFAULT_ACTIVITY_TIME,
            priority: newCard.priority,
            tipo: newCard.tipo ?? "actividad",
            assignedUserIds,
          })
        : await createTareaAction({
            titulo: newCard.title,
            prioridad: newCard.priority,
            assignedUserIds,
          });

      const finalCard: KanbanCardData = {
        ...newCard,
        id: `${isAgendaColumn ? "agenda" : "tarea"}-${created.id}`,
        source: isAgendaColumn ? "agenda" : "tarea",
        dbId: created.id,
        isCompleted: false,
        fromOrdenDia: isAgendaColumn,
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
  }, [router]);

  const handleOpenDetail = useCallback((columnId: string, card: KanbanCardData) => {
    setDetailCard({ columnId, card });
  }, []);

  const handleEditFromDetail = useCallback(() => {
    setDetailCard((prev) => {
      if (!prev) return prev;
      const { columnId, card } = prev;
      setTimeout(() => setEditingCard({ columnId, card }), 150);
      return null;
    });
  }, []);

  const handleRequestDeleteFromDetail = useCallback(() => {
    setDetailCard((prev) => { if (prev) setConfirmDeleteCard(prev); return prev; });
  }, []);

  async function handleConfirmDeleteCard() {
    if (!confirmDeleteCard) return;
    const { columnId, card } = confirmDeleteCard;
    setConfirmDeleteCard(null);
    setDetailCard(null);

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
    title: string;
    priority: KanbanPriority;
    dueDate?: string;
    tipo?: ActivityType;
    assignedUserIds?: number[];
  }) => {
    if (!editingCard) return;
    const { columnId, card } = editingCard;
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? { ...col, cards: col.cards.map((c) => c.id === card.id ? { ...c, ...updates } : c) }
          : col,
      ),
    );

    if (card.source === "tarea") {
      updateTareaAction(card.dbId, {
        titulo: updates.title,
        prioridad: updates.priority,
        assignedUserIds: updates.assignedUserIds,
      })
        .then(() => router.refresh())
        .catch(() => router.refresh());
      return;
    }

    const { date, time } = splitLocalDateTime(updates.dueDate ?? card.dueDate);
    updateAgendaAction(card.dbId, {
      description: updates.title,
      priority: updates.priority,
      tipo: updates.tipo ?? card.tipo ?? "actividad",
      eventDate: date ?? localDateKey(),
      time: time ?? card.time ?? DEFAULT_ACTIVITY_TIME,
      assignedUserIds: updates.assignedUserIds,
    }).then(() => router.refresh()).catch(() => router.refresh());
  }, [editingCard, router]);

  const handleCompleteCard = useCallback((columnId: string, cardId: string, card: KanbanCardData) => {
    if (card.source === "agenda") {
      setResultadoText("");
      setResultadoModal({ columnId, cardId, titulo: card.title });
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
    if (!resultadoModal) return;
    const { columnId, cardId } = resultadoModal;
    const card = findCard(columnId, cardId);
    const resultado = resultadoText.trim();
    setResultadoModal(null);

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
    if (!deleteTarget) return;
    if (deleteTarget.type === "column") {
      handleDeleteColumn(deleteTarget.columnId);
    } else if (deleteTarget.type === "card" && deleteTarget.cardId) {
      const card = findCard(deleteTarget.columnId, deleteTarget.cardId);
      setColumns((prev) =>
        prev.map((col) =>
          col.id === deleteTarget.columnId
            ? { ...col, cards: col.cards.filter((c) => c.id !== deleteTarget.cardId) }
            : col,
        ),
      );
      if (!deleteTarget.isAgenda && card?.source === "tarea") {
        deleteTareaAction(card.dbId).then(() => router.refresh()).catch(() => router.refresh());
      }
      if (deleteTarget.isAgenda && card?.source === "agenda") {
        archiveAgendaAction(card.dbId).then(() => router.refresh()).catch(() => router.refresh());
      }
    }
    setDeleteTarget(null);
  }

  const isManager = role === "Administrador" || role === "Director";
  const currentUserIdNum = useMemo(() => Number(_currentUserId), [_currentUserId]);

  const isOwnerOrAssigned = useCallback((card: KanbanCardData) => {
    return card.assignedUserIds?.includes(currentUserIdNum) ?? false;
  }, [currentUserIdNum]);

  const canDeleteAgenda = useCallback((card: KanbanCardData) => {
    return isManager || isOwnerOrAssigned(card);
  }, [isManager, isOwnerOrAssigned]);

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="@container flex min-w-0 flex-row gap-3 overflow-x-auto overscroll-x-contain pb-2">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onDeleteColumn={requestDeleteColumn}
              onAddCard={(colId) => setAddingCardCol(colId)}
              onCompleteCard={handleCompleteCard}
              onDetailCard={handleOpenDetail}
            />
          ))}

          {/* Añadir columna */}
          {addingColumn ? (
            <div className="mt-0 flex h-fit w-[calc((100cqi-3rem)/4)] min-w-[260px] shrink-0 flex-col gap-2 rounded-2xl border border-dashed border-border bg-surface p-3">
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
                  className="flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
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
              className="mt-0 flex h-fit w-[calc((100cqi-3rem)/4)] min-w-[260px] shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface/50 px-4 py-6 text-sm font-medium text-text-secondary transition-all hover:border-primary/40 hover:bg-surface hover:text-primary"
            >
              <Plus className="h-4 w-4" />
              Nueva columna
            </button>
          )}
        </div>
      </DragDropContext>

      {/* Drawer detalle de tarjeta */}
      {detailCard && (
        <KanbanDetailDrawer
          card={detailCard.card}
          open
          onClose={() => setDetailCard(null)}
          onEdit={handleEditFromDetail}
          onDelete={handleRequestDeleteFromDetail}
          isManager={isManager}
          isOwnerOrAssigned={isOwnerOrAssigned(detailCard.card)}
          canDelete={
            detailCard.card.source === "tarea"
              ? (isManager || isOwnerOrAssigned(detailCard.card))
              : canDeleteAgenda(detailCard.card)
          }
        />
      )}

      {/* Convertir tarea → agenda (desde drag & drop) */}
      {convertingCard && (
        <KanbanConvertCard
          card={convertingCard.card}
          onConfirm={handleConfirmConvert}
          onClose={handleCancelConvert}
          agents={agents}
          currentUserId={_currentUserId}
          role={role}
        />
      )}

      {/* Añadir tarjeta */}
      {addingCardCol && (
        <KanbanAddCard
          role={role}
          agents={agents}
          currentUserId={_currentUserId}
          mode={addingCardCol === "en_progreso" ? "actividad" : "tarea"}
          onAdd={(card) => handleAddCard(addingCardCol, card)}
          onClose={() => setAddingCardCol(null)}
        />
      )}

      {/* Editar tarjeta */}
      {editingCard && (
        <KanbanEditCard
          card={editingCard.card}
          agents={agents}
          currentUserId={_currentUserId}
          onSave={(updates) => { handleSaveEdit(updates); setEditingCard(null); }}
          onClose={() => setEditingCard(null)}
        />
      )}

      {/* Confirmacion eliminar tarjeta (desde detalle) */}
      {confirmDeleteCard && (
        <ConfirmDialog
          open
          title="Eliminar actividad"
          description={
            confirmDeleteCard.card.source === "agenda"
              ? "Esta actividad se archivara y desaparecera del tablero. Esta accion no se puede deshacer."
              : "Esta tarea se eliminara permanentemente. Esta accion no se puede deshacer."
          }
          confirmLabel="Eliminar"
          onCancel={() => { setConfirmDeleteCard(null); }}
          onConfirm={handleConfirmDeleteCard}
        />
      )}

      {/* Resultado al completar */}
      {resultadoModal && (
        <Drawer
          open
          onClose={() => setResultadoModal(null)}
          title="Como ha ido?"
          subtitle={resultadoModal.titulo}
          width="sm"
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setResultadoModal(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmResultado}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
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
                value={resultadoText}
                onChange={(e) => setResultadoText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleConfirmResultado();
                  if (e.key === "Escape") setResultadoModal(null);
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
      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          title={deleteTarget.type === "column" ? "Eliminar columna" : "Eliminar actividad"}
          description={
            deleteTarget.type === "column"
              ? "Esta columna desaparecera de tu tablero. Las tareas dentro NO se eliminaran de la base de datos y quedaran sin columna asignada. ¿Seguro?"
              : deleteTarget.isAgenda
                ? "Esta actividad se archivara. ¿Quieres continuar?"
                : "¿Estas seguro de que quieres eliminar esta tarea? Esta accion no se puede deshacer."
          }
          confirmLabel="Eliminar"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
}

export default memo(KanbanBoard);
