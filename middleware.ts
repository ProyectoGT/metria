import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const start = Date.now();
  const { pathname } = request.nextUrl;

  const isApiRoute = pathname.startsWith("/api/");

  // OAuth callbacks y rutas de infraestructura que el navegador o servicios
  // externos invocan sin sesión Supabase activa. Cortocircuitamos aquí para
  // evitar la llamada de red a Supabase.auth.getUser en estas rutas.
  const isPublicApiRoute =
    pathname.startsWith("/api/google/callback") ||
    pathname.startsWith("/api/google/gmail-callback") ||
    pathname.startsWith("/api/email/gmail/callback") ||
    pathname === "/api/observability/log" ||
    pathname === "/api/set-locale" ||
    pathname === "/api/jobs/process";

  if (isPublicApiRoute) {
    return NextResponse.next();
  }

  // Páginas de login: unauthenticated puede acceder, pero un usuario con sesión
  // activa es redirigido a /dashboard.
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/recuperar" ||
    pathname.startsWith("/auth/");

  // Páginas accesibles para cualquier estado de sesión. No aplica la regla
  // "autenticado en página pública → dashboard": un usuario con sesión puede
  // llegar aquí legítimamente (/sin-acceso desde app-shell, /nueva-contrasena
  // tras callback de reset de contraseña).
  const isAlwaysAllowedPage =
    pathname === "/sin-acceso" ||
    pathname === "/nueva-contrasena" ||
    pathname === "/offline";

  const isPublicPage = isAuthPage || isAlwaysAllowedPage;

  // Crear respuesta mutable para que Supabase pueda refrescar la cookie si hace falta
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

  // Obtener usuario real (refresca el token si es necesario)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const isAuthenticated = !!user;

  // Token caducado o inválido en ruta protegida
  if (authError && !isAuthenticated && !isPublicPage) {
    if (isApiRoute) {
      return Response.json({ error: "Sesion expirada" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith("sb-")) {
        redirectResponse.cookies.delete(name);
      }
    });
    return redirectResponse;
  }

  // Sin sesión en ruta protegida
  if (!isAuthenticated && !isPublicPage) {
    if (isApiRoute) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Sesión activa en página de login → dashboard.
  // No aplica a /sin-acceso, /nueva-contrasena ni /offline (isAlwaysAllowedPage).
  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const duration = Date.now() - start;
  response.headers.set("X-Response-Time", `${duration}ms`);

  if (duration > 2000) {
    console.warn(`[SLOW] ${request.method} ${pathname} — ${duration}ms`);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
