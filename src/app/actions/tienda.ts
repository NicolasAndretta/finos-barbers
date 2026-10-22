'use server'

import { createClient } from '@/lib/supabase'
import { exigirPermiso, requireProfile } from '@/lib/auth'
import { localDeAccion } from '@/lib/local'
import { refrescarLocales } from '@/lib/refrescar'

/**
 * Catálogo público de la tienda de un local.
 *
 * Si la base no responde devuelve una lista vacía en lugar de tirar: la página
 * ya tiene programado el estado "la tienda está en construcción" y eso es mucho
 * mejor que una pantalla de error 500 mientras se está mostrando la demo.
 * El error igual queda en el log del servidor.
 *
 * ⚠️ El panel usa `adminGetProductos`, que SÍ tira: ahí un fallo tiene que
 * verse, porque significa que no se puede administrar el catálogo.
 */
export async function getProductos(slug: string) {
  const local = await localDeAccion(slug)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('local_id', local.id)
    .eq('activo', true)
    .order('nombre')

  if (error) {
    console.error('[tienda] no se pudo leer el catálogo:', error.message)
    return []
  }
  return data ?? []
}

export async function adminGetProductos(slug: string) {
  const local = await localDeAccion(slug)
  await exigirPermiso(local, 'editaCatalogo')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('local_id', local.id)
    .order('nombre')

  if (error) throw new Error(error.message)
  return data
}

export async function adminCrearProducto(formData: FormData) {
  const local = await localDeAccion(formData.get('local'))
  await exigirPermiso(local, 'editaCatalogo')

  const nombre       = formData.get('nombre') as string
  const descripcion  = formData.get('descripcion') as string
  const precio       = formData.get('precio') as string
  const stock        = formData.get('stock') as string
  const stockMinimo  = formData.get('stock_minimo') as string
  const imagen_url   = (formData.get('imagen_url') as string) || null
  const categoria    = formData.get('categoria') as string

  if (!nombre || !descripcion || !precio || !stock || !categoria) {
    return { error: 'Faltan campos requeridos' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('productos').insert({
    local_id: local.id,
    nombre,
    descripcion,
    precio: parseFloat(precio),
    stock: parseInt(stock),
    stock_minimo: stockMinimo ? parseInt(stockMinimo) : 3,
    imagen_url: imagen_url?.trim() || null,
    categoria,
    activo: true,
  })

  if (error) return { error: error.message }

  refrescarLocales()
  return { success: true }
}

// Las que siguen trabajan por id. No necesitan el local: la base solo deja
// tocar productos de un local donde tenés permiso (Fase 2). Si no tocó
// ninguna fila (no existe o no es tuyo), se avisa en vez de decir "guardado".

export async function adminActualizarProducto(formData: FormData) {
  await requireProfile()

  const id           = formData.get('id') as string
  const nombre       = formData.get('nombre') as string
  const descripcion  = formData.get('descripcion') as string
  const precio       = formData.get('precio') as string
  const stock        = formData.get('stock') as string
  const stockMinimo  = formData.get('stock_minimo') as string
  const imagen_url   = (formData.get('imagen_url') as string) || null
  const categoria    = formData.get('categoria') as string

  if (!id || !nombre || !descripcion || !precio || !stock || !categoria) {
    return { error: 'Faltan campos requeridos' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('productos')
    .update({
      nombre,
      descripcion,
      precio: parseFloat(precio),
      stock: parseInt(stock),
      ...(stockMinimo ? { stock_minimo: parseInt(stockMinimo) } : {}),
      imagen_url: imagen_url?.trim() || null,
      categoria,
    })
    .eq('id', id)
    .select('id')

  if (error) return { error: error.message }
  if (!data?.length) return { error: 'No se encontró el producto o no tenés permiso para cambiarlo.' }

  refrescarLocales()
  return { success: true }
}

export async function adminToggleProducto(id: string) {
  await requireProfile()
  const supabase = await createClient()

  const { data, error: getErr } = await supabase
    .from('productos')
    .select('activo')
    .eq('id', id)
    .single()

  if (getErr || !data) return { error: 'Producto no encontrado' }

  const { data: cambiados, error } = await supabase
    .from('productos')
    .update({ activo: !data.activo })
    .eq('id', id)
    .select('id')

  if (error) return { error: error.message }
  if (!cambiados?.length) return { error: 'No tenés permiso para cambiar este producto.' }

  refrescarLocales()
  return { success: true, activo: !data.activo }
}
