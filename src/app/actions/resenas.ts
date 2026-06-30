'use server'

import { createClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

/** Público: reseñas visibles (para la home). */
export async function getResenasVisibles() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resenas')
    .select('*')
    .eq('visible', true)
    .order('orden')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function adminGetResenas() {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resenas').select('*').order('orden').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function adminCrearResena(formData: FormData) {
  await requireAdmin()
  const nombre = (formData.get('nombre') as string)?.trim()
  const texto  = (formData.get('texto') as string)?.trim()
  const rating = parseInt((formData.get('rating') as string) || '5')
  const orden  = parseInt((formData.get('orden') as string) || '0')
  const visible = formData.get('visible') === 'on' || formData.get('visible') === 'true'

  if (!nombre || !texto) return { error: 'Nombre y texto son requeridos' }

  const supabase = await createClient()
  const { error } = await supabase.from('resenas').insert({
    nombre, texto,
    rating: Math.min(5, Math.max(1, isNaN(rating) ? 5 : rating)),
    orden: isNaN(orden) ? 0 : orden,
    visible,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/resenas'); revalidatePath('/')
  return { success: true }
}

export async function adminActualizarResena(formData: FormData) {
  await requireAdmin()
  const id     = formData.get('id') as string
  const nombre = (formData.get('nombre') as string)?.trim()
  const texto  = (formData.get('texto') as string)?.trim()
  const rating = parseInt((formData.get('rating') as string) || '5')
  const orden  = parseInt((formData.get('orden') as string) || '0')

  if (!id || !nombre || !texto) return { error: 'Faltan campos requeridos' }

  const supabase = await createClient()
  const { error } = await supabase.from('resenas').update({
    nombre, texto,
    rating: Math.min(5, Math.max(1, isNaN(rating) ? 5 : rating)),
    orden: isNaN(orden) ? 0 : orden,
  }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/resenas'); revalidatePath('/')
  return { success: true }
}

export async function adminToggleResena(id: string) {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error: getErr } = await supabase
    .from('resenas').select('visible').eq('id', id).single()
  if (getErr || !data) return { error: 'Reseña no encontrada' }
  const { error } = await supabase.from('resenas').update({ visible: !data.visible }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/resenas'); revalidatePath('/')
  return { success: true }
}

export async function adminEliminarResena(id: string) {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from('resenas').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/resenas'); revalidatePath('/')
  return { success: true }
}
