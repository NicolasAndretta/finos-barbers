'use server'

import { createClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { destinoDespuesDeEntrar, esVueltaSegura } from '@/lib/auth'
import type { AuthFormState } from '@/components/ui/AuthForm'

/**
 * Inicia sesión y manda a cada uno a donde corresponde:
 *  - si pidió volver a una página (?next=/roble/reservar), a esa;
 *  - si no, según lo que es en el local del que vino (ver
 *    `destinoDespuesDeEntrar`): su panel, su agenda o su área de cliente.
 */
export async function loginAction(
  prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const volver = formData.get('next')
  const local = formData.get('local')

  if (!email || !password) {
    return { error: 'Completá todos los campos.' }
  }

  let redirectPath: string | null = null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { error: error.message }
    }

    if (!data.user) {
      return { error: 'Ocurrió un error inesperado al iniciar sesión.' }
    }

    redirectPath = esVueltaSegura(volver) && !volver.startsWith('/login')
      ? volver
      : await destinoDespuesDeEntrar(supabase, data.user.id, typeof local === 'string' ? local : null)
  } catch (err: unknown) {
    if (err instanceof Error && 'digest' in err && typeof (err as { digest?: string }).digest === 'string' && (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')) {
      throw err // Dejar que Next.js maneje su redirección
    }
    return { error: err instanceof Error ? err.message : 'Error al iniciar sesión' }
  }

  if (redirectPath) {
    redirect(redirectPath)
  }

  return {}
}
