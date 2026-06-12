'use server'

import { createClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import type { AuthFormState } from '@/components/ui/AuthForm'

export async function loginAction(
  prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Por favor, completa todos los campos.' }
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

    // Consultar el perfil para redirigir al área adecuada
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'admin') {
      redirectPath = '/admin/dashboard'
    } else {
      redirectPath = '/dashboard'
    }
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
