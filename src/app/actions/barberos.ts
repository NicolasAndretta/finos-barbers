'use server'

import { createClient, createServiceClient } from '@/lib/supabase'
import { exigirPermiso, requireProfile } from '@/lib/auth'
import { localDeAccion } from '@/lib/local'
import { refrescarLocales } from '@/lib/refrescar'
import { borrarFotoVieja, fotoValida } from '@/lib/imagenes'

/** La foto que se quiere guardar, revisada (lib/imagenes.ts), o el error para mostrar. */
function revisarFoto(localId: string, nueva: string | null, actual: string | null): { foto: string | null } | { error: string } {
  try {
    return { foto: fotoValida(localId, nueva, actual) }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Foto inválida' }
  }
}

/** Público: barberos activos de un local (para su home y la reserva). */
export async function getBarberos(slug: string) {
  const local = await localDeAccion(slug)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('barberos')
    .select('*')
    .eq('local_id', local.id)
    .eq('activo', true)
    .order('nombre')
  if (error) throw new Error(error.message)
  return data
}

export async function adminGetBarberos(slug: string) {
  const local = await localDeAccion(slug)
  await exigirPermiso(local, 'editaCatalogo')
  const supabase = await createClient()
  // Las cuentas de acceso de cada uno salen de las membresías de barbero de
  // ESTE local (Fase 4b; antes, del perfil, que es de toda la plataforma).
  // Con la sesión: quien no opera lo privado del local no ve los mails.
  const { data, error } = await supabase
    .from('barberos')
    .select('*, membresias(user_id, rol, profiles(email))')
    .eq('local_id', local.id)
    .order('nombre')
  if (error) throw new Error(error.message)
  type Membresia = { user_id: string; rol: string; profiles: { email: string } | { email: string }[] | null }
  return (data ?? []).map(({ membresias, ...barbero }) => ({
    ...barbero,
    cuentas: ((membresias ?? []) as Membresia[])
      .filter((m) => m.rol === 'barbero')
      .map((m) => ({ id: m.user_id, email: (Array.isArray(m.profiles) ? m.profiles[0]?.email : m.profiles?.email) ?? '' })),
  }))
}

/**
 * Crea una cuenta de acceso (rol "barbero") vinculada a un barbero del local.
 * Es darle a alguien entrada al sistema. Pueden hacerlo quien administra el
 * local (el dueño, el admin de la plataforma) y la comercial mientras el local
 * está en demo, para dejarlo armado. Una vez entregado (activo), es cosa del
 * dueño (decisión de Nico, 25/10/2026). Es la misma regla que "opera lo
 * privado" de la Fase 2. Usa la llave del servidor (crear un usuario ya
 * confirmado), así que acá se revisa todo a mano:
 *   - el permiso, en el local de la pantalla;
 *   - que el barbero sea de ESE local.
 * Desde la Fase 4b la membresía de barbero se crea acá, directamente. Antes se
 * ponía `role = 'barbero'` en el perfil (que es de toda la plataforma) y un
 * disparador temporal de la Fase 2 copiaba la membresía; la 0012 lo saca.
 */
export async function adminCrearCuentaBarbero(formData: FormData) {
  const local = await localDeAccion(formData.get('local'))
  await exigirPermiso(local, 'operaPrivado')
  const barberoId = formData.get('barbero_id') as string
  const email = ((formData.get('email') as string) || '').trim().toLowerCase()
  const password = (formData.get('password') as string) || ''

  if (!barberoId || !email) return { error: 'Faltan datos.' }
  if (password.length < 6) return { error: 'La contraseña debe tener al menos 6 caracteres.' }

  const service = createServiceClient()

  const { data: barbero } = await service
    .from('barberos').select('nombre, apellido').eq('id', barberoId).eq('local_id', local.id).single()
  if (!barbero) return { error: 'Ese barbero no es de este local.' }

  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (createErr || !created?.user) {
    return { error: createErr?.message || 'No se pudo crear la cuenta (¿el email ya existe?).' }
  }

  // El perfil, con su nombre (el rol de la plataforma queda en 'client': lo
  // que puede hacer en cada local lo dice su membresía).
  const { error: profErr } = await service.from('profiles').upsert(
    { id: created.user.id, email, nombre: barbero.nombre, apellido: barbero.apellido || '' },
    { onConflict: 'id' }
  )
  // Su agenda en ESTE local.
  const { error: membErr } = profErr ? { error: null } : await service.from('membresias').insert({
    user_id: created.user.id, local_id: local.id, rol: 'barbero', barbero_id: barberoId,
  })
  if (profErr || membErr) {
    // Si algo falló, se deshace la cuenta: no queda una cuenta a medias.
    await service.auth.admin.deleteUser(created.user.id)
    return { error: (profErr ?? membErr)!.message }
  }

  refrescarLocales()
  return { success: true }
}

function parseDias(raw: string | null): string[] {
  if (!raw) return []
  return raw.split(',').map(d => d.trim()).filter(Boolean)
}

export async function adminCrearBarbero(formData: FormData) {
  const local = await localDeAccion(formData.get('local'))
  await exigirPermiso(local, 'editaCatalogo')
  const nombre       = (formData.get('nombre') as string)?.trim()
  const apellido     = ((formData.get('apellido') as string) || '').trim()
  const bio          = ((formData.get('bio') as string) || '').trim() || null
  const especialidad = ((formData.get('especialidad') as string) || '').trim() || null
  const foto_url     = ((formData.get('foto_url') as string) || '').trim() || null
  const dias         = parseDias(formData.get('dias') as string)

  if (!nombre) return { error: 'El nombre es requerido' }
  // La foto tiene que estar subida desde el panel, en la carpeta de ESTE local.
  const revisada = revisarFoto(local.id, foto_url, null)
  if ('error' in revisada) return { error: revisada.error }

  const supabase = await createClient()
  const { error } = await supabase.from('barberos').insert({
    local_id: local.id, nombre, apellido, bio, especialidad, foto_url: revisada.foto, dias, activo: true,
  })
  if (error) return { error: error.message }
  refrescarLocales()
  return { success: true }
}

// Por id: la base solo deja tocar barberos de un local donde tenés permiso.

export async function adminActualizarBarbero(formData: FormData) {
  await requireProfile()
  const id           = formData.get('id') as string
  const nombre       = (formData.get('nombre') as string)?.trim()
  const apellido     = ((formData.get('apellido') as string) || '').trim()
  const bio          = ((formData.get('bio') as string) || '').trim() || null
  const especialidad = ((formData.get('especialidad') as string) || '').trim() || null
  const foto_url     = ((formData.get('foto_url') as string) || '').trim() || null
  const dias         = parseDias(formData.get('dias') as string)

  if (!id || !nombre) return { error: 'Faltan campos requeridos' }

  const supabase = await createClient()
  // De qué local es y qué foto tenía: para revisar la nueva y borrar la vieja.
  const { data: antes } = await supabase.from('barberos').select('local_id, foto_url').eq('id', id).maybeSingle()
  if (!antes) return { error: 'No se encontró el barbero o no tenés permiso para cambiarlo.' }
  const revisada = revisarFoto(antes.local_id, foto_url, antes.foto_url)
  if ('error' in revisada) return { error: revisada.error }

  const { data, error } = await supabase
    .from('barberos')
    .update({ nombre, apellido, bio, especialidad, foto_url: revisada.foto, dias })
    .eq('id', id)
    .select('id')
  if (error) return { error: error.message }
  if (!data?.length) return { error: 'No se encontró el barbero o no tenés permiso para cambiarlo.' }
  // Recién con el cambio guardado (la base confirmó el permiso), la foto
  // reemplazada o quitada se borra.
  await borrarFotoVieja(antes.local_id, antes.foto_url, revisada.foto)
  refrescarLocales()
  return { success: true }
}

export async function adminToggleBarbero(id: string) {
  await requireProfile()
  const supabase = await createClient()
  const { data, error: getErr } = await supabase
    .from('barberos').select('activo').eq('id', id).single()
  if (getErr || !data) return { error: 'Barbero no encontrado' }
  const { data: cambiados, error } = await supabase
    .from('barberos').update({ activo: !data.activo }).eq('id', id).select('id')
  if (error) return { error: error.message }
  if (!cambiados?.length) return { error: 'No tenés permiso para cambiar este barbero.' }
  refrescarLocales()
  return { success: true }
}
