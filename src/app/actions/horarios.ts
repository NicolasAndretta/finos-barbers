'use server'

/**
 * Horarios de un local (Fase 3b): lo que muestra la web y lo que se carga
 * desde el panel. Quién puede tocar qué lo deciden las reglas de la base
 * (migración 0010): los horarios y las ausencias los edita quien edita el
 * catálogo (dueño, admin de la plataforma, comercial).
 */

import { createClient } from '@/lib/supabase'
import { exigirPermiso, requireProfile } from '@/lib/auth'
import { localDeAccion } from '@/lib/local'
import { refrescarLocales } from '@/lib/refrescar'
import { resumenSemanal } from '@/lib/horarios'

const esId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
const esFecha = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

/**
 * Público: el resumen de la semana para la web del local
 * ("Lunes a Sábado 10:00 – 20:00", "Domingo Cerrado"). Sale de la misma tabla
 * que usa la reserva, así que la web y la reserva no pueden decir cosas
 * distintas. Si el local no cargó horarios, lista vacía.
 */
export async function getHorariosSemana(slug: string) {
  const local = await localDeAccion(slug)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('horarios')
    .select('dia_semana, desde, hasta')
    .eq('local_id', local.id)
    .is('barbero_id', null)
  if (error) {
    console.error('[horarios] no se pudieron leer:', error.message)
    return []
  }
  return data?.length ? resumenSemanal(data) : []
}

/** Panel: todo lo de horarios del local, para la pantalla "Horarios". */
export async function adminGetHorarios(slug: string) {
  const local = await localDeAccion(slug)
  await exigirPermiso(local, 'editaCatalogo')
  const supabase = await createClient()
  const [tramos, ausencias, profesionales] = await Promise.all([
    supabase.from('horarios').select('id, barbero_id, dia_semana, desde, hasta').eq('local_id', local.id).order('dia_semana').order('desde'),
    supabase.from('ausencias').select('id, barbero_id, desde, hasta, motivo').eq('local_id', local.id).order('desde'),
    supabase.from('barberos').select('id, nombre, apellido').eq('local_id', local.id).eq('activo', true).order('nombre'),
  ])
  for (const r of [tramos, ausencias, profesionales]) if (r.error) throw new Error(r.error.message)
  return {
    reglas: { anticipacionMinutos: local.anticipacionMinutos, diasReserva: local.diasReserva },
    tramos: (tramos.data ?? []).map((t) => ({ ...t, desde: t.desde.slice(0, 5), hasta: t.hasta.slice(0, 5) })),
    ausencias: ausencias.data ?? [],
    profesionales: profesionales.data ?? [],
  }
}

/**
 * Guarda el horario de la semana del local (sin profesional) o de un
 * profesional. Reemplaza todo de una vez con `guardar_horarios` (migración
 * 0010): si un tramo está mal, no se guarda nada y la base dice por qué.
 * Para un profesional, ningún tramo = "usa el horario del local".
 */
export async function adminGuardarHorarios(formData: FormData) {
  const local = await localDeAccion(formData.get('local'))
  await exigirPermiso(local, 'editaCatalogo')
  const barberoRaw = formData.get('barbero_id')
  const barbero = barberoRaw ? (esId(barberoRaw) ? barberoRaw : null) : null
  if (barberoRaw && !barbero) return { error: 'Profesional inválido.' }

  let tramos: unknown
  try { tramos = JSON.parse(String(formData.get('tramos') ?? '[]')) } catch { return { error: 'Los horarios llegaron con un formato inválido.' } }
  if (!Array.isArray(tramos)) return { error: 'Los horarios llegaron con un formato inválido.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('guardar_horarios', { p_local: local.id, p_barbero: barbero, p_tramos: tramos })
  if (error) return { error: error.message }
  refrescarLocales()
  return { success: true }
}

/** Las reglas de reserva del local: anticipación mínima y días adelante. */
export async function adminGuardarReglas(formData: FormData) {
  const local = await localDeAccion(formData.get('local'))
  await exigirPermiso(local, 'editaCatalogo')
  const anticipacion = Number(formData.get('anticipacion_minutos'))
  const dias = Number(formData.get('dias_reserva'))
  if (!Number.isInteger(anticipacion) || anticipacion < 0 || anticipacion > 10080) return { error: 'La anticipación tiene que estar entre 0 y 7 días.' }
  if (!Number.isInteger(dias) || dias < 1 || dias > 365) return { error: 'Los días para reservar tienen que estar entre 1 y 365.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('locales')
    .update({ anticipacion_minutos: anticipacion, dias_reserva: dias })
    .eq('id', local.id)
    .select('id')
  if (error) return { error: error.message }
  if (!data?.length) return { error: 'No tenés permiso para cambiar las reglas de este local.' }
  refrescarLocales()
  return { success: true }
}

/** Una ausencia: feriado del local (sin profesional) o licencia de un profesional. */
export async function adminCrearAusencia(formData: FormData) {
  const local = await localDeAccion(formData.get('local'))
  await exigirPermiso(local, 'editaCatalogo')
  const barberoRaw = formData.get('barbero_id')
  const desde = formData.get('desde')
  const hasta = formData.get('hasta')
  const motivo = String(formData.get('motivo') ?? '').trim() || null
  if (barberoRaw && !esId(barberoRaw)) return { error: 'Profesional inválido.' }
  if (!esFecha(desde) || !esFecha(hasta)) return { error: 'Elegí las dos fechas.' }
  if (desde > hasta) return { error: 'La fecha de fin tiene que ser igual o posterior a la de inicio.' }

  const supabase = await createClient()
  // El profesional tiene que ser de este local: la base lo exige (candado doble).
  const { error } = await supabase.from('ausencias').insert({
    local_id: local.id,
    barbero_id: barberoRaw || null,
    desde, hasta, motivo,
  })
  if (error) return { error: error.message }
  refrescarLocales()
  return { success: true }
}

export async function adminEliminarAusencia(id: string) {
  await requireProfile()
  const supabase = await createClient()
  const { data, error } = await supabase.from('ausencias').delete().eq('id', id).select('id')
  if (error) return { error: error.message }
  if (!data?.length) return { error: 'No se encontró la ausencia o no tenés permiso para borrarla.' }
  refrescarLocales()
  return { success: true }
}
