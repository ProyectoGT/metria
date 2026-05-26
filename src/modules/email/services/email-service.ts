import type { SupabaseClient } from "@supabase/supabase-js";
import type { CurrentUserContext } from "@/lib/current-user";
import { buildGmailReply, type EmailAccount } from "./gmail";
import { linkEmailMessageToEntities } from "./linking";
import { getEmailProviderAdapter } from "./providers";

export type EmailAction =
  | "read"
  | "unread"
  | "archive"
  | "restore"
  | "trash"
  | "spam"
  | "star"
  | "unstar"
  | "important"
  | "unimportant";

export type SendMode = "new" | "reply" | "replyAll" | "forward";

type Mailbox = { email: string; name: string | null };
type StoredMessage = {
  id: number;
  account_id: number;
  provider_message_id: string;
  provider_thread_id: string | null;
  folder: string;
  from_email: string | null;
  from_name: string | null;
  to_emails: Mailbox[];
  cc_emails?: Mailbox[];
  subject: string | null;
  body_text: string | null;
  needs_response?: boolean;
  raw_metadata?: { messageIdHeader?: string | null; references?: string | null };
};

function parseRecipients(value: string) {
  return value
    .split(/[;,]/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function mailboxRows(value: string): Mailbox[] {
  return parseRecipients(value).map((email) => ({ email, name: null }));
}

function actionPatch(action: EmailAction) {
  if (action === "read") return { is_read: true };
  if (action === "unread") return { is_read: false };
  if (action === "archive") return { folder: "archive", archived_at: null };
  if (action === "restore") return { folder: "inbox", archived_at: null };
  if (action === "trash") return { folder: "trash", archived_at: null };
  if (action === "spam") return { folder: "spam", archived_at: null };
  if (action === "star") return { raw_metadata: { isStarred: true } };
  if (action === "unstar") return { raw_metadata: { isStarred: false } };
  if (action === "important") return { raw_metadata: { isImportant: true } };
  return { raw_metadata: { isImportant: false } };
}

async function getAccountForMessage(supabase: SupabaseClient, userId: number, messageId: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: message } = await (supabase as any)
    .from("email_messages")
    .select("*, email_accounts(*)")
    .eq("id", messageId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!message) throw new Error("message_not_found");
  const account = message.email_accounts as EmailAccount | null;
  if (!account) throw new Error("account_not_found");
  return { message, account };
}

async function getConnectedAccount(supabase: SupabaseClient, currentUser: CurrentUserContext) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account } = await (supabase as any)
    .from("email_accounts")
    .select("*")
    .eq("user_id", currentUser.id)
    .eq("provider", "gmail")
    .in("status", ["connected", "sync_error"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!account) throw new Error("gmail_not_connected");
  return account as EmailAccount;
}

async function tokenForAccount(supabase: SupabaseClient, account: EmailAccount) {
  const adapter = getEmailProviderAdapter(account.provider);
  const token = await adapter.getValidAccessToken(supabase, account);
  if (!token) throw new Error("reauth_required");
  return { adapter, token };
}

export async function getMessage(supabase: SupabaseClient, currentUser: CurrentUserContext, messageId: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: message } = await (supabase as any)
    .from("email_messages")
    .select("*, email_attachments(*)")
    .eq("id", messageId)
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (!message) throw new Error("message_not_found");
  return message;
}

export async function getThread(supabase: SupabaseClient, currentUser: CurrentUserContext, messageId: number) {
  const message = await getMessage(supabase, currentUser, messageId);
  if (!message.provider_thread_id) return [message];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("email_messages")
    .select("id,from_email,from_name,to_emails,cc_emails,subject,snippet,body_text,body_html,received_at,sent_at,direction,is_read,has_attachments,raw_metadata")
    .eq("user_id", currentUser.id)
    .eq("account_id", message.account_id)
    .eq("provider_thread_id", message.provider_thread_id)
    .order("received_at", { ascending: true, nullsFirst: false })
    .order("sent_at", { ascending: true, nullsFirst: false });

  return data ?? [message];
}

export async function applyMessageAction(
  supabase: SupabaseClient,
  currentUser: CurrentUserContext,
  messageId: number,
  action: EmailAction,
) {
  const { message, account } = await getAccountForMessage(supabase, currentUser.id, messageId);
  const { adapter, token } = await tokenForAccount(supabase, account);
  const providerAction = action === "restore" && message.folder === "trash" ? "untrash" : action;
  await adapter.modifyMessage(token, message.provider_message_id, providerAction);

  const patch = actionPatch(action);
  const rawMetadataPatch = "raw_metadata" in patch
    ? { raw_metadata: { ...(message.raw_metadata ?? {}), ...patch.raw_metadata } }
    : patch;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("email_messages").update(rawMetadataPatch).eq("id", messageId);
  if (error) throw error;
  return { ok: true };
}

export async function sendMessage(
  supabase: SupabaseClient,
  currentUser: CurrentUserContext,
  params: {
    mode: SendMode;
    sourceMessageId?: number;
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    bodyText: string;
    entityType?: string;
    entityId?: number;
  },
) {
  const account = params.sourceMessageId
    ? (await getAccountForMessage(supabase, currentUser.id, params.sourceMessageId)).account
    : await getConnectedAccount(supabase, currentUser);
  const { adapter, token } = await tokenForAccount(supabase, account);

  let sendParams = {
    from: account.email,
    to: params.to,
    cc: params.cc,
    bcc: params.bcc,
    subject: params.subject,
    bodyText: params.bodyText,
    threadId: null as string | null,
    inReplyTo: null as string | null,
    references: null as string | null,
  };

  let sourceMessage: StoredMessage | null = null;
  if (params.sourceMessageId) {
    sourceMessage = await getMessage(supabase, currentUser, params.sourceMessageId);
    if (!sourceMessage) throw new Error("message_not_found");
    sendParams = {
      from: account.email,
      ...buildGmailReply({
        accountEmail: account.email,
        message: sourceMessage,
        mode: params.mode === "new" ? "reply" : params.mode,
        bodyText: params.bodyText,
        to: params.to,
        cc: params.cc,
        bcc: params.bcc,
        originalText: sourceMessage.body_text,
      }),
    };
  }

  const sent = await adapter.sendMessage(token, sendParams);
  const subject = sendParams.subject;
  const toRows = mailboxRows(sendParams.to);
  const ccRows = mailboxRows(sendParams.cc ?? "");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: saved, error } = await (supabase as any)
    .from("email_messages")
    .upsert({
      empresa_id: currentUser.empresaId,
      user_id: currentUser.id,
      account_id: account.id,
      provider: account.provider,
      provider_message_id: sent.id,
      provider_thread_id: sent.threadId,
      from_email: account.email,
      to_emails: toRows,
      cc_emails: ccRows,
      subject,
      snippet: params.bodyText.slice(0, 240),
      body_text: params.bodyText,
      sent_at: new Date().toISOString(),
      is_read: true,
      direction: "outbound",
      folder: "sent",
      raw_metadata: { source: "crm", mode: params.mode, sourceMessageId: params.sourceMessageId ?? null },
    }, { onConflict: "account_id,provider_message_id" })
    .select("id, empresa_id, subject, body_text, snippet, from_email")
    .single();

  if (error) throw error;

  if (params.entityType && params.entityId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("email_entity_links").upsert({
      empresa_id: currentUser.empresaId,
      email_message_id: saved.id,
      entity_type: params.entityType,
      entity_id: params.entityId,
      confidence_score: 1,
      linked_by: "user",
    }, { onConflict: "email_message_id,entity_type,entity_id" });
  } else {
    await linkEmailMessageToEntities(supabase, saved);
  }

  if (sourceMessage?.needs_response) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("email_messages")
      .update({ responded_at: new Date().toISOString(), needs_response: false })
      .eq("id", sourceMessage.id);
  }

  return { ok: true, messageId: saved.id };
}

export async function downloadAttachment(
  supabase: SupabaseClient,
  currentUser: CurrentUserContext,
  attachmentId: number,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: attachment } = await (supabase as any)
    .from("email_attachments")
    .select("id,filename,mime_type,provider_attachment_id,email_messages!inner(id,user_id,account_id,provider_message_id,email_accounts(*))")
    .eq("id", attachmentId)
    .eq("email_messages.user_id", currentUser.id)
    .maybeSingle();

  if (!attachment) throw new Error("attachment_not_found");
  if (!attachment.provider_attachment_id) throw new Error("attachment_not_downloadable");

  const message = attachment.email_messages;
  const account = message.email_accounts as EmailAccount;
  const { adapter, token } = await tokenForAccount(supabase, account);
  const buffer = await adapter.downloadAttachment(token, message.provider_message_id, attachment.provider_attachment_id);

  return {
    buffer,
    filename: attachment.filename as string,
    mimeType: attachment.mime_type as string | null,
  };
}
