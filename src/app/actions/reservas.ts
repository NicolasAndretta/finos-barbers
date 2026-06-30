'use server'

import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import { createClient, createServiceClient } from '@/lib/supabase'
import { requireClient } from '@/lib/auth'
import { sendConfirmacionTurno, sendCancelacionTurno } from '@/lib/resend'
import { SITE } from '@/lib/site'
import { revalidatePath } from 'next/cache'

export type MetodoPago = 'mercadopago' | 'transferencia' | 'efectivo'

// Formatear hora de 'HH:mm:ss' a 'HH:mm'
function formatHora(horaSql: string) {
  return horaSql.slice(0, 5)
}

// Sumar minutos a una hora 'HH:mm'
function addMinutesToTime(time: string, mins: number) {
  const [h, m] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(h, m, 0, 0)
  date.setMinutes(date.getMinutes() + mins)
  const newH = date.getHours().toString().padStart(2, '0')
  const newM = date.getMinutes().toString().padStart(2, '0')
  return `${newH}:${newM}`
}

export async function getServicios() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('servicios')
    .select('*')
    .eq('activo', true)
    .order('nombre')
  
  if (error) throw new Error(error.message)
  return data
}

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

export async function getHorariosDisponibles(barberoId: string, fecha: string, servicioId: string) {
  const supabase = await createClient()
  
  // 1. Obtener la duración del servicio solicitado
  const { data: servicio, error: sErr } = await supabase
    .from('servicios')
    .select('duracion_minutos')
    .eq('id', servicioId)
    .single()
    
  if (sErr || !servicio) throw new Error('Servicio no encontrado')
  const duracionSolicitada = servicio.duracion_minutos

  // 2. Obtener turnos existentes del barbero en la fecha
  const { data: turnos, error: tErr } = await supabase
    .from('turnos')
    .select(`
      hora,
      servicios (duracion_minutos)
    `)
    .eq('barbero_id', barberoId)
    .eq('fecha', fecha)
    .in('estado', ['pendiente', 'confirmado'])

  if (tErr) throw new Error(tErr.message)

  // Parsear turnos ocupados: { inicio: 'HH:mm', fin: 'HH:mm' }
  const ocupados = (turnos || []).map((t: { hora: string; servicios: { duracion_minutos: number }[] }) => {
    const inicio = formatHora(t.hora)
    const servicio = Array.isArray(t.servicios) ? t.servicios[0] : t.servicios
    const fin = addMinutesToTime(inicio, servicio.duracion_minutos)
    return { inicio, fin }
  })

  // 3. Generar franjas horarias (09:00 a 20:00) cada 15 min
  const horarios = []
  let horaActual = '09:00'
  const horaCierre = '20:00'

  while (horaActual < horaCierre) {
    const finEstimado = addMinutesToTime(horaActual, duracionSolicitada)
    
    // Si el servicio termina después del cierre, no es válido
    if (finEstimado > horaCierre) {
      break
    }

    // Verificar si hay solapamiento con algún turno ocupado
    const haySolapamiento = ocupados.some((o) => {
      // Un turno se solapa si (inicio1 < fin2) AND (fin1 > inicio2)
      return horaActual < o.fin && finEstimado > o.inicio
    })

    if (!haySolapamiento) {
      horarios.push(horaActual)
    }

    horaActual = addMinutesToTime(horaActual, 15) // Incrementar de a 15 min
  }

  return horarios
}

export async function crearReserva(formData: FormData) {
  const profile = await requireClient() // Protege la ruta y obtiene el usuario
  
  const barbero_id = formData.get('barbero_id') as string
  const servicio_id = formData.get('servicio_id') as string
  const fecha = formData.get('fecha') as string
  const hora = formData.get('hora') as string
  const metodo_pago = (formData.get('metodo_pago') as MetodoPago) || 'efectivo'

  if (!barbero_id || !servicio_id || !fecha || !hora) {
    return { error: 'Faltan datos para crear la reserva' }
  }
  if (!['mercadopago', 'transferencia', 'efectivo'].includes(metodo_pago)) {
    return { error: 'Método de pago inválido' }
  }

  // Validar que la fecha esté dentro del rango permitido (hoy a 60 días)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 60)
  maxDate.setHours(23, 59, 59, 999)
  
  const fechaDate = new Date(fecha)
  fechaDate.setHours(12, 0, 0, 0) // Normalizar a mediodía para evitar problemas de zona horaria

  if (fechaDate < today) {
    return { error: 'La fecha debe ser hoy o una fecha futura' }
  }
  
  if (fechaDate > maxDate) {
    return { error: 'La fecha no puede ser mayor a 60 días desde hoy' }
  }

  const supabase = await createClient()

  // 1. Obtener detalles para el email y el precio (para la seña)
  const { data: barbero } = await supabase.from('barberos').select('nombre, apellido').eq('id', barbero_id).single()
  const { data: servicio } = await supabase.from('servicios').select('nombre, precio').eq('id', servicio_id).single()

  // Seña = porcentaje del precio del servicio (definido en SITE).
  const precio = servicio?.precio ?? 0
  const senaMonto = Math.round((precio * SITE.senaPorcentaje) / 100)

  // 2. Insertar en la BD
  const { data, error } = await supabase
    .from('turnos')
    .insert({
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
    if (error.message.includes('turnos_no_overlap_idx')) {
      return { error: 'El horario seleccionado ya no está disponible. Por favor, elige otro.' }
    }
    return { error: error.message }
  }

  // 3. Enviar email de confirmación
  if (barbero && servicio) {
    // Formatear la fecha para que sea más legible, ej "24/06/2026" o similar
    const [year, month, day] = fecha.split('-')
    const fechaLegible = `${day}/${month}/${year}`
    
    await sendConfirmacionTurno({
      nombreCliente: `${profile.nombre} ${profile.apellido}`,
      emailCliente: profile.email,
      nombreBarbero: `${barbero.nombre} ${barbero.apellido}`,
      servicio: servicio.nombre,
      fecha: fechaLegible,
      hora
    })
  }

  // 4. Revalidar rutas
  revalidatePath('/turnos')
  revalidatePath('/admin/turnos')

  // 5. Pago de la seña según el método elegido
  if (metodo_pago === 'mercadopago' && senaMonto > 0) {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) {
      return { success: true, turnoId: data.id, metodo: metodo_pago, sena: senaMonto, alias: SITE.aliasPago }
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    try {
      const mpClient = new MercadoPagoConfig({ accessToken })
      const pref = await new Preference(mpClient).create({
        body: {
          items: [{
            id: data.id,
            title: `Seña ${SITE.senaPorcentaje}% — ${servicio?.nombre ?? 'Turno'} (Fino's)`,
            quantity: 1,
            unit_price: senaMonto,
            currency_id: 'ARS',
          }],
          payer: { email: profile.email },
          back_urls: {
            success: `${appUrl}/turnos`,
            failure: `${appUrl}/turnos`,
            pending: `${appUrl}/turnos`,
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
      return { success: true, turnoId: data.id, metodo: metodo_pago, sena: senaMonto, alias: SITE.aliasPago }
    }
  }

  return { success: true, turnoId: data.id, metodo: metodo_pago, sena: senaMonto, alias: SITE.aliasPago }
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

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
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
  revalidatePath('/turnos')
  revalidatePath('/admin/turnos')
  return { success: true }
}

export async function getTurnosCliente() {
  const profile = await requireClient()
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
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function cancelarTurno(turnoId: string) {
  const profile = await requireClient()
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

  await sendCancelacionTurno({
    nombreCliente: `${profile.nombre} ${profile.apellido}`,
    emailCliente: profile.email,
    nombreBarbero: `${barbero.nombre} ${barbero.apellido}`,
    servicio: servicio.nombre,
    fecha: fechaLegible,
    hora: formatHora(turno.hora)
  })

  revalidatePath('/turnos')
  revalidatePath('/admin/turnos')
  
  return { success: true }
}
