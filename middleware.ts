import { NextResponse, type NextRequest } from "next/server";

// Check session by reading the Supabase auth cookie directly.
// This avoids any Node.js API usage and is fully Edge Runtime compatible.
function hasSession(request: NextRequest): boolean {
  const cookies = request.cookies;
  // Supabase stores the session in chunked cookies: sb-<ref>-auth-token, sb-<ref>-auth-token.0, etc.
  return cookies.getAll().some(
    (c) =>
      c.name.startsWith("sb-") &&
      c.name.includes("-auth-token") &&
      c.value.length > 0
  );
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicPage = pathname === "/login" || pathname === "/recuperar";
  const authenticated = hasSession(request);

  if (!authenticated && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (authenticated && isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
