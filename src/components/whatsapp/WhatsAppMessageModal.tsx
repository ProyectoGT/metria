"use client";

import { useState, useTransition } from "react";
import { MessageCircle, X, Send, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import {
  WHATSAPP_TEMPLATE_LABELS,
  type WhatsAppTemplateKey,
} from "@/lib/whatsapp";
import { sendOrPrepareWhatsAppAction } from "@/app/(crm)/whatsapp/actions";

type TemplateOption = {
  key: WhatsAppTemplateKey;
  buildMessage: () => string;
};

type Props = {
  phone: string;
  recipientName: string;
  initialMessage: string;
  templateName?: WhatsAppTemplateKey;
  extraTemplates?: TemplateOption[];
  relatedType: "solicitud" | "propiedad";
  relatedId: number;
  pedidoId?: number;
  propiedadId?: number;
  buttonLabel?: string;
  buttonVariant?: "default" | "compact";
};

export default function WhatsAppMessageModal({
  phone,
  recipientName,
  initialMessage,
  templateName,
  extraTemplates,
  relatedType,
  relatedId,
  pedidoId,
  propiedadId,
  buttonLabel = "Enviar WhatsApp",
  buttonVariant = "default",
}: Props) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [activeTemplate, setActiveTemplate] = useState<WhatsAppTemplateKey | undefined>(templateName);
  const [wasSent, setWasSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setMessage(initialMessage);
    setActiveTemplate(templateName);
    setWasSent(false);
    setIsOpen(true);
  }

  function handleSelectTemplate(option: TemplateOption) {
    setActiveTemplate(option.key);
    setMessage(option.buildMessage());
  }

  function handleSend() {
    if (!message.trim()) return;
    startTransition(async () => {
      try {
        const result = await sendOrPrepareWhatsAppAction({
          phone,
          recipientName,
          messageBody: message,
          templateName: activeTemplate,
          relatedType,
          relatedId,
          pedidoId,
          propiedadId,
        });

        if (result.sent) {
          // API activa: mensaje enviado directamente
          setWasSent(true);
          toast("Mensaje enviado por WhatsApp");
          setTimeout(() => setIsOpen(false), 1500);
        } else {
          // Modo manual: abrir wa.me
          window.open(result.fallbackUrl, "_blank", "noopener,noreferrer");
          setIsOpen(false);
          toast("WhatsApp abierto");
        }
      } catch {
        toast("Error al enviar WhatsApp", "error");
      }
    });
  }

  const hasTemplates = extraTemplates && extraTemplates.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        title={`Enviar WhatsApp a ${recipientName}`}
        className={
          buttonVariant === "compact"
            ? "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/10 dark:text-emerald-400"
            : "inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
        }
      >
        <MessageCircle className="h-4 w-4 shrink-0" />
        {buttonLabel}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-surface shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                </div>
                <h2 className="text-base font-semibold text-text-primary">Enviar WhatsApp</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {wasSent ? (
              <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
                <CheckCircle2 className="h-12 w-12 text-success" />
                <p className="text-base font-semibold text-text-primary">Mensaje enviado</p>
                <p className="text-sm text-text-secondary">
                  El mensaje se ha enviado a {recipientName} via WhatsApp Cloud API.
                </p>
              </div>
            ) : (
              <div className="space-y-4 p-5">
                {/* Destinatario */}
                <div className="rounded-xl border border-border bg-background px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Destinatario</p>
                  <p className="mt-0.5 text-sm font-medium text-text-primary">{recipientName}</p>
                  <p className="text-xs text-text-secondary">{phone}</p>
                </div>

                {/* Selector de plantilla */}
                {hasTemplates && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Plantilla</p>
                    <div className="flex flex-wrap gap-2">
                      {templateName && (
                        <button
                          type="button"
                          onClick={() => { setActiveTemplate(templateName); setMessage(initialMessage); }}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            activeTemplate === templateName
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border text-text-secondary hover:bg-surface-raised"
                          }`}
                        >
                          {WHATSAPP_TEMPLATE_LABELS[templateName]}
                        </button>
                      )}
                      {extraTemplates?.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleSelectTemplate(opt)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            activeTemplate === opt.key
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border text-text-secondary hover:bg-surface-raised"
                          }`}
                        >
                          {WHATSAPP_TEMPLATE_LABELS[opt.key]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mensaje editable */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Mensaje
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    className="input mt-1.5 w-full resize-y text-sm"
                    placeholder="Escribe el mensaje..."
                  />
                  <p className="mt-1 text-xs text-text-secondary">{message.length} caracteres</p>
                </div>
              </div>
            )}

            {/* Acciones */}
            {!wasSent && (
              <div className="flex items-center justify-between border-t border-border px-5 py-4">
                <p className="text-xs text-text-secondary">
                  Se abrira WhatsApp o se enviara automaticamente
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={isPending || !message.trim()}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {isPending ? "Enviando..." : "Enviar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
