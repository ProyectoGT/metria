"use client";

import { useState, useTransition } from "react";
import {
  Users, X, MessageCircle, Euro, MapPin, Home,
  CheckCircle2, XCircle, AlertCircle, ShieldOff,
  CheckSquare, Square, Send, Loader2,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { buildWhatsAppUrl, buildWhatsAppMessage } from "@/lib/whatsapp";
import { sendOrPrepareWhatsAppAction } from "@/app/(crm)/whatsapp/actions";
import {
  findCompatibleBuyersAction,
  type BuyerMatch,
} from "@/app/(crm)/whatsapp/matching";
import { formatModalidadPedido } from "@/modules/solicitudes/services/modalidades";

type Props = {
  propiedadId: number;
  propiedadLabel: string;
  precio: number | null;
  zonaNombre: string | null;
  currentUserName: string;
};

function ScoreBadge({ score }: { score: number }) {
  if (score >= 80)
    return <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success"><CheckCircle2 className="h-3 w-3" />{score}%</span>;
  if (score >= 50)
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400"><AlertCircle className="h-3 w-3" />{score}%</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-text-secondary">{score}%</span>;
}

function MatchCriteria({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs ${ok ? "text-success" : "text-text-secondary line-through"}`}>
      {ok ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <XCircle className="h-3 w-3 shrink-0" />}
      {label}
    </span>
  );
}

function ConsentBadge({ consent }: { consent: boolean | null }) {
  if (consent === false)
    return <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger"><ShieldOff className="h-3 w-3" />Opt-out</span>;
  if (consent === null)
    return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-text-secondary">Sin consentimiento</span>;
  return null;
}

function formatCurrency(v: number | null) {
  if (!v) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

export default function BuyerMatcherModal({ propiedadId, propiedadLabel, precio, zonaNombre, currentUserName }: Props) {
  const { toast } = useToast();
  const [isOpen, setIsOpen]       = useState(false);
  const [matches, setMatches]     = useState<BuyerMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sentIds, setSentIds]     = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleOpen() {
    setIsOpen(true);
    setIsLoading(true);
    setSelectedIds(new Set());
    setSentIds(new Set());
    try {
      setMatches(await findCompatibleBuyersAction(propiedadId));
    } catch {
      toast("Error al buscar compradores", "error");
    } finally {
      setIsLoading(false);
    }
  }

  function handleClose() {
    if (bulkSending) return;
    setIsOpen(false);
  }

  function buildMessage(buyer: BuyerMatch): string {
    return buildWhatsAppMessage("cliente_propiedad_compatible", {
      nombre: buyer.nombre_cliente,
      agente: currentUserName,
      zona:   zonaNombre ?? undefined,
      precio: precio ? formatCurrency(precio) : undefined,
    });
  }

  // ─── Envío individual ─────────────────────────────────────────────────────

  function handleSendOne(buyer: BuyerMatch) {
    startTransition(async () => {
      try {
        const message = buildMessage(buyer);
        const result = await sendOrPrepareWhatsAppAction({
          phone:         buyer.telefono,
          recipientName: buyer.nombre_cliente,
          messageBody:   message,
          templateName:  "cliente_propiedad_compatible",
          relatedType:   "propiedad",
          relatedId:     propiedadId,
          propiedadId,
        });
        if (result.sent) {
          toast(`Mensaje enviado a ${buyer.nombre_cliente}`);
        } else {
          window.open(buildWhatsAppUrl(buyer.telefono, message), "_blank", "noopener,noreferrer");
          toast(`WhatsApp abierto para ${buyer.nombre_cliente}`);
        }
        setSentIds((prev) => new Set(prev).add(buyer.id));
        setSelectedIds((prev) => { const s = new Set(prev); s.delete(buyer.id); return s; });
      } catch {
        toast(`Error al enviar a ${buyer.nombre_cliente}`, "error");
      }
    });
  }

  // ─── Selección ───────────────────────────────────────────────────────────

  const selectableBuyers = matches.filter((m) => m.whatsapp_consent !== false && !sentIds.has(m.id));
  const allSelected      = selectableBuyers.length > 0 && selectableBuyers.every((m) => selectedIds.has(m.id));

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableBuyers.map((m) => m.id)));
    }
  }

  // ─── Envío masivo ─────────────────────────────────────────────────────────

  async function handleSendSelected() {
    const targets = matches.filter((m) => selectedIds.has(m.id));
    if (targets.length === 0) return;

    setBulkSending(true);
    setBulkProgress({ done: 0, total: targets.length });
    let successCount = 0;
    let manualCount  = 0;

    for (const buyer of targets) {
      try {
        const message = buildMessage(buyer);
        const result = await sendOrPrepareWhatsAppAction({
          phone:         buyer.telefono,
          recipientName: buyer.nombre_cliente,
          messageBody:   message,
          templateName:  "cliente_propiedad_compatible",
          relatedType:   "propiedad",
          relatedId:     propiedadId,
          propiedadId,
        });
        if (result.sent) {
          successCount++;
        } else {
          window.open(buildWhatsAppUrl(buyer.telefono, message), "_blank", "noopener,noreferrer");
          manualCount++;
        }
        setSentIds((prev) => new Set(prev).add(buyer.id));
        setSelectedIds((prev) => { const s = new Set(prev); s.delete(buyer.id); return s; });
      } catch {
        // continuar con el siguiente aunque falle uno
      }
      setBulkProgress((p) => p ? { done: p.done + 1, total: p.total } : null);
    }

    setBulkSending(false);
    setBulkProgress(null);

    if (successCount > 0 && manualCount === 0) {
      toast(`${successCount} mensajes enviados correctamente`);
    } else if (successCount > 0 && manualCount > 0) {
      toast(`${successCount} enviados · ${manualCount} abiertos en WhatsApp`);
    } else if (manualCount > 0) {
      toast(`${manualCount} conversaciones abiertas en WhatsApp`);
    }
  }

  const total        = matches.length;
  const highMatch    = matches.filter((m) => m.score >= 70).length;
  const optOuts      = matches.filter((m) => m.whatsapp_consent === false).length;
  const selectedCount = selectedIds.size;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
      >
        <Users className="h-4 w-4" />
        Buscar compradores
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity"
            onClick={handleClose}
          />

          {/* Panel lateral derecho */}
          <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-surface shadow-2xl sm:w-[520px] md:w-[580px]">

            {/* Header */}
            <div className="flex shrink-0 items-start justify-between border-b border-border px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-base font-semibold text-text-primary">Compradores compatibles</h2>
                </div>
                <p className="mt-1 truncate text-xs text-text-secondary">
                  {propiedadLabel}{precio ? ` · ${formatCurrency(precio)}` : ""}{zonaNombre ? ` · ${zonaNombre}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={bulkSending}
                className="ml-3 shrink-0 rounded-lg p-1.5 text-text-secondary hover:bg-surface-raised hover:text-text-primary disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Barra de resumen + selección */}
            {!isLoading && total > 0 && (
              <div className="shrink-0 border-b border-border bg-background px-5 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
                    <span><strong className="text-text-primary">{total}</strong> con presupuesto</span>
                    <span className="text-success"><strong>{highMatch}</strong> alta compatibilidad</span>
                    {optOuts > 0 && <span className="text-danger"><strong>{optOuts}</strong> opt-out</span>}
                  </div>

                  {selectableBuyers.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      disabled={bulkSending}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary disabled:opacity-40"
                    >
                      {allSelected
                        ? <><CheckSquare className="h-3.5 w-3.5 text-primary" /> Deseleccionar todos</>
                        : <><Square className="h-3.5 w-3.5" /> Seleccionar todos</>
                      }
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Lista */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex h-40 items-center justify-center gap-2 text-sm text-text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando compradores...
                </div>
              ) : total === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-text-secondary">
                  <Users className="h-8 w-8 opacity-30" />
                  <p>No hay compradores con presupuesto suficiente</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {matches.map((buyer) => {
                    const alreadySent = sentIds.has(buyer.id);
                    const optOut      = buyer.whatsapp_consent === false;
                    const isSelected  = selectedIds.has(buyer.id);
                    const selectable  = !optOut && !alreadySent;

                    return (
                      <li
                        key={buyer.id}
                        className={`px-4 py-3.5 transition-colors ${
                          alreadySent ? "bg-success/5"
                          : optOut    ? "bg-danger/5 opacity-60"
                          : isSelected ? "bg-primary/5"
                          : "hover:bg-background"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={() => selectable && toggleSelect(buyer.id)}
                            disabled={!selectable || bulkSending}
                            className="mt-0.5 shrink-0 text-text-secondary transition-colors hover:text-primary disabled:cursor-default disabled:opacity-30"
                            aria-label={isSelected ? "Deseleccionar" : "Seleccionar"}
                          >
                            {alreadySent
                              ? <CheckCircle2 className="h-4 w-4 text-success" />
                              : isSelected
                              ? <CheckSquare className="h-4 w-4 text-primary" />
                              : <Square className="h-4 w-4" />
                            }
                          </button>

                          {/* Datos */}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-sm font-semibold text-text-primary">{buyer.nombre_cliente}</p>
                              <ScoreBadge score={buyer.score} />
                              <ConsentBadge consent={buyer.whatsapp_consent} />
                              {alreadySent && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                                  <MessageCircle className="h-3 w-3" /> Enviado
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-secondary">
                              <span className="flex items-center gap-1"><Euro className="h-3 w-3" />{formatCurrency(buyer.presupuesto)}</span>
                              {(buyer.zona_nombre || buyer.zona_busqueda) && (
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{buyer.zona_nombre ?? buyer.zona_busqueda}</span>
                              )}
                              {buyer.tipo_propiedad && <span className="flex items-center gap-1"><Home className="h-3 w-3" />{buyer.tipo_propiedad}</span>}
                              {buyer.modalidad && <span>{formatModalidadPedido(buyer.modalidad)}</span>}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <MatchCriteria ok={buyer.score_presupuesto} label="Presupuesto" />
                              <MatchCriteria ok={buyer.score_zona} label="Zona" />
                              <MatchCriteria ok={buyer.score_modalidad} label="Modalidad" />
                            </div>
                          </div>

                          {/* Botón individual */}
                          <button
                            type="button"
                            onClick={() => handleSendOne(buyer)}
                            disabled={isPending || alreadySent || optOut || bulkSending}
                            title={optOut ? "El cliente ha solicitado no ser contactado" : undefined}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20 disabled:opacity-40 dark:text-emerald-400"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            {alreadySent ? "Enviado" : optOut ? "Opt-out" : "Enviar"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer — envío masivo */}
            <div className="shrink-0 border-t border-border bg-background px-5 py-3">
              {bulkSending && bulkProgress ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Enviando {bulkProgress.done} de {bulkProgress.total}...
                    </span>
                    <span className="font-medium text-primary">{Math.round((bulkProgress.done / bulkProgress.total) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              ) : selectedCount > 0 ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-text-secondary">
                    <strong className="text-text-primary">{selectedCount}</strong> seleccionado{selectedCount !== 1 ? "s" : ""}
                  </p>
                  <button
                    type="button"
                    onClick={handleSendSelected}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                  >
                    <Send className="h-4 w-4" />
                    Enviar a {selectedCount} {selectedCount === 1 ? "comprador" : "compradores"}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-text-secondary">
                  Selecciona compradores para envío múltiple · Opt-out: no contactar
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
