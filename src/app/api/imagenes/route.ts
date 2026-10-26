import { NextResponse, type NextRequest } from 'next/server'
import { getUser } from '@/lib/auth'
import { getLocal, getPermisos } from '@/lib/local'
import { ErrorDeImagen, MAX_RECIBIDO, subirImagen } from '@/lib/imagenes'

// Subir una foto de un local (Fase 4b): POST /api/imagenes, con un formulario
// de dos campos: `local` (el nombre de la dirección) y `archivo`.
//
// Es una ruta de la API y no una Server Action, como en 369: así no choca con
// el tope de 1 MB de las Server Actions, se puede probar desde afuera (las
// pruebas le mandan archivos disfrazados a propósito), y el tamaño se revisa
// antes de leer el archivo entero.
//
// Quién puede: quien edita el catálogo de ESE local (el dueño, el admin, la
// comercial). La carpeta es siempre la del local que se pidió, y el permiso se
// revisa en ese mismo local: nadie sube a la carpeta de otro.

export const dynamic = 'force-dynamic'

const responder = (estado: number, cuerpo: Record<string, unknown>) => NextResponse.json(cuerpo, { status: estado })

export async function POST(req: NextRequest) {
  // Mismo origen, como hacen las Server Actions: un formulario de otro sitio
  // no puede mandar fotos con la sesión de alguien.
  const origen = req.headers.get('origin')
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  let mismoOrigen = false
  try { mismoOrigen = !!origen && !!host && new URL(origen).host === host } catch { /* origen roto */ }
  if (!mismoOrigen) return responder(403, { error: 'Pedido de otro sitio.' })

  // El tamaño, antes de leer nada.
  const largo = Number(req.headers.get('content-length') ?? 0)
  if (largo > MAX_RECIBIDO + 64 * 1024) return responder(413, { error: 'La foto pesa demasiado.' })

  let formulario: FormData
  try {
    formulario = await req.formData()
  } catch {
    return responder(400, { error: 'No llegó el archivo.' })
  }
  const local = await getLocal(String(formulario.get('local') ?? '')).catch(() => null)
  if (!local) return responder(404, { error: 'Ese local no existe.' })
  if (!(await getUser())) return responder(401, { error: 'Tenés que entrar con tu cuenta.' })
  if (!(await getPermisos(local.id)).editaCatalogo) return responder(403, { error: 'No podés cargar fotos en este local.' })

  const archivo = formulario.get('archivo')
  if (!(archivo instanceof File) || archivo.size === 0) return responder(400, { error: 'No llegó ninguna foto.' })
  if (archivo.size > MAX_RECIBIDO) return responder(413, { error: 'La foto pesa demasiado.' })

  try {
    const url = await subirImagen(local.id, Buffer.from(await archivo.arrayBuffer()))
    return responder(200, { url })
  } catch (err) {
    if (err instanceof ErrorDeImagen) return responder(err.estado, { error: err.message })
    console.error('[imagenes] error al subir:', err instanceof Error ? err.message : err)
    return responder(500, { error: 'No se pudo subir la foto. Probá de nuevo.' })
  }
}
