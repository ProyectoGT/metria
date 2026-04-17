import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPage = pathname === "/login" || pathname === "/recuperar";

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

  // Token caducado o inválido → limpiar cookies sb-* y redirigir a login
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

  // Sin sesión y ruta protegida → login
  if (!isAuthenticated && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Con sesión y en página pública → dashboard
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
