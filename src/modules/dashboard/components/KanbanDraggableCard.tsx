"use client";

/**
 * Wrapper memoizado de KanbanCard dentro de Draggable.
 *
 * Problema que resuelve:
 *   KanbanCard está envuelto en `memo()`, pero si su componente padre
 *   (KanbanColumn) le pasa callbacks inline en el .map(), cada render de
 *   KanbanColumn crea nuevas referencias de función → el memo se rompe y
 *   TODAS las tarjetas re-renderizan aunque solo cambie una.
 *
 * Solución:
 *   Cada instancia de KanbanDraggableCard crea sus propios handlers con
 *   `useCallback`. Como el componente en sí está memoizado y solo recibe
 *   props primitivos / referencias estables del padre, los handlers son
 *   estables entre renders → KanbanCard solo re-renderiza cuando cambia
 *   su propia `card`.
 */

import { memo, useCallback } from "react";
import { Draggable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";
import type { KanbanCardData } from "@/lib/mock/dashboard";

interface KanbanDraggableCardProps {
  card:           KanbanCardData;
  index:          number;
  columnId:       string;
  onDetail:       (columnId: string, card: KanbanCardData) => void;
  onComplete?:    (columnId: string, cardId: string, card: KanbanCardData) => void;
}

function KanbanDraggableCard({
  card,
  index,
  columnId,
  onDetail,
  onComplete,
}: KanbanDraggableCardProps) {
  // Callbacks estables — solo se recrean si cambian sus dependencias,
  // que son referencias estables pasadas desde KanbanBoard.
  // Keep (id: string) signature to match KanbanCard's prop type
  const handleClick = useCallback((_id: string) => {
    onDetail(columnId, card);
  }, [columnId, card, onDetail]);

  const handleComplete = useCallback((id: string) => {
    onComplete?.(columnId, id, card);
  }, [columnId, card, onComplete]);

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        // div wrapper requerido por @hello-pangea/dnd — no añadir clases aquí
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={provided.draggableProps.style}
        >
          <KanbanCard
            card={card}
            isCompleted={card.isCompleted ?? false}
            onClick={handleClick}
            onComplete={onComplete ? handleComplete : undefined}
            dragHandleProps={provided.dragHandleProps ?? undefined}
            isDragging={snapshot.isDragging}
          />
        </div>
      )}
    </Draggable>
  );
}

export default memo(KanbanDraggableCard);
