'use server'

import { createClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export type TipoCategoria = 'producto' | 'servicio'

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Público: categorías activas de un tipo (para selectores y filtros). */
export async function getCategorias(tipo: TipoCategoria) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('tipo', tipo)
    .eq('activo', true)
    .order('orden')
    .order('nombre')
  if (error) throw new Error(error.message)
  return data
}

export async function adminGetCategorias(tipo?: TipoCategoria) {
  await requireAdmin()
  const supabase = await createClient()
  let q = supabase.from('categorias').select('*').order('tipo').order('orden').order('nombre')
  if (tipo) q = q.eq('tipo', tipo)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data
}

export async function adminCrearCategoria(formData: FormData) {
  await requireAdmin()
  const nombre   = (formData.get('nombre') as string)?.trim()
  const tipo     = formData.get('tipo') as TipoCategoria
  const parentId = (formData.get('parent_id') as string) || null
  const orden    = parseInt((formData.get('orden') as string) || '0')

  if (!nombre || !tipo) return { error: 'Faltan campos requeridos' }

  const supabase = await createClient()
  const { error } = await supabase.from('categorias').insert({
    nombre,
    slug: slugify(nombre),
    tipo,
    parent_id: parentId || null,
    orden: isNaN(orden) ? 0 : orden,
    activo: true,
  })
  if (error) return { error: error.message }

  revalidatePath('/admin/categorias')
  revalidatePath('/tienda')
  return { success: true }
}

export async function adminActualizarCategoria(formData: FormData) {
  await requireAdmin()
  const id       = formData.get('id') as string
  const nombre   = (formData.get('nombre') as string)?.trim()
  const parentId = (formData.get('parent_id') as string) || null
  const orden    = parseInt((formData.get('orden') as string) || '0')

  if (!id || !nombre) return { error: 'Faltan campos requeridos' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('categorias')
    .update({
      nombre,
      slug: slugify(nombre),
      parent_id: parentId || null,
      orden: isNaN(orden) ? 0 : orden,
    })
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/categorias')
  revalidatePath('/tienda')
  return { success: true }
}

export async function adminToggleCategoria(id: string) {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error: getErr } = await supabase
    .from('categorias').select('activo').eq('id', id).single()
  if (getErr || !data) return { error: 'Categoría no encontrada' }
  const { error } = await supabase
    .from('categorias').update({ activo: !data.activo }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/categorias')
  revalidatePath('/tienda')
  return { success: true }
}

export async function adminEliminarCategoria(id: string) {
  await requireAdmin()
  const supabase = await createClient()
  // Los productos/servicios con esta categoría quedan con categoria_id = null (FK on delete set null).
  const { error } = await supabase.from('categorias').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/categorias')
  revalidatePath('/tienda')
  return { success: true }
}
