import { NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/current-user";
import { createClient } from "@/lib/supabase";

export async function POST() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("email_accounts")
    .update({
      status: "disconnected",
      access_token_encrypted: null,
      refresh_token_encrypted: null,
      token_expires_at: null,
      last_error: null,
    })
    .eq("user_id", currentUser.id)
    .eq("provider", "gmail");

  if (error) return NextResponse.json({ error: "disconnect_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
