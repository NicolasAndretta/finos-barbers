import { NextResponse, type NextRequest } from 'next/server'
import { getUser } from '@/lib/auth'
import { getLocal, getPermisos } from '@/lib/local'
import { ahoraEnZona } from '@/lib/horarios'
import { createClient } from '@/lib/supabase'

/**
 * Exportar los datos de un local (Fase 7, en todos los planes): sus turnos o
 * sus clientes, en un CSV que abre Excel. "Tus datos son tuyos y te los llevás
 * cuando quieras".
 *
 * Solo quien administra el local (el dueño, el admin de la plataforma). Se lee
 * con la sesión de quien pide: la base decide qué filas ve, como en el panel.
 */

export const dynamic = 'force-dynamic'

type Fila = Record<string, string | number | boolean | null | undefined>

/** Un valor de CSV: entre comillas si hace falta, y sin fórmulas (Excel ejecuta lo que empieza con = + - @). */
function celda(valor: Fila[string]): string {
  let texto = valor === null || valor === undefined ? '' : String(valor)
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`
  return /[",;\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

function csv(columnas: [clave: string, titulo: string][], filas: Fila[]): string {
  const lineas = [columnas.map(([, t]) => celda(t)).join(',')]
  for (const f of filas) lineas.push(columnas.map(([c]) => celda(f[c])).join(','))
  // El BOM al principio hace que Excel lea bien los acentos.
  return '﻿' + lineas.join('\r\n') + '\r\n'
}

const nombreDe = (p: { nombre?: string | null; apellido?: string | null } | null | undefined) =>
  [p?.nombre, p?.apellido].filter(Boolean).join(' ')
const uno = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : v ?? undefined)

export async function GET(_req: NextRequest, { params }: { params: Promise<{ local: string; que: string }> }) {
  const { local: slug, que } = await params
  const local = await getLocal(slug)
  if (!local) return new NextResponse('No existe ese local.', { status: 404 })
  if (que !== 'turnos' && que !== 'clientes') return new NextResponse('Se puede exportar "turnos" o "clientes".', { status: 404 })
  if (!(await getUser())) return new NextResponse('Entrá con tu cuenta.', { status: 401 })
  if (!(await getPermisos(local.id)).administra) return new NextResponse('Exporta los datos quien administra el local.', { status: 403 })
  if (!local.plan.exportar) return new NextResponse('Tu plan no trae exportar los datos.', { status: 403 })

  const supabase = await createClient()
  let cuerpo: string
  if (que === 'turnos') {
    const { data, error } = await supabase
      .from('turnos')
      .select('fecha, hora, estado, no_vino, metodo_pago, sena_estado, created_at, profiles ( nombre, apellido, email ), barberos ( nombre, apellido ), servicios ( nombre, precio )')
      .eq('local_id', local.id)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true })
    if (error) return new NextResponse(`No se pudieron leer los turnos: ${error.message}`, { status: 500 })
    cuerpo = csv(
      [['fecha', 'Fecha'], ['hora', 'Hora'], ['cliente', 'Cliente'], ['email', 'Mail'], ['profesional', 'Profesional'],
        ['servicio', 'Servicio'], ['precio', 'Precio'], ['estado', 'Estado'], ['no_vino', 'No vino'],
        ['pago', 'Seña'], ['sena', 'Estado de la seña'], ['reservado', 'Reservado el']],
      (data ?? []).map((t) => {
        const cliente = uno(t.profiles)
        const servicio = uno(t.servicios)
        return {
          fecha: t.fecha, hora: String(t.hora).slice(0, 5), cliente: nombreDe(cliente), email: cliente?.email,
          profesional: nombreDe(uno(t.barberos)),
          servicio: servicio?.nombre, precio: servicio?.precio, estado: t.estado, no_vino: t.no_vino ? 'sí' : '',
          pago: t.metodo_pago, sena: t.sena_estado, reservado: String(t.created_at).slice(0, 10),
        }
      }),
    )
  } else {
    const { data, error } = await supabase
      .from('membresias')
      .select('created_at, profiles ( nombre, apellido, email )')
      .eq('local_id', local.id)
      .eq('rol', 'cliente')
      .order('created_at', { ascending: true })
    if (error) return new NextResponse(`No se pudieron leer los clientes: ${error.message}`, { status: 500 })
    cuerpo = csv(
      [['nombre', 'Nombre'], ['email', 'Mail'], ['desde', 'Cliente desde']],
      (data ?? []).map((m) => {
        const p = uno(m.profiles)
        return { nombre: nombreDe(p), email: p?.email, desde: String(m.created_at).slice(0, 10) }
      }),
    )
  }

  const hoy = ahoraEnZona(local.zonaHoraria).fecha
  return new NextResponse(cuerpo, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${local.slug}-${que}-${hoy}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
