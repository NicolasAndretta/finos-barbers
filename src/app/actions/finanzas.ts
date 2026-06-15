'use server'

import { createClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function adminGetTransacciones() {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transacciones')
    .select('*')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function adminCrearTransaccion(formData: FormData) {
  const profile = await requireAdmin()

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
    tipo,
    categoria,
    monto,
    descripcion: descripcion.trim(),
    fecha,
    origen:     'manual',
    created_by: profile.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/finanzas')
  return { success: true }
}

export async function adminActualizarTransaccion(formData: FormData) {
  await requireAdmin()

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
  const { error } = await supabase
    .from('transacciones')
    .update({ tipo, categoria, monto, descripcion: descripcion.trim(), fecha })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/finanzas')
  return { success: true }
}

export async function adminEliminarTransaccion(id: string) {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from('transacciones').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/finanzas')
  return { success: true }
}
