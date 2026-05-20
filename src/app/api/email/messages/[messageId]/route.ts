import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/current-user";
import { createClient } from "@/lib/supabase";
import { applyMessageAction, getMessage, getThread, type EmailAction } from "@/modules/email/services/email-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { messageId } = await params;
  const supabase = await createClient();
  try {
    const [message, thread] = await Promise.all([
      getMessage(supabase, currentUser, Number(messageId)),
      getThread(supabase, currentUser, Number(messageId)),
    ]);
    return NextResponse.json({ message, thread });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { action } = await request.json();
  const supportedActions: EmailAction[] = ["read", "unread", "archive", "restore", "trash", "spam", "star", "unstar", "important", "unimportant"];
  if (!supportedActions.includes(action)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const { messageId } = await params;
  const supabase = await createClient();
  try {
    return NextResponse.json(await applyMessageAction(supabase, currentUser, Number(messageId), action));
  } catch (error) {
    const message = error instanceof Error ? error.message : "action_failed";
    const status = message === "reauth_required" ? 401 : message === "message_not_found" ? 404 : 500;
    return NextResponse.json({ error: message, message }, { status });
  }
}
