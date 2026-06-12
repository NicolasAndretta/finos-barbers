'use server'

import { createClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'
import { sendConfirmacionTurno, sendCancelacionTurno } from '@/lib/resend'
import { revalidatePath } from 'next/cache'

function formatHora(horaSql: string) {
  return horaSql.slice(0, 5)
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
    const today = new Date().toISOString().split('T')[0]
    query = query.eq('fecha', today)
  } else if (filters?.fechaFiltro === 'semana') {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    query = query.gte('fecha', startOfWeek.toISOString().split('T')[0])
    query = query.lte('fecha', endOfWeek.toISOString().split('T')[0])
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
  const servicio = (Array.isArray(turno.servicios) ? turno.servicios[0] : turno.servicios) as { nombre: string }

  await sendConfirmacionTurno({
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