"use client";

import { useEffect, useState } from "react";
import { Mail, Send } from "lucide-react";

type Message = {
  id: number;
  subject: string | null;
  from_email: string | null;
  from_name: string | null;
  to_emails: Array<{ email: string; name: string | null }>;
  snippet: string | null;
  body_text: string | null;
  received_at: string | null;
  sent_at: string | null;
  direction: "inbound" | "outbound";
  urgency: "normal" | "important" | "urgent";
  intent: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function RelatedEmailsPanel({
  entityType,
  entityId,
  replyTo,
}: {
  entityType: "contacto" | "pedido" | "propiedad";
  entityId: number;
  replyTo?: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [openCompose, setOpenCompose] = useState(false);
  const [compose, setCompose] = useState({ to: replyTo ?? "", subject: "", bodyText: "" });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/email/related?entityType=${entityType}&entityId=${entityId}`)
      .then((res) => res.json())
      .then((json) => { if (active) setMessages(json.messages ?? []); })
      .catch(() => {});
    return () => { active = false; };
  }, [entityId, entityType]);

  async function send() {
    setSending(true);
    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...compose,
        entityType,
        entityId,
      }),
    });
    setSending(false);
    if (res.ok) {
      setOpenCompose(false);
      setCompose({ to: replyTo ?? "", subject: "", bodyText: "" });
      const json = await fetch(`/api/email/related?entityType=${entityType}&entityId=${entityId}`).then((r) => r.json());
      setMessages(json.messages ?? []);
    }
  }

  return (
    <section className="border-t border-border bg-surface px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-text-secondary" />
          <h3 className="text-sm font-semibold text-text-primary">Emails relacionados</h3>
          <span className="rounded-full bg-surface-raised px-2 py-0.5 text-xs text-text-secondary">{messages.length}</span>
        </div>
        <button
          type="button"
          onClick={() => setOpenCompose((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-raised hover:text-text-primary"
        >
          <Send className="h-3.5 w-3.5" />
          Responder
        </button>
      </div>

      {openCompose && (
        <div className="mb-4 space-y-2 rounded-xl border border-border bg-surface-raised/35 p-3">
          <input className="input" value={compose.to} onChange={(e) => setCompose((c) => ({ ...c, to: e.target.value }))} placeholder="Para" />
          <input className="input" value={compose.subject} onChange={(e) => setCompose((c) => ({ ...c, subject: e.target.value }))} placeholder="Asunto" />
          <textarea className="input min-h-28 resize-y" value={compose.bodyText} onChange={(e) => setCompose((c) => ({ ...c, bodyText: e.target.value }))} placeholder="Mensaje" />
          <div className="flex justify-end">
            <button type="button" disabled={sending} onClick={send} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">
              {sending ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </div>
      )}

      {messages.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-text-secondary">No hay emails relacionados todavia.</p>
      ) : (
        <div className="space-y-2">
          {messages.slice(0, 8).map((message) => (
            <a key={message.id} href={`/email?message=${message.id}`} className="block rounded-xl border border-border bg-surface-raised/30 px-3 py-2 transition-colors hover:bg-surface-raised">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-medium text-text-primary">{message.subject || "(Sin asunto)"}</p>
                <span className="shrink-0 text-xs text-text-secondary">{formatDate(message.received_at ?? message.sent_at)}</span>
              </div>
              <p className="mt-1 truncate text-xs text-text-secondary">
                {message.direction === "outbound" ? `Para ${message.to_emails?.[0]?.email ?? ""}` : message.from_name || message.from_email}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{message.snippet}</p>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
