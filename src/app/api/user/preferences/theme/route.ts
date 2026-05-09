import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/current-user";
import { createClient } from "@/lib/supabase";

const THEMES = new Set(["light", "dark", "dark-black"]);

export async function GET() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return NextResponse.json({ theme: null }, { status: 401 });

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("user_preferences")
    .select("theme")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  return NextResponse.json({ theme: data?.theme ?? null });
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { theme } = await request.json();
  if (!THEMES.has(theme)) return NextResponse.json({ error: "invalid_theme" }, { status: 400 });

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("user_preferences")
    .upsert({
      empresa_id: currentUser.empresaId,
      user_id: currentUser.id,
      theme,
    }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set("metria-theme", theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}
