'use server'

import { createClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import type { AuthFormState } from '@/components/ui/AuthForm'

export async function registerAction(
  prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const nombre = formData.get('nombre') as string
  const apellido = formData.get('apellido') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!nombre || !apellido || !email || !password) {
    return { error: 'Por favor, completa todos los campos.' }
  }

  let redirectPath: string | null = null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
          apellido,
          role: 'client',
        },
      },
    })

    if (error) {
      return { error: error.message }
    }

    if (!data.user) {
      return { error: 'No se pudo crear la cuenta. Por favor, intenta de nuevo.' }
    }

    redirectPath = '/login?registered=1'
  } catch (err: unknown) {
    if (err instanceof Error && 'digest' in err && typeof (err as { digest?: string }).digest === 'string' && (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')) {
      throw err
    }
    return { error: err instanceof Error ? err.message : 'Error al registrarse' }
  }

  if (redirectPath) {
    redirect(redirectPath)
  }

  return {}
}
