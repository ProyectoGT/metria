import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/current-user";
import { createClient } from "@/lib/supabase";

const ENTITY_TYPES = new Set(["contacto", "pedido", "propiedad"]);

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const entityType = request.nextUrl.searchParams.get("entityType") ?? "";
  const entityId = Number(request.nextUrl.searchParams.get("entityId"));
  if (!ENTITY_TYPES.has(entityType) || !entityId) {
    return NextResponse.json({ messages: [] });
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: links } = await (supabase as any)
    .from("email_entity_links")
    .select("email_message_id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);

  const ids = (links ?? []).map((link: { email_message_id: number }) => link.email_message_id);
  if (ids.length === 0) return NextResponse.json({ messages: [] });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: messages } = await (supabase as any)
    .from("email_messages")
    .select("id,subject,from_email,from_name,to_emails,snippet,body_text,received_at,sent_at,direction,is_read,urgency,intent")
    .in("id", ids)
    .eq("user_id", currentUser.id)
    .order("received_at", { ascending: false, nullsFirst: false })
    .order("sent_at", { ascending: false, nullsFirst: false });

  return NextResponse.json({ messages: messages ?? [] });
}
