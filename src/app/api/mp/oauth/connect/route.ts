import { NextResponse, type NextRequest } from 'next/server'
import { getUser, rutaLogin } from '@/lib/auth'
import { getLocal, getPermisos } from '@/lib/local'
import { rutaLocal } from '@/lib/local-datos'
import { urlPublica } from '@/lib/sitio'
import { COOKIE_CONEXION, RUTA_COOKIE_CONEXION, mpConnectConfigurado, urlParaConectar } from '@/lib/mp-conexion'

// Arranca la conexión de la cuenta de Mercado Pago de UN local:
//   /api/mp/oauth/connect?local=<nombre del local en la dirección>
//
// Solo quien administra ese local (su dueño, o el admin de la plataforma). La
// comercial no: es la plata del dueño, y se conecta con la cuenta del dueño.
//
// Genera un `state` al azar y lo guarda en una cookie junto con el id del
// local. Cuando Mercado Pago vuelve, el callback compara el `state`: si no
// coincide, la vuelta no salió de acá (alguien quiso conectarle a un local una
// cuenta ajena). El local sale de la cookie, que pone el servidor, y no de la
// dirección de vuelta: nadie lo puede cambiar en el camino.
//
// Las redirecciones van con una dirección relativa: detrás del proxy de
// Hostinger, la dirección del pedido puede traer el host interno (lección de
// Código Rojo).

export const dynamic = 'force-dynamic'

function irA(ruta: string) {
  return new NextResponse(null, { status: 303, headers: { Location: ruta } })
}

export async function GET(req: NextRequest) {
  const local = await getLocal(req.nextUrl.searchParams.get('local') ?? '').catch(() => null)
  if (!local) return irA('/')
  const pagos = rutaLocal(local.slug, '/admin/pagos')

  if (!(await getUser())) return irA(rutaLogin(pagos))
  if (!(await getPermisos(local.id)).administra) return irA(`${pagos}?error=permiso`)
  if (!mpConnectConfigurado()) return irA(`${pagos}?error=config`)

  const state = crypto.randomUUID()
  const res = NextResponse.redirect(urlParaConectar(state), 303)
  res.cookies.set(COOKIE_CONEXION, `${state}.${local.id}`, {
    httpOnly: true,
    // Solo por https, salvo probando en la PC (http://127.0.0.1).
    secure: Boolean(urlPublica()?.startsWith('https://')),
    sameSite: 'lax',
    maxAge: 600, // 10 minutos para autorizar
    path: RUTA_COOKIE_CONEXION,
  })
  return res
}
