import { NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/current-user";
import { createClient } from "@/lib/supabase";
import { type EmailAccount } from "@/modules/email/services/gmail";
import { linkEmailMessageToEntities } from "@/modules/email/services/linking";
import { createClientNoReplyAlerts, enrichCommercialEmail } from "@/modules/email/services/commercial";
import { getEmailProviderAdapter } from "@/modules/email/services/providers";

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 500);
  if (error && typeof error === "object") {
    const value = error as { message?: unknown; details?: unknown; code?: unknown };
    return [value.message, value.details, value.code].filter(Boolean).join(" | ").slice(0, 500) || "sync_failed";
  }
  return "sync_failed";
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account, error: accountError } = await (supabase as any)
    .from("email_accounts")
    .select("*")
    .eq("user_id", currentUser.id)
    .eq("provider", "gmail")
    .in("status", ["connected", "sync_error"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (accountError || !account) {
    return NextResponse.json({ error: "gmail_not_connected" }, { status: 401 });
  }

  try {
    if (!("full_sync_completed_at" in account) || !("sync_cursor" in account)) {
      return NextResponse.json({
        error: "database_migration_required",
        message: "Falta aplicar la migracion 20260518000001_email_enterprise_sync.sql en Supabase.",
      }, { status: 409 });
    }

    const adapter = getEmailProviderAdapter(account.provider);
    const token = await adapter.getValidAccessToken(supabase, account as EmailAccount);
    if (!token) return NextResponse.json({ error: "reauth_required" }, { status: 401 });

    const lastHistoryId = account.last_history_id as string | null;
    const isFullSync = !lastHistoryId;

    const body = await request.json().catch(() => ({}));
    const mode = body?.mode === "full" || body?.mode === "incremental" ? body.mode : "auto";
    const synced = await adapter.syncMessages(supabase, account as EmailAccount, token, { mode });
    const messages = (synced.messages ?? []) as Array<{
      id: number;
      empresa_id: number | null;
      user_id: number;
      subject?: string | null;
      from_email?: string | null;
      from_name?: string | null;
      body_text?: string | null;
      snippet?: string | null;
      direction?: "inbound" | "outbound";
      is_read?: boolean;
      has_attachments?: boolean;
      received_at?: string | null;
    }>;

    let linked = 0;
    for (const message of messages) {
      const result = await linkEmailMessageToEntities(supabase, message);
      linked += result.linked;
      await enrichCommercialEmail(supabase, message);
    }
    await createClientNoReplyAlerts(supabase, currentUser.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedAccount } = await (supabase as any)
      .from("email_accounts")
      .select("last_sync_at, last_history_id")
      .eq("id", account.id)
      .single();

    return NextResponse.json({
      synced: synced.synced,
      linked,
      isFullSync: synced.isFullSync ?? isFullSync,
      pagesFetched: synced.pagesFetched ?? null,
      lastSyncAt: updatedAccount?.last_sync_at ?? null,
      lastHistoryId: updatedAccount?.last_history_id ?? null,
      syncedMessages: messages.map((m) => ({ id: m.id, subject: m.subject, direction: m.direction })),
    });
  } catch (error) {
    const message = errorMessage(error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("email_accounts")
      .update({
        status: "sync_error",
        last_error: message,
      })
      .eq("id", account.id);

    return NextResponse.json({ error: "sync_failed", message }, { status: 500 });
  }
}
