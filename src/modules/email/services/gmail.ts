import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret, encryptSecret } from "./crypto";
import { classifyAttachment } from "./rules";

export type EmailAccount = {
  id: number;
  empresa_id: number | null;
  user_id: number;
  provider: "gmail" | "outlook";
  email: string;
  status: "connected" | "not_connected" | "sync_error" | "reauth_required" | "disconnected";
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  last_sync_at: string | null;
  last_history_id: string | null;
  last_error?: string | null;
};

type GmailHeader = { name: string; value: string };
type GmailPayload = {
  mimeType?: string;
  filename?: string;
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: GmailPayload[];
  headers?: GmailHeader[];
};
type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailPayload;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
};

function gmailUrl(path: string) {
  return `https://gmail.googleapis.com/gmail/v1${path}`;
}

function decodeBase64Url(data?: string) {
  if (!data) return "";
  try {
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  } catch {
    return "";
  }
}

function stripHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|li|tr|td|th)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findBody(payload: GmailPayload | undefined, mimeType: "text/plain" | "text/html"): string {
  if (!payload) return "";
  if (payload.mimeType === mimeType && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  for (const part of payload.parts ?? []) {
    const body = findBody(part, mimeType);
    if (body) return body;
  }
  return "";
}

function hasAttachment(payload: GmailPayload | undefined): boolean {
  if (!payload) return false;
  if (payload.filename || payload.body?.attachmentId) return true;
  return (payload.parts ?? []).some(hasAttachment);
}

function collectAttachments(payload: GmailPayload | undefined, out: Array<{ filename: string; mime_type?: string; size_bytes?: number; provider_attachment_id?: string }> = []) {
  if (!payload) return out;
  if (payload.filename || payload.body?.attachmentId) {
    out.push({
      filename: payload.filename || "adjunto",
      mime_type: payload.mimeType,
      size_bytes: payload.body?.size,
      provider_attachment_id: payload.body?.attachmentId,
    });
  }
  for (const part of payload.parts ?? []) collectAttachments(part, out);
  return out;
}

function header(headers: GmailHeader[] | undefined, name: string) {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function parseMailbox(value: string) {
  const match = value.match(/^(?:"?([^"<]*)"?\s*)?<([^>]+)>$/);
  if (match) {
    return { name: match[1]?.trim() || null, email: match[2].trim().toLowerCase() };
  }
  const email = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? value;
  return { name: null, email: email.trim().toLowerCase() };
}

function parseAddressList(value: string) {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => parseMailbox(part.trim()))
    .filter((item) => item.email);
}

function messageDate(message: GmailMessage, dateHeader: string) {
  const parsed = dateHeader ? new Date(dateHeader) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return message.internalDate ? new Date(Number(message.internalDate)).toISOString() : null;
}

async function gmailFetch<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const res = await fetch(gmailUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`gmail_${res.status}:${text.slice(0, 180)}`);
  }
  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

export async function exchangeGmailCode(code: string, redirectUri: string): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  return res.json() as Promise<TokenResponse>;
}

export async function getGmailProfile(accessToken: string) {
  return gmailFetch<{ emailAddress: string }>("/users/me/profile", accessToken);
}

export async function getValidAccessToken(
  supabase: SupabaseClient,
  account: EmailAccount,
): Promise<string | null> {
  if (account.status !== "connected" && account.status !== "sync_error") return null;

  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
  if (account.access_token_encrypted && expiresAt > Date.now() + 60_000) {
    return decryptSecret(account.access_token_encrypted);
  }

  if (!account.refresh_token_encrypted) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("email_accounts").update({ status: "reauth_required" }).eq("id", account.id);
    return null;
  }

  const refreshToken = decryptSecret(account.refresh_token_encrypted);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  const data = (await res.json()) as TokenResponse;

  if (!data.access_token) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("email_accounts")
      .update({ status: "reauth_required", last_error: data.error ?? "refresh_failed" })
      .eq("id", account.id);
    return null;
  }

  const tokenExpiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("email_accounts")
    .update({
      status: "connected",
      access_token_encrypted: encryptSecret(data.access_token),
      token_expires_at: tokenExpiresAt,
      last_error: null,
    })
    .eq("id", account.id);

  return data.access_token;
}

export function mapGmailMessage(message: GmailMessage, account: EmailAccount) {
  const headers = message.payload?.headers ?? [];
  const from = parseMailbox(header(headers, "From"));
  const to = parseAddressList(header(headers, "To"));
  const cc = parseAddressList(header(headers, "Cc"));
  const subject = header(headers, "Subject") || "(Sin asunto)";
  const date = messageDate(message, header(headers, "Date"));
  const html = findBody(message.payload, "text/html");
  const plain = findBody(message.payload, "text/plain") || stripHtml(html);
  const isSent = message.labelIds?.includes("SENT") ?? false;
  const isInbox = message.labelIds?.includes("INBOX") ?? !isSent;

  return {
    empresa_id: account.empresa_id,
    user_id: account.user_id,
    account_id: account.id,
    provider: "gmail",
    provider_message_id: message.id,
    provider_thread_id: message.threadId,
    from_email: from.email,
    from_name: from.name,
    to_emails: to,
    cc_emails: cc,
    subject,
    snippet: message.snippet ?? plain.slice(0, 240),
    body_text: plain.slice(0, 20000),
    body_html: html ? html.slice(0, 50000) : null,
    received_at: isSent ? null : date,
    sent_at: isSent ? date : null,
    is_read: !(message.labelIds?.includes("UNREAD") ?? false),
    has_attachments: hasAttachment(message.payload),
    direction: isSent ? "outbound" : "inbound",
    folder: isSent ? "sent" : isInbox ? "inbox" : "archive",
    raw_metadata: { labelIds: message.labelIds ?? [] },
    archived_at: isInbox || isSent ? null : new Date().toISOString(),
    _attachments: collectAttachments(message.payload),
  };
}

export async function getGmailHistoryId(accessToken: string): Promise<string | null> {
  try {
    const profile = await gmailFetch<{ historyId: string }>("/users/me/profile", accessToken);
    return profile.historyId ?? null;
  } catch {
    return null;
  }
}

async function fetchAndUpsertMessages(
  supabase: SupabaseClient,
  account: EmailAccount,
  accessToken: string,
  messageIds: string[],
  batchSize = 10,
) {
  if (messageIds.length === 0) return [];

  const rows = [];
  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((id) =>
        gmailFetch<GmailMessage>(`/users/me/messages/${id}?format=full`, accessToken).catch(() => null),
      ),
    );
    for (const msg of batchResults) {
      if (msg) rows.push(mapGmailMessage(msg, account));
    }
  }

  if (rows.length === 0) return [];

  const messageRows = rows.map((row) => {
    const { _attachments: attachments, ...messageRow } = row;
    void attachments;
    return messageRow;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("email_messages")
    .upsert(messageRows, { onConflict: "account_id,provider_message_id" })
    .select("id, provider_message_id, subject, from_email, from_name, body_text, snippet, empresa_id, user_id, direction, is_read, has_attachments, received_at");

  if (error) throw error;

  const attachmentsByMessage = new Map(rows.map((row) => [row.provider_message_id, row._attachments ?? []]));
  const attachmentRows = ((data ?? []) as Array<{ id: number; provider_message_id: string }>).flatMap((message) =>
    (attachmentsByMessage.get(message.provider_message_id) ?? []).map((attachment) => ({
      empresa_id: account.empresa_id,
      user_id: account.user_id,
      email_message_id: message.id,
      filename: attachment.filename,
      mime_type: attachment.mime_type ?? null,
      size_bytes: attachment.size_bytes ?? null,
      provider_attachment_id: attachment.provider_attachment_id ?? null,
      document_type: classifyAttachment(attachment.filename, attachment.mime_type),
    }))
  );

  if (attachmentRows.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("email_attachments").upsert(attachmentRows);
  }

  return data ?? [];
}

export async function syncGmailMessages(
  supabase: SupabaseClient,
  account: EmailAccount,
  accessToken: string,
  folder: "inbox" | "sent" = "inbox",
  maxPages = 5,
) {
  const now = new Date().toISOString();
  const isFullSync = !account.last_history_id;

  if (isFullSync) {
    // ── Full sync: paginated list ──────────────────────────────────────
    const query = folder === "sent" ? "in:sent newer_than:90d" : "in:inbox newer_than:90d";
    let nextPageToken: string | undefined;
    const allIds: string[] = [];
    let pagesFetched = 0;

    do {
      let url = `/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100`;
      if (nextPageToken) url += `&pageToken=${nextPageToken}`;

      const list = await gmailFetch<{ messages?: Array<{ id: string }>; nextPageToken?: string }>(url, accessToken);
      const ids = list.messages?.map((m) => m.id) ?? [];
      allIds.push(...ids);
      nextPageToken = list.nextPageToken;
      pagesFetched++;

      if (allIds.length >= 500) break;
    } while (nextPageToken && pagesFetched < maxPages);

    if (allIds.length === 0) {
      const newHistoryId = await getGmailHistoryId(accessToken);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("email_accounts").update({
        status: "connected", last_sync_at: now, last_error: null,
        last_history_id: newHistoryId,
      }).eq("id", account.id);
      return { synced: 0 };
    }

    const data = await fetchAndUpsertMessages(supabase, account, accessToken, allIds);

    const newHistoryId = await getGmailHistoryId(accessToken);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("email_accounts").update({
      status: "connected", last_sync_at: now, last_error: null,
      last_history_id: newHistoryId,
    }).eq("id", account.id);

    return { synced: data?.length ?? 0, messages: data ?? [] };
  }

  // ── Incremental sync via History API ─────────────────────────────────
  try {
    const historyUrl = `/users/me/history?startHistoryId=${account.last_history_id}&historyTypes=messageAdded&maxResults=100`;
    let nextPageToken: string | undefined;
    const allIds: string[] = [];
    let pagesFetched = 0;

    do {
      let url = historyUrl;
      if (nextPageToken) url += `&pageToken=${nextPageToken}`;

      const history = await gmailFetch<{
        history?: Array<{ messagesAdded?: Array<{ message: { id: string } }> }>;
        nextPageToken?: string;
      }>(url, accessToken);

      if (history.history) {
        for (const entry of history.history) {
          if (entry.messagesAdded) {
            for (const ma of entry.messagesAdded) {
              allIds.push(ma.message.id);
            }
          }
        }
      }

      nextPageToken = history.nextPageToken;
      pagesFetched++;
      if (allIds.length >= 500) break;
    } while (nextPageToken && pagesFetched < maxPages);

    if (allIds.length > 0) {
      const data = await fetchAndUpsertMessages(supabase, account, accessToken, allIds);
      const newHistoryId = await getGmailHistoryId(accessToken);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("email_accounts").update({
        status: "connected", last_sync_at: now, last_error: null,
        last_history_id: newHistoryId,
      }).eq("id", account.id);
      return { synced: data?.length ?? 0, messages: data ?? [] };
    }

    // No new messages, just update timestamps
    const newHistoryId = await getGmailHistoryId(accessToken);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("email_accounts").update({
      status: "connected", last_sync_at: now, last_error: null,
      last_history_id: newHistoryId,
    }).eq("id", account.id);
    return { synced: 0 };
  } catch {
    // History API fallback: use date-based query
    const since = account.last_sync_at
      ? new Date(new Date(account.last_sync_at).getTime() - 86400000).toISOString().split("T")[0]
      : new Date(Date.now() - 86400000 * 7).toISOString().split("T")[0];
    const query = `${folder === "sent" ? "in:sent" : "in:inbox"} after:${since}`;

    let nextPageToken: string | undefined;
    const allIds: string[] = [];
    let pagesFetched = 0;

    do {
      let url = `/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100`;
      if (nextPageToken) url += `&pageToken=${nextPageToken}`;

      const list = await gmailFetch<{ messages?: Array<{ id: string }>; nextPageToken?: string }>(url, accessToken);
      const ids = list.messages?.map((m) => m.id) ?? [];
      allIds.push(...ids);
      nextPageToken = list.nextPageToken;
      pagesFetched++;
      if (allIds.length >= 500) break;
    } while (nextPageToken && pagesFetched < maxPages);

    if (allIds.length === 0) {
      const newHistoryId = await getGmailHistoryId(accessToken);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("email_accounts").update({
        status: "connected", last_sync_at: now, last_error: null,
        last_history_id: newHistoryId,
      }).eq("id", account.id);
      return { synced: 0 };
    }

    const data = await fetchAndUpsertMessages(supabase, account, accessToken, allIds);
    const newHistoryId = await getGmailHistoryId(accessToken);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("email_accounts").update({
      status: "connected", last_sync_at: now, last_error: null,
      last_history_id: newHistoryId,
    }).eq("id", account.id);

    return { synced: data?.length ?? 0, messages: data ?? [] };
  }
}

export async function modifyGmailMessage(
  accessToken: string,
  providerMessageId: string,
  action: "read" | "unread" | "archive",
) {
  const body =
    action === "read"
      ? { removeLabelIds: ["UNREAD"] }
      : action === "unread"
        ? { addLabelIds: ["UNREAD"] }
        : { removeLabelIds: ["INBOX"] };

  return gmailFetch(`/users/me/messages/${providerMessageId}/modify`, accessToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function sendGmailMessage(accessToken: string, params: {
  from: string;
  to: string;
  cc?: string;
  subject: string;
  bodyText: string;
}) {
  const lines = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    params.cc ? `Cc: ${params.cc}` : "",
    `Subject: ${params.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    params.bodyText,
  ].filter(Boolean);
  const raw = Buffer.from(lines.join("\r\n"), "utf8").toString("base64url");
  return gmailFetch<{ id: string; threadId: string }>("/users/me/messages/send", accessToken, {
    method: "POST",
    body: JSON.stringify({ raw }),
  });
}
