/**
 * src/lib/imagenes.ts — SOLO SERVIDOR.
 *
 * Las fotos de cada local (productos, profesionales), Fase 4b.
 *
 * Viven en el bucket `imagenes` de Supabase Storage, cada local en su carpeta
 * con su id (`<id del local>/<nombre al azar>.webp`): el nombre de la dirección
 * de un local puede cambiar (Fase 6), su id nunca. El bucket es público para
 * LEER (las fotos se ven en la web); para escribir no hay ninguna política, así
 * que solo sube y borra el servidor, por acá.
 *
 * Lo que hace con cada foto, aunque el navegador ya la haya achicado (no se
 * confía en eso: alguien puede mandar cualquier cosa sin pasar por la pantalla):
 *   1. Mira los primeros bytes del archivo: tiene que ser JPG, PNG o WebP de
 *      verdad. Lo que diga el navegador no cuenta (un SVG puede traer código).
 *   2. La endereza según la cámara, la achica a 1600 px de lado y la guarda en
 *      WebP. Sale sin datos ocultos: ni el modelo del celu ni la ubicación GPS.
 *   3. Controla el tope del local (25 MB): la galería de 369 y los locales
 *      comparten el espacio del plan gratis (1 GB).
 *
 * `sharp` en Hostinger corre en WebAssembly, de un solo núcleo (la lección de
 * 369): por eso una sola conversión, liviana, y el "unshare" de abajo.
 */

import 'server-only'
import { randomUUID } from 'crypto'
import sharp from 'sharp'
import { createServiceClient } from '@/lib/supabase'

const BUCKET = 'imagenes'
/** El mismo lado máximo que usa el navegador (LADO_MAX en lib/image-client.ts). */
const LADO_MAX = 1600
/** Tope de espacio por local: unas 100 a 150 fotos ya achicadas. Cambiarlo es esta línea. */
export const CUPO_POR_LOCAL = 25 * 1024 * 1024
/** Lo más grande que se acepta recibir. El navegador ya manda ~300 KB. */
export const MAX_RECIBIDO = 8 * 1024 * 1024

/** Error con un mensaje que se le puede mostrar al dueño tal cual. */
export class ErrorDeImagen extends Error {
  constructor(mensaje: string, public estado = 400) {
    super(mensaje)
  }
}

/** El tipo de verdad, por los primeros bytes del archivo. */
export function tipoReal(b: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg'
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'webp'
  return null
}

// sharp en WebAssembly (Hostinger) devuelve buffers sobre memoria compartida,
// que la subida a Storage rechaza ("SharedArrayBuffer is not allowed").
const unshare = (b: Buffer) => (b.buffer instanceof SharedArrayBuffer ? Buffer.from(b) : b)

/** Enderezada, achicada y en WebP, sin datos ocultos (sharp no copia el EXIF si no se lo pide). */
async function procesar(entrada: Buffer): Promise<Buffer> {
  if (!tipoReal(entrada)) throw new ErrorDeImagen('Tiene que ser una foto (JPG, PNG o WebP).', 415)
  try {
    const salida = await sharp(entrada, { sequentialRead: true, limitInputPixels: 60_000_000 })
      .rotate()
      .resize(LADO_MAX, LADO_MAX, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()
    return unshare(salida)
  } catch (err) {
    console.error('[imagenes] sharp no pudo procesar la foto:', err instanceof Error ? err.message : err)
    throw new ErrorDeImagen('No se pudo procesar esa foto. Puede estar dañada o a medio descargar.', 422)
  }
}

/** Cuánto ocupan hoy las fotos de un local. */
export async function usoDelLocal(localId: string): Promise<number> {
  const storage = createServiceClient().storage.from(BUCKET)
  let total = 0
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await storage.list(localId, { limit: 1000, offset: desde })
    if (error) throw new Error(`No se pudo medir el espacio del local: ${error.message}`)
    for (const archivo of data ?? []) total += Number((archivo.metadata as { size?: number } | null)?.size ?? 0)
    if (!data || data.length < 1000) return total
  }
}

/** Procesa y sube una foto a la carpeta del local. Devuelve su dirección pública. */
export async function subirImagen(localId: string, entrada: Buffer): Promise<string> {
  if (entrada.length > MAX_RECIBIDO) throw new ErrorDeImagen('La foto pesa demasiado.', 413)
  const webp = await procesar(entrada)

  if ((await usoDelLocal(localId)) + webp.length > CUPO_POR_LOCAL) {
    throw new ErrorDeImagen('Llegaste al tope de fotos del local (25 MB). Quitá alguna que ya no uses y probá de nuevo.', 413)
  }

  const ruta = `${localId}/${randomUUID()}.webp`
  const storage = createServiceClient().storage.from(BUCKET)
  // Cada foto tiene un nombre nuevo, así que se puede guardar en caché para siempre.
  const { error } = await storage.upload(ruta, webp, { contentType: 'image/webp', cacheControl: '31536000', upsert: false })
  if (error) {
    console.error('[imagenes] no se pudo subir:', error.message)
    throw new ErrorDeImagen('No se pudo guardar la foto. Probá de nuevo en un momento.', 502)
  }
  return storage.getPublicUrl(ruta).data.publicUrl
}

/**
 * Si la dirección es de una foto NUESTRA, en la carpeta de ESE local, devuelve
 * su ruta en el bucket. Si no (otro local, otro sitio, el bucket de 369),
 * null: esas no se tocan nunca.
 */
function rutaPropia(localId: string, url: string | null | undefined): string | null {
  if (!url) return null
  const base = `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')}/storage/v1/object/public/${BUCKET}/`
  if (!url.startsWith(base)) return null
  const ruta = url.slice(base.length)
  return ruta.startsWith(`${localId}/`) && /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i.test(ruta) ? ruta : null
}

/**
 * La foto que se quiere guardar en un producto o un profesional. Vale:
 *   - vacía (se quita la foto);
 *   - la misma que ya tenía (se editó otra cosa; también una vieja de afuera);
 *   - una foto subida por acá a la carpeta de ESE local.
 * Pegar la dirección de una foto de otro sitio ya no se acepta: los links de
 * Instagram y Facebook vencen a los días, y la foto se rompe sin aviso.
 */
export function fotoValida(localId: string, nueva: string | null, actual: string | null): string | null {
  const limpia = nueva?.trim() || null
  if (!limpia || limpia === actual) return limpia
  if (rutaPropia(localId, limpia)) return limpia
  throw new ErrorDeImagen('La foto se sube desde el panel (no se puede pegar un link).')
}

/** Borra una foto vieja, si era nuestra y de ese local. Si falla, lo anota y sigue. */
export async function borrarFotoVieja(localId: string, vieja: string | null, nueva: string | null): Promise<void> {
  if (!vieja || vieja === nueva) return
  const ruta = rutaPropia(localId, vieja)
  if (!ruta) return
  const { error } = await createServiceClient().storage.from(BUCKET).remove([ruta])
  if (error) console.error(`[imagenes] no se pudo borrar la foto vieja ${ruta}:`, error.message)
}
