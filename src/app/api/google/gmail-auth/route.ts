import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/current-user";
import { canViewIdealistaLeads } from "@/lib/roles";

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUserContext();
  if (!currentUser || !canViewIdealistaLeads(currentUser.role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/google/gmail-callback`;

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/gmail.readonly");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");

  return NextResponse.redirect(url.toString());
}
