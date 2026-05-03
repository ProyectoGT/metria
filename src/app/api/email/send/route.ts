import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/current-user";
import { createClient } from "@/lib/supabase";
import { getValidAccessToken, sendGmailMessage, type EmailAccount } from "@/lib/email/gmail";
import { linkEmailMessageToEntities } from "@/lib/email/linking";

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await request.json();
  const to = String(body.to ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const bodyText = String(body.bodyText ?? "").trim();

  if (!to || !subject || !bodyText) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account } = await (supabase as any)
    .from("email_accounts")
    .select("*")
    .eq("user_id", currentUser.id)
    .eq("provider", "gmail")
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!account) return NextResponse.json({ error: "gmail_not_connected" }, { status: 401 });
  const token = await getValidAccessToken(supabase, account as EmailAccount);
  if (!token) return NextResponse.json({ error: "reauth_required" }, { status: 401 });

  const sent = await sendGmailMessage(token, {
    from: account.email,
    to,
    subject,
    bodyText,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: saved, error } = await (supabase as any)
    .from("email_messages")
    .insert({
      empresa_id: currentUser.empresaId,
      user_id: currentUser.id,
      account_id: account.id,
      provider: "gmail",
      provider_message_id: sent.id,
      provider_thread_id: sent.threadId,
      from_email: account.email,
      to_emails: [{ email: to, name: null }],
      subject,
      snippet: bodyText.slice(0, 240),
      body_text: bodyText,
      sent_at: new Date().toISOString(),
      is_read: true,
      direction: "outbound",
      folder: "sent",
      raw_metadata: { source: "crm" },
    })
    .select("id, empresa_id, subject, body_text, snippet, from_email")
    .single();

  if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });

  if (body.entityType && body.entityId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("email_entity_links").insert({
      empresa_id: currentUser.empresaId,
      email_message_id: saved.id,
      entity_type: body.entityType,
      entity_id: Number(body.entityId),
      confidence_score: 1,
      linked_by: "user",
    });
  } else {
    await linkEmailMessageToEntities(supabase, saved);
  }

  return NextResponse.json({ ok: true, messageId: saved.id });
}
