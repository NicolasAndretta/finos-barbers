'use server'

import { createClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { esSlug, rutaLocal } from '@/lib/local-datos'

/**
 * Cierra la sesión. Si se sale desde un local, vuelve a la home de ese local
 * (no al login vacío): es lo que esperaría un cliente.
 */
export async function logoutAction(formData?: FormData) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const local = formData?.get('local')
  redirect(typeof local === 'string' && esSlug(local) ? rutaLocal(local) : '/login')
}
