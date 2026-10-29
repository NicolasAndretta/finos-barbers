/**
 * src/lib/auth.ts
 *
 * Sesión y permisos — SOLO SERVIDOR.
 * Importar únicamente en Server Components, Server Actions y Route Handlers.
 *
 * Desde la Fase 3a los permisos son POR LOCAL: lo que alguien puede hacer en
 * /roble no dice nada de lo que puede hacer en /otro-local. Las reglas las
 * tiene la base (Fase 2); acá solo se preguntan (`getPermisos`) para decidir
 * qué mostrar y a dónde mandar a cada uno. Aunque la app se equivocara, la
 * base igual frenaría lo que no corresponde.
 *
 * Funciones:
 *  - getUser()                 → Usuario | null   (no redirige)
 *  - getProfile()              → Profile | null   (no redirige)
 *  - requireUser(volver?)      → Usuario          (sin sesión → /login)
 *  - requireProfile(volver?)   → Profile          (sin sesión → /login)
 *  - requirePanelAdmin(local)  → { profile, permisos }  (panel de administración del local)
 *  - requirePanelBarbero(local)→ { profile, permisos }  (agenda del barbero en el local)
 *  - exigirPermiso(local, p)   → Profile          (para acciones: corta si no tiene permiso)
 *  - exigirPlan(local, c)      → void             (para acciones: corta si el plan no lo trae)
 *  - destinoDespuesDeEntrar()  → a qué página va alguien después del login
 */

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getLocal, getPermisos, type Permisos } from '@/lib/local'
import { rutaLocal, type Capacidad, type LocalPublico } from '@/lib/local-datos'
import { planMinimoPara } from '@/lib/planes'
import { PRODUCTO } from '@/lib/producto'
import type { Profile } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Primitivos (no redirigen) ───────────────────────────────────────────────

/** Quién está conectado: su id y su mail. */
export type Usuario = { id: string; email: string }

/**
 * El usuario conectado, o null. Sirve para autorizar: verifica la firma de la
 * sesión (getClaims). Con las claves nuevas de Supabase (ES256) la verifica
 * acá mismo, con la clave pública del proyecto (se baja una vez cada 10
 * minutos), sin ir a Supabase en cada pedido; con una sesión firmada a la
 * antigua, pregunta a Supabase como antes. Una sola vez por pedido (cache):
 * antes cada página lo preguntaba 6 o 7 veces, una atrás de otra.
 *
 * Lo que no ve: una sesión cerrada en otro lado sigue valiendo hasta que vence
 * su token (una hora). Es lo mismo que ya pasa con la base (que también confía
 * en la firma), y la base sigue decidiendo qué puede ver y tocar cada uno.
 */
export const getUser = cache(async (): Promise<Usuario | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (error || !claims?.sub) return null
  return { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : '' }
})

/** El perfil del usuario conectado (nombre, mail), o null. Una vez por pedido. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser()
  if (!user) return null

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile as Profile | null
})

// ─── Login ───────────────────────────────────────────────────────────────────

/**
 * La dirección del login, con a dónde volver después.
 * `volver` es una dirección de este mismo sitio (por ejemplo /roble/reservar).
 */
export function rutaLogin(volver?: string): string {
  if (!volver) return '/login'
  const local = volver.split('/')[1]
  const params = new URLSearchParams({ next: volver })
  if (local) params.set('local', local)
  return `/login?${params.toString()}`
}

/**
 * ¿Es seguro volver a esta dirección después del login?
 * Solo direcciones de este sitio: empiezan con "/" pero no con "//" (eso sería
 * otro sitio) ni con "/\" (algunos navegadores lo leen igual).
 */
export function esVueltaSegura(ruta: unknown): ruta is string {
  return typeof ruta === 'string' && ruta.startsWith('/') && !ruta.startsWith('//') && !ruta.startsWith('/\\')
}

// ─── Guardias (redirigen si no se cumple) ────────────────────────────────────

/** Hay sesión. Si no, al login (y después vuelve a `volver`). */
export async function requireUser(volver?: string): Promise<Usuario> {
  const user = await getUser()
  if (!user) redirect(rutaLogin(volver))
  return user
}

/** Hay sesión y perfil. Si no, al login. */
export async function requireProfile(volver?: string): Promise<Profile> {
  const profile = await getProfile()
  if (!profile) redirect(rutaLogin(volver))
  return profile
}

/**
 * Panel de administración de un local: entra quien edita su catálogo (el
 * dueño, el admin de la plataforma y la comercial). Lo que cada uno ve adentro
 * depende de sus permisos (por ejemplo, la caja solo quien administra).
 * Un cliente que llega acá va a su área de cliente de ese local.
 */
export async function requirePanelAdmin(local: LocalPublico): Promise<{ profile: Profile; permisos: Permisos }> {
  const [profile, permisos] = await Promise.all([
    requireProfile(rutaLocal(local.slug, '/admin/dashboard')),
    getPermisos(local.id),
  ])
  if (!permisos.editaCatalogo) redirect(rutaLocal(local.slug, '/dashboard'))
  return { profile, permisos }
}

/**
 * Agenda del barbero en un local: entra quien es barbero de ESE local (y quien
 * lo administra, para revisarla).
 */
export async function requirePanelBarbero(local: LocalPublico): Promise<{ profile: Profile; permisos: Permisos }> {
  const [profile, permisos] = await Promise.all([
    requireProfile(rutaLocal(local.slug, '/barbero/calendario')),
    getPermisos(local.id),
  ])
  if (!permisos.barberoId && !permisos.administra) redirect(rutaLocal(local.slug, '/dashboard'))
  return { profile, permisos }
}

type PermisoDeAccion = 'administra' | 'editaCatalogo' | 'operaPrivado'

/**
 * Para las acciones del servidor: hay sesión y tiene ese permiso en el local.
 * Si no hay sesión, al login. Si no tiene permiso, corta con un error: una
 * pantalla legítima no ofrece la acción a quien no puede usarla, así que solo
 * llega acá quien la llama a mano. La base, igual, la frenaría.
 */
export async function exigirPermiso(local: LocalPublico, permiso: PermisoDeAccion): Promise<Profile> {
  const [profile, permisos] = await Promise.all([requireProfile(), getPermisos(local.id)])
  if (!permisos[permiso]) throw new Error('No tenés permiso para hacer esto en este local')
  return profile
}

/**
 * Para las acciones del servidor: el plan del local trae esto (Fase 7). Si no,
 * corta con un error que dice qué plan lo trae. Las pantallas no lo ofrecen y
 * la base, en lo que importa (profesionales, cuentas, Mercado Pago, la tienda,
 * la caja, las reseñas a la vista), lo frena igual.
 */
export async function exigirPlan(local: LocalPublico, capacidad: Capacidad): Promise<void> {
  if (!local.plan[capacidad]) {
    throw new Error(`Esto es del plan ${await planMinimoPara(capacidad)} en adelante (este local está en el plan ${local.plan.nombre}).`)
  }
}

/**
 * A dónde va alguien después de entrar, si no pidió volver a una página.
 *
 *  0. Si no venía de ningún local y es del equipo de la plataforma (Fase 6):
 *     a /plataforma, la lista de locales.
 *  1. ¿De qué local venía? (el que mandó el login). Si no venía de ninguno:
 *     el primer local donde es dueño o barbero; si no, el de demostración.
 *  2. En ese local: quien lo administra o edita → su panel; el barbero → su
 *     agenda; el resto → su área de cliente.
 *
 * Recibe el cliente de Supabase con el que se acaba de iniciar sesión: en esa
 * misma acción las cookies nuevas todavía no llegaron, pero ese cliente ya
 * tiene la sesión en memoria.
 */
export async function destinoDespuesDeEntrar(
  supabase: SupabaseClient,
  userId: string,
  slugPedido?: string | null,
): Promise<string> {
  let local = slugPedido ? await getLocal(slugPedido) : null

  if (!local) {
    const { data: equipo } = await supabase.from('equipo').select('rol').eq('user_id', userId).maybeSingle()
    if (equipo) return '/plataforma'
  }

  if (!local) {
    const { data: membresias } = await supabase
      .from('membresias')
      .select('rol, locales ( slug )')
      .eq('user_id', userId)
      .in('rol', ['dueno', 'barbero'])
    const orden = ['dueno', 'barbero']
    const primera = (membresias ?? [])
      .map((m) => ({ rol: m.rol as string, slug: (Array.isArray(m.locales) ? m.locales[0] : m.locales)?.slug as string | undefined }))
      .filter((m) => !!m.slug)
      .sort((a, b) => orden.indexOf(a.rol) - orden.indexOf(b.rol))[0]
    local = await getLocal(primera?.slug ?? PRODUCTO.localPorDefecto)
  }
  if (!local) return '/'

  const { data } = await supabase.rpc('permisos_en_local', { p_local: local.id })
  const p = (data as { edita_catalogo: boolean; barbero_id: string | null }[] | null)?.[0]
  if (p?.edita_catalogo) return rutaLocal(local.slug, '/admin/dashboard')
  if (p?.barbero_id) return rutaLocal(local.slug, '/barbero/calendario')
  return rutaLocal(local.slug, '/dashboard')
}
