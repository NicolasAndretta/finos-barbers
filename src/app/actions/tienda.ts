'use server'

import { createClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getProductos() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('activo', true)
    .order('nombre')

  if (error) throw new Error(error.message)
  return data
}

export async function adminGetProductos() {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .order('nombre')

  if (error) throw new Error(error.message)
  return data
}

export async function adminCrearProducto(formData: FormData) {
  await requireAdmin()

  const nombre      = formData.get('nombre') as string
  const descripcion = formData.get('descripcion') as string
  const precio      = formData.get('precio') as string
  const stock       = formData.get('stock') as string
  const imagen_url  = (formData.get('imagen_url') as string) || null
  const categoria   = formData.get('categoria') as string

  if (!nombre || !descripcion || !precio || !stock || !categoria) {
    return { error: 'Faltan campos requeridos' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('productos').insert({
    nombre,
    descripcion,
    precio: parseFloat(precio),
    stock: parseInt(stock),
    imagen_url: imagen_url?.trim() || null,
    categoria,
    activo: true,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/productos')
  revalidatePath('/tienda')
  return { success: true }
}

export async function adminActualizarProducto(formData: FormData) {
  await requireAdmin()

  const id          = formData.get('id') as string
  const nombre      = formData.get('nombre') as string
  const descripcion = formData.get('descripcion') as string
  const precio      = formData.get('precio') as string
  const stock       = formData.get('stock') as string
  const imagen_url  = (formData.get('imagen_url') as string) || null
  const categoria   = formData.get('categoria') as string

  if (!id || !nombre || !descripcion || !precio || !stock || !categoria) {
    return { error: 'Faltan campos requeridos' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('productos')
    .update({
      nombre,
      descripcion,
      precio: parseFloat(precio),
      stock: parseInt(stock),
      imagen_url: imagen_url?.trim() || null,
      categoria,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/productos')
  revalidatePath('/tienda')
  return { success: true }
}

export async function adminToggleProducto(id: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error: getErr } = await supabase
    .from('productos')
    .select('activo')
    .eq('id', id)
    .single()

  if (getErr || !data) return { error: 'Producto no encontrado' }

  const { error } = await supabase
    .from('productos')
    .update({ activo: !data.activo })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/productos')
  revalidatePath('/tienda')
  return { success: true, activo: !data.activo }
}
