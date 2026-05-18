import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/current-user";
import { createClient } from "@/lib/supabase";

const PAGE_SIZE_MAX = 100;
const FOLDERS = new Set(["priority", "inbox", "sent", "archive", "trash", "spam", "starred", "important", "unread", "attachments", "personal"]);

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const folder = FOLDERS.has(searchParams.get("folder") ?? "") ? searchParams.get("folder")! : "priority";
  const q = searchParams.get("q")?.trim() ?? "";
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 50), 1), PAGE_SIZE_MAX);

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("email_messages")
    .select("id,account_id,provider_thread_id,from_email,from_name,to_emails,cc_emails,subject,snippet,received_at,sent_at,is_read,has_attachments,direction,folder,commercial_priority,commercial_bucket,intent,urgency,needs_response,response_due_at,responded_at,portal_source,raw_metadata,body_html", { count: "exact" })
    .eq("user_id", currentUser.id)
    .order("commercial_priority", { ascending: false })
    .order("received_at", { ascending: false, nullsFirst: false })
    .order("sent_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (folder === "priority") query = query.neq("commercial_bucket", "personal").not("folder", "in", "(trash,spam)");
  else if (folder === "starred") query = query.contains("raw_metadata", { isStarred: true });
  else if (folder === "important") query = query.contains("raw_metadata", { isImportant: true });
  else if (folder === "unread") query = query.eq("is_read", false).not("folder", "in", "(trash,spam)");
  else if (folder === "attachments") query = query.eq("has_attachments", true);
  else if (folder === "personal") query = query.eq("commercial_bucket", "personal");
  else query = query.eq("folder", folder);

  if (q) {
    query = query.or(`subject.ilike.%${q}%,snippet.ilike.%${q}%,from_email.ilike.%${q}%,from_name.ilike.%${q}%`);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: "messages_query_failed", message: error.message }, { status: 500 });

  return NextResponse.json({
    messages: data ?? [],
    nextOffset: count !== null && offset + limit < count ? offset + limit : null,
    total: count ?? null,
  });
}
