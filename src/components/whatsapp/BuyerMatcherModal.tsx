"use client";

import { useState, useTransition } from "react";
import { Users, X, MessageCircle, Euro, MapPin, Home, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { buildWhatsAppUrl, buildWhatsAppMessage } from "@/lib/whatsapp";
import { logWhatsAppContactAction } from "@/app/(crm)/whatsapp/actions";
import {
  findCompatibleBuyersAction,
  formatModalidadPedido,
  type BuyerMatch,
} from "@/app/(crm)/whatsapp/matching";

type Props = {
  propiedadId: number;
  propiedadLabel: string;
  precio: number | null;
  zonaNombre: string | null;
  currentUserName: string;
};

function ScoreBadge({ score }: { score: number }) {
  if (score >= 80)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
        <CheckCircle2 className="h-3 w-3" /> {score}%
      </span>
    );
  if (score >= 50)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
        <AlertCircle className="h-3 w-3" /> {score}%
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-raised px-2 py-0.5 text-xs font-semibold text-text-secondary">
      {score}%
    </span>
  );
}

function MatchCriteria({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs ${
        ok ? "text-success" : "text-text-secondary line-through"
      }`}
    >
      {ok ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <XCircle className="h-3 w-3 shrink-0" />}
      {label}
    </span>
  );
}

function formatCurrency(v: number | null) {
  if (!v) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

export default function BuyerMatcherModal({
  propiedadId,
  propiedadLabel,
  precio,
  zonaNombre,
  currentUserName,
}: Props) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [matches, setMatches] = useState<BuyerMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [sentIds, setSentIds] = useState<Set<number>>(new Set());
  const [isPending, startTransition] = useTransition();

  async function handleOpen() {
    setIsOpen(true);
    setIsLoading(true);
    try {
      const result = await findCompatibleBuyersAction(propiedadId);
      setMatches(result);
    } catch {
      toast("Error al buscar compradores", "error");
    } finally {
      setIsLoading(false);
    }
  }

  function buildMessage(buyer: BuyerMatch): string {
    return buildWhatsAppMessage("cliente_propiedad_compatible", {
      nombre: buyer.nombre_cliente,
      agente: currentUserName,
      zona: zonaNombre ?? undefined,
      precio: precio ? formatCurrency(precio) : undefined,
    });
  }

  function handleSendOne(buyer: BuyerMatch) {
    setSendingId(buyer.id);
    startTransition(async () => {
      try {
        const message = buildMessage(buyer);
        await logWhatsAppContactAction({
          phone: buyer.telefono,
          recipientName: buyer.nombre_cliente,
          messageBody: message,
          templateName: "cliente_propiedad_compatible",
          relatedType: "propiedad",
          relatedId: propiedadId,
          propiedadId,
        });
        window.open(buildWhatsAppUrl(buyer.telefono, message), "_blank", "noopener,noreferrer");
        setSentIds((prev) => new Set(prev).add(buyer.id));
        toast(`WhatsApp abierto para ${buyer.nombre_cliente}`);
      } catch {
        toast("Error al abrir WhatsApp", "error");
      } finally {
        setSendingId(null);
      }
    });
  }

  const total = matches.length;
  const highMatch = matches.filter((m) => m.score >= 70).length;

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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          <div className="flex h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-surface shadow-xl">
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between border-b border-border px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-base font-semibold text-text-primary">Compradores compatibles</h2>
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {propiedadLabel} · {formatCurrency(precio)}
                  {zonaNombre ? ` · ${zonaNombre}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="ml-4 shrink-0 rounded-lg p-1 text-text-secondary hover:bg-surface-raised hover:text-text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Resumen */}
            {!isLoading && total > 0 && (
              <div className="shrink-0 border-b border-border bg-background px-5 py-3">
                <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
                  <span>
                    <strong className="text-text-primary">{total}</strong> compradores con presupuesto suficiente
                  </span>
                  <span>
                    <strong className="text-success">{highMatch}</strong> con alta compatibilidad (≥70%)
                  </span>
                  <span className="text-xs text-text-secondary">
                    Ordenados por compatibilidad · Envio individual revisado
                  </span>
                </div>
              </div>
            )}

            {/* Lista */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex h-32 items-center justify-center text-sm text-text-secondary">
                  Buscando compradores...
                </div>
              ) : total === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-text-secondary">
                  <Users className="h-8 w-8 opacity-30" />
                  <p>No hay compradores con presupuesto suficiente en esta zona</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {matches.map((buyer) => {
                    const alreadySent = sentIds.has(buyer.id);
                    const isSending = sendingId === buyer.id && isPending;
                    return (
                      <li
                        key={buyer.id}
                        className={`px-5 py-4 transition-colors ${alreadySent ? "bg-success/5" : "hover:bg-background"}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-text-primary">{buyer.nombre_cliente}</p>
                              <ScoreBadge score={buyer.score} />
                              {alreadySent && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                                  <MessageCircle className="h-3 w-3" /> Enviado
                                </span>
                              )}
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                              <span className="flex items-center gap-1">
                                <Euro className="h-3 w-3" />
                                {formatCurrency(buyer.presupuesto)}
                              </span>
                              {(buyer.zona_nombre || buyer.zona_busqueda) && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {buyer.zona_nombre ?? buyer.zona_busqueda}
                                </span>
                              )}
                              {buyer.tipo_propiedad && (
                                <span className="flex items-center gap-1">
                                  <Home className="h-3 w-3" />
                                  {buyer.tipo_propiedad}
                                </span>
                              )}
                              {buyer.modalidad && (
                                <span>{formatModalidadPedido(buyer.modalidad)}</span>
                              )}
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              <MatchCriteria ok={buyer.score_presupuesto} label="Presupuesto" />
                              <MatchCriteria ok={buyer.score_zona} label="Zona" />
                              <MatchCriteria ok={buyer.score_modalidad} label="Modalidad" />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSendOne(buyer)}
                            disabled={isSending || alreadySent}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20 disabled:opacity-50 dark:text-emerald-400"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            {isSending ? "Abriendo..." : alreadySent ? "Enviado" : "WhatsApp"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-border px-5 py-3">
              <p className="text-xs text-text-secondary">
                Cada mensaje se revisa antes de enviar. Los contactos se registran en el historial.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
