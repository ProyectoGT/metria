import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/current-user";
import { createClient } from "@/lib/supabase";
import { sendMessage, type SendMode } from "@/modules/email/services/email-service";

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await request.json();
  const mode = ["new", "reply", "replyAll", "forward"].includes(body.mode) ? body.mode as SendMode : "new";
  const to = String(body.to ?? "").trim();
  const cc = String(body.cc ?? "").trim();
  const bcc = String(body.bcc ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const bodyText = String(body.bodyText ?? "").trim();

  if (!to || !subject || !bodyText) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    const result = await sendMessage(supabase, currentUser, {
      mode,
      sourceMessageId: body.sourceMessageId ? Number(body.sourceMessageId) : undefined,
      to,
      cc,
      bcc,
      subject,
      bodyText,
      entityType: body.entityType ? String(body.entityType) : undefined,
      entityId: body.entityId ? Number(body.entityId) : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "send_failed";
    const status = message === "reauth_required" || message === "gmail_not_connected" ? 401 : 500;
    return NextResponse.json({ error: message, message }, { status });
  }
}
