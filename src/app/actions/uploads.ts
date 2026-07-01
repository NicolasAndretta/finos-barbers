'use server'

import { createServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const BUCKET = 'imagenes'

/**
 * Sube una imagen al Storage de Supabase (bucket público "imagenes") y devuelve
 * su URL pública. Solo admin. La valida por tipo y tamaño.
 */
export async function subirImagen(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  await requireAdmin()

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'No se seleccionó ninguna imagen.' }
  if (!file.type.startsWith('image/')) return { error: 'El archivo debe ser una imagen.' }
  if (file.size > MAX_BYTES) return { error: 'La imagen supera los 5 MB.' }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const supabase = createServiceClient()
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  })
  if (error) return { error: error.message }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl }
}
