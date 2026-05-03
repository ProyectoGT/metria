import { NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/current-user";
import { createClient } from "@/lib/supabase";
import { getValidAccessToken, syncGmailMessages, type EmailAccount } from "@/lib/email/gmail";
import { linkEmailMessageToEntities } from "@/lib/email/linking";

export async function POST() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account, error: accountError } = await (supabase as any)
    .from("email_accounts")
    .select("*")
    .eq("user_id", currentUser.id)
    .eq("provider", "gmail")
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (accountError || !account) {
    return NextResponse.json({ error: "gmail_not_connected" }, { status: 401 });
  }

  try {
    const token = await getValidAccessToken(supabase, account as EmailAccount);
    if (!token) return NextResponse.json({ error: "reauth_required" }, { status: 401 });

    const inbox = await syncGmailMessages(supabase, account as EmailAccount, token, "inbox", 30);
    const sent = await syncGmailMessages(supabase, account as EmailAccount, token, "sent", 20);
    const messages = [...(inbox.messages ?? []), ...(sent.messages ?? [])];

    let linked = 0;
    for (const message of messages) {
      const result = await linkEmailMessageToEntities(supabase, message);
      linked += result.linked;
    }

    return NextResponse.json({ synced: inbox.synced + sent.synced, linked });
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("email_accounts")
      .update({
        status: "sync_error",
        last_error: error instanceof Error ? error.message.slice(0, 240) : "sync_failed",
      })
      .eq("id", account.id);

    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }
}
