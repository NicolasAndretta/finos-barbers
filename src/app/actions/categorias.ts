'use server'

import { createClient } from '@/lib/supabase'
import { exigirPermiso, exigirPlan, requireProfile } from '@/lib/auth'
import { localDeAccion } from '@/lib/local'
import { refrescarLocales } from '@/lib/refrescar'

export type TipoCategoria = 'producto' | 'servicio'

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Público: categorías activas de un tipo, de un local (para selectores y filtros). */
export async function getCategorias(slug: string, tipo: TipoCategoria) {
  const local = await localDeAccion(slug)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('local_id', local.id)
    .eq('tipo', tipo)
    .eq('activo', true)
    .order('orden')
    .order('nombre')
  if (error) throw new Error(error.message)
  return data
}

export async function adminGetCategorias(slug: string, tipo?: TipoCategoria) {
  const local = await localDeAccion(slug)
  await exigirPermiso(local, 'editaCatalogo')
  const supabase = await createClient()
  let q = supabase.from('categorias').select('*').eq('local_id', local.id).order('tipo').order('orden').order('nombre')
  if (tipo) q = q.eq('tipo', tipo)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data
}

export async function adminCrearCategoria(formData: FormData) {
  const local = await localDeAccion(formData.get('local'))
  await exigirPermiso(local, 'editaCatalogo')
  await exigirPlan(local, 'tienda')
  const nombre   = (formData.get('nombre') as string)?.trim()
  const tipo     = formData.get('tipo') as TipoCategoria
  const parentId = (formData.get('parent_id') as string) || null
  const orden    = parseInt((formData.get('orden') as string) || '0')

  if (!nombre || !tipo) return { error: 'Faltan campos requeridos' }

  const supabase = await createClient()
  // La categoría madre tiene que ser del mismo local: la base lo exige (candado doble).
  const { error } = await supabase.from('categorias').insert({
    local_id: local.id,
    nombre,
    slug: slugify(nombre),
    tipo,
    parent_id: parentId || null,
    orden: isNaN(orden) ? 0 : orden,
    activo: true,
  })
  if (error) return { error: error.message }

  refrescarLocales()
  return { success: true }
}

// Por id: la base solo deja tocar categorías de un local donde tenés permiso.

export async function adminActualizarCategoria(formData: FormData) {
  await requireProfile()
  const id       = formData.get('id') as string
  const nombre   = (formData.get('nombre') as string)?.trim()
  const parentId = (formData.get('parent_id') as string) || null
  const orden    = parseInt((formData.get('orden') as string) || '0')

  if (!id || !nombre) return { error: 'Faltan campos requeridos' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categorias')
    .update({
      nombre,
      slug: slugify(nombre),
      parent_id: parentId || null,
      orden: isNaN(orden) ? 0 : orden,
    })
    .eq('id', id)
    .select('id')
  if (error) return { error: error.message }
  if (!data?.length) return { error: 'No se encontró la categoría o no tenés permiso para cambiarla.' }

  refrescarLocales()
  return { success: true }
}

export async function adminToggleCategoria(id: string) {
  await requireProfile()
  const supabase = await createClient()
  const { data, error: getErr } = await supabase
    .from('categorias').select('activo').eq('id', id).single()
  if (getErr || !data) return { error: 'Categoría no encontrada' }
  const { data: cambiadas, error } = await supabase
    .from('categorias').update({ activo: !data.activo }).eq('id', id).select('id')
  if (error) return { error: error.message }
  if (!cambiadas?.length) return { error: 'No tenés permiso para cambiar esta categoría.' }
  refrescarLocales()
  return { success: true }
}

export async function adminEliminarCategoria(id: string) {
  await requireProfile()
  const supabase = await createClient()
  // Los productos/servicios con esta categoría quedan con categoria_id = null (FK on delete set null).
  // Borrar solo lo puede quien administra el local (Fase 2).
  const { data, error } = await supabase.from('categorias').delete().eq('id', id).select('id')
  if (error) return { error: error.message }
  if (!data?.length) return { error: 'No se encontró la categoría o no tenés permiso para borrarla.' }
  refrescarLocales()
  return { success: true }
}
