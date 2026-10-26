import { NextResponse, type NextRequest } from 'next/server'
import { getUser } from '@/lib/auth'
import { getPermisos } from '@/lib/local'
import { rutaLocal } from '@/lib/local-datos'
import { createClient } from '@/lib/supabase'
import { COOKIE_CONEXION, RUTA_COOKIE_CONEXION, canjearCodigo, guardarConexion } from '@/lib/mp-conexion'

// La vuelta de Mercado Pago después de que el dueño autoriza. Es UNA dirección
// para todos los locales (la que se registra en la aplicación de Mercado
// Pago); de qué local se trata lo dice la cookie que dejó /connect.
//
// Valida el `state`, vuelve a revisar el permiso (la sesión pudo cambiar en
// el medio), cambia el código por el token (servidor a servidor: el navegador
// nunca lo ve) y guarda la conexión de ese local.

export const dynamic = 'force-dynamic'

const esId = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

/** Redirige y, de paso, borra la cookie: sirve para una sola vuelta. */
function irA(ruta: string) {
  const res = new NextResponse(null, { status: 303, headers: { Location: ruta } })
  res.cookies.delete({ name: COOKIE_CONEXION, path: RUTA_COOKIE_CONEXION })
  return res
}

export async function GET(req: NextRequest) {
  const [stateGuardado = '', localId = ''] = (req.cookies.get(COOKIE_CONEXION)?.value ?? '').split('.')
  if (!esId(localId)) return irA('/')

  // Sin sesión, al login a secas: volver acá después no serviría (la cookie
  // ya se borró), así que se conecta de nuevo desde el panel.
  if (!(await getUser())) return irA('/login')

  // El nombre del local, para volver a su panel. Con la sesión: si no es
  // alguien de ese local, no lo ve y vuelve al inicio.
  const supabase = await createClient()
  const { data: local } = await supabase.from('locales').select('id, slug').eq('id', localId).maybeSingle()
  if (!local) return irA('/')
  const pagos = rutaLocal(local.slug, '/admin/pagos')

  const state = req.nextUrl.searchParams.get('state')
  if (!state || !stateGuardado || state !== stateGuardado) return irA(`${pagos}?error=state`)
  if (!(await getPermisos(local.id)).administra) return irA(`${pagos}?error=permiso`)

  // Sin código: el dueño canceló en Mercado Pago, o Mercado Pago devolvió un error.
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return irA(`${pagos}?error=cancelado`)

  try {
    await guardarConexion(local.id, await canjearCodigo(code))
    return irA(`${pagos}?mp=ok`)
  } catch (err) {
    console.error(`[mp-conexion] No se pudo completar la conexión del local ${local.id}:`, err instanceof Error ? err.message : err)
    return irA(`${pagos}?error=token`)
  }
}
