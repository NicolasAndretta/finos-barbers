'use server'

import { createServiceClient } from '@/lib/supabase'
import { requirePanelBarbero } from '@/lib/auth'
import { localDeAccion } from '@/lib/local'

/**
 * Turnos del barbero conectado, en ESTE local (su agenda).
 *
 * El barbero sale de su membresía en el local (Fase 2), no del perfil: una
 * persona puede ser barbero en un local y cliente en otro. Usa la llave del
 * servidor, así que el filtro por local y por barbero se hace acá, a mano.
 */
export async function getMisTurnos(slug: string) {
  const local = await localDeAccion(slug)
  const { permisos } = await requirePanelBarbero(local)
  if (!permisos.barberoId) return []

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('turnos')
    .select(`
      id, fecha, hora, estado,
      profiles ( nombre, apellido ),
      servicios ( nombre, duracion_minutos, precio )
    `)
    .eq('local_id', local.id)
    .eq('barbero_id', permisos.barberoId)
    .neq('estado', 'cancelado')
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true })

  if (error) throw new Error(error.message)

  return (data ?? []).map((t) => ({
    ...t,
    profiles: Array.isArray(t.profiles) ? t.profiles[0] ?? null : t.profiles,
    servicios: Array.isArray(t.servicios) ? t.servicios[0] ?? null : t.servicios,
  }))
}

/**
 * Los clientes de ESTE local (solo lectura), para que el barbero reconozca a
 * quién atiende. Sin datos de pago: nombre, apellido y mail.
 * Un cliente de un local es quien reservó o compró ahí (membresía "cliente").
 */
export async function getClientesLista(slug: string) {
  const local = await localDeAccion(slug)
  await requirePanelBarbero(local)

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('membresias')
    .select('profiles ( id, nombre, apellido, email )')
    .eq('local_id', local.id)
    .eq('rol', 'cliente')

  if (error) throw new Error(error.message)
  return (data ?? [])
    .map((m) => (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles) as { id: string; nombre: string; apellido: string; email: string } | null)
    .filter((p): p is { id: string; nombre: string; apellido: string; email: string } => !!p)
    .sort((a, b) => (a.apellido || '').localeCompare(b.apellido || ''))
}
