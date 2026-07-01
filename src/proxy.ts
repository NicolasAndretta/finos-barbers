/**
 * src/proxy.ts
 *
 * Responsabilidades:
 *  1. Refrescar el token de sesión de Supabase en cada request (via setAll).
 *  2. Proteger rutas: redirigir usuarios sin sesión a /login.
 *  3. Redirigir usuarios con sesión activa fuera de las rutas de auth.
 *
 * NO verifica rol aquí — eso lo hacen los layouts (Server Components).
 * Motivo: hacerlo aquí requeriría una query extra a `profiles` en cada request
 * y en cada prefetch, impactando la performance global.
 *
 * El proxy usa su propio createServerClient con setAll funcional
 * (lee de request.cookies, escribe en response.cookies).
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ─── Clasificación de rutas ───────────────────────────────────────────────────

/** Rutas que requieren sesión activa (rol cualquiera) */
const PROTECTED_PREFIXES = ['/dashboard', '/reservar', '/turnos', '/admin', '/barbero']

/** Rutas de autenticación: si hay sesión, redirigir al área correspondiente */
const AUTH_ROUTES = ['/login', '/register']

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))
}

// ─── Proxy ───────────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  /**
   * Patrón oficial de @supabase/ssr:
   * 1. Crear supabaseResponse antes del cliente.
   * 2. setAll escribe en request Y en supabaseResponse (para que el browser
   *    reciba las cookies actualizadas).
   * 3. SIEMPRE retornar supabaseResponse (nunca un NextResponse nuevo sin las cookies).
   */
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Escribir en request (para que el cliente in-memory quede actualizado)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // Crear nueva response con el request actualizado
          supabaseResponse = NextResponse.next({ request })
          // Escribir en la response (para que el browser reciba las cookies)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANTE: No agregar lógica entre createServerClient y getUser().
  // getUser() puede disparar un refresh de token que escribe cookies via setAll.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Sin sesión → proteger rutas privadas ──────────────────────────────────
  if (!user && isProtected(pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    // Preservar la URL de destino para redirigir después del login (opcional)
    loginUrl.searchParams.set('next', pathname)

    const redirectResponse = NextResponse.redirect(loginUrl)
    // Copiar las cookies de supabase al redirect para no perder tokens parciales
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  // ── Con sesión → sacar de rutas de auth ──────────────────────────────────
  // El rol se determina en el login action y en los layouts.
  // Aquí simplemente redirigimos al área de cliente por defecto.
  // El layout de (client) redirigirá a los admins a /admin/dashboard.
  if (user && isAuthRoute(pathname)) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    dashboardUrl.search = ''

    const redirectResponse = NextResponse.redirect(dashboardUrl)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  return supabaseResponse
}

// ─── Matcher ──────────────────────────────────────────────────────────────────
// Excluye assets estáticos, imágenes y el favicon para no ejecutar el proxy
// en recursos que no necesitan autenticación.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
