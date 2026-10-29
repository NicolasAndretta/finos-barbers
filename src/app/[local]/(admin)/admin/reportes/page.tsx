import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLocal, getPermisos } from '@/lib/local'
import { rutaLocal } from '@/lib/local-datos'
import { ahoraEnZona, sumarDias } from '@/lib/horarios'
import { formatPrecio } from '@/lib/format'
import { createClient } from '@/lib/supabase'

/**
 * Reportes (Fase 7, plan Pro en adelante): los cuenta la base
 * (reporte_del_local), que revisa quién pregunta y el plan del local.
 * "Facturado": el precio de los servicios de los turnos que ya pasaron, no se
 * cancelaron y a los que el cliente vino.
 */

type Fila = { turnos: number; cancelados?: number; no_vinieron?: number; facturado: number }
type Reporte = {
  totales: Fila & { cancelados: number; no_vinieron: number; hechos: number }
  por_mes: (Fila & { mes: string })[]
  por_profesional: (Fila & { nombre: string })[]
  por_servicio: (Fila & { nombre: string })[]
}

const PERIODOS = [
  { dias: 30, texto: 'Últimos 30 días' },
  { dias: 90, texto: 'Últimos 3 meses' },
  { dias: 180, texto: 'Últimos 6 meses' },
] as const

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const nombreDelMes = (mes: string) => {
  const [anio, m] = mes.split('-')
  return `${MESES[Number(m) - 1]} ${anio}`
}
const porcentaje = (parte: number, total: number) => (total ? `${Math.round((parte / total) * 100)}%` : '—')

export default async function ReportesPage({ params, searchParams }: {
  params: Promise<{ local: string }>
  searchParams: Promise<{ dias?: string }>
}) {
  const local = await getLocal((await params).local)
  if (!local) notFound()
  const pedido = Number((await searchParams).dias)
  const periodo = PERIODOS.find((p) => p.dias === pedido) ?? PERIODOS[1]

  const hoy = ahoraEnZona(local.zonaHoraria).fecha
  const desde = sumarDias(hoy, -periodo.dias + 1)
  const supabase = await createClient()
  const [permisos, { data, error }] = await Promise.all([
    getPermisos(local.id),
    supabase.rpc('reporte_del_local', { p_local: local.id, p_desde: desde, p_hasta: hoy }),
  ])
  if (!permisos.operaPrivado) {
    return <p className="text-zinc-400">Los reportes los ve quien opera el local.</p>
  }
  if (error || !data) {
    return <p className="text-red-400" role="alert">No se pudieron armar los reportes: {error?.message ?? 'sin datos'}.</p>
  }
  const r = data as Reporte
  const t = r.totales

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">Reportes</h1>
          <p className="text-zinc-400 mt-2 text-sm">Turnos con fecha del {desde.split('-').reverse().join('/')} al {hoy.split('-').reverse().join('/')}.</p>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="Período">
          {PERIODOS.map((p) => (
            <Link
              key={p.dias}
              href={rutaLocal(local.slug, `/admin/reportes?dias=${p.dias}`)}
              aria-current={p.dias === periodo.dias ? 'page' : undefined}
              className={`text-xs font-semibold rounded-lg px-3 py-2 border ${p.dias === periodo.dias ? 'border-amber-500 text-amber-300 bg-amber-500/10' : 'border-zinc-800 text-zinc-400 hover:text-white'}`}
            >
              {p.texto}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { titulo: 'Turnos', valor: String(t.turnos), detalle: `${t.hechos} ya atendidos` },
          { titulo: 'Cancelados', valor: String(t.cancelados), detalle: `${porcentaje(t.cancelados, t.turnos)} del total` },
          { titulo: 'No vinieron', valor: String(t.no_vinieron), detalle: `${porcentaje(t.no_vinieron, t.turnos)} del total` },
          { titulo: 'Facturado', valor: formatPrecio(t.facturado), detalle: 'Turnos atendidos' },
        ].map((c) => (
          <div key={c.titulo} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            <p className="text-xs font-semibold text-zinc-500">{c.titulo}</p>
            <p className="text-2xl sm:text-3xl font-black text-white mt-1 break-words">{c.valor}</p>
            <p className="text-[11px] text-zinc-500 mt-1">{c.detalle}</p>
          </div>
        ))}
      </div>

      {t.turnos === 0 ? (
        <p className="text-zinc-400 text-sm">No hay turnos en este período.</p>
      ) : (
        <>
          <Tabla
            titulo="Mes a mes"
            columnas={['Mes', 'Turnos', 'Cancelados', 'No vinieron', 'Facturado']}
            filas={r.por_mes.map((m) => [nombreDelMes(m.mes), m.turnos, m.cancelados ?? 0, m.no_vinieron ?? 0, formatPrecio(m.facturado)])}
          />
          <Tabla
            titulo={`Por ${local.palabras.profesional}`}
            columnas={['Nombre', 'Turnos', 'No vinieron', 'Facturado']}
            filas={r.por_profesional.map((p) => [p.nombre, p.turnos, p.no_vinieron ?? 0, formatPrecio(p.facturado)])}
          />
          <Tabla
            titulo="Por servicio"
            columnas={['Servicio', 'Turnos', 'Facturado']}
            filas={r.por_servicio.map((s) => [s.nombre, s.turnos, formatPrecio(s.facturado)])}
          />
        </>
      )}
      <p className="text-xs text-zinc-500">
        Los turnos cancelados no cuentan en &quot;Turnos&quot; de cada {local.palabras.profesional} ni de cada servicio. &quot;No vino&quot; se marca en Turnos, en un turno que ya pasó.
      </p>
    </div>
  )
}

function Tabla({ titulo, columnas, filas }: { titulo: string; columnas: string[]; filas: (string | number)[][] }) {
  return (
    <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
      <h2 className="text-lg font-bold text-white mb-3">{titulo}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500 border-b border-zinc-800">
              {columnas.map((c, i) => <th key={c} className={`py-2 pr-4 font-semibold ${i ? 'text-right' : ''}`}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i} className="border-b border-zinc-900 last:border-0">
                {f.map((v, j) => <td key={j} className={`py-2 pr-4 ${j ? 'text-right text-zinc-300' : 'text-white'}`}>{v}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
