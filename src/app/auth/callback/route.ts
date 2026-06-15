import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Callback de Supabase Auth (confirmación de email, recuperación, etc.).
 *
 * Soporta los dos formatos de enlace que puede mandar Supabase:
 *  - PKCE / code flow:   /auth/callback?code=xxx
 *  - Token hash flow:    /auth/callback?token_hash=xxx&type=signup
 *
 * Si la verificación es exitosa, deja la sesión iniciada (cookies) y redirige
 * a una pantalla de éxito. Si falla (enlace vencido o inválido), redirige a la
 * misma pantalla en modo error.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  // Preferimos la URL pública configurada; el origin de la request puede venir
  // mal detrás del proxy de Hostinger.
  const base = process.env.NEXT_PUBLIC_APP_URL || origin

  const supabase = await createClient()

  let ok = false

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    ok = !error
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    ok = !error
  }

  return NextResponse.redirect(`${base}/auth/confirmado${ok ? '' : '?error=1'}`)
}
