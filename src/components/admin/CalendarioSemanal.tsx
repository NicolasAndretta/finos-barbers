'use client'

import { useState, useEffect, useTransition } from 'react'
import { adminGetCalendario, adminConfirmarTurno, adminCancelarTurno } from '@/app/actions/admin'
import { Spinner } from '@/components/ui/Spinner'

// ─── Constantes del grid ─────────────────────────────────────────────────────
const HORA_INICIO = 9
const HORA_FIN = 20
const TOTAL_HORAS = HORA_FIN - HORA_INICIO        // 11
const ALTO_HORA = 64                               // px por hora
const ALTO_GRID = TOTAL_HORAS * ALTO_HORA         // 704 px

const DIAS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const HORAS_EJE = Array.from({ length: TOTAL_HORAS + 1 }, (_, i) => HORA_INICIO + i)

// Colores por barbero (índice cíclico)
const COLORES = [
  { bg: 'bg-amber-500/20',  borde: 'border-l-amber-500',  texto: 'text-amber-300',  solid: '#f59e0b', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30'  },
  { bg: 'bg-violet-500/20', borde: 'border-l-violet-500', texto: 'text-violet-300', solid: '#8b5cf6', badge: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  { bg: 'bg-cyan-500/20',   borde: 'border-l-cyan-500',   texto: 'text-cyan-300',   solid: '#06b6d4', badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'   },
  { bg: 'bg-emerald-500/20',borde: 'border-l-emerald-500',texto: 'text-emerald-300',solid: '#10b981', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { bg: 'bg-rose-500/20',   borde: 'border-l-rose-500',   texto: 'text-rose-300',   solid: '#f43f5e', badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30'   },
]

// ─── Tipos ───────────────────────────────────────────────────────────────────
type TurnoCalendario = {
  id: string
  fecha: string
  hora: string
  estado: string
  barbero_id: string
  profiles: { nombre: string; apellido: string; email: string } | null
  barberos:  { id: string; nombre: string; apellido: string } | null
  servicios: { nombre: string; duracion_minutos: number; precio: number } | null
}

type TurnoConLayout = TurnoCalendario & {
  top: number
  height: number
  left: number    // porcentaje dentro de la columna
  width: number   // porcentaje dentro de la columna
  colorIdx: number
}

// ─── Helpers de fecha ────────────────────────────────────────────────────────
function lunesDeEstaSemana(date: Date): Date {
  const d = new Date(date)
  const dia = d.getDay()
  d.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function diasDeLaSemana(lunes: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes)
    d.setDate(d.getDate() + i)
    return d
  })
}

function toISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function esHoy(date: Date): boolean {
  return date.toDateString() === new Date().toDateString()
}

// ─── Helpers de tiempo ───────────────────────────────────────────────────────
function horaAMinutos(hora: string): number {
  const [h, m] = hora.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

function minutosATop(min: number): number {
  return ((min - HORA_INICIO * 60) / (TOTAL_HORAS * 60)) * ALTO_GRID
}

function duracionAAlto(min: number): number {
  return Math.max((min / (TOTAL_HORAS * 60)) * ALTO_GRID, 26)
}

function sumarMinutos(hora: string, mins: number): string {
  const total = horaAMinutos(hora) + mins
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// ─── Cálculo de layout para superpuestos ────────────────────────────────────
function calcLayout(
  turnos: TurnoCalendario[],
  colorMap: Map<string, number>,
): TurnoConLayout[] {
  if (turnos.length === 0) return []

  const sorted = [...turnos].sort(
    (a, b) => horaAMinutos(a.hora) - horaAMinutos(b.hora)
  )

  const grupos: TurnoCalendario[][] = []
  let grupo: TurnoCalendario[] = []
  let maxFin = 0

  for (const t of sorted) {
    const inicio = horaAMinutos(t.hora)
    const fin = inicio + (t.servicios?.duracion_minutos ?? 30)
    if (grupo.length === 0 || inicio < maxFin) {
      grupo.push(t)
      maxFin = Math.max(maxFin, fin)
    } else {
      grupos.push([...grupo])
      grupo = [t]
      maxFin = fin
    }
  }
  if (grupo.length > 0) grupos.push(grupo)

  const result: TurnoConLayout[] = []
  for (const g of grupos) {
    const n = g.length
    g.forEach((t, i) => {
      result.push({
        ...t,
        top:      minutosATop(horaAMinutos(t.hora)),
        height:   duracionAAlto(t.servicios?.duracion_minutos ?? 30),
        left:     (i / n) * 100,
        width:    (1 / n) * 100,
        colorIdx: colorMap.get(t.barbero_id) ?? 0,
      })
    })
  }
  return result
}

// ─── Componente principal ────────────────────────────────────────────────────
export function CalendarioSemanal() {
  const [semanaInicio, setSemanaInicio] = useState<Date>(() => lunesDeEstaSemana(new Date()))
  const [turnos, setTurnos]             = useState<TurnoCalendario[]>([])
  const [loading, setLoading]           = useState(true)
  const [selected, setSelected]         = useState<TurnoConLayout | null>(null)
  const [filtro, setFiltro]             = useState<string | null>(null)
  const [isPending, startTransition]    = useTransition()

  const dias    = diasDeLaSemana(semanaInicio)
  const isoIni  = toISO(semanaInicio)
  const isoFin  = toISO(dias[6])

  // ── Mapa de colores por barbero (basado en orden de aparición) ────────────
  const barberosUnicos = Array.from(
    new Map(turnos.map(t => [t.barbero_id, t.barberos])).entries()
  )
  const colorMap = new Map<string, number>(
    barberosUnicos.map(([id], i) => [id, i % COLORES.length])
  )

  // ── Carga de datos ────────────────────────────────────────────────────────
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    adminGetCalendario(isoIni, isoFin)
      .then(d  => { if (!cancelled) setTurnos(d as TurnoCalendario[]) })
      .catch(() => { if (!cancelled) setTurnos([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isoIni, isoFin])
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Navegación de semana ──────────────────────────────────────────────────
  const prevSemana = () => setSemanaInicio(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
  const nextSemana = () => setSemanaInicio(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
  const irHoy     = () => setSemanaInicio(lunesDeEstaSemana(new Date()))

  // ── Etiqueta de semana ────────────────────────────────────────────────────
  const fin = dias[6]
  const etiquetaSemana =
    semanaInicio.getMonth() === fin.getMonth()
      ? `${semanaInicio.getDate()} – ${fin.getDate()} de ${MESES[semanaInicio.getMonth()]} ${semanaInicio.getFullYear()}`
      : `${semanaInicio.getDate()} de ${MESES[semanaInicio.getMonth()]} – ${fin.getDate()} de ${MESES[fin.getMonth()]} ${semanaInicio.getFullYear()}`

  // ── Acciones sobre turnos ─────────────────────────────────────────────────
  const handleConfirmar = (id: string) => {
    startTransition(async () => {
      const res = await adminConfirmarTurno(id)
      if (!res.error) {
        setTurnos(prev => prev.map(t => t.id === id ? { ...t, estado: 'confirmado' } : t))
        setSelected(prev => prev?.id === id ? { ...prev, estado: 'confirmado' } : prev)
      }
    })
  }

  const handleCancelar = (id: string) => {
    if (!confirm('¿Cancelar este turno?')) return
    startTransition(async () => {
      const res = await adminCancelarTurno(id)
      if (!res.error) {
        setTurnos(prev => prev.filter(t => t.id !== id))
        setSelected(null)
      }
    })
  }

  // ── Indicador de hora actual ──────────────────────────────────────────────
  const ahora    = new Date()
  const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes()
  const ahoraTop = minutosATop(ahoraMin)
  const mostrarIndicador = ahoraMin >= HORA_INICIO * 60 && ahoraMin < HORA_FIN * 60

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">

      {/* ── Header: nav de semana + leyenda de barberos ─────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Navegación */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevSemana}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors cursor-pointer"
            aria-label="Semana anterior"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="text-white font-semibold text-sm sm:text-base select-none min-w-[220px] text-center">
            {etiquetaSemana}
          </span>

          <button
            onClick={nextSemana}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors cursor-pointer"
            aria-label="Semana siguiente"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={irHoy}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:bg-amber-500/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Hoy
          </button>
        </div>

        {/* Leyenda de barberos */}
        {!loading && barberosUnicos.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFiltro(null)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                filtro === null
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700'
              }`}
            >
              Todos
            </button>
            {barberosUnicos.map(([id, b]) => {
              const c = COLORES[colorMap.get(id) ?? 0]
              const activo = filtro === id
              return (
                <button
                  key={id}
                  onClick={() => setFiltro(activo ? null : id)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                    activo ? c.badge : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: c.solid }} />
                  {b?.nombre} {b?.apellido?.[0]}.
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Grilla del calendario ────────────────────────────────────── */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-[420px]">
            <div className="flex items-center gap-3 text-zinc-500 text-sm">
              <Spinner className="w-5 h-5 text-amber-400" />
              Cargando calendario...
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: 700 }}>

              {/* Cabecera de días */}
              <div className="flex border-b border-zinc-800">
                <div className="w-14 shrink-0" />
                {dias.map((dia, i) => {
                  const hoy      = esHoy(dia)
                  const isoDia   = toISO(dia)
                  const conteo   = turnos.filter(t =>
                    t.fecha === isoDia && (!filtro || t.barbero_id === filtro)
                  ).length
                  return (
                    <div
                      key={i}
                      className={`flex-1 py-3 text-center border-l border-zinc-800 ${hoy ? 'bg-amber-500/5' : ''}`}
                    >
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${hoy ? 'text-amber-400' : 'text-zinc-500'}`}>
                        {DIAS[i]}
                      </p>
                      <p className={`text-xl font-black mt-0.5 leading-none ${hoy ? 'text-amber-400' : 'text-zinc-200'}`}>
                        {dia.getDate()}
                      </p>
                      <p className={`text-[10px] mt-1 ${conteo > 0 ? 'text-zinc-500' : 'text-transparent'}`}>
                        {conteo} {conteo === 1 ? 'turno' : 'turnos'}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Eje de tiempo + columnas */}
              <div className="flex">

                {/* Eje horario */}
                <div className="w-14 shrink-0 relative select-none" style={{ height: ALTO_GRID }}>
                  {HORAS_EJE.map(h => (
                    <div
                      key={h}
                      className="absolute right-2 text-[10px] text-zinc-600 font-mono tabular-nums"
                      style={{ top: (h - HORA_INICIO) * ALTO_HORA - 7 }}
                    >
                      {String(h).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>

                {/* Columnas de días */}
                {dias.map((dia, dIdx) => {
                  const hoy    = esHoy(dia)
                  const isoDia = toISO(dia)
                  const dTurnos = turnos.filter(t =>
                    t.fecha === isoDia && (!filtro || t.barbero_id === filtro)
                  )
                  const layout = calcLayout(dTurnos, colorMap)

                  return (
                    <div
                      key={dIdx}
                      className={`flex-1 border-l border-zinc-800 relative ${hoy ? 'bg-amber-500/[0.025]' : ''}`}
                      style={{ height: ALTO_GRID }}
                    >
                      {/* Líneas de hora */}
                      {HORAS_EJE.map(h => (
                        <div
                          key={h}
                          className="absolute left-0 right-0 border-t border-zinc-800/50"
                          style={{ top: (h - HORA_INICIO) * ALTO_HORA }}
                        />
                      ))}

                      {/* Indicador de hora actual (solo columna de hoy) */}
                      {hoy && mostrarIndicador && (
                        <div
                          className="absolute left-0 right-0 z-10 pointer-events-none"
                          style={{ top: ahoraTop }}
                        >
                          <div className="flex items-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 -ml-1.5 shrink-0 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                            <div className="flex-1 h-px bg-amber-500/50" />
                          </div>
                        </div>
                      )}

                      {/* Bloques de turno */}
                      {layout.map(t => {
                        const c      = COLORES[t.colorIdx]
                        const chico  = t.height < 44
                        const mediano = t.height < 74
                        return (
                          <button
                            key={t.id}
                            onClick={() => setSelected(t)}
                            className={`absolute overflow-hidden rounded border-l-2 cursor-pointer transition-all hover:brightness-125 hover:z-20 text-left px-1.5 py-1 ${c.bg} ${c.borde}`}
                            style={{
                              top:    t.top + 1,
                              height: t.height - 2,
                              left:   `calc(${t.left}% + 2px)`,
                              width:  `calc(${t.width}% - 4px)`,
                            }}
                          >
                            <p className={`text-[11px] font-semibold leading-tight truncate ${c.texto}`}>
                              {t.servicios?.nombre}
                            </p>
                            {!chico && (
                              <p className="text-[10px] text-zinc-400 leading-tight truncate">
                                {t.profiles?.nombre} {t.profiles?.apellido}
                              </p>
                            )}
                            {!mediano && (
                              <p className="text-[10px] text-zinc-600 leading-tight mt-0.5">
                                {t.hora.slice(0, 5)}
                              </p>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal de detalle del turno ───────────────────────────────── */}
      {selected && (() => {
        const c = COLORES[selected.colorIdx]
        const statusColors: Record<string, string> = {
          pendiente:  'bg-amber-500/10 text-amber-500 border-amber-500/20',
          confirmado: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          cancelado:  'bg-red-500/10 text-red-500 border-red-500/20',
        }
        const [y, mo, d] = selected.fecha.split('-')
        const fechaLeg  = `${d}/${mo}/${y}`
        const horaIni   = selected.hora.slice(0, 5)
        const dur       = selected.servicios?.duracion_minutos ?? 30
        const horaFin   = sumarMinutos(horaIni, dur)

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setSelected(null)}
            />
            <div className="relative z-10 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4">
              {/* Línea de color del barbero */}
              <div className="h-1 rounded-t-2xl" style={{ background: c.solid }} />

              <div className="p-5">
                {/* Título + badge + cerrar */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-white leading-tight">
                      {selected.servicios?.nombre}
                    </h3>
                    <p className="text-zinc-500 text-sm mt-0.5">
                      {fechaLeg} · {horaIni} – {horaFin}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${statusColors[selected.estado] ?? ''}`}>
                      {selected.estado}
                    </span>
                    <button
                      onClick={() => setSelected(null)}
                      className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Datos del turno */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800 mb-4">
                  <div className="flex justify-between items-center px-4 py-2.5">
                    <span className="text-zinc-500 text-sm">Cliente</span>
                    <span className="text-white text-sm font-medium">
                      {selected.profiles?.nombre} {selected.profiles?.apellido}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5">
                    <span className="text-zinc-500 text-sm">Barbero</span>
                    <span className={`text-sm font-semibold ${c.texto}`}>
                      {selected.barberos?.nombre} {selected.barberos?.apellido}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5">
                    <span className="text-zinc-500 text-sm">Duración</span>
                    <span className="text-white text-sm font-medium">{dur} min</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5">
                    <span className="text-zinc-500 text-sm">Precio</span>
                    <span className="text-amber-400 font-bold text-base">${selected.servicios?.precio}</span>
                  </div>
                </div>

                {/* Acciones */}
                {(selected.estado === 'pendiente' || selected.estado === 'confirmado') && (
                  <div className="flex gap-2">
                    {selected.estado === 'pendiente' && (
                      <button
                        onClick={() => handleConfirmar(selected.id)}
                        disabled={isPending}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isPending && <Spinner className="w-3 h-3 text-emerald-400" />}
                        Confirmar
                      </button>
                    )}
                    <button
                      onClick={() => handleCancelar(selected.id)}
                      disabled={isPending}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isPending && <Spinner className="w-3 h-3 text-red-400" />}
                      Cancelar turno
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
