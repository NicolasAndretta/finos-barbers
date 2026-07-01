/**
 * src/lib/auth.ts
 *
 * Helpers de autenticación y autorización — SOLO SERVIDOR.
 * Importar únicamente en Server Components, Server Actions y Route Handlers.
 *
 * Funciones disponibles:
 *  - getUser()        → User | null         (no lanza)
 *  - getProfile()     → Profile | null      (no lanza)
 *  - requireUser()    → User                (redirige a /login si no hay sesión)
 *  - requireClient()  → Profile             (redirige si no es cliente ni admin)
 *  - requireAdmin()   → Profile             (redirige si no es admin)
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/types'
import type { User } from '@supabase/supabase-js'

// ─── Primitivos (no lanzan) ───────────────────────────────────────────────────

/**
 * Retorna el usuario autenticado o null.
 * Usa getUser() (verifica contra el servidor Supabase) — seguro para autorización.
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * Retorna el profile del usuario actual o null.
 * Combina getUser() + query a `profiles`.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile as Profile | null
}

// ─── Guards (redirigen si no se cumple la condición) ──────────────────────────

/**
 * Garantiza que hay un usuario autenticado.
 * Si no, redirige a /login.
 *
 * @example
 * // En un layout o page de Server Component:
 * const user = await requireUser()
 */
export async function requireUser(): Promise<User> {
  const user = await getUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

/**
 * Garantiza que el usuario tiene un profile en la BD y es cliente O admin.
 * - Sin sesión → redirige a /login
 * - Admin visitando área de cliente → redirige a /admin/dashboard
 *
 * Nota: los admins tienen acceso completo; no bloqueamos su acceso al área
 * de cliente, sólo los redirigimos a su panel por defecto.
 */
export async function requireClient(): Promise<Profile> {
  const profile = await getProfile()

  if (!profile) {
    redirect('/login')
  }

  if (profile.role === 'admin') {
    redirect('/admin/dashboard')
  }

  if (profile.role === 'barbero') {
    redirect('/barbero/calendario')
  }

  return profile
}

/**
 * Garantiza que el usuario es barbero (o admin, que ve todo).
 * - Sin sesión → /login
 * - Cliente común → /dashboard
 */
export async function requireBarbero(): Promise<Profile> {
  const profile = await getProfile()

  if (!profile) {
    redirect('/login')
  }

  if (profile.role !== 'barbero' && profile.role !== 'admin') {
    redirect('/dashboard')
  }

  return profile
}

/**
 * Garantiza que el usuario es administrador.
 * - Sin sesión → redirige a /login
 * - Cliente intentando acceder al área admin → redirige a /dashboard
 */
export async function requireAdmin(): Promise<Profile> {
  const profile = await getProfile()

  if (!profile) {
    redirect('/login')
  }

  if (profile.role !== 'admin') {
    redirect(profile.role === 'barbero' ? '/barbero/calendario' : '/dashboard')
  }

  return profile
}
