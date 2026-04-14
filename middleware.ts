import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Definir rutas públicas y estáticas
  const isPublicPage = pathname === "/login" || pathname === "/recuperar";
  
  // 2. Verificar sesión (Supabase suele usar este patrón de cookies)
  const allCookies = request.cookies.getAll();
  const hasSupabaseCookie = allCookies.some(
    (c) => c.name.includes("auth-token") && c.value.length > 0
  );

  // 3. LÓGICA DE REDIRECCIÓN

  // CASO A: Si NO está autenticado y NO está en una página pública -> Ir a Login
  if (!hasSupabaseCookie && !isPublicPage) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // CASO B: Si YA está autenticado e intenta ir al Login -> Ir al Dashboard
  if (hasSupabaseCookie && isPublicPage) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Si todo está bien, continuar
  return NextResponse.next();
}

export const config = {
  // Este matcher excluye archivos estáticos para que el middleware no corra en cada imagen o CSS
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};