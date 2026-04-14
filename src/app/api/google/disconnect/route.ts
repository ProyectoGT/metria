import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const response = NextResponse.redirect(`${origin}/calendario`);
  response.cookies.delete("google_access_token");
  response.cookies.delete("google_refresh_token");
  return response;
}
