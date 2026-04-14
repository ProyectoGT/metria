import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${origin}/calendario?error=access_denied`);
  }

  const redirectUri = `${origin}/api/google/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokens.access_token) {
    return NextResponse.redirect(`${origin}/calendario?error=token_failed`);
  }

  const response = NextResponse.redirect(`${origin}/calendario`);

  response.cookies.set("google_access_token", tokens.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: tokens.expires_in ?? 3600,
    path: "/",
    sameSite: "lax",
  });

  if (tokens.refresh_token) {
    response.cookies.set("google_refresh_token", tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}
