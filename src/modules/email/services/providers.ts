import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmailAccount } from "./gmail";
import {
  getValidAccessToken,
  downloadGmailAttachment,
  modifyGmailMessage,
  sendGmailMessage,
  syncGmailMessages,
} from "./gmail";

export type EmailProvider = "gmail" | "outlook";

export type EmailProviderAdapter = {
  provider: EmailProvider;
  getValidAccessToken(supabase: SupabaseClient, account: EmailAccount): Promise<string | null>;
  syncMessages(supabase: SupabaseClient, account: EmailAccount, token: string, options?: { mode?: "auto" | "full" | "incremental" }): Promise<{ synced: number; messages?: unknown[]; isFullSync?: boolean; pagesFetched?: number }>;
  modifyMessage(token: string, providerMessageId: string, action: "read" | "unread" | "archive" | "restore" | "untrash" | "trash" | "spam" | "star" | "unstar" | "important" | "unimportant"): Promise<unknown>;
  sendMessage(token: string, params: { from: string; to: string; cc?: string; bcc?: string; subject: string; bodyText: string; threadId?: string | null; inReplyTo?: string | null; references?: string | null }): Promise<{ id: string; threadId: string }>;
  downloadAttachment(token: string, providerMessageId: string, providerAttachmentId: string): Promise<Buffer>;
};

const gmailAdapter: EmailProviderAdapter = {
  provider: "gmail",
  getValidAccessToken,
  async syncMessages(supabase, account, token, options) {
    return syncGmailMessages(supabase, account, token, options);
  },
  modifyMessage: modifyGmailMessage,
  sendMessage: sendGmailMessage,
  downloadAttachment: downloadGmailAttachment,
};

export function getEmailProviderAdapter(provider: EmailProvider): EmailProviderAdapter {
  if (provider === "gmail") return gmailAdapter;
  throw new Error("email_provider_not_implemented");
}
