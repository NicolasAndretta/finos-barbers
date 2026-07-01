'use server'

import { createClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export type ResetPasswordState = { error?: string }

export async function actualizarPassword(
  prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const password = (formData.get('password') as string | null) ?? ''
  const confirm = (formData.get('confirm') as string | null) ?? ''

  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' }
  }
  if (password !== confirm) {
    return { error: 'Las contraseñas no coinciden.' }
  }

  const supabase = await createClient()

  // El enlace de recuperación dejó una sesión activa (vía /auth/callback).
  // Si no hay usuario, el enlace venció o es inválido.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'El enlace venció o no es válido. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".' }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }

  redirect('/login?reset=1')
}
