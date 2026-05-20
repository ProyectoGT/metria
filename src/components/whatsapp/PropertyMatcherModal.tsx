"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Building2, X, MessageCircle, Euro, MapPin,
  CheckCircle2, XCircle, AlertCircle, ExternalLink, PhoneOff,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { buildWhatsAppUrl, buildWhatsAppMessage } from "@/lib/whatsapp";
import { sendOrPrepareWhatsAppAction } from "@/app/(crm)/whatsapp/actions";
import { findCompatiblePropertiesAction, type PropertyMatch } from "@/app/(crm)/whatsapp/matching";

type Props = {
  pedidoId: number;
  clienteNombre: string;
  clienteTelefono: string | null;
  currentUserName: string;
};

const ESTADO_LABEL: Record<string, string> = {
  neutral: "Neutral", investigacion: "Investigacion",
  seguimiento: "Seguimiento", noticia: "Noticia", encargo: "Encargo",
};
const OPERACION_LABEL: Record<string, string> = {
  venta: "Venta", alquiler: "Alquiler", venta_alquiler: "Venta / Alquiler",
};

function ScoreBadge({ score }: { score: number }) {
  if (score >= 80)
    return <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success"><CheckCircle2 className="h-3 w-3" />{score}%</span>;
  if (score >= 50)
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400"><AlertCircle className="h-3 w-3" />{score}%</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-surface-raised px-2 py-0.5 text-xs font-semibold text-text-secondary">{score}%</span>;
}

function MatchCriteria({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs ${ok ? "text-success" : "text-text-secondary line-through"}`}>
      {ok ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <XCircle className="h-3 w-3 shrink-0" />}
      {label}
    </span>
  );
}

function formatCurrency(v: number | null) {
  if (!v) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

export default function PropertyMatcherModal({ pedidoId, clienteNombre, clienteTelefono, currentUserName }: Props) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [matches, setMatches] = useState<PropertyMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sentIds, setSentIds] = useState<Set<number>>(new Set());
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleOpen() {
    setIsOpen(true);
    setIsLoading(true);
    try {
      setMatches(await findCompatiblePropertiesAction(pedidoId));
    } catch {
      toast("Error al buscar propiedades", "error");
    } finally {
      setIsLoading(false);
    }
  }

  function buildMessage(prop: PropertyMatch): string {
    return buildWhatsAppMessage("cliente_propiedad_compatible", {
      nombre: clienteNombre,
      agente: currentUserName,
      zona:   prop.zona_nombre ?? undefined,
      precio: formatCurrency(prop.precio),
    });
  }

  function handleSendOne(prop: PropertyMatch) {
    if (!clienteTelefono) return;
    setSendingId(prop.id);
    startTransition(async () => {
      try {
        const message = buildMessage(prop);
        const result = await sendOrPrepareWhatsAppAction({
          phone:         clienteTelefono,
          recipientName: clienteNombre,
          messageBody:   message,
          templateName:  "cliente_propiedad_compatible",
          relatedType:   "solicitud",
          relatedId:     pedidoId,
          pedidoId,
          propiedadId:   prop.id,
        });

        if (result.sent) {
          toast(`Mensaje enviado para ${prop.titulo ?? `Propiedad #${prop.id}`}`);
        } else {
          window.open(buildWhatsAppUrl(clienteTelefono, message), "_blank", "noopener,noreferrer");
          toast(`WhatsApp abierto`);
        }
        setSentIds((prev) => new Set(prev).add(prop.id));
      } catch {
        toast("Error al abrir WhatsApp", "error");
      } finally {
        setSendingId(null);
      }
    });
  }

  const total     = matches.length;
  const highMatch = matches.filter((m) => m.score >= 70).length;
  const sinTelefono = !clienteTelefono;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
      >
        <Building2 className="h-4 w-4" />
        Ver propiedades compatibles
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
          <div className="flex h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-surface shadow-xl">
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between border-b border-border px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-base font-semibold text-text-primary">Propiedades compatibles</h2>
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  Para {clienteNombre}
                  {sinTelefono && <span className="ml-2 text-warning">· Sin telefono — no se puede contactar por WhatsApp</span>}
                </p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="ml-4 shrink-0 rounded-lg p-1 text-text-secondary hover:bg-surface-raised hover:text-text-primary">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Aviso sin teléfono */}
            {sinTelefono && (
              <div className="shrink-0 border-b border-warning/20 bg-warning/10 px-5 py-3">
                <div className="flex items-center gap-2 text-xs text-warning">
                  <PhoneOff className="h-4 w-4 shrink-0" />
                  Este cliente no tiene telefono registrado. Puedes ver las propiedades compatibles pero no enviar WhatsApp directamente.
                </div>
              </div>
            )}

            {/* Resumen */}
            {!isLoading && total > 0 && (
              <div className="shrink-0 border-b border-border bg-background px-5 py-3">
                <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
                  <span><strong className="text-text-primary">{total}</strong> dentro del presupuesto</span>
                  <span><strong className="text-success">{highMatch}</strong> alta compatibilidad</span>
                </div>
              </div>
            )}

            {/* Lista */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex h-32 items-center justify-center text-sm text-text-secondary">Buscando propiedades...</div>
              ) : total === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-text-secondary">
                  <Building2 className="h-8 w-8 opacity-30" />
                  <p>No hay propiedades disponibles dentro del presupuesto</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {matches.map((prop) => {
                    const alreadySent = sentIds.has(prop.id);
                    const isSending   = sendingId === prop.id && isPending;
                    const label       = prop.titulo ?? prop.propietario ?? `Propiedad #${prop.id}`;
                    return (
                      <li key={prop.id} className={`px-5 py-4 transition-colors ${alreadySent ? "bg-success/5" : "hover:bg-background"}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/propiedades/${prop.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-sm font-semibold text-text-primary hover:text-primary hover:underline"
                              >
                                {label}
                                <ExternalLink className="h-3 w-3 opacity-50" />
                              </Link>
                              <ScoreBadge score={prop.score} />
                              {alreadySent && <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success"><MessageCircle className="h-3 w-3" />Enviado</span>}
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                              <span className="flex items-center gap-1"><Euro className="h-3 w-3" />{formatCurrency(prop.precio)}</span>
                              {prop.zona_nombre && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{prop.zona_nombre}</span>}
                              {prop.tipo_operacion && <span>{OPERACION_LABEL[prop.tipo_operacion] ?? prop.tipo_operacion}</span>}
                              {prop.estado && prop.estado !== "neutral" && <span>{ESTADO_LABEL[prop.estado] ?? prop.estado}</span>}
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              <MatchCriteria ok={prop.score_presupuesto} label="Presupuesto" />
                              <MatchCriteria ok={prop.score_zona} label="Zona" />
                              <MatchCriteria ok={prop.score_modalidad} label="Modalidad" />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSendOne(prop)}
                            disabled={isSending || alreadySent || sinTelefono}
                            title={sinTelefono ? "El cliente no tiene telefono" : undefined}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20 disabled:opacity-40 dark:text-emerald-400"
                          >
                            {sinTelefono ? <PhoneOff className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
                            {isSending ? "Enviando..." : alreadySent ? "Enviado" : sinTelefono ? "Sin tel." : "WhatsApp"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="shrink-0 border-t border-border px-5 py-3">
              <p className="text-xs text-text-secondary">
                Propiedades disponibles ordenadas por compatibilidad. Haz clic en el nombre para ver la ficha completa.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
