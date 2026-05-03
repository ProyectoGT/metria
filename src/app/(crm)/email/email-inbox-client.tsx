"use client";

import { useMemo, useState, useTransition } from "react";
import { Archive, CheckCircle2, ExternalLink, Inbox, Mail, Paperclip, RefreshCw, Search, Send, Tag, Undo2 } from "lucide-react";

type Account = { id: number; email: string; status: string; last_sync_at: string | null; last_error: string | null };
type LinkRow = { id: number; email_message_id: number; entity_type: string; entity_id: number; confidence_score: number; linked_by: string };
type Template = { id: number; name: string; subject: string; body_text: string; category: string };
type Message = {
  id: number;
  account_id: number;
  provider_thread_id: string | null;
  from_email: string | null;
  from_name: string | null;
  to_emails: Array<{ email: string; name: string | null }>;
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  received_at: string | null;
  sent_at: string | null;
  is_read: boolean;
  has_attachments: boolean;
  direction: "inbound" | "outbound";
  folder: "inbox" | "sent" | "archive";
};

type FilterKey = "inbox" | "sent" | "unread" | "linked" | "contacto" | "pedido" | "propiedad" | "attachments";

const FILTERS: Array<{ key: FilterKey; label: string; icon: React.ElementType }> = [
  { key: "inbox", label: "Entrada", icon: Inbox },
  { key: "sent", label: "Enviados", icon: Send },
  { key: "unread", label: "No leidos", icon: Mail },
  { key: "linked", label: "Relacionados", icon: Tag },
  { key: "contacto", label: "Contacto", icon: Tag },
  { key: "pedido", label: "Pedido", icon: Tag },
  { key: "propiedad", label: "Propiedad", icon: Tag },
  { key: "attachments", label: "Adjuntos", icon: Paperclip },
];

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function entityHref(link: LinkRow) {
  if (link.entity_type === "contacto") return `/contactos?contacto=${link.entity_id}`;
  if (link.entity_type === "pedido") return `/solicitudes?pedido=${link.entity_id}`;
  if (link.entity_type === "propiedad") return `/zona`;
  if (link.entity_type === "lead") return `/solicitudes?tab=idealista`;
  return null;
}

export default function EmailInboxClient({
  accounts,
  messages,
  links,
  templates,
}: {
  accounts: Account[];
  messages: Message[];
  links: LinkRow[];
  templates: Template[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("inbox");
  const [selectedId, setSelectedId] = useState(messages[0]?.id ?? null);
  const [isPending, startTransition] = useTransition();
  const [composeOpen, setComposeOpen] = useState(false);
  const [compose, setCompose] = useState({ to: "", subject: "", bodyText: "" });
  const [manualLink, setManualLink] = useState({ entityType: "contacto", entityId: "" });

  const linksByMessage = useMemo(() => {
    const map = new Map<number, LinkRow[]>();
    for (const link of links) map.set(link.email_message_id, [...(map.get(link.email_message_id) ?? []), link]);
    return map;
  }, [links]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return messages.filter((message) => {
      const messageLinks = linksByMessage.get(message.id) ?? [];
      if (filter === "inbox" && message.folder !== "inbox") return false;
      if (filter === "sent" && message.folder !== "sent") return false;
      if (filter === "unread" && message.is_read) return false;
      if (filter === "linked" && messageLinks.length === 0) return false;
      if (["contacto", "pedido", "propiedad"].includes(filter) && !messageLinks.some((link) => link.entity_type === filter)) return false;
      if (filter === "attachments" && !message.has_attachments) return false;
      if (!q) return true;
      return [message.subject, message.snippet, message.body_text, message.from_email, message.from_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [filter, linksByMessage, messages, query]);

  const selected = filtered.find((message) => message.id === selectedId) ?? filtered[0] ?? null;
  const account = accounts[0] ?? null;
  const connected = account?.status === "connected";

  function sync() {
    startTransition(async () => {
      await fetch("/api/email/sync", { method: "POST" });
      window.location.reload();
    });
  }

  function messageAction(messageId: number, action: "read" | "unread" | "archive") {
    startTransition(async () => {
      await fetch(`/api/email/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      window.location.reload();
    });
  }

  function applyTemplate(templateId: string) {
    const template = templates.find((item) => item.id === Number(templateId));
    if (!template) return;
    setCompose((current) => ({ ...current, subject: template.subject, bodyText: template.body_text }));
  }

  function sendEmail() {
    startTransition(async () => {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(compose),
      });
      if (res.ok) {
        setComposeOpen(false);
        setCompose({ to: "", subject: "", bodyText: "" });
        window.location.reload();
      }
    });
  }

  function linkManually(messageId: number) {
    startTransition(async () => {
      const res = await fetch("/api/email/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, ...manualLink }),
      });
      if (res.ok) {
        setManualLink({ entityType: "contacto", entityId: "" });
        window.location.reload();
      }
    });
  }

  if (!connected) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <Mail className="mx-auto h-10 w-10 text-text-secondary/50" />
        <h2 className="mt-3 text-base font-semibold text-text-primary">Gmail no esta conectado</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-text-secondary">
          Conecta tu cuenta desde Cuenta para sincronizar tu bandeja y relacionar emails con clientes, pedidos y propiedades.
        </p>
        <a
          href="/cuenta"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          <ExternalLink className="h-4 w-4" />
          Ir a Cuenta
        </a>
      </section>
    );
  }

  return (
    <div className="grid min-h-[calc(100vh-12rem)] grid-cols-1 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm lg:grid-cols-[220px_minmax(0,0.9fr)_minmax(360px,1.2fr)]">
      <aside className="border-b border-border bg-surface-raised/25 p-4 lg:border-b-0 lg:border-r">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">{account.email}</p>
            <p className="text-xs text-text-secondary">{account.last_sync_at ? `Sync ${formatDate(account.last_sync_at)}` : "Pendiente de sync"}</p>
          </div>
          <button
            type="button"
            onClick={sync}
            disabled={isPending}
            className="rounded-lg border border-border p-2 text-text-secondary hover:bg-surface hover:text-text-primary disabled:opacity-60"
            title="Sincronizar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          <Send className="h-4 w-4" />
          Redactar
        </button>

        <nav className="space-y-1">
          {FILTERS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={[
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                filter === key ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-surface hover:text-text-primary",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <section className="border-b border-border lg:border-b-0 lg:border-r">
        <div className="border-b border-border p-3">
          <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-secondary">
            <Search className="h-4 w-4" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar correo"
              className="min-w-0 flex-1 bg-transparent text-text-primary outline-none placeholder:text-text-secondary"
            />
          </label>
        </div>

        <div className="max-h-[680px] overflow-y-auto">
          {filtered.map((message) => {
            const related = linksByMessage.get(message.id) ?? [];
            return (
              <button
                key={message.id}
                type="button"
                onClick={() => setSelectedId(message.id)}
                className={[
                  "block w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-surface-raised/45",
                  selected?.id === message.id ? "bg-primary/8" : "",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className={`truncate text-sm ${message.is_read ? "font-medium text-text-primary" : "font-bold text-text-primary"}`}>
                    {message.direction === "outbound" ? `Para ${message.to_emails?.[0]?.email ?? ""}` : message.from_name || message.from_email}
                  </p>
                  <span className="shrink-0 text-xs text-text-secondary">{formatDate(message.received_at ?? message.sent_at)}</span>
                </div>
                <p className="mt-1 truncate text-sm font-medium text-text-primary">{message.subject}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-secondary">{message.snippet}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {message.has_attachments && <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[11px] text-text-secondary">Adjunto</span>}
                  {related.map((link) => (
                    <span key={link.id} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {link.entity_type} #{link.entity_id}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-text-secondary">No hay emails para este filtro.</div>
          )}
        </div>
      </section>

      <section className="min-h-[520px]">
        {selected ? (
          <div className="flex h-full flex-col">
            <div className="border-b border-border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-text-primary">{selected.subject}</h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    {selected.direction === "outbound" ? `Para ${selected.to_emails?.[0]?.email ?? ""}` : `${selected.from_name ?? ""} ${selected.from_email ?? ""}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => messageAction(selected.id, selected.is_read ? "unread" : "read")}
                    className="rounded-lg border border-border p-2 text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                    title={selected.is_read ? "Marcar como no leido" : "Marcar como leido"}
                  >
                    {selected.is_read ? <Undo2 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  </button>
                  {selected.folder === "inbox" && (
                    <button
                      type="button"
                      onClick={() => messageAction(selected.id, "archive")}
                      className="rounded-lg border border-border p-2 text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                      title="Archivar"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(linksByMessage.get(selected.id) ?? []).map((link) => {
                  const href = entityHref(link);
                  return href ? (
                    <a key={link.id} href={href} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:underline">
                      {link.entity_type} #{link.entity_id}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null;
                })}
              </div>
              <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-surface-raised/35 p-3 sm:flex-row">
                <select
                  value={manualLink.entityType}
                  onChange={(event) => setManualLink((current) => ({ ...current, entityType: event.target.value }))}
                  className="input sm:max-w-40"
                >
                  <option value="contacto">Contacto</option>
                  <option value="pedido">Pedido</option>
                  <option value="propiedad">Propiedad</option>
                  <option value="tarea">Tarea</option>
                  <option value="lead">Lead</option>
                </select>
                <input
                  value={manualLink.entityId}
                  onChange={(event) => setManualLink((current) => ({ ...current, entityId: event.target.value }))}
                  className="input"
                  inputMode="numeric"
                  placeholder="ID a vincular"
                />
                <button
                  type="button"
                  onClick={() => linkManually(selected.id)}
                  disabled={isPending || !manualLink.entityId}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface hover:text-text-primary disabled:opacity-60"
                >
                  Vincular manualmente
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-text-primary">{selected.body_text || selected.snippet}</pre>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-sm text-text-secondary">Selecciona un email.</div>
        )}
      </section>

      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-text-primary">Nuevo email</h2>
              <button type="button" onClick={() => setComposeOpen(false)} className="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-raised">Cerrar</button>
            </div>
            <div className="space-y-3">
              <select onChange={(event) => applyTemplate(event.target.value)} className="input">
                <option value="">Usar plantilla</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
              <input value={compose.to} onChange={(e) => setCompose((c) => ({ ...c, to: e.target.value }))} className="input" placeholder="Para" />
              <input value={compose.subject} onChange={(e) => setCompose((c) => ({ ...c, subject: e.target.value }))} className="input" placeholder="Asunto" />
              <textarea value={compose.bodyText} onChange={(e) => setCompose((c) => ({ ...c, bodyText: e.target.value }))} className="input min-h-48 resize-y" placeholder="Mensaje" />
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={sendEmail} disabled={isPending} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">
                <Send className="h-4 w-4" />
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
