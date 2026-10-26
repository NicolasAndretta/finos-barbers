'use server'

import { exigirPermiso } from '@/lib/auth'
import { localDeAccion } from '@/lib/local'
import { desconectar } from '@/lib/mp-conexion'
import { refrescarLocales } from '@/lib/refrescar'

/**
 * Desconecta la cuenta de Mercado Pago de ESTE local (las de los demás no se
 * tocan). Solo quien lo administra: su dueño o el admin de la plataforma.
 */
export async function desconectarMP(slug: string) {
  const local = await localDeAccion(slug)
  await exigirPermiso(local, 'administra')
  await desconectar(local.id)
  refrescarLocales()
  return { success: true }
}
