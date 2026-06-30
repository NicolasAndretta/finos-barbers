import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/lib/auth'
import { exchangeCodeForToken, guardarConexion } from '@/lib/mp-oauth'

// Vuelta de Mercado Pago tras autorizar. Valida el state, cambia el código por
// el token (server-to-server) y lo guarda. Solo admin.
export async function GET(req: NextRequest) {
  await requireAdmin()

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const cookieStore = await cookies()
  const savedState = cookieStore.get('mp_oauth_state')?.value
  cookieStore.delete('mp_oauth_state')

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL('/admin/pagos?error=state', base))
  }

  try {
    const token = await exchangeCodeForToken(code)
    await guardarConexion(token)
    return NextResponse.redirect(new URL('/admin/pagos?mp=ok', base))
  } catch (err) {
    console.error('[MP OAuth] Error en callback:', err)
    return NextResponse.redirect(new URL('/admin/pagos?error=token', base))
  }
}
