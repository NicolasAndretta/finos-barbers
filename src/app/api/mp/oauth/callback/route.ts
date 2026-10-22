import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exigirPermiso } from '@/lib/auth'
import { localDeAccion } from '@/lib/local'
import { PRODUCTO } from '@/lib/producto'
import { exchangeCodeForToken, guardarConexion, publicBaseUrl } from '@/lib/mp-oauth'

// Vuelta de Mercado Pago tras autorizar. Valida el state, cambia el código por
// el token (server-to-server) y lo guarda. Solo admin.
export async function GET(req: NextRequest) {
  // Por ahora hay UNA conexión de Mercado Pago, la de Roble (por local, en la
  // Fase 4): la puede tocar solo quien administra Roble.
  await exigirPermiso(await localDeAccion(PRODUCTO.localPorDefecto), 'administra')

  const base = publicBaseUrl(req)
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const cookieStore = await cookies()
  const savedState = cookieStore.get('mp_oauth_state')?.value
  cookieStore.delete('mp_oauth_state')

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL(`/${PRODUCTO.localPorDefecto}/admin/pagos?error=state`, base))
  }

  try {
    const token = await exchangeCodeForToken(code, req)
    await guardarConexion(token)
    return NextResponse.redirect(new URL(`/${PRODUCTO.localPorDefecto}/admin/pagos?mp=ok`, base))
  } catch (err) {
    console.error('[MP OAuth] Error en callback:', err)
    return NextResponse.redirect(new URL(`/${PRODUCTO.localPorDefecto}/admin/pagos?error=token`, base))
  }
}
