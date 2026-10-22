/**
 * src/lib/local.ts — SOLO SERVIDOR.
 *
 * Lee de la base el local que corresponde a una dirección, y qué puede hacer
 * en él quien está conectado. Lo usan las páginas, los layouts y las acciones.
 *
 * `cache` (de React) hace que, dentro de un mismo pedido, la base se consulte
 * una sola vez aunque el layout, la página y las acciones pregunten lo mismo.
 */

import { cache } from 'react'
import { createClient } from '@/lib/supabase'
import { aLocalPublico, esSlug, type FilaLocal, type LocalPublico } from '@/lib/local-datos'

/**
 * El local de esa dirección, o null si no existe.
 * Usa `datos_del_local` (migración 0008): devuelve solo datos públicos, y la
 * pueden llamar también los visitantes sin cuenta.
 */
export const getLocal = cache(async (slug: string): Promise<LocalPublico | null> => {
  if (!esSlug(slug)) return null
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('datos_del_local', { p_slug: slug })
  if (error) throw new Error(`No se pudo leer el local "${slug}": ${error.message}`)
  const fila = (data as FilaLocal[] | null)?.[0]
  return fila ? aLocalPublico(fila) : null
})

export type Permisos = {
  /** Admin de la plataforma o dueño de este local: todo, incluso la caja. */
  administra: boolean
  /** Edita el catálogo: quien administra, y la comercial. */
  editaCatalogo: boolean
  /** Ve turnos, pedidos y clientes: quien administra, y la comercial en las demos. */
  operaPrivado: boolean
  /** Si es barbero de este local, cuál (su agenda). */
  barberoId: string | null
}

const SIN_PERMISOS: Permisos = { administra: false, editaCatalogo: false, operaPrivado: false, barberoId: null }

/**
 * Qué puede hacer en ese local quien está conectado (`permisos_en_local`,
 * migración 0008). Sin sesión, todo en falso. Son las mismas reglas que usa la
 * base para frenar: la app las pregunta solo para decidir qué mostrar.
 */
export const getPermisos = cache(async (localId: string): Promise<Permisos> => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('permisos_en_local', { p_local: localId })
  if (error) {
    console.error('[local] no se pudieron leer los permisos:', error.message)
    return SIN_PERMISOS
  }
  const fila = (data as { administra: boolean; edita_catalogo: boolean; opera_privado: boolean; barbero_id: string | null }[] | null)?.[0]
  if (!fila) return SIN_PERMISOS
  return {
    administra: !!fila.administra,
    editaCatalogo: !!fila.edita_catalogo,
    operaPrivado: !!fila.opera_privado,
    barberoId: fila.barbero_id,
  }
})

/**
 * Para las acciones del servidor: el local del slug que mandó la pantalla.
 * Si no existe, corta con un error (una pantalla legítima nunca manda uno
 * inexistente: es alguien llamando a la acción a mano).
 */
export async function localDeAccion(slug: unknown): Promise<LocalPublico> {
  const local = typeof slug === 'string' ? await getLocal(slug) : null
  if (!local) throw new Error('Local no encontrado')
  return local
}
