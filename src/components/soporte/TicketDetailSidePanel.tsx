"use client";

import { useState, useEffect } from "react";
import {
  Send, Archive, RotateCcw, UserCheck, Loader2,
  ArrowLeft, MessageSquare, Calendar,
} from "lucide-react";
import Drawer from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import TicketMessage, { type MessageData, TipoIcon } from "./TicketMessage";

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

const PRIORIDAD_LABELS: Record<string, string> = { alta: "Alta", media: "Media", baja: "Baja" };
const PRIORIDAD_STYLES: Record<string, string> = {
  alta: "border-l-red-500 bg-red-500/5",
  media: "border-l-amber-500 bg-amber-500/5",
  baja: "border-l-blue-500 bg-blue-500/5",
};
const ESTADO_LABELS: Record<string, string> = {
  abierto: "Abierto", en_proceso: "En proceso", resuelto: "Resuelto",
  cerrado: "Cerrado", archivado: "Archivado",
};
const ESTADO_DOTS: Record<string, string> = {
  abierto: "bg-blue-500", en_proceso: "bg-amber-500", resuelto: "bg-green-500",
  cerrado: "bg-gray-400", archivado: "bg-gray-400",
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
  ticket, messages, isAdmin, isOwner,
  currentUserNombre, agents, onClose, onRefresh,
}: Props) {
  const { toast } = useToast();
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [estado, setEstado] = useState(ticket.estado);
  const [prioridad, setPrioridad] = useState(ticket.prioridad);
  const [asignadoA, setAsignadoA] = useState(ticket.asignadoA ? String(ticket.asignadoA) : "");
  const [updating, setUpdating] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(isAdmin);

  useEffect(() => {
    setEstado(ticket.estado);
    setPrioridad(ticket.prioridad);
    setAsignadoA(ticket.asignadoA ? String(ticket.asignadoA) : "");
  }, [ticket.id, ticket.estado, ticket.prioridad, ticket.asignadoA]);

  const isArchived = ticket.archivedAt !== null;
  const canReply = !isArchived && (isAdmin || isOwner);
  const isDirty = estado !== ticket.estado || prioridad !== ticket.prioridad || asignadoA !== (ticket.asignadoA ? String(ticket.asignadoA) : "");

  // Group messages by date
  const groupedMessages: Array<{ date: string; msgs: MessageData[] }> = [];
  for (const msg of messages) {
    const d = new Date(msg.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === d) last.msgs.push(msg);
    else groupedMessages.push({ date: d, msgs: [msg] });
  }

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
      if (estado !== ticket.estado) await updateTicketStatusAction(ticket.id, estado);
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

  const replyCount = messages.filter((m) => !m.esSistema).length;

  return (
    <Drawer open={true} onClose={onClose} width="lg">
      <div className="flex h-full flex-col">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <button onClick={onClose} className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-raised hover:text-text-primary">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span className="font-mono text-[11px]">#{ticket.id}</span>
              <span className="text-text-secondary/30">·</span>
              <TipoIcon tipo={ticket.tipo} />
              <span className="truncate">{ticket.tipo}</span>
              <span className="text-text-secondary/30">·</span>
              <span className={`inline-block h-2 w-2 rounded-full ${ESTADO_DOTS[estado] ?? ""}`} />
              <span className="capitalize">{ESTADO_LABELS[estado] ?? estado}</span>
            </div>
            <h2 className="truncate text-base font-semibold text-text-primary">{ticket.asunto}</h2>
          </div>
        </div>

        {/* ── Quick meta bar ── */}
        <div className="flex items-center gap-4 border-b border-border bg-background/50 px-5 py-2.5 text-xs text-text-secondary">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(ticket.createdAt)}
          </span>
          {ticket.nombreUsuario && (
            <span className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded-full bg-primary/20 text-[8px] leading-[14px] text-center text-primary">
                {ticket.nombreUsuario.charAt(0).toUpperCase()}
              </span>
              {ticket.nombreUsuario}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            {replyCount} mensaje{replyCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Conversation timeline ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {groupedMessages.map((group) => (
            <div key={group.date} className="mb-4">
              <div className="relative mb-3 flex items-center gap-3">
                <div className="flex-1 border-t border-border" />
                <span className="shrink-0 text-[11px] font-medium text-text-secondary/50">{group.date}</span>
                <div className="flex-1 border-t border-border" />
              </div>
              <div className="space-y-3">
                {group.msgs.map((msg) => (
                  <TicketMessage key={msg.id} message={msg} />
                ))}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-sm text-text-secondary/60">
              <MessageSquare className="mb-2 h-8 w-8" />
              No hay mensajes en este ticket
            </div>
          )}
        </div>

        {/* ── Reply area ── */}
        {canReply && (
          <div className="border-t border-border px-5 py-3">
            <div className="flex gap-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={isAdmin ? "Escribe una respuesta..." : "Añade informacion adicional..."}
                rows={2}
                className="input min-h-[44px] flex-1 resize-none text-sm"
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSendReply(); } }}
              />
              <button
                onClick={handleSendReply}
                disabled={sending || !replyText.trim()}
                className="flex items-center gap-1.5 self-end rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar
              </button>
            </div>
            <p className="mt-1 text-[10px] text-text-secondary/40">Ctrl+Enter para enviar</p>
          </div>
        )}

        {/* ── Admin panel ── */}
        {isAdmin && (
          <div className="border-t border-border">
            <button
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              className="flex w-full items-center justify-between bg-background/50 px-5 py-2.5 text-xs font-medium text-text-secondary hover:text-text-primary"
            >
              Acciones administrativas
              <span className={`transition-transform ${showAdminPanel ? "rotate-180" : ""}`}>▾</span>
            </button>
            {showAdminPanel && (
              <div className="space-y-3 bg-background/30 px-5 py-3">
                {/* Estado */}
                <div>
                  <label className="mb-1.5 text-[11px] font-medium text-text-secondary">Estado</label>
                  <div className="flex flex-wrap gap-1">
                    {["abierto", "en_proceso", "resuelto", "cerrado", "archivado"].map((e) => (
                      <button key={e} onClick={() => setEstado(e)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                          estado === e
                            ? "border-primary bg-primary text-white shadow-sm"
                            : "border-border text-text-secondary hover:border-text-secondary/30 hover:text-text-primary"
                        }`}
                      >
                        {ESTADO_LABELS[e] ?? e}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prioridad + Asignacion */}
                <div className="flex flex-wrap gap-3">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-[11px] font-medium text-text-secondary">Prioridad</label>
                    <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="input h-9 text-xs">
                      {Object.entries(PRIORIDAD_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="mb-1.5 block text-[11px] font-medium text-text-secondary">Asignado a</label>
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                      <select value={asignadoA} onChange={(e) => setAsignadoA(e.target.value)} className="input h-9 text-xs">
                        <option value="">Sin asignar</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>{a.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={handleUpdateTicket} disabled={updating || !isDirty}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-40"
                  >
                    {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Guardar cambios
                  </button>
                  <button onClick={handleToggleArchive} disabled={updating}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary disabled:opacity-40"
                  >
                    {isArchived ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                    {isArchived ? "Desarchivar" : "Archivar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}
