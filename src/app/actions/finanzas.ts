'use server'

import { createClient } from '@/lib/supabase'
import { exigirPermiso, exigirPlan, requireProfile } from '@/lib/auth'
import { localDeAccion } from '@/lib/local'
import { refrescarLocales } from '@/lib/refrescar'

// La caja de un local la ve y la toca solo quien lo administra (el dueño y el
// admin de la plataforma). La comercial no (Fase 2).

export async function adminGetTransacciones(slug: string) {
  const local = await localDeAccion(slug)
  await exigirPermiso(local, 'administra')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transacciones')
    .select('*')
    .eq('local_id', local.id)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function adminCrearTransaccion(formData: FormData) {
  const local = await localDeAccion(formData.get('local'))
  const profile = await exigirPermiso(local, 'administra')
  await exigirPlan(local, 'finanzas')

  const tipo        = formData.get('tipo') as string
  const categoria   = formData.get('categoria') as string
  const montoStr    = formData.get('monto') as string
  const descripcion = formData.get('descripcion') as string
  const fecha       = formData.get('fecha') as string

  if (!tipo || !categoria || !montoStr || !descripcion || !fecha) {
    return { error: 'Faltan campos requeridos' }
  }

  const monto = parseFloat(montoStr)
  if (isNaN(monto) || monto <= 0) return { error: 'El monto debe ser mayor a 0' }

  const supabase = await createClient()
  const { error } = await supabase.from('transacciones').insert({
    local_id:   local.id,
    tipo,
    categoria,
    monto,
    descripcion: descripcion.trim(),
    fecha,
    origen:     'manual',
    created_by: profile.id,
  })

  if (error) return { error: error.message }

  refrescarLocales()
  return { success: true }
}

// Por id: la base solo deja tocar movimientos de un local que administrás.

export async function adminActualizarTransaccion(formData: FormData) {
  await requireProfile()

  const id          = formData.get('id') as string
  const tipo        = formData.get('tipo') as string
  const categoria   = formData.get('categoria') as string
  const montoStr    = formData.get('monto') as string
  const descripcion = formData.get('descripcion') as string
  const fecha       = formData.get('fecha') as string

  if (!id || !tipo || !categoria || !montoStr || !descripcion || !fecha) {
    return { error: 'Faltan campos requeridos' }
  }

  const monto = parseFloat(montoStr)
  if (isNaN(monto) || monto <= 0) return { error: 'El monto debe ser mayor a 0' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transacciones')
    .update({ tipo, categoria, monto, descripcion: descripcion.trim(), fecha })
    .eq('id', id)
    .select('id')

  if (error) return { error: error.message }
  if (!data?.length) return { error: 'No se encontró el movimiento o no tenés permiso para cambiarlo.' }

  refrescarLocales()
  return { success: true }
}

export async function adminEliminarTransaccion(id: string) {
  await requireProfile()
  const supabase = await createClient()
  const { data, error } = await supabase.from('transacciones').delete().eq('id', id).select('id')
  if (error) return { error: error.message }
  if (!data?.length) return { error: 'No se encontró el movimiento o no tenés permiso para borrarlo.' }
  refrescarLocales()
  return { success: true }
}
