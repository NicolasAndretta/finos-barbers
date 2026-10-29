/**
 * src/proxy.ts
 *
 * Responsabilidades:
 *  1. Los links viejos de la demo (/reservar, /tienda, /admin/...) llevan a
 *     los mismos lugares dentro de Roble (/roble/reservar...). Desde la Fase 3a
 *     cada local vive en su carpeta, y no se puede romper ningún link que ya
 *     se haya mandado a un cliente (ni las vueltas de Mercado Pago).
 *  2. Refrescar el token de sesión de Supabase cuando vence (via setAll).
 *  3. Proteger las áreas privadas de cada local (/<local>/admin, /<local>/turnos...):
 *     sin sesión, al login, que después vuelve a la misma página.
 *
 * Qué NO hace: decidir a dónde va alguien que ya tiene sesión y abre el login.
 * Eso lo resuelve la página del login, que sabe de qué local viene y qué es
 * en él (antes lo mandaba siempre a /dashboard).
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
import { PRODUCTO } from '@/lib/producto'

// ─── Clasificación de rutas ───────────────────────────────────────────────────

/**
 * Las direcciones de la demo de antes de la Fase 3a. Ahora viven dentro del
 * local de demostración: /reservar → /roble/reservar. (La base no deja crear
 * un local con estos nombres: migración 0008.)
 */
const RUTAS_VIEJAS = ['tienda', 'checkout', 'reservar', 'turnos', 'dashboard', 'admin', 'barbero']

/** Áreas de un local que requieren sesión: /<local>/<área>/... */
const AREAS_PRIVADAS = ['dashboard', 'reservar', 'turnos', 'admin', 'barbero']

/** "/roble/admin/turnos" → ['roble', 'admin', 'turnos'] */
function partes(pathname: string): string[] {
  return pathname.split('/').filter(Boolean)
}

function esPrivada(pathname: string): boolean {
  const [, area] = partes(pathname)
  return !!area && AREAS_PRIVADAS.includes(area)
}

// ─── Proxy ───────────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  // ── 1. Links viejos → dentro de Roble (308: redirección permanente que
  //       respeta el método, así un POST viejo tampoco se rompe) ─────────────
  const [primera] = partes(request.nextUrl.pathname)
  if (primera && RUTAS_VIEJAS.includes(primera)) {
    const nueva = request.nextUrl.clone()
    nueva.pathname = `/${PRODUCTO.localPorDefecto}${request.nextUrl.pathname}`
    return NextResponse.redirect(nueva, 308)
  }

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

  // IMPORTANTE: No agregar lógica entre createServerClient y getClaims().
  // getClaims() puede disparar un refresh de token que escribe cookies via setAll.
  // Verifica la firma de la sesión acá mismo (con la clave pública del
  // proyecto, ES256), sin ir a Supabase en cada pedido; con una sesión firmada
  // a la antigua, le pregunta a Supabase como antes. Las páginas y la base
  // vuelven a verificar: esto solo decide si mandar al login.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims?.sub ? data.claims : null

  const { pathname } = request.nextUrl

  // ── Sin sesión → proteger las áreas privadas de cada local ────────────────
  if (!user && esPrivada(pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    // Después del login vuelve a la misma página, y el login muestra la
    // marca del local del que viene.
    loginUrl.searchParams.set('next', pathname)
    loginUrl.searchParams.set('local', partes(pathname)[0])

    const redirectResponse = NextResponse.redirect(loginUrl)
    // Copiar las cookies de supabase al redirect para no perder tokens parciales
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
