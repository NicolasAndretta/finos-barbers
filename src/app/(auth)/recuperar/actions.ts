'use server'

import { createClient } from '@/lib/supabase'

export type ResetRequestState = { error?: string; success?: boolean }

export async function solicitarReset(
  prevState: ResetRequestState,
  formData: FormData
): Promise<ResetRequestState> {
  const email = ((formData.get('email') as string | null) ?? '').trim()
  if (!email) return { error: 'Ingresá tu email.' }

  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${base}/auth/callback?next=/restablecer`,
  })

  // Por seguridad NO revelamos si el email existe o no (evita enumeración de
  // usuarios). Mostramos siempre el mismo mensaje de éxito.
  if (error) console.error('[reset] resetPasswordForEmail:', error.message)

  return { success: true }
}
