'use server'

import { createClient } from '@/lib/supabase'
import { exigirPermiso, exigirPlan, requireProfile } from '@/lib/auth'
import { localDeAccion } from '@/lib/local'
import { refrescarLocales } from '@/lib/refrescar'

/** Público: reseñas visibles de un local (para su home). */
export async function getResenasVisibles(slug: string) {
  const local = await localDeAccion(slug)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resenas')
    .select('*')
    .eq('local_id', local.id)
    .eq('visible', true)
    .order('orden')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function adminGetResenas(slug: string) {
  const local = await localDeAccion(slug)
  await exigirPermiso(local, 'editaCatalogo')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resenas').select('*').eq('local_id', local.id).order('orden').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function adminCrearResena(formData: FormData) {
  const local = await localDeAccion(formData.get('local'))
  await exigirPermiso(local, 'editaCatalogo')
  await exigirPlan(local, 'resenas')
  const nombre = (formData.get('nombre') as string)?.trim()
  const texto  = (formData.get('texto') as string)?.trim()
  const rating = parseInt((formData.get('rating') as string) || '5')
  const orden  = parseInt((formData.get('orden') as string) || '0')
  const visible = formData.get('visible') === 'on' || formData.get('visible') === 'true'

  if (!nombre || !texto) return { error: 'Nombre y texto son requeridos' }

  const supabase = await createClient()
  const { error } = await supabase.from('resenas').insert({
    local_id: local.id,
    nombre, texto,
    rating: Math.min(5, Math.max(1, isNaN(rating) ? 5 : rating)),
    orden: isNaN(orden) ? 0 : orden,
    visible,
  })
  if (error) return { error: error.message }
  refrescarLocales()
  return { success: true }
}

// Por id: la base solo deja tocar reseñas de un local donde tenés permiso.

export async function adminActualizarResena(formData: FormData) {
  await requireProfile()
  const id     = formData.get('id') as string
  const nombre = (formData.get('nombre') as string)?.trim()
  const texto  = (formData.get('texto') as string)?.trim()
  const rating = parseInt((formData.get('rating') as string) || '5')
  const orden  = parseInt((formData.get('orden') as string) || '0')

  if (!id || !nombre || !texto) return { error: 'Faltan campos requeridos' }

  const supabase = await createClient()
  const { data, error } = await supabase.from('resenas').update({
    nombre, texto,
    rating: Math.min(5, Math.max(1, isNaN(rating) ? 5 : rating)),
    orden: isNaN(orden) ? 0 : orden,
  }).eq('id', id).select('id')
  if (error) return { error: error.message }
  if (!data?.length) return { error: 'No se encontró la reseña o no tenés permiso para cambiarla.' }
  refrescarLocales()
  return { success: true }
}

export async function adminToggleResena(id: string) {
  await requireProfile()
  const supabase = await createClient()
  const { data, error: getErr } = await supabase
    .from('resenas').select('visible').eq('id', id).single()
  if (getErr || !data) return { error: 'Reseña no encontrada' }
  const { data: cambiadas, error } = await supabase.from('resenas').update({ visible: !data.visible }).eq('id', id).select('id')
  if (error) return { error: error.message }
  if (!cambiadas?.length) return { error: 'No tenés permiso para cambiar esta reseña.' }
  refrescarLocales()
  return { success: true }
}

export async function adminEliminarResena(id: string) {
  await requireProfile()
  const supabase = await createClient()
  const { data, error } = await supabase.from('resenas').delete().eq('id', id).select('id')
  if (error) return { error: error.message }
  if (!data?.length) return { error: 'No se encontró la reseña o no tenés permiso para borrarla.' }
  refrescarLocales()
  return { success: true }
}

/**
 * Un cliente deja la reseña de un turno suyo que ya pasó (Fase 7: reseñas
 * verificadas). Todo lo revisa la base (dejar_resena): que el turno sea suyo,
 * que haya ido, que ya haya pasado, una sola vez, y que el plan del local
 * traiga reseñas.
 */
export async function dejarResena(formData: FormData): Promise<{ error?: string }> {
  // Que exista el local de la página (la base revisa que el turno sea de él y del cliente).
  await localDeAccion(formData.get('local'))
  await requireProfile()
  const turno = formData.get('turno')
  const rating = Number(formData.get('rating'))
  const texto = formData.get('texto')
  if (typeof turno !== 'string' || typeof texto !== 'string') return { error: 'Faltan datos.' }
  const supabase = await createClient()
  const { error } = await supabase.rpc('dejar_resena', { p_turno: turno, p_rating: rating, p_texto: texto.slice(0, 600) })
  if (error) return { error: error.message }
  refrescarLocales()
  return {}
}
