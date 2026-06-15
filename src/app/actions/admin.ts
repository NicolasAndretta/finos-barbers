'use server'

import { createClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'
import { sendConfirmacionTurno, sendCancelacionTurno } from '@/lib/resend'
import { revalidatePath } from 'next/cache'

function formatHora(horaSql: string) {
  return horaSql.slice(0, 5)
}

// Devuelve 'YYYY-MM-DD' en hora local (evita desfase UTC)
function localDateISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export async function adminGetTurnos(filters?: {
  estado?: string
  fechaFiltro?: 'hoy' | 'semana' | 'todos'
}) {
  await requireAdmin()
  const supabase = await createClient()

  let query = supabase
    .from('turnos')
    .select(`
      id,
      fecha,
      hora,
      estado,
      created_at,
      profiles ( nombre, apellido, email ),
      barberos ( nombre, apellido ),
      servicios ( nombre, duracion_minutos, precio )
    `)

  if (filters?.estado && filters.estado !== 'todos') {
    query = query.eq('estado', filters.estado)
  }

  if (filters?.fechaFiltro === 'hoy') {
    query = query.eq('fecha', localDateISO(new Date()))
  } else if (filters?.fechaFiltro === 'semana') {
    const today = new Date()
    const day = today.getDay()
    const lunes = new Date(today)
    lunes.setDate(today.getDate() - (day === 0 ? 6 : day - 1))
    const domingo = new Date(lunes)
    domingo.setDate(lunes.getDate() + 6)
    query = query.gte('fecha', localDateISO(lunes))
    query = query.lte('fecha', localDateISO(domingo))
  }

  query = query.order('fecha', { ascending: true }).order('hora', { ascending: true })

  const { data, error } = await query

  if (error) throw new Error(error.message)

  return data?.map((t) => ({
    ...t,
    profiles: Array.isArray(t.profiles) ? t.profiles[0] ?? null : t.profiles,
    barberos: Array.isArray(t.barberos) ? t.barberos[0] ?? null : t.barberos,
    servicios: Array.isArray(t.servicios) ? t.servicios[0] ?? null : t.servicios,
  })) ?? []
}

export async function adminConfirmarTurno(turnoId: string) {
  const adminProfile = await requireAdmin()
  const supabase = await createClient()

  const { data: turno, error: getErr } = await supabase
    .from('turnos')
    .select(`
      id, fecha, hora, estado,
      profiles ( nombre, apellido, email ),
      barberos ( nombre, apellido ),
      servicios ( nombre, precio )
    `)
    .eq('id', turnoId)
    .single()

  if (getErr || !turno) return { error: 'Turno no encontrado' }
  if (turno.estado !== 'pendiente') return { error: 'Solo se pueden confirmar turnos pendientes' }

  const { error: updErr } = await supabase
    .from('turnos')
    .update({ estado: 'confirmado' })
    .eq('id', turnoId)

  if (updErr) return { error: updErr.message }

  const [year, month, day] = turno.fecha.split('-')
  const fechaLegible = `${day}/${month}/${year}`
  const cliente = (Array.isArray(turno.profiles) ? turno.profiles[0] : turno.profiles) as { nombre: string; apellido: string; email: string }
  const barbero = (Array.isArray(turno.barberos) ? turno.barberos[0] : turno.barberos) as { nombre: string; apellido: string }
  const servicio = (Array.isArray(turno.servicios) ? turno.servicios[0] : turno.servicios) as { nombre: string; precio: number }

  await sendConfirmacionTurno({
    nombreCliente: `${cliente.nombre} ${cliente.apellido}`,
    emailCliente: cliente.email,
    nombreBarbero: `${barbero.nombre} ${barbero.apellido}`,
    servicio: servicio.nombre,
    fecha: fechaLegible,
    hora: formatHora(turno.hora)
  })

  // Auto-registro financiero: evita duplicados si ya existe una transacción para este turno
  const { data: txExistente } = await supabase
    .from('transacciones')
    .select('id')
    .eq('turno_id', turnoId)
    .maybeSingle()

  if (!txExistente) {
    await supabase.from('transacciones').insert({
      tipo:        'ingreso',
      categoria:   'servicios',
      monto:       servicio.precio,
      descripcion: `Turno: ${cliente.nombre} ${cliente.apellido} — ${servicio.nombre}`,
      fecha:       turno.fecha,
      origen:      'turno',
      turno_id:    turnoId,
      created_by:  adminProfile.id,
    })
  }

  revalidatePath('/admin/turnos')
  revalidatePath('/turnos')
  revalidatePath('/admin/finanzas')
  return { success: true }
}

export async function adminCancelarTurno(turnoId: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { data: turno, error: getErr } = await supabase
    .from('turnos')
    .select(`
      id, fecha, hora, estado,
      profiles ( nombre, apellido, email ),
      barberos ( nombre, apellido ),
      servicios ( nombre )
    `)
    .eq('id', turnoId)
    .single()

  if (getErr || !turno) return { error: 'Turno no encontrado' }
  if (turno.estado === 'cancelado') return { error: 'El turno ya está cancelado' }

  const { error: updErr } = await supabase
    .from('turnos')
    .update({ estado: 'cancelado' })
    .eq('id', turnoId)

  if (updErr) return { error: updErr.message }

  const [year, month, day] = turno.fecha.split('-')
  const fechaLegible = `${day}/${month}/${year}`
  const cliente = (Array.isArray(turno.profiles) ? turno.profiles[0] : turno.profiles) as { nombre: string; apellido: string; email: string }
  const barbero = (Array.isArray(turno.barberos) ? turno.barberos[0] : turno.barberos) as { nombre: string; apellido: string }
  const servicio = (Array.isArray(turno.servicios) ? turno.servicios[0] : turno.servicios) as { nombre: string }

  await sendCancelacionTurno({
    nombreCliente: `${cliente.nombre} ${cliente.apellido}`,
    emailCliente: cliente.email,
    nombreBarbero: `${barbero.nombre} ${barbero.apellido}`,
    servicio: servicio.nombre,
    fecha: fechaLegible,
    hora: formatHora(turno.hora)
  })

  revalidatePath('/admin/turnos')
  revalidatePath('/turnos')
  return { success: true }
}

export async function adminGetServicios() {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('servicios')
    .select('*')
    .order('nombre')

  if (error) throw new Error(error.message)
  return data
}

export async function adminCrearServicio(formData: FormData) {
  await requireAdmin()

  const nombre = formData.get('nombre') as string
  const descripcion = formData.get('descripcion') as string
  const precio = formData.get('precio') as string
  const duracion_minutos = formData.get('duracion_minutos') as string

  if (!nombre || !descripcion || !precio || !duracion_minutos) {
    return { error: 'Faltan datos para crear el servicio' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('servicios')
    .insert({
      nombre,
      descripcion,
      precio: parseFloat(precio),
      duracion_minutos: parseInt(duracion_minutos),
      activo: true
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/servicios')
  revalidatePath('/reservar')
  return { success: true, servicio: data }
}

export async function adminActualizarServicio(formData: FormData) {
  await requireAdmin()

  const id = formData.get('id') as string
  const nombre = formData.get('nombre') as string
  const descripcion = formData.get('descripcion') as string
  const precio = formData.get('precio') as string
  const duracion_minutos = formData.get('duracion_minutos') as string

  if (!id || !nombre || !descripcion || !precio || !duracion_minutos) {
    return { error: 'Faltan datos para actualizar el servicio' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('servicios')
    .update({
      nombre,
      descripcion,
      precio: parseFloat(precio),
      duracion_minutos: parseInt(duracion_minutos)
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/servicios')
  revalidatePath('/reservar')
  return { success: true, servicio: data }
}

export async function adminToggleServicio(servicioId: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { data: servicio, error: getErr } = await supabase
    .from('servicios')
    .select('activo')
    .eq('id', servicioId)
    .single()

  if (getErr || !servicio) return { error: 'Servicio no encontrado' }

  const { error: updErr } = await supabase
    .from('servicios')
    .update({ activo: !servicio.activo })
    .eq('id', servicioId)

  if (updErr) return { error: updErr.message }

  revalidatePath('/admin/servicios')
  revalidatePath('/reservar')
  return { success: true, activo: !servicio.activo }
}

export async function adminGetCalendario(fechaInicio: string, fechaFin: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('turnos')
    .select(`
      id,
      fecha,
      hora,
      estado,
      barbero_id,
      profiles ( nombre, apellido, email ),
      barberos ( id, nombre, apellido ),
      servicios ( nombre, duracion_minutos, precio )
    `)
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)
    .neq('estado', 'cancelado')
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true })

  if (error) throw new Error(error.message)

  return data?.map((t) => ({
    ...t,
    profiles: Array.isArray(t.profiles) ? t.profiles[0] ?? null : t.profiles,
    barberos: Array.isArray(t.barberos) ? t.barberos[0] ?? null : t.barberos,
    servicios: Array.isArray(t.servicios) ? t.servicios[0] ?? null : t.servicios,
  })) ?? []
}

export async function adminGetClientes() {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nombre, apellido, email')
    .eq('role', 'client')
    .order('apellido')

  if (error) throw new Error(error.message)
  return data
}

export async function adminCrearTurno(formData: FormData) {
  const adminProfile = await requireAdmin()

  const cliente_id = formData.get('cliente_id') as string
  const barbero_id = formData.get('barbero_id') as string
  const servicio_id = formData.get('servicio_id') as string
  const fecha = formData.get('fecha') as string
  const hora = formData.get('hora') as string

  if (!cliente_id || !barbero_id || !servicio_id || !fecha || !hora) {
    return { error: 'Faltan datos para crear el turno' }
  }

  const supabase = await createClient()

  const [{ data: cliente }, { data: barbero }, { data: servicio }] = await Promise.all([
    supabase.from('profiles').select('nombre, apellido, email').eq('id', cliente_id).single(),
    supabase.from('barberos').select('nombre, apellido').eq('id', barbero_id).single(),
    supabase.from('servicios').select('nombre, precio').eq('id', servicio_id).single(),
  ])

  const { data, error } = await supabase
    .from('turnos')
    .insert({
      cliente_id,
      barbero_id,
      servicio_id,
      fecha,
      hora: `${hora}:00`,
      estado: 'confirmado',
    })
    .select()
    .single()

  if (error) {
    if (error.message.includes('turnos_no_overlap_idx')) {
      return { error: 'El horario seleccionado ya no está disponible. Elegí otro.' }
    }
    return { error: error.message }
  }

  if (cliente && barbero && servicio) {
    const [year, month, day] = fecha.split('-')
    const fechaLegible = `${day}/${month}/${year}`

    await sendConfirmacionTurno({
      nombreCliente: `${cliente.nombre} ${cliente.apellido}`,
      emailCliente: cliente.email,
      nombreBarbero: `${barbero.nombre} ${barbero.apellido}`,
      servicio: servicio.nombre,
      fecha: fechaLegible,
      hora,
    })
  }

  // Auto-registro financiero al crear turno confirmado
  if (servicio) {
    await supabase.from('transacciones').insert({
      tipo:        'ingreso',
      categoria:   'servicios',
      monto:       (servicio as { nombre: string; precio: number }).precio,
      descripcion: `Turno: ${cliente?.nombre ?? ''} ${cliente?.apellido ?? ''} — ${servicio.nombre}`.trim(),
      fecha,
      origen:      'turno',
      turno_id:    data.id,
      created_by:  adminProfile.id,
    })
  }

  revalidatePath('/admin/turnos')
  revalidatePath('/turnos')
  revalidatePath('/admin/finanzas')
  return { success: true, turnoId: data.id }
}

export async function adminGetStats() {
  await requireAdmin()
  const supabase = await createClient()

  // Turnos de hoy
  const today = new Date().toISOString().split('T')[0]
  const { count: turnosHoy, error: turnosError } = await supabase
    .from('turnos')
    .select('*', { count: 'exact', head: true })
    .eq('fecha', today)
    .in('estado', ['pendiente', 'confirmado'])

  // Servicios activos
  const { count: serviciosActivos, error: serviciosError } = await supabase
    .from('servicios')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true)

  // Total clientes (perfiles con role 'client')
  const { count: totalClientes, error: clientesError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'client')

  if (turnosError || serviciosError || clientesError) {
    throw new Error('Error al obtener estadísticas')
  }

  return {
    turnosHoy: turnosHoy || 0,
    serviciosActivos: serviciosActivos || 0,
    totalClientes: totalClientes || 0,
  }
}