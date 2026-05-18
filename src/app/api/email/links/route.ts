import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/current-user";
import { createClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await request.json();
  const messageId = Number(body.messageId);
  const entityId = Number(body.entityId);
  const entityType = String(body.entityType ?? "");

  if (!messageId || !entityId || !["contacto", "pedido", "propiedad", "tarea", "lead"].includes(entityType)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: message } = await (supabase as any)
    .from("email_messages")
    .select("id")
    .eq("id", messageId)
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (!message) return NextResponse.json({ error: "message_not_found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("email_entity_links")
    .upsert({
      empresa_id: currentUser.empresaId,
      email_message_id: messageId,
      entity_type: entityType,
      entity_id: entityId,
      confidence_score: 1,
      linked_by: "user",
    }, { onConflict: "email_message_id,entity_type,entity_id" });

  if (error) return NextResponse.json({ error: "link_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await request.json();
  const linkId = Number(body.linkId);
  if (!linkId) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: link } = await (supabase as any)
    .from("email_entity_links")
    .select("id,email_messages!inner(user_id)")
    .eq("id", linkId)
    .eq("email_messages.user_id", currentUser.id)
    .maybeSingle();

  if (!link) return NextResponse.json({ error: "link_not_found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("email_entity_links").delete().eq("id", linkId);
  if (error) return NextResponse.json({ error: "unlink_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
