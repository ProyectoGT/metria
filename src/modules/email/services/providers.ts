import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmailAccount } from "./gmail";
import {
  getValidAccessToken,
  modifyGmailMessage,
  sendGmailMessage,
  syncGmailMessages,
} from "./gmail";

export type EmailProvider = "gmail" | "outlook";

export type EmailProviderAdapter = {
  provider: EmailProvider;
  getValidAccessToken(supabase: SupabaseClient, account: EmailAccount): Promise<string | null>;
  syncMessages(supabase: SupabaseClient, account: EmailAccount, token: string): Promise<{ synced: number; messages?: unknown[] }>;
  modifyMessage(token: string, providerMessageId: string, action: "read" | "unread" | "archive"): Promise<unknown>;
  sendMessage(token: string, params: { from: string; to: string; cc?: string; subject: string; bodyText: string }): Promise<{ id: string; threadId: string }>;
};

const gmailAdapter: EmailProviderAdapter = {
  provider: "gmail",
  getValidAccessToken,
  async syncMessages(supabase, account, token) {
    const [inbox, sent] = await Promise.all([
      syncGmailMessages(supabase, account, token, "inbox"),
      syncGmailMessages(supabase, account, token, "sent"),
    ]);
    return { synced: inbox.synced + sent.synced, messages: [...(inbox.messages ?? []), ...(sent.messages ?? [])] };
  },
  modifyMessage: modifyGmailMessage,
  sendMessage: sendGmailMessage,
};

export function getEmailProviderAdapter(provider: EmailProvider): EmailProviderAdapter {
  if (provider === "gmail") return gmailAdapter;
  throw new Error("email_provider_not_implemented");
}
