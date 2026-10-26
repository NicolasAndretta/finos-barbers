'use server'

import { createClient } from '@/lib/supabase'
import { requirePanelBarbero } from '@/lib/auth'
import { localDeAccion } from '@/lib/local'

// El panel del barbero (Fase 4b): todo con la SESIÓN de quien entra, no con la
// llave del servidor. Así lo cuidan las reglas de la base (Fase 2): el barbero
// ve su agenda ("es_mi_agenda") y los datos de quienes tienen turno con él
// ("puede_ver_persona"); quien administra el local, todo lo de su local.
// Aunque este código se equivocara de filtro, la base no le mostraría más.

/**
 * Turnos del barbero conectado, en ESTE local (su agenda).
 * El barbero sale de su membresía en el local (Fase 2), no del perfil: una
 * persona puede ser barbero en un local y cliente en otro.
 */
export async function getMisTurnos(slug: string) {
  const local = await localDeAccion(slug)
  const { permisos } = await requirePanelBarbero(local)
  if (!permisos.barberoId) return []

  const supabase = await createClient()
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

type Persona = { id: string; nombre: string; apellido: string; email: string }
const unaPersona = (p: unknown): Persona | null => (Array.isArray(p) ? p[0] ?? null : (p as Persona | null))

/**
 * Los clientes que ve el panel del barbero (solo lectura): nombre, apellido y
 * mail, para reconocer a quién atiende. Sin datos de pago.
 *   - El barbero: los que tienen o tuvieron turno con él. Es lo que dice el
 *     cuadro de la Fase 2 ("datos de clientes: los de sus turnos"); hasta la
 *     4b veía a todos los clientes del local.
 *   - Quien administra el local y no tiene agenda propia: todos los clientes
 *     del local (quien reservó o compró ahí).
 */
export async function getClientesLista(slug: string): Promise<{ clientes: Persona[]; alcance: 'mis_turnos' | 'local' }> {
  const local = await localDeAccion(slug)
  const { permisos } = await requirePanelBarbero(local)
  const supabase = await createClient()

  const { data, error } = permisos.barberoId
    ? await supabase.from('turnos').select('profiles ( id, nombre, apellido, email )').eq('local_id', local.id).eq('barbero_id', permisos.barberoId)
    : await supabase.from('membresias').select('profiles ( id, nombre, apellido, email )').eq('local_id', local.id).eq('rol', 'cliente')
  if (error) throw new Error(error.message)

  // Una vez cada uno (un cliente con varios turnos aparece en varias filas).
  const porId = new Map<string, Persona>()
  for (const fila of data ?? []) {
    const p = unaPersona(fila.profiles)
    if (p) porId.set(p.id, p)
  }
  return {
    clientes: [...porId.values()].sort((a, b) => (a.apellido || '').localeCompare(b.apellido || '')),
    alcance: permisos.barberoId ? 'mis_turnos' : 'local',
  }
}
