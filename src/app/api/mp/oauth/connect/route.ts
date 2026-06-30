import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/lib/auth'
import { getAuthorizationUrl, mpOAuthConfigurado } from '@/lib/mp-oauth'

// Inicia el flujo OAuth: solo admin. Genera un `state` (anti-CSRF) en cookie y
// redirige al comercio a Mercado Pago para que autorice.
export async function GET() {
  await requireAdmin()

  if (!mpOAuthConfigurado()) {
    return NextResponse.redirect(
      new URL('/admin/pagos?error=config', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    )
  }

  const state = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set('mp_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  return NextResponse.redirect(getAuthorizationUrl(state))
}
