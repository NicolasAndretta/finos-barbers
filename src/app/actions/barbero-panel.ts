'use server'

import { createServiceClient } from '@/lib/supabase'
import { requireBarbero } from '@/lib/auth'

/**
 * Turnos del barbero logueado (los suyos). Scopeado por su barbero_id: el guard
 * requireBarbero asegura el rol y el filtro por barbero_id asegura que solo ve
 * lo propio. Usa service client porque el rol barbero no tiene políticas RLS
 * de lectura sobre turnos (el acceso queda acotado acá, server-side).
 */
export async function getMisTurnos() {
  const profile = await requireBarbero()
  if (!profile.barbero_id) return []

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('turnos')
    .select(`
      id, fecha, hora, estado,
      profiles ( nombre, apellido ),
      servicios ( nombre, duracion_minutos, precio )
    `)
    .eq('barbero_id', profile.barbero_id)
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
 * Lista de clientes (solo lectura) para el barbero. No incluye datos sensibles
 * de pago; solo contacto básico para reconocer a quién atiende.
 */
export async function getClientesLista() {
  await requireBarbero()

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nombre, apellido, email')
    .eq('role', 'client')
    .order('apellido', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}
