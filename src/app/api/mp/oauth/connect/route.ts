import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exigirPermiso } from '@/lib/auth'
import { localDeAccion } from '@/lib/local'
import { PRODUCTO } from '@/lib/producto'
import { getAuthorizationUrl, mpOAuthConfigurado, publicBaseUrl } from '@/lib/mp-oauth'

// Inicia el flujo OAuth: solo admin. Genera un `state` (anti-CSRF) en cookie y
// redirige al comercio a Mercado Pago para que autorice.
export async function GET(req: Request) {
  // Por ahora hay UNA conexión de Mercado Pago, la de Roble (por local, en la
  // Fase 4): la puede tocar solo quien administra Roble.
  await exigirPermiso(await localDeAccion(PRODUCTO.localPorDefecto), 'administra')

  if (!mpOAuthConfigurado()) {
    return NextResponse.redirect(new URL(`/${PRODUCTO.localPorDefecto}/admin/pagos?error=config`, publicBaseUrl(req)))
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

  return NextResponse.redirect(getAuthorizationUrl(state, req))
}
