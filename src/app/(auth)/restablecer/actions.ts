'use server'

import { createClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { destinoDespuesDeEntrar } from '@/lib/auth'
import { esSlug } from '@/lib/local-datos'

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

  // Un dueño invitado (Fase 6) ya tiene la sesión iniciada: entra directo a lo
  // suyo en ese local. El resto vuelve al login con el aviso de siempre.
  const local = formData.get('local')
  if (typeof local === 'string' && esSlug(local)) redirect(await destinoDespuesDeEntrar(supabase, user.id, local))
  redirect('/login?reset=1')
}
