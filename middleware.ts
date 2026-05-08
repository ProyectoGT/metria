import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPage =
    pathname === "/login" ||
    pathname === "/recuperar" ||
    pathname.startsWith("/auth/");

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 1. Fast local session check — lee cookie JWT, sin llamada HTTP
  const { data: { session } } = await supabase.auth.getSession();
  const hasSession = !!session;

  // 2. Intentar refresh/verificación con getUser, pero no bloquear si falla
  let isAuthenticated = hasSession;

  if (hasSession) {
    const { error: verifyError } = await supabase.auth.getUser();
    if (verifyError) {
      console.error("[middleware] getUser verification error (session exists, continuing):", verifyError.message);
    }
  } else {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    isAuthenticated = !!user;

    if (authError && !isAuthenticated && !isPublicPage) {
      const loginUrl = new URL("/login", request.url);
      const redirectResponse = NextResponse.redirect(loginUrl);
      request.cookies.getAll().forEach(({ name }) => {
        if (name.startsWith("sb-")) {
          redirectResponse.cookies.delete(name);
        }
      });
      return redirectResponse;
    }
  }

  // Sin-acceso es accesible siempre: AppShell redirige aqui si falta perfil,
  // y la pagina de error debe verse sin importar el estado de sesion.
  if (pathname === "/sin-acceso") {
    return response;
  }

  if (!isAuthenticated && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthenticated && isPublicPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
