"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AlertCircle, Archive, CheckCircle2, Clock, ExternalLink, Forward, Inbox, Mail, Paperclip, RefreshCw, Reply, ReplyAll, Search, Send, Star, Tag, Trash2, Undo2 } from "lucide-react";
import Drawer from "@/components/ui/drawer";

type Account = { id: number; email: string; status: string; last_sync_at: string | null; last_error: string | null };
type LinkRow = { id: number; email_message_id: number; entity_type: string; entity_id: number; confidence_score: number; linked_by: string };
type Template = { id: number; name: string; subject: string; body_text: string; category: string };
type AlertRow = { id: number; email_message_id: number; alert_type: string; title: string; severity: string; due_at: string | null; status: string };
type AttachmentRow = { id: number; email_message_id: number; filename: string; mime_type: string | null; document_type: string; storage_path: string | null; provider_attachment_id?: string | null };
type Message = {
  id: number;
  account_id: number;
  provider_thread_id: string | null;
  from_email: string | null;
  from_name: string | null;
  to_emails: Array<{ email: string; name: string | null }>;
  cc_emails?: Array<{ email: string; name: string | null }>;
  subject: string | null;
  snippet: string | null;
  body_text?: string | null;
  body_html?: string | null;
  received_at: string | null;
  sent_at: string | null;
  is_read: boolean;
  has_attachments: boolean;
  direction: "inbound" | "outbound";
  folder: "inbox" | "sent" | "archive" | "trash" | "spam" | "drafts";
  commercial_priority: number;
  commercial_bucket: "active_client" | "hot_pedido" | "property_owner" | "related" | "personal";
  intent: string | null;
  urgency: "normal" | "important" | "urgent";
  needs_response: boolean;
  response_due_at: string | null;
  responded_at: string | null;
  portal_source: string | null;
  raw_metadata?: { labelIds?: string[]; isStarred?: boolean; isImportant?: boolean };
};

type FilterKey = "priority" | "inbox" | "sent" | "archive" | "trash" | "spam" | "starred" | "important" | "unread" | "linked" | "contacto" | "pedido" | "propiedad" | "attachments" | "personal";
type MessageBody = { text: string | null; html: string | null };
type ComposeMode = "new" | "reply" | "replyAll" | "forward";
type ThreadRow = Pick<Message, "id" | "from_email" | "from_name" | "to_emails" | "subject" | "received_at" | "sent_at" | "direction" | "body_text" | "body_html">;

const FILTERS: Array<{ key: FilterKey; label: string; icon: React.ElementType }> = [
  { key: "priority", label: "Prioridad", icon: Tag },
  { key: "inbox", label: "Entrada", icon: Inbox },
  { key: "sent", label: "Enviados", icon: Send },
  { key: "archive", label: "Archivados", icon: Archive },
  { key: "trash", label: "Papelera", icon: Trash2 },
  { key: "spam", label: "Spam", icon: AlertCircle },
  { key: "starred", label: "Destacados", icon: Star },
  { key: "important", label: "Importantes", icon: AlertCircle },
  { key: "unread", label: "No leidos", icon: Mail },
  { key: "linked", label: "Relacionados", icon: Tag },
  { key: "contacto", label: "Contacto", icon: Tag },
  { key: "pedido", label: "Pedido", icon: Tag },
  { key: "propiedad", label: "Propiedad", icon: Tag },
  { key: "attachments", label: "Adjuntos", icon: Paperclip },
  { key: "personal", label: "Personal", icon: Mail },
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

function ensureSubjectPrefix(subject: string | null, prefix: "Re" | "Fwd") {
  const clean = subject?.trim() || "(Sin asunto)";
  if (prefix === "Re" && /^re:/i.test(clean)) return clean;
  if (prefix === "Fwd" && /^(fwd|fw):/i.test(clean)) return clean;
  return `${prefix}: ${clean}`;
}

function recipientList(items: Array<{ email: string; name: string | null }> | undefined, exclude?: string | null) {
  const excludeEmail = exclude?.toLowerCase();
  return [...new Set((items ?? []).map((item) => item.email).filter((email) => email && email.toLowerCase() !== excludeEmail))].join(", ");
}

function EmailBody({ html, text }: { html: string | null; text: string }) {
  const [height, setHeight] = useState(720);
  const normalizedHtml = html ? decodeMaybeQuotedPrintableIfNeeded(html) : null;
  const normalizedText = decodeMaybeQuotedPrintableIfNeeded(text);

  const resizeIframe = useCallback((frame: HTMLIFrameElement | null) => {
    if (!frame?.contentDocument) return;
    const doc = frame.contentDocument;
    const nextHeight = Math.max(
      720,
      doc.documentElement.scrollHeight,
      doc.body?.scrollHeight ?? 0,
    );
    setHeight(nextHeight + 24);
  }, []);

  if (normalizedHtml) {
    return (
      <iframe
        title="Contenido del email"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        srcDoc={emailDocument(normalizedHtml)}
        onLoad={(event) => {
          const frame = event.currentTarget;
          resizeIframe(frame);
          window.setTimeout(() => resizeIframe(frame), 300);
          window.setTimeout(() => resizeIframe(frame), 1200);
        }}
        style={{ height }}
        className="w-full border-0 bg-white"
      />
    );
  }

  return <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-text-primary">{normalizedText}</pre>;
}

function emailDocument(html: string) {
  const normalized = html
    .replace(/\s(src|href)=["']\/\//gi, ' $1="https://')
    .replace(/<img\b/gi, '<img loading="lazy" referrerpolicy="no-referrer"');
  const meta = '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
  const base = '<base target="_blank">';
  const style = `<style>
    html,body{margin:0;padding:0;background:#fff;color:#0f172a;font-family:Arial,sans-serif;}
    body{overflow-wrap:anywhere;}
    img{max-width:100%;height:auto;}
    table{max-width:100%;}
  </style>`;

  if (/<html[\s>]/i.test(html)) {
    return normalized
      .replace(/<head([^>]*)>/i, `<head$1>${meta}${base}${style}`)
  }

  return `<!doctype html><html><head>${meta}${base}${style}</head><body>${normalized}</body></html>`;
}

function decodeMaybeQuotedPrintableIfNeeded(value: string) {
  if (!/=[A-Fa-f0-9]{2}|=\r?\n/.test(value)) return value;
  const binary = value
    .replace(/=\r?\n/g, "")
    .replace(/=([A-Fa-f0-9]{2})/g, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));
  try {
    const decoded = new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
    return shouldUseDecodedBody(value, decoded) ? decoded : value;
  } catch {
    return value;
  }
}

function shouldUseDecodedBody(original: string, decoded: string) {
  const originalEscapes = (original.match(/=[A-Fa-f0-9]{2}|=\r?\n/g) ?? []).length;
  const decodedEscapes = (decoded.match(/=[A-Fa-f0-9]{2}|=\r?\n/g) ?? []).length;
  const originalReplacement = (original.match(/\uFFFD/g) ?? []).length;
  const decodedReplacement = (decoded.match(/\uFFFD/g) ?? []).length;

  if (decodedReplacement > originalReplacement) return false;
  if (originalReplacement > decodedReplacement) return true;
  return originalEscapes >= 3 && decodedEscapes < originalEscapes;
}

export default function EmailInboxClient({
  accounts,
  messages: initialMessages,
  links,
  templates,
  alerts,
  attachments,
}: {
  accounts: Account[];
  messages: Message[];
  links: LinkRow[];
  templates: Template[];
  alerts: AlertRow[];
  attachments: AttachmentRow[];
}) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("priority");
  const [selectedId, setSelectedId] = useState(Number(searchParams.get("message")) || (initialMessages[0]?.id ?? null));
  const [isPending, startTransition] = useTransition();
  const [composeOpen, setComposeOpen] = useState(false);
  const [compose, setCompose] = useState({ mode: "new" as ComposeMode, sourceMessageId: null as number | null, to: "", cc: "", bcc: "", subject: "", bodyText: "" });
  const [manualLink, setManualLink] = useState({ entityType: "contacto", entityId: "" });
  const [messageBodies, setMessageBodies] = useState<Record<number, MessageBody>>({});
  const [threads, setThreads] = useState<Record<number, ThreadRow[]>>({});
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(accounts[0]?.last_sync_at ?? null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const messageQuery = useInfiniteQuery({
    queryKey: ["email", "messages", filter, query],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        folder: filter,
        limit: "50",
        offset: String(pageParam),
      });
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/email/messages?${params.toString()}`);
      if (!res.ok) throw new Error("messages_query_failed");
      return res.json() as Promise<{ messages: Message[]; nextOffset: number | null; total: number | null }>;
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 30_000,
    refetchInterval: syncing ? false : 60_000,
  });

  const queryMessages = useMemo(() => messageQuery.data?.pages.flatMap((page) => page.messages) ?? [], [messageQuery.data]);
  const messages = queryMessages.length > 0 || messageQuery.isFetched ? queryMessages : initialMessages;

  const linksByMessage = useMemo(() => {
    const map = new Map<number, LinkRow[]>();
    for (const link of links) map.set(link.email_message_id, [...(map.get(link.email_message_id) ?? []), link]);
    return map;
  }, [links]);
  const alertsByMessage = useMemo(() => {
    const map = new Map<number, AlertRow[]>();
    for (const alert of alerts) map.set(alert.email_message_id, [...(map.get(alert.email_message_id) ?? []), alert]);
    return map;
  }, [alerts]);
  const attachmentsByMessage = useMemo(() => {
    const map = new Map<number, AttachmentRow[]>();
    for (const attachment of attachments) map.set(attachment.email_message_id, [...(map.get(attachment.email_message_id) ?? []), attachment]);
    return map;
  }, [attachments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return messages.filter((message) => {
      const messageLinks = linksByMessage.get(message.id) ?? [];
      if (filter === "priority" && message.commercial_bucket === "personal") return false;
      if (filter === "inbox" && message.folder !== "inbox") return false;
      if (filter === "sent" && message.folder !== "sent") return false;
      if (filter === "archive" && message.folder !== "archive") return false;
      if (filter === "trash" && message.folder !== "trash") return false;
      if (filter === "spam" && message.folder !== "spam") return false;
      if (filter === "starred" && !message.raw_metadata?.isStarred) return false;
      if (filter === "important" && !message.raw_metadata?.isImportant) return false;
      if (filter === "unread" && message.is_read) return false;
      if (filter === "linked" && messageLinks.length === 0) return false;
      if (["contacto", "pedido", "propiedad"].includes(filter) && !messageLinks.some((link) => link.entity_type === filter)) return false;
      if (filter === "attachments" && !message.has_attachments) return false;
      if (filter === "personal" && message.commercial_bucket !== "personal") return false;
      if (!q) return true;
      return [message.subject, message.snippet, message.body_text, message.from_email, message.from_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [filter, linksByMessage, messages, query]);

  const metrics = useMemo(() => ({
    pending: messages.filter((m) => m.needs_response && !m.responded_at).length,
    noReply: alerts.filter((a) => a.alert_type === "client_no_reply" || a.alert_type === "needs_response").length,
    activeConversations: new Set(messages.filter((m) => m.commercial_bucket !== "personal").map((m) => m.provider_thread_id ?? m.id)).size,
    hot: messages.filter((m) => m.commercial_bucket === "hot_pedido" || m.urgency === "urgent").length,
  }), [alerts, messages]);

  const selected = filtered.find((message) => message.id === selectedId) ?? filtered[0] ?? null;
  const account = accounts[0] ?? null;
  const connected = account?.status === "connected" || account?.status === "sync_error";
  const selectedFetchedBody = selected ? messageBodies[selected.id] : null;
  const selectedHtml = selectedFetchedBody?.html ?? selected?.body_html ?? null;
  const selectedText = selectedFetchedBody?.text ?? selected?.body_text ?? selected?.snippet ?? "";
  const selectedThread = selected ? threads[selected.id] ?? [] : [];
  // TanStack Virtual returns imperative helpers that React Compiler cannot memoize safely.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 124,
    getItemKey: (index) => filtered[index]?.id ?? index,
    measureElement: (element) => element.getBoundingClientRect().height,
    overscan: 8,
  });

  useEffect(() => {
    const lastVirtualItem = rowVirtualizer.getVirtualItems().at(-1);
    if (!lastVirtualItem) return;
    if (
      lastVirtualItem.index >= filtered.length - 8
      && messageQuery.hasNextPage
      && !messageQuery.isFetchingNextPage
    ) {
      void messageQuery.fetchNextPage();
    }
  }, [filtered.length, messageQuery, rowVirtualizer]);

  useEffect(() => {
    if (!selected || (messageBodies[selected.id] && threads[selected.id])) return;
    let active = true;
    fetch(`/api/email/messages/${selected.id}`)
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        const text = typeof json?.message?.body_text === "string" ? json.message.body_text : null;
        const html = typeof json?.message?.body_html === "string" ? json.message.body_html : null;
        const thread = Array.isArray(json?.thread) ? json.thread as ThreadRow[] : [];
        if (active && (text || html)) {
          setMessageBodies((current) => ({ ...current, [selected.id]: { text, html } }));
        }
        if (active && thread.length > 0) {
          setThreads((current) => ({ ...current, [selected.id]: thread }));
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [messageBodies, selected, threads]);

  const sync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncProgress("Sincronizando...");
    setSyncError(null);

    const startTime = Date.now();
    try {
      const res = await fetch("/api/email/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "auto" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSyncError(data.message ?? data.error ?? "sync_failed");
        setSyncing(false);
        return;
      }

      const elapsed = Date.now() - startTime;
      const label = data.isFullSync ? "Sync completo" : "Sync incremental";
      setSyncProgress(`${label}: ${data.synced} emails, ${data.linked} vinculados (${(elapsed / 1000).toFixed(1)}s)`);
      if (data.lastSyncAt) setLastSyncAt(data.lastSyncAt);

      await queryClient.invalidateQueries({ queryKey: ["email"] });
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        setSyncing(false);
        setSyncProgress(null);
      }, 2000);
    } catch {
      setSyncError("Error de conexion al sincronizar");
      setSyncing(false);
    }
  }, [queryClient, syncing]);

  function messageAction(messageId: number, action: "read" | "unread" | "archive" | "restore" | "trash" | "spam" | "star" | "unstar" | "important" | "unimportant") {
    startTransition(async () => {
      await fetch(`/api/email/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await queryClient.invalidateQueries({ queryKey: ["email"] });
    });
  }

  function applyTemplate(templateId: string) {
    const template = templates.find((item) => item.id === Number(templateId));
    if (!template) return;
    setCompose((current) => ({ ...current, subject: template.subject, bodyText: template.body_text }));
  }

  function openCompose(mode: ComposeMode, message?: Message | null) {
    const accountEmail = account?.email ?? "";
    const from = message?.from_email ?? "";
    const toForReply = message?.direction === "outbound"
      ? recipientList(message.to_emails, accountEmail)
      : from;
    const replyAllTo = [
      from,
      recipientList(message?.to_emails, accountEmail),
    ].filter(Boolean).join(", ");

    const originalBlock = message
      ? `\n\n\nEl ${formatDate(message.received_at ?? message.sent_at)}, ${message.from_name || message.from_email || ""} escribió:\n${selectedText}`
      : "";

    setCompose({
      mode,
      sourceMessageId: message?.id ?? null,
      to: mode === "new" ? "" : mode === "reply" ? toForReply : mode === "replyAll" ? replyAllTo : "",
      cc: mode === "replyAll" ? recipientList(message?.cc_emails, accountEmail) : "",
      bcc: "",
      subject: mode === "new" ? "" : ensureSubjectPrefix(message?.subject ?? "", mode === "forward" ? "Fwd" : "Re"),
      bodyText: mode === "forward" ? "" : originalBlock,
    });
    setComposeOpen(true);
  }

  function smartTemplateForSelected() {
    if (!selected) return templates[0] ?? null;
    const category =
      selected.intent === "solicita_visita" ? "recordatorio_visita"
        : selected.commercial_bucket === "property_owner" ? "seguimiento_encargo"
          : selected.intent === "interesado" || selected.commercial_bucket === "hot_pedido" ? "seguimiento_solicitud"
            : selected.intent === "no_interesado" ? "reactivacion"
              : "primer_contacto";
    return templates.find((template) => template.category === category) ?? templates[0] ?? null;
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
        setCompose({ mode: "new", sourceMessageId: null, to: "", cc: "", bcc: "", subject: "", bodyText: "" });
        await queryClient.invalidateQueries({ queryKey: ["email"] });
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
    <div className="grid h-[calc(100vh-12rem)] min-h-[620px] grid-cols-1 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm lg:grid-cols-[220px_minmax(0,0.9fr)_minmax(360px,1.2fr)]">
      <aside className="min-h-0 overflow-y-auto border-b border-border bg-surface-raised/25 p-4 lg:border-b-0 lg:border-r">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">{account.email}</p>
            <p className="flex items-center gap-1 text-xs text-text-secondary">
              <Clock className="h-3 w-3" />
              {lastSyncAt ? formatDate(lastSyncAt) : "Pendiente de sync"}
            </p>
          </div>
          <button
            type="button"
            onClick={sync}
            disabled={syncing}
            className="rounded-lg border border-border p-2 text-text-secondary hover:bg-surface hover:text-text-primary disabled:opacity-60"
            title="Sincronizar"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {syncProgress && (
          <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            <div className="mb-1 flex items-center gap-1.5">
              <RefreshCw className="h-3 w-3 animate-spin" />
              {syncProgress}
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-primary/10">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
            </div>
          </div>
        )}

        {syncError && (
          <div className="mb-3 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {syncError}
            </div>
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
            <p className="text-[11px] text-text-secondary">Pendientes</p>
            <p className="text-base font-semibold text-text-primary">{metrics.pending}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
            <p className="text-[11px] text-text-secondary">Calientes</p>
            <p className="text-base font-semibold text-text-primary">{metrics.hot}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
            <p className="text-[11px] text-text-secondary">Alertas</p>
            <p className="text-base font-semibold text-text-primary">{metrics.noReply}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
            <p className="text-[11px] text-text-secondary">Convers.</p>
            <p className="text-base font-semibold text-text-primary">{metrics.activeConversations}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openCompose("new")}
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

      <section className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
        <div className="shrink-0 border-b border-border p-3">
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

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const message = filtered[virtualRow.index];
            if (!message) return null;
            const related = linksByMessage.get(message.id) ?? [];
            return (
              <button
                key={message.id}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                type="button"
                onClick={() => setSelectedId(message.id)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
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
                <div className="mt-1 flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{message.subject}</p>
                  {message.urgency !== "normal" && (
                    <span className={message.urgency === "urgent" ? "rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger" : "rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent"}>
                      {message.urgency === "urgent" ? "Urgente" : "Importante"}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-secondary">{message.snippet}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {message.commercial_bucket !== "personal" && <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">{message.commercial_bucket.replace("_", " ")}</span>}
                  {message.portal_source && <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600">{message.portal_source}</span>}
                  {alertsByMessage.has(message.id) && <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger">Alerta</span>}
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
          </div>
          {(messageQuery.isLoading || messageQuery.isFetchingNextPage) && (
            <div className="space-y-2 px-4 py-3">
              <div className="h-4 w-2/3 animate-pulse rounded bg-surface-raised" />
              <div className="h-3 w-full animate-pulse rounded bg-surface-raised" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-surface-raised" />
            </div>
          )}
          {filtered.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-text-secondary">
              {messageQuery.isError ? "No se pudo cargar la bandeja." : "No hay emails para este filtro."}
            </div>
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
                    onClick={() => openCompose("reply", selected)}
                    className="rounded-lg border border-border p-2 text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                    title="Responder"
                  >
                    <Reply className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openCompose("replyAll", selected)}
                    className="rounded-lg border border-border p-2 text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                    title="Responder a todos"
                  >
                    <ReplyAll className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openCompose("forward", selected)}
                    className="rounded-lg border border-border p-2 text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                    title="Reenviar"
                  >
                    <Forward className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => messageAction(selected.id, selected.raw_metadata?.isStarred ? "unstar" : "star")}
                    className={["rounded-lg border border-border p-2 hover:bg-surface-raised", selected.raw_metadata?.isStarred ? "text-accent" : "text-text-secondary hover:text-text-primary"].join(" ")}
                    title={selected.raw_metadata?.isStarred ? "Quitar destacado" : "Destacar"}
                  >
                    <Star className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => messageAction(selected.id, selected.is_read ? "unread" : "read")}
                    className="rounded-lg border border-border p-2 text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                    title={selected.is_read ? "Marcar como no leido" : "Marcar como leido"}
                  >
                    {selected.is_read ? <Undo2 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  </button>
                  {selected.folder === "trash" ? (
                    <button
                      type="button"
                      onClick={() => messageAction(selected.id, "restore")}
                      className="rounded-lg border border-border p-2 text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                      title="Restaurar"
                    >
                      <Undo2 className="h-4 w-4" />
                    </button>
                  ) : selected.folder === "archive" ? (
                    <button
                      type="button"
                      onClick={() => messageAction(selected.id, "restore")}
                      className="rounded-lg border border-border p-2 text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                      title="Mover a entrada"
                    >
                      <Undo2 className="h-4 w-4" />
                    </button>
                  ) : selected.folder === "inbox" ? (
                    <button
                      type="button"
                      onClick={() => messageAction(selected.id, "archive")}
                      className="rounded-lg border border-border p-2 text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                      title="Archivar"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  ) : null}
                  {selected.folder !== "trash" && (
                    <button
                      type="button"
                      onClick={() => messageAction(selected.id, "trash")}
                      className="rounded-lg border border-border p-2 text-text-secondary hover:bg-surface-raised hover:text-danger"
                      title="Mover a papelera"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.intent && (
                  <span className="rounded-full bg-surface-raised px-2.5 py-1 text-xs font-medium text-text-secondary">
                    Intencion: {selected.intent.replace("_", " ")}
                  </span>
                )}
                {selected.raw_metadata?.isImportant && (
                  <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">Importante</span>
                )}
                <button
                  type="button"
                  onClick={() => messageAction(selected.id, selected.raw_metadata?.isImportant ? "unimportant" : "important")}
                  className="rounded-full bg-surface-raised px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary"
                >
                  {selected.raw_metadata?.isImportant ? "Quitar importante" : "Marcar importante"}
                </button>
                {selected.response_due_at && !selected.responded_at && (
                  <span className="rounded-full bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger">
                    Responder antes de {formatDate(selected.response_due_at)}
                  </span>
                )}
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
              {(attachmentsByMessage.get(selected.id) ?? []).length > 0 && (
                <div className="mt-4 rounded-xl border border-border bg-surface-raised/35 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Adjuntos</p>
                  <div className="flex flex-wrap gap-2">
                    {(attachmentsByMessage.get(selected.id) ?? []).map((attachment) => (
                      <a key={attachment.id} href={`/api/email/attachments/${attachment.id}`} className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-text-secondary hover:text-primary">
                        <Paperclip className="h-3.5 w-3.5" />
                        {attachment.filename}
                        <span className="text-text-secondary/70">{attachment.document_type}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
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
              {selectedThread.length > 1 && (
                <div className="mb-4 rounded-xl border border-border bg-surface-raised/25">
                  <p className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Hilo ({selectedThread.length})
                  </p>
                  <div className="divide-y divide-border">
                    {selectedThread.filter((item) => item.id !== selected.id).map((item) => (
                      <details key={item.id} className="group">
                        <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-surface-raised/40">
                          <span className="min-w-0 truncate font-medium text-text-primary">
                            {item.direction === "outbound" ? `Para ${item.to_emails?.[0]?.email ?? ""}` : item.from_name || item.from_email}
                          </span>
                          <span className="shrink-0 text-xs text-text-secondary">{formatDate(item.received_at ?? item.sent_at)}</span>
                        </summary>
                        <div className="max-h-72 overflow-auto border-t border-border bg-white p-3">
                          <EmailBody html={item.body_html ?? null} text={item.body_text ?? ""} />
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}
              <EmailBody html={selectedHtml} text={selectedText} />
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-sm text-text-secondary">Selecciona un email.</div>
        )}
      </section>

      <Drawer
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        title={compose.mode === "reply" ? "Responder" : compose.mode === "replyAll" ? "Responder a todos" : compose.mode === "forward" ? "Reenviar" : "Nuevo email"}
        width="lg"
      >
        <div className="flex flex-col gap-3 p-5">
          <div className="flex gap-2">
            <select onChange={(event) => applyTemplate(event.target.value)} className="input">
            <option value="">Usar plantilla</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
            </select>
            <button
              type="button"
              onClick={() => {
                const template = smartTemplateForSelected();
                if (template) setCompose((current) => ({ ...current, subject: template.subject, bodyText: template.body_text }));
              }}
              className="shrink-0 rounded-lg border border-border px-3 text-sm font-medium text-text-secondary hover:bg-surface-raised hover:text-text-primary"
            >
              Inteligente
            </button>
          </div>
          <input value={compose.to} onChange={(e) => setCompose((c) => ({ ...c, to: e.target.value }))} className="input" placeholder="Para" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input value={compose.cc} onChange={(e) => setCompose((c) => ({ ...c, cc: e.target.value }))} className="input" placeholder="CC" />
            <input value={compose.bcc} onChange={(e) => setCompose((c) => ({ ...c, bcc: e.target.value }))} className="input" placeholder="BCC" />
          </div>
          <input value={compose.subject} onChange={(e) => setCompose((c) => ({ ...c, subject: e.target.value }))} className="input" placeholder="Asunto" />
          <textarea value={compose.bodyText} onChange={(e) => setCompose((c) => ({ ...c, bodyText: e.target.value }))} className="input min-h-48 resize-y" placeholder="Mensaje" />
        </div>
        <div className="border-t border-border px-5 py-4">
          <div className="flex justify-end">
            <button type="button" onClick={sendEmail} disabled={isPending} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">
              <Send className="h-4 w-4" />
              Enviar
            </button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
