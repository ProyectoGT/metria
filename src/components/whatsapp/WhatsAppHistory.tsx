"use client";

import { useState, useCallback } from "react";
import { MessageCircle, ChevronDown, ChevronUp, Clock, CheckCheck, Check, AlertCircle } from "lucide-react";
import { getWhatsAppHistoryAction, type WhatsAppMessage } from "@/app/(crm)/whatsapp/actions";

type Props = {
  pedidoId?: number;
  propiedadId?: number;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  prepared: {
    label: "Preparado",
    color: "text-text-secondary",
    icon: <Clock className="h-3 w-3" />,
  },
  sent: {
    label: "Enviado",
    color: "text-blue-600 dark:text-blue-400",
    icon: <Check className="h-3 w-3" />,
  },
  delivered: {
    label: "Entregado",
    color: "text-primary",
    icon: <CheckCheck className="h-3 w-3" />,
  },
  read: {
    label: "Leido",
    color: "text-success",
    icon: <CheckCheck className="h-3 w-3" />,
  },
  failed: {
    label: "Fallido",
    color: "text-danger",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WhatsAppHistory({ pedidoId, propiedadId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getWhatsAppHistoryAction({ pedidoId, propiedadId, limit: 20 });
      setMessages(data);
      setLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, [pedidoId, propiedadId]);

  const count = loaded ? messages.length : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <button
        type="button"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next && !loaded) void load();
        }}
        className="flex w-full items-center justify-between gap-3 border-b border-border px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-semibold text-text-primary">
            Historial WhatsApp
            {count != null && count > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500/10 px-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                {count}
              </span>
            )}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-text-secondary" />
        ) : (
          <ChevronDown className="h-4 w-4 text-text-secondary" />
        )}
      </button>

      {isOpen && (
        <div className="px-5 py-4">
          {isLoading ? (
            <p className="text-sm text-text-secondary">Cargando historial...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-text-secondary">Sin mensajes registrados aun.</p>
          ) : (
            <ul className="space-y-3">
              {messages.map((msg) => {
                const st = STATUS_CONFIG[msg.status] ?? STATUS_CONFIG.prepared;
                return (
                  <li key={msg.id} className="rounded-xl border border-border bg-background p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-text-primary">
                            {msg.recipient_name ?? msg.phone}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${st.color} bg-current/10`}
                          >
                            {st.icon}
                            {st.label}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                          {msg.message_body}
                        </p>
                      </div>
                      <time className="shrink-0 text-xs text-text-secondary">
                        {formatDate(msg.sent_at)}
                      </time>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
