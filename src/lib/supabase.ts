/**
 * src/lib/supabase.ts
 *
 * Finos Barbers — clientes de Supabase para App Router (Next.js 15 / Next.js 16)
 *
 * REGLAS DE USO:
 *  - createClient()        → Server Components, Route Handlers, Server Actions
 *  - createBrowserClient() → Client Components ("use client")
 *
 * Por qué dos funciones separadas:
 *  El cliente de servidor lee las cookies de la *request* y las escribe en la
 *  *response* a través del middleware. Si se usara el mismo cliente en el
 *  browser, los tokens nunca se almacenarían correctamente y el usuario sería
 *  deslogueado de forma aleatoria.
 *
 * Por qué NO se usa getSession() para autorización:
 *  getSession() lee directamente de la cookie sin verificar la firma. Un
 *  cliente malicioso podría falsificar la cookie. Usar siempre getUser() o
 *  getClaims() para decisiones de autorización en el servidor.
 */

import { createServerClient as _createServerClient } from '@supabase/ssr'
import { createBrowserClient as _createBrowserClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ─── Variables de entorno ────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Faltan variables de entorno de Supabase.\n' +
      'Asegúrate de definir NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local',
  )
}

// ─── Cliente de servidor (Server Components / Route Handlers / Actions) ───────

/**
 * Crea un cliente de Supabase para usarse en contextos de servidor.
 *
 * Debe llamarse UNA VEZ por request — nunca compartir la instancia entre
 * peticiones distintas, ya que las cookies son específicas a cada request.
 *
 * Implementa getAll/setAll (API no-deprecated de @supabase/ssr ^0.6+) para
 * evitar problemas de sincronización con el token de refresco.
 *
 * @example
 * // En un Server Component:
 * import { createClient } from '@/lib/supabase'
 * const supabase = await createClient()
 * const { data: { user } } = await supabase.auth.getUser()
 */
export async function createClient() {
  // next/headers devuelve una Promise<ReadonlyRequestCookies> en Next.js 15+
  const cookieStore = await cookies()

  return _createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      // En Server Components y Route Handlers sólo se puede leer cookies,
      // no escribir. El middleware es quien se encarga de actualizar la cookie
      // cuando el token se refresca. Por eso setAll se deja vacío aquí.
      // Si usas esta función desde un Route Handler donde SÍ puedes escribir,
      // añade la lógica de escritura correspondiente (ver middleware.ts).
      setAll(cookiesToSet) {
        try {
          // En Server Actions y Route Handlers, set() sí funciona.
          // En Server Components, lanza — el catch lo silencia.
          // El middleware escribe las cookies al refrescar el token.
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components no pueden escribir cookies — comportamiento esperado.
        }
      },
    },
  })
}

// ─── Cliente de browser (Client Components) ───────────────────────────────────

/**
 * Crea (o reutiliza) el cliente de Supabase para usarse en el browser.
 *
 * @supabase/ssr cachea automáticamente la instancia cuando detecta un entorno
 * de browser (isSingleton=true por defecto), garantizando que sólo exista una
 * conexión activa por pestaña.
 *
 * @example
 * // En un Client Component:
 * 'use client'
 * import { createBrowserClient } from '@/lib/supabase'
 * const supabase = createBrowserClient()
 * await supabase.auth.signInWithPassword({ email, password })
 */
export function createBrowserClient() {
  return _createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
}
