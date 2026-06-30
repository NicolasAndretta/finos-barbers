'use server'

import { createClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

/** Público: barberos activos (para la home y la reserva). */
export async function getBarberos() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('barberos')
    .select('*')
    .eq('activo', true)
    .order('nombre')
  if (error) throw new Error(error.message)
  return data
}

export async function adminGetBarberos() {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase.from('barberos').select('*').order('nombre')
  if (error) throw new Error(error.message)
  return data
}

function parseDias(raw: string | null): string[] {
  if (!raw) return []
  return raw.split(',').map(d => d.trim()).filter(Boolean)
}

export async function adminCrearBarbero(formData: FormData) {
  await requireAdmin()
  const nombre       = (formData.get('nombre') as string)?.trim()
  const apellido     = ((formData.get('apellido') as string) || '').trim()
  const bio          = ((formData.get('bio') as string) || '').trim() || null
  const especialidad = ((formData.get('especialidad') as string) || '').trim() || null
  const foto_url     = ((formData.get('foto_url') as string) || '').trim() || null
  const dias         = parseDias(formData.get('dias') as string)

  if (!nombre) return { error: 'El nombre es requerido' }

  const supabase = await createClient()
  const { error } = await supabase.from('barberos').insert({
    nombre, apellido, bio, especialidad, foto_url, dias, activo: true,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/barberos')
  return { success: true }
}

export async function adminActualizarBarbero(formData: FormData) {
  await requireAdmin()
  const id           = formData.get('id') as string
  const nombre       = (formData.get('nombre') as string)?.trim()
  const apellido     = ((formData.get('apellido') as string) || '').trim()
  const bio          = ((formData.get('bio') as string) || '').trim() || null
  const especialidad = ((formData.get('especialidad') as string) || '').trim() || null
  const foto_url     = ((formData.get('foto_url') as string) || '').trim() || null
  const dias         = parseDias(formData.get('dias') as string)

  if (!id || !nombre) return { error: 'Faltan campos requeridos' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('barberos')
    .update({ nombre, apellido, bio, especialidad, foto_url, dias })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/barberos')
  return { success: true }
}

export async function adminToggleBarbero(id: string) {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error: getErr } = await supabase
    .from('barberos').select('activo').eq('id', id).single()
  if (getErr || !data) return { error: 'Barbero no encontrado' }
  const { error } = await supabase
    .from('barberos').update({ activo: !data.activo }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/barberos')
  return { success: true }
}
