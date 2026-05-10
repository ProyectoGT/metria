import { NextRequest, NextResponse } from "next/server";
import { locales, localeCookieName } from "@/lib/i18n/config";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { locale } = body as { locale?: string };

  if (!locale || !(locales as readonly string[]).includes(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(localeCookieName, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });
  return res;
}
