'use server'

import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import { createClient, createServiceClient } from '@/lib/supabase'
import { getAccessTokenComercio } from '@/lib/mp-oauth'
import { getUser, requireProfile } from '@/lib/auth'
import { sendConfirmacionTurno, sendCancelacionTurno } from '@/lib/resend'
import { localDeAccion } from '@/lib/local'
import { localVisible, rutaLocal } from '@/lib/local-datos'
import { refrescarLocales } from '@/lib/refrescar'
import {
  ahoraEnZona, aHora, aMinutos, diaDeLaSemana, horariosLibres, interseccion, sumarDias,
  MENSAJE_SIN_HORARIOS, type MotivoSinHorarios,
} from '@/lib/horarios'

// La seña se paga siempre por adelantado (online), nunca en el local.
export type MetodoPago = 'mercadopago' | 'transferencia'

// Formatear hora de 'HH:mm:ss' a 'HH:mm'
function formatHora(horaSql: string) {
  return horaSql.slice(0, 5)
}

// Las acciones reciben el nombre corto del local (el de la dirección, "roble")
// y lo buscan ellas mismas: nunca confían en un id que mande el navegador.

export async function getServicios(slug: string) {
  const local = await localDeAccion(slug)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('servicios')
    .select('*')
    .eq('local_id', local.id)
    .eq('activo', true)
    .order('nombre')
  
  if (error) throw new Error(error.message)
  return data
}

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

// ¿Tiene forma de id (uuid) o de fecha (AAAA-MM-DD)? Se revisa antes de
// consultar, porque una Server Action se puede llamar sin pasar por la pantalla.
const esId = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
const esFecha = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)

export type Disponibilidad = { horarios: string[]; motivo?: MotivoSinHorarios }

const ZONA_POR_DEFECTO = 'America/Argentina/Buenos_Aires'

/**
 * Qué horarios se pueden ofrecer para un servicio, con un profesional, un día
 * (Fase 3b). Si no hay ninguno, dice por qué, para que la pantalla lo explique.
 *
 *  1. El servicio: cuánto dura y de qué local es.
 *  2. Las reglas del local: anticipación mínima, hasta cuántos días adelante y
 *     su zona horaria ("hoy" y "ya pasó" se miden en la hora del local).
 *  3. Los horarios de ese día de la semana: los del local y, si el profesional
 *     tiene propios, los que tienen en común (el local abierto Y él trabajando).
 *  4. Las ausencias de ese día: feriado del local o licencia del profesional.
 *  5. Los turnos ya tomados por cualquiera.
 *  6. Los horarios libres: entran completos en un tramo (no se meten en el
 *     hueco del mediodía), no se pisan con nada y, si es hoy, empiezan después
 *     de ahora + la anticipación.
 *
 * Lo que no es público (las reglas, las ausencias, los turnos de otros) se lee
 * con la llave del servidor, y de acá solo sale la lista de horarios: ningún
 * dato de otros clientes ni el motivo de una ausencia.
 */
export async function getDisponibilidad(barberoId: string, fecha: string, servicioId: string): Promise<Disponibilidad> {
  // Solo con sesión iniciada y con datos que tengan forma válida: la pantalla
  // de reserva ya lo exige, pero esta función también se puede llamar directo.
  if (!(await getUser())) return { horarios: [] }
  if (!esId(barberoId) || !esId(servicioId) || !esFecha(fecha)) return { horarios: [] }

  const supabase = await createClient()

  // 1. El servicio. Con la sesión: si el local no es público, no aparece.
  const { data: servicio, error: sErr } = await supabase
    .from('servicios')
    .select('duracion_minutos, local_id')
    .eq('id', servicioId)
    .single()
  if (sErr || !servicio) throw new Error('Servicio no encontrado')

  // Si al servidor le falta la llave (en Hostinger un redeploy puede borrar
  // las variables), se usa la sesión: las reglas quedan en sus valores por
  // defecto y los turnos de otros podrían aparecer libres, pero las reservas
  // no se cortan. Queda escrito en el registro del servidor.
  let servidor = supabase
  try {
    servidor = createServiceClient()
  } catch {
    console.error('[horarios] Falta SUPABASE_SERVICE_ROLE_KEY: horarios calculados sin las reglas privadas del local.')
  }

  // 2. Las reglas del local, y que el profesional sea de ese mismo local.
  const [{ data: reglas }, { data: barbero }] = await Promise.all([
    servidor.from('locales').select('anticipacion_minutos, dias_reserva, zona_horaria').eq('id', servicio.local_id).maybeSingle(),
    servidor.from('barberos').select('id').eq('id', barberoId).eq('local_id', servicio.local_id).maybeSingle(),
  ])
  if (!barbero) return { horarios: [] }
  const anticipacion = reglas?.anticipacion_minutos ?? 60
  const diasReserva = reglas?.dias_reserva ?? 60
  const ahora = ahoraEnZona(reglas?.zona_horaria || ZONA_POR_DEFECTO)

  if (fecha < ahora.fecha) return { horarios: [], motivo: 'pasado' }
  if (fecha > sumarDias(ahora.fecha, diasReserva)) return { horarios: [], motivo: 'muy_adelante' }

  // 3 y 4. Horarios de ese día de la semana, ausencias de esa fecha, y si el
  //        profesional tiene horario propio (en cualquier día).
  const dia = diaDeLaSemana(fecha)
  const [{ data: filas, error: hErr }, { data: ausencias }, { count: tramosPropios }] = await Promise.all([
    servidor.from('horarios').select('barbero_id, desde, hasta').eq('local_id', servicio.local_id).eq('dia_semana', dia),
    servidor.from('ausencias').select('barbero_id').eq('local_id', servicio.local_id).lte('desde', fecha).gte('hasta', fecha),
    servidor.from('horarios').select('id', { count: 'exact', head: true }).eq('local_id', servicio.local_id).eq('barbero_id', barberoId),
  ])
  if (hErr) throw new Error(hErr.message)

  const delLocal = (filas ?? []).filter((f) => f.barbero_id === null).map((f) => ({ desde: f.desde, hasta: f.hasta }))
  if (!delLocal.length || (ausencias ?? []).some((a) => a.barbero_id === null)) return { horarios: [], motivo: 'cerrado' }

  const propios = (filas ?? []).filter((f) => f.barbero_id === barberoId).map((f) => ({ desde: f.desde, hasta: f.hasta }))
  if ((tramosPropios ?? 0) > 0 && !propios.length) return { horarios: [], motivo: 'no_atiende' }
  if ((ausencias ?? []).some((a) => a.barbero_id === barberoId)) return { horarios: [], motivo: 'ausente' }

  const tramos = propios.length ? interseccion(delLocal, propios) : delLocal
  if (!tramos.length) return { horarios: [], motivo: 'no_atiende' }

  // 5. Turnos ya tomados por cualquiera, con ese profesional ese día. Con la
  //    sesión del cliente la base solo le mostraría SUS turnos y los de otros
  //    aparecerían libres (se podían pisar dos turnos: arreglo del 14/10).
  const { data: turnos, error: tErr } = await servidor
    .from('turnos')
    .select(`
      hora,
      servicios (duracion_minutos)
    `)
    .eq('barbero_id', barberoId)
    .eq('fecha', fecha)
    .in('estado', ['pendiente', 'confirmado'])
  if (tErr) throw new Error(tErr.message)

  const ocupados = (turnos || []).map((t: { hora: string; servicios: { duracion_minutos: number }[] | { duracion_minutos: number } }) => {
    const s = Array.isArray(t.servicios) ? t.servicios[0] : t.servicios
    const inicio = aMinutos(t.hora)
    return { inicio: aHora(inicio), fin: aHora(inicio + (s?.duracion_minutos ?? 0)) }
  })

  // 6. Los libres. Si es hoy, desde ahora + la anticipación del local.
  const desdeMinuto = fecha === ahora.fecha ? ahora.minutos + anticipacion : 0
  const horarios = horariosLibres({ tramos, ocupados, duracion: servicio.duracion_minutos, desdeMinuto })
  return horarios.length ? { horarios } : { horarios, motivo: 'sin_lugar' }
}

/** Solo la lista de horarios (la usan crearReserva y el turno a mano del panel). */
export async function getHorariosDisponibles(barberoId: string, fecha: string, servicioId: string): Promise<string[]> {
  return (await getDisponibilidad(barberoId, fecha, servicioId)).horarios
}

export async function crearReserva(formData: FormData) {
  const local = await localDeAccion(formData.get('local'))
  const profile = await requireProfile(rutaLocal(local.slug, '/reservar'))
  if (!localVisible(local)) return { error: 'Este local no está tomando reservas por ahora.' }

  const barbero_id = formData.get('barbero_id') as string
  const servicio_id = formData.get('servicio_id') as string
  const fecha = formData.get('fecha') as string
  const hora = formData.get('hora') as string
  const metodo_pago = (formData.get('metodo_pago') as MetodoPago) || 'mercadopago'

  if (!barbero_id || !servicio_id || !fecha || !hora) {
    return { error: 'Faltan datos para crear la reserva' }
  }
  if (!['mercadopago', 'transferencia'].includes(metodo_pago)) {
    return { error: 'Método de pago inválido' }
  }

  // El horario se vuelve a revisar al guardar, no solo al mostrar la lista:
  // entre que el cliente la vio y apretó el botón, otro pudo reservar un
  // horario que se pisa con este (la base solo frena dos turnos que EMPIEZAN a
  // la misma hora). Esta misma cuenta revisa también el horario del local, la
  // fecha (en la hora del local, no la del servidor) y la anticipación.
  let disponibilidad: Disponibilidad
  try {
    disponibilidad = await getDisponibilidad(barbero_id, fecha, servicio_id)
  } catch {
    return { error: 'No pudimos revisar el horario. Probá de nuevo en un momento.' }
  }
  if (!disponibilidad.horarios.includes(hora)) {
    const motivo = disponibilidad.motivo
    if (motivo && motivo !== 'sin_lugar') return { error: MENSAJE_SIN_HORARIOS[motivo] }
    return { error: 'El horario que elegiste ya no está libre. Elegí otro de la lista.', horarioOcupado: true }
  }

  const supabase = await createClient()

  // 1. Obtener detalles para el email y el precio (para la seña). Los dos
  //    tienen que ser de ESTE local (igual la base lo frena: candado doble).
  const { data: barbero } = await supabase.from('barberos').select('nombre, apellido').eq('id', barbero_id).eq('local_id', local.id).single()
  const { data: servicio } = await supabase.from('servicios').select('nombre, precio').eq('id', servicio_id).eq('local_id', local.id).single()
  if (!barbero || !servicio) return { error: 'Ese servicio o ese profesional no son de este local.' }

  // Seña = porcentaje del precio del servicio (lo define cada local).
  const precio = servicio.precio ?? 0
  const senaMonto = Math.round((precio * local.senaPorcentaje) / 100)

  // 2. Insertar en la BD
  const { data, error } = await supabase
    .from('turnos')
    .insert({
      local_id: local.id,
      cliente_id: profile.id,
      barbero_id,
      servicio_id,
      fecha,
      hora: `${hora}:00`,
      estado: 'pendiente',
      metodo_pago,
      sena_monto: senaMonto,
      sena_estado: 'pendiente',
    })
    .select()
    .single()

  if (error) {
    // Manejo específico para el índice único que previene solapamiento exacto
    // (queda por si dos clientes confirman la misma hora en el mismo instante)
    if (error.message.includes('turnos_no_overlap_idx')) {
      return { error: 'El horario que elegiste ya no está libre. Elegí otro de la lista.', horarioOcupado: true }
    }
    return { error: error.message }
  }

  // 3. Enviar email de confirmación
  if (barbero && servicio) {
    // Formatear la fecha para que sea más legible, ej "24/06/2026" o similar
    const [year, month, day] = fecha.split('-')
    const fechaLegible = `${day}/${month}/${year}`
    
    // El turno YA está guardado. Si el mail falla (falta la API key, el dominio
    // no está verificado, Resend caído) se registra y se sigue: perder el aviso
    // es molesto, perder la reserva confirmada es inaceptable.
    const envio = await sendConfirmacionTurno({
      nombreCliente: `${profile.nombre} ${profile.apellido}`,
      emailCliente: profile.email,
      nombreBarbero: `${barbero.nombre} ${barbero.apellido}`,
      servicio: servicio.nombre,
      fecha: fechaLegible,
      hora
    })
    if (!envio.ok) console.error('[reservas] no se pudo enviar la confirmación:', envio.error)
  }

  // 4. Que las pantallas muestren el turno nuevo
  refrescarLocales()

  // 5. Pago de la seña según el método elegido
  if (metodo_pago === 'mercadopago' && senaMonto > 0) {
    const accessToken = (await getAccessTokenComercio()) ?? process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) {
      return { success: true, turnoId: data.id, metodo: metodo_pago, sena: senaMonto, alias: local.aliasPago }
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    try {
      const mpClient = new MercadoPagoConfig({ accessToken })
      const pref = await new Preference(mpClient).create({
        body: {
          items: [{
            id: data.id,
            title: `Seña ${local.senaPorcentaje}% — ${servicio.nombre} (${local.nombreCorto})`,
            quantity: 1,
            unit_price: senaMonto,
            currency_id: 'ARS',
          }],
          payer: { email: profile.email },
          back_urls: {
            success: `${appUrl}${rutaLocal(local.slug, '/turnos')}`,
            failure: `${appUrl}${rutaLocal(local.slug, '/turnos')}`,
            pending: `${appUrl}${rutaLocal(local.slug, '/turnos')}`,
          },
          ...(!appUrl.includes('localhost') && { auto_return: 'approved' as const }),
          external_reference: data.id,
        },
      })
      await supabase.from('turnos').update({ mp_preference_id: pref.id }).eq('id', data.id)
      const url = pref.init_point ?? pref.sandbox_init_point
      return { mp: true, url_checkout: url ?? '', turnoId: data.id }
    } catch (err) {
      console.error('[MP turno] Error al crear preferencia:', err)
      // El turno queda creado; la seña se podrá pagar por otro medio.
      return { success: true, turnoId: data.id, metodo: metodo_pago, sena: senaMonto, alias: local.aliasPago }
    }
  }

  return { success: true, turnoId: data.id, metodo: metodo_pago, sena: senaMonto, alias: local.aliasPago }
}

/**
 * Marca la seña de un turno como pagada tras la vuelta de MercadoPago.
 * Idempotente. Verifica el pago con MP cuando es posible.
 */
export async function confirmarPagoSenaTurno(turnoId: string, paymentId: string) {
  const supabase = createServiceClient()
  const { data: turno } = await supabase
    .from('turnos').select('id, sena_estado').eq('id', turnoId).single()
  if (!turno) return { error: 'Turno no encontrado' }
  if (turno.sena_estado === 'pagada') return { success: true }

  const accessToken = (await getAccessTokenComercio()) ?? process.env.MERCADOPAGO_ACCESS_TOKEN
  if (accessToken && paymentId) {
    try {
      const payment = await new Payment(new MercadoPagoConfig({ accessToken })).get({ id: paymentId })
      if (payment.status !== 'approved' && payment.status !== 'pending') {
        return { error: 'El pago no fue aprobado' }
      }
    } catch { /* MP ya redirigió a success; seguimos */ }
  }

  await supabase.from('turnos')
    .update({ sena_estado: 'pagada', mp_payment_id: paymentId, estado: 'confirmado' })
    .eq('id', turnoId)
  refrescarLocales()
  return { success: true }
}

/** Los turnos del cliente conectado en ESTE local. */
export async function getTurnosCliente(slug: string) {
  const local = await localDeAccion(slug)
  const profile = await requireProfile(rutaLocal(local.slug, '/turnos'))
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('turnos')
    .select(`
      id,
      fecha,
      hora,
      estado,
      barberos ( nombre, apellido ),
      servicios ( nombre, duracion_minutos, precio )
    `)
    .eq('cliente_id', profile.id)
    .eq('local_id', local.id)
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function cancelarTurno(turnoId: string) {
  // Por id: la base solo deja ver y cancelar los turnos propios (Fase 2).
  const profile = await requireProfile()
  const supabase = await createClient()

  // 1. Obtener turno para validar propiedad y datos para el email
  const { data: turno, error: getErr } = await supabase
    .from('turnos')
    .select(`
      id,
      cliente_id,
      fecha,
      hora,
      estado,
      barberos ( nombre, apellido ),
      servicios ( nombre )
    `)
    .eq('id', turnoId)
    .single()

  if (getErr || !turno) return { error: 'Turno no encontrado' }
  if (turno.cliente_id !== profile.id) return { error: 'No autorizado' }
  if (turno.estado === 'cancelado') return { error: 'El turno ya está cancelado' }

  // 2. Actualizar estado
  const { error: updErr } = await supabase
    .from('turnos')
    .update({ estado: 'cancelado' })
    .eq('id', turnoId)

  if (updErr) return { error: updErr.message }

  // 3. Enviar email
  const [year, month, day] = turno.fecha.split('-')
  const fechaLegible = `${day}/${month}/${year}`
  
  // El tipado que retorna Supabase de los joins es un array o un objeto único según si es 1:1.
  // Barberos y servicios son tablas relacionadas donde el turno tiene las FK, así que es objeto único.
  const barbero = (Array.isArray(turno.barberos) ? turno.barberos[0] : turno.barberos) as { nombre: string; apellido: string }
  const servicio = (Array.isArray(turno.servicios) ? turno.servicios[0] : turno.servicios) as { nombre: string }

  // Mismo criterio que en la confirmación: el turno ya se canceló en la base,
  // así que un fallo del mail no puede tirar abajo la operación.
  const envio = await sendCancelacionTurno({
    nombreCliente: `${profile.nombre} ${profile.apellido}`,
    emailCliente: profile.email,
    nombreBarbero: `${barbero.nombre} ${barbero.apellido}`,
    servicio: servicio.nombre,
    fecha: fechaLegible,
    hora: formatHora(turno.hora)
  })
  if (!envio.ok) console.error('[reservas] no se pudo enviar la cancelación:', envio.error)

  refrescarLocales()

  return { success: true }
}
