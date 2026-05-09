import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/current-user";
import { createClient } from "@/lib/supabase";
import { type EmailAccount } from "@/modules/email/services/gmail";
import { getEmailProviderAdapter } from "@/modules/email/services/providers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { messageId } = await params;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: message } = await (supabase as any)
    .from("email_messages")
    .select("id,body_text,body_html")
    .eq("id", Number(messageId))
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (!message) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ message });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { action } = await request.json();
  if (!["read", "unread", "archive"].includes(action)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const { messageId } = await params;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: message } = await (supabase as any)
    .from("email_messages")
    .select("id, account_id, provider_message_id")
    .eq("id", Number(messageId))
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (!message) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account } = await (supabase as any)
    .from("email_accounts")
    .select("*")
    .eq("id", message.account_id)
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (!account) return NextResponse.json({ error: "account_not_found" }, { status: 404 });

  const adapter = getEmailProviderAdapter(account.provider);
  const token = await adapter.getValidAccessToken(supabase, account as EmailAccount);
  if (!token) return NextResponse.json({ error: "reauth_required" }, { status: 401 });

  await adapter.modifyMessage(token, message.provider_message_id, action);

  const patch =
    action === "read" ? { is_read: true }
      : action === "unread" ? { is_read: false }
        : { folder: "archive", archived_at: new Date().toISOString() };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("email_messages").update(patch).eq("id", message.id);
  return NextResponse.json({ ok: true });
}
