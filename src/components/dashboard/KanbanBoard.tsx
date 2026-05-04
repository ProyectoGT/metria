"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { Calendar, Clock } from "lucide-react";
import KanbanColumn from "./KanbanColumn";
import KanbanAddCard from "./KanbanAddCard";
import KanbanEditCard from "./KanbanEditCard";
import type { KanbanData, KanbanColumnData, KanbanCardData, KanbanPriority } from "@/lib/mock/dashboard";
import type { UserRole } from "@/lib/roles";
import type { ActivityType } from "@/lib/activity-options";
import {
  completeAgendaAction,
  completeTareaAction,
  convertAgendaToTareaAction,
  convertTareaToAgendaAction,
  createAgendaAction,
  createTareaAction,
  deleteTareaAction,
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

export default function KanbanBoard({
  initialData,
  role,
  currentUserId: _currentUserId,
  agents = [],
}: KanbanBoardProps) {
  const router = useRouter();
  const [columns, setColumns] = useState<KanbanColumnData[]>(initialData.columns);
  const [addingCardCol, setAddingCardCol] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<{ columnId: string; card: KanbanCardData } | null>(null);
  const [resultadoModal, setResultadoModal] = useState<{ columnId: string; cardId: string; titulo: string } | null>(null);
  const [resultadoText, setResultadoText] = useState("");
  const [convertModal, setConvertModal] = useState<{
    card: KanbanCardData;
    sourceColId: string;
    destColId: string;
    sourceIndex: number;
    destIndex: number;
  } | null>(null);
  const [convertDate, setConvertDate] = useState(localDateKey());
  const [convertTime, setConvertTime] = useState(DEFAULT_ACTIVITY_TIME);

  function findCard(columnId: string, cardId: string) {
    return columns.find((c) => c.id === columnId)?.cards.find((c) => c.id === cardId) ?? null;
  }

  function handleDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const moved = findCard(source.droppableId, draggableId);
    if (!moved) return;

    // Tarea → Orden del dia: pedir fecha/hora antes de convertir
    if (moved.source === "tarea" && destination.droppableId === "en_progreso") {
      setConvertDate(localDateKey());
      setConvertTime(DEFAULT_ACTIVITY_TIME);
      setConvertModal({
        card: moved,
        sourceColId: source.droppableId,
        destColId: destination.droppableId,
        sourceIndex: source.index,
        destIndex: destination.index,
      });
      return;
    }

    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, cards: [...col.cards] }));
      const sourceCol = next.find((c) => c.id === source.droppableId);
      const destCol = next.find((c) => c.id === destination.droppableId);
      if (!sourceCol || !destCol) return prev;
      const [card] = sourceCol.cards.splice(source.index, 1);
      destCol.cards.splice(destination.index, 0, card);
      return next;
    });

    if (source.droppableId === destination.droppableId) return;

    if (moved.source === "agenda" && destination.droppableId === "pendientes") {
      convertAgendaToTareaAction(moved.dbId, moved.assignedUserIds)
        .then(() => router.refresh())
        .catch(() => router.refresh());
    }
  }

  function handleConfirmConvert() {
    if (!convertModal) return;
    const { card, sourceColId, destColId, sourceIndex, destIndex } = convertModal;
    setConvertModal(null);

    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, cards: [...col.cards] }));
      const sourceCol = next.find((c) => c.id === sourceColId);
      const destCol = next.find((c) => c.id === destColId);
      if (!sourceCol || !destCol) return prev;
      const [movedCard] = sourceCol.cards.splice(sourceIndex, 1);
      destCol.cards.splice(destIndex, 0, { ...movedCard, source: "agenda" as const });
      return next;
    });

    convertTareaToAgendaAction(card.dbId, {
      date: convertDate,
      time: convertTime,
      assignedUserIds: card.assignedUserIds,
    }).then(() => router.refresh()).catch(() => router.refresh());
  }

  const handleAddCard = useCallback(async (columnId: string, newCard: NewKanbanCard) => {
    try {
      const assignedUserIds = newCard.assignedUserIds?.length ? newCard.assignedUserIds : undefined;
      const { date, time } = splitLocalDateTime(newCard.dueDate);
      const isAgendaColumn = columnId === "en_progreso";
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
        prev.map((col) => col.id === columnId ? { ...col, cards: [...col.cards, finalCard] } : col),
      );
      router.refresh();
    } catch {
      router.refresh();
    }
  }, [router]);

  function handleDeleteCard(columnId: string, cardId: string) {
    const card = findCard(columnId, cardId);
    setColumns((prev) =>
      prev.map((col) => col.id === columnId ? { ...col, cards: col.cards.filter((c) => c.id !== cardId) } : col),
    );
    if (card?.source === "tarea") {
      deleteTareaAction(card.dbId).then(() => router.refresh()).catch(() => router.refresh());
    }
  }

  const handleOpenEdit = useCallback((columnId: string, card: KanbanCardData) => {
    setEditingCard({ columnId, card });
  }, []);

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

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-row gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              role={role}
              currentUserId={_currentUserId}
              onDeleteColumn={() => {}}
              onAddCard={(colId) => setAddingCardCol(colId)}
              onDeleteCard={handleDeleteCard}
              onEditCard={handleOpenEdit}
              onCompleteCard={handleCompleteCard}
            />
          ))}
        </div>
      </DragDropContext>

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

      {editingCard && (
        <KanbanEditCard
          card={editingCard.card}
          agents={agents}
          currentUserId={_currentUserId}
          onSave={(updates) => { handleSaveEdit(updates); setEditingCard(null); }}
          onClose={() => setEditingCard(null)}
        />
      )}

      {resultadoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-text-primary">Como ha ido?</h2>
              <p className="mt-0.5 truncate text-sm text-text-secondary">{resultadoModal.titulo}</p>
            </div>
            <div className="space-y-4 p-6">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">
                  Consecuencia / nota de lo realizado
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
                <p className="text-xs text-text-secondary">Opcional - Ctrl+Enter para confirmar</p>
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setResultadoModal(null)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmResultado}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
                >
                  Marcar como realizada
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {convertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface shadow-xl">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-text-primary">Programar en el Orden del dia</h2>
              <p className="mt-0.5 truncate text-sm text-text-secondary">{convertModal.card.title}</p>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                    <Calendar className="h-3.5 w-3.5" />
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={convertDate}
                    onChange={(e) => setConvertDate(e.target.value)}
                    className="input"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                    <Clock className="h-3.5 w-3.5" />
                    Hora
                  </label>
                  <input
                    type="time"
                    value={convertTime}
                    onChange={(e) => setConvertTime(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setConvertModal(null)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmConvert}
                  disabled={!convertDate}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                >
                  Programar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
