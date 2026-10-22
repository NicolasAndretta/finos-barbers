'use server'

import { exigirPermiso } from '@/lib/auth'
import { localDeAccion } from '@/lib/local'
import { createServiceClient } from '@/lib/supabase'
import { refrescarLocales } from '@/lib/refrescar'

/**
 * Desconecta la cuenta de Mercado Pago del local. Solo quien lo administra.
 * (Conectar una cuenta por local completa en la Fase 4; hoy solo Roble tiene.)
 */
export async function desconectarMP(slug: string) {
  const local = await localDeAccion(slug)
  await exigirPermiso(local, 'administra')
  const supabase = createServiceClient()
  await supabase.from('mp_conexion').delete().eq('local_id', local.id)
  refrescarLocales()
  return { success: true }
}
