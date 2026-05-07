"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Send,
  Archive,
  RotateCcw,
  UserCheck,
  RefreshCw,
  Loader2,
} from "lucide-react";
import Drawer from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import TicketMessage, { type MessageData } from "./TicketMessage";

type TicketDetail = {
  id: number;
  asunto: string;
  tipo: string;
  prioridad: string;
  estado: string;
  nombreUsuario: string | null;
  createdAt: string;
  ultimaRespuestaAt: string | null;
  asignadoA: number | null;
  empresaId: number | null;
  archivedAt: string | null;
};

type UsuarioItem = { id: string; nombre: string };

const PRIORIDAD_LABELS: Record<string, string> = {
  alta: "Alta", media: "Media", baja: "Baja",
};
const PRIORIDAD_BADGES: Record<string, string> = {
  alta: "bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  media: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  baja: "bg-blue-500/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
};
const ESTADO_LABELS: Record<string, string> = {
  abierto: "Abierto", en_proceso: "En proceso", resuelto: "Resuelto",
  cerrado: "Cerrado", archivado: "Archivado",
};
const ESTADO_BADGES: Record<string, string> = {
  abierto: "bg-blue-500/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  en_proceso: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  resuelto: "bg-green-500/15 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  cerrado: "bg-gray-500/15 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400",
  archivado: "bg-gray-500/15 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

type Props = {
  ticket: TicketDetail;
  messages: MessageData[];
  isAdmin: boolean;
  isOwner: boolean;
  currentUserNombre: string;
  agents: UsuarioItem[];
  onClose: () => void;
  onRefresh: () => void;
};

export default function TicketDetailSidePanel({
  ticket,
  messages,
  isAdmin,
  isOwner,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  currentUserNombre,
  agents,
  onClose,
  onRefresh,
}: Props) {
  const { toast } = useToast();
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [estado, setEstado] = useState(ticket.estado);
  const [prioridad, setPrioridad] = useState(ticket.prioridad);
  const [asignadoA, setAsignadoA] = useState(ticket.asignadoA ? String(ticket.asignadoA) : "");
  const [updating, setUpdating] = useState(false);

  // Reset when ticket changes
  useEffect(() => {
    setEstado(ticket.estado);
    setPrioridad(ticket.prioridad);
    setAsignadoA(ticket.asignadoA ? String(ticket.asignadoA) : "");
  }, [ticket.id, ticket.estado, ticket.prioridad, ticket.asignadoA]);

  const isArchived = ticket.archivedAt !== null;
  const canReply = !isArchived && (isAdmin || isOwner);
  const isDirty =
    estado !== ticket.estado ||
    prioridad !== ticket.prioridad ||
    asignadoA !== (ticket.asignadoA ? String(ticket.asignadoA) : "");

  async function handleSendReply() {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const { addReplyAction } = await import("@/app/(crm)/soporte/actions");
      await addReplyAction(ticket.id, replyText.trim());
      setReplyText("");
      toast("Respuesta enviada");
      onRefresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error al enviar respuesta", "error");
    }
    setSending(false);
  }

  async function handleUpdateTicket() {
    if (!isAdmin) return;
    setUpdating(true);
    try {
      const { updateTicketAction, updateTicketStatusAction } = await import("@/app/(crm)/soporte/actions");

      if (estado !== ticket.estado) {
        await updateTicketStatusAction(ticket.id, estado);
      }

      if (prioridad !== ticket.prioridad || (asignadoA || null) !== (ticket.asignadoA ? String(ticket.asignadoA) : null)) {
        await updateTicketAction(ticket.id, {
          prioridad: prioridad !== ticket.prioridad ? prioridad : undefined,
          asignado_a: asignadoA ? Number(asignadoA) : null,
        });
      }

      toast("Ticket actualizado");
      onRefresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error al actualizar", "error");
    }
    setUpdating(false);
  }

  async function handleToggleArchive() {
    if (!isAdmin) return;
    setUpdating(true);
    try {
      const { toggleArchiveTicketAction } = await import("@/app/(crm)/soporte/actions");
      await toggleArchiveTicketAction(ticket.id, !isArchived);
      toast(isArchived ? "Ticket desarchivado" : "Ticket archivado");
      onRefresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    }
    setUpdating(false);
  }

  return (
    <Drawer open={true} onClose={onClose} width="lg" title={ticket.asunto}
      subtitle={`#${ticket.id} · ${ticket.nombreUsuario ?? "—"} · ${formatDate(ticket.createdAt)}`}
    >
      <div className="flex h-full flex-col">
        {/* Header info */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORIDAD_BADGES[prioridad] ?? ""}`}>
              {PRIORIDAD_LABELS[prioridad] ?? prioridad}
            </span>
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_BADGES[estado] ?? ""}`}>
              {ESTADO_LABELS[estado] ?? estado}
            </span>
            <span className="text-xs text-text-secondary">{ticket.tipo}</span>
            {ticket.ultimaRespuestaAt && (
              <>
                <span className="text-text-secondary/50">·</span>
                <span className="text-xs text-text-secondary">Respuesta: {formatDate(ticket.ultimaRespuestaAt)}</span>
              </>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <TicketMessage key={msg.id} message={msg} />
            ))}
          </AnimatePresence>

          {messages.length === 0 && (
            <div className="flex items-center justify-center py-12 text-sm text-text-secondary">
              No hay mensajes en este ticket.
            </div>
          )}
        </div>

        {/* Reply area */}
        {canReply && (
          <div className="border-t border-border px-6 py-4">
            <div className="flex gap-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={isAdmin ? "Escribe una respuesta..." : "Añade más información..."}
                rows={3}
                className="input flex-1 resize-none"
              />
              <button
                onClick={handleSendReply}
                disabled={sending || !replyText.trim()}
                className="flex h-full items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Enviar
              </button>
            </div>
          </div>
        )}

        {/* Admin actions */}
        {isAdmin && (
          <div className="border-t border-border bg-background px-6 py-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <p className="w-full text-xs font-medium text-text-secondary">Acciones administrativas</p>

              {/* Estado selector */}
              <div className="flex flex-wrap gap-1.5">
                {["abierto", "en_proceso", "resuelto", "cerrado", "archivado"].map((e) => (
                  <button
                    key={e}
                    onClick={() => setEstado(e)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                      estado === e
                        ? "border-primary bg-primary text-white"
                        : "border-border text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {ESTADO_LABELS[e] ?? e}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Prioridad */}
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value)}
                className="input w-auto text-xs"
              >
                {Object.entries(PRIORIDAD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>

              {/* Asignar a */}
              <div className="flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-text-secondary" />
                <select
                  value={asignadoA}
                  onChange={(e) => setAsignadoA(e.target.value)}
                  className="input w-auto text-xs"
                >
                  <option value="">Sin asignar</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              {isDirty && (
                <button
                  onClick={handleUpdateTicket}
                  disabled={updating}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
                >
                  {updating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Guardar cambios
                </button>
              )}

              <button
                onClick={handleToggleArchive}
                disabled={updating}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary disabled:opacity-60"
              >
                {isArchived ? (
                  <RotateCcw className="h-3.5 w-3.5" />
                ) : (
                  <Archive className="h-3.5 w-3.5" />
                )}
                {isArchived ? "Desarchivar" : "Archivar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
