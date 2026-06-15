'use client'

import { useState, useTransition, useEffect } from 'react'
import { getServicios, getBarberos, getHorariosDisponibles } from '@/app/actions/reservas'
import { adminGetClientes, adminCrearTurno } from '@/app/actions/admin'
import { Spinner } from '@/components/ui/Spinner'
import type { Servicio, Barbero } from '@/types'

type ClienteResumen = {
  id: string
  nombre: string
  apellido: string
  email: string
}

type Step = 'cliente' | 'servicio' | 'horario' | 'confirmar'

const STEPS: Step[] = ['cliente', 'servicio', 'horario', 'confirmar']
const STEP_LABELS: Record<Step, string> = {
  cliente: 'Cliente',
  servicio: 'Servicio',
  horario: 'Horario',
  confirmar: 'Confirmar',
}

type Props = {
  onClose: () => void
  onSuccess: () => void
}

export function AdminNuevoTurnoModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('cliente')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Listas de datos
  const [clientes, setClientes] = useState<ClienteResumen[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [barberos, setBarberos] = useState<Barbero[]>([])
  const [horarios, setHorarios] = useState<string[]>([])
  const [loadingInicial, setLoadingInicial] = useState(true)
  const [loadingHorarios, setLoadingHorarios] = useState(false)

  // Selecciones del usuario
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteResumen | null>(null)
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null)
  const [barberoSeleccionado, setBarberoSeleccionado] = useState<Barbero | null>(null)
  const [fecha, setFecha] = useState('')
  const [horaSeleccionada, setHoraSeleccionada] = useState('')

  // Búsqueda de cliente
  const [busqueda, setBusqueda] = useState('')

  // Cargar datos iniciales al montar
  useEffect(() => {
    Promise.all([adminGetClientes(), getServicios(), getBarberos()])
      .then(([c, s, b]) => {
        setClientes(c)
        setServicios(s)
        setBarberos(b)
      })
      .finally(() => setLoadingInicial(false))
  }, [])

  // Cerrar con ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Cargar horarios cuando barbero + fecha + servicio están completos
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!barberoSeleccionado || !fecha || !servicioSeleccionado) return

    let cancelled = false
    setLoadingHorarios(true)
    setHoraSeleccionada('')
    setHorarios([])

    getHorariosDisponibles(barberoSeleccionado.id, fecha, servicioSeleccionado.id)
      .then((h) => { if (!cancelled) setHorarios(h) })
      .catch(() => { if (!cancelled) setHorarios([]) })
      .finally(() => { if (!cancelled) setLoadingHorarios(false) })

    return () => { cancelled = true }
  }, [barberoSeleccionado?.id, fecha, servicioSeleccionado?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const clientesFiltrados = clientes.filter((c) => {
    const q = busqueda.toLowerCase()
    return (
      c.nombre.toLowerCase().includes(q) ||
      c.apellido.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    )
  })

  const handleConfirmar = () => {
    if (!clienteSeleccionado || !servicioSeleccionado || !barberoSeleccionado || !fecha || !horaSeleccionada) return

    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.append('cliente_id', clienteSeleccionado.id)
      fd.append('servicio_id', servicioSeleccionado.id)
      fd.append('barbero_id', barberoSeleccionado.id)
      fd.append('fecha', fecha)
      fd.append('hora', horaSeleccionada)

      const res = await adminCrearTurno(fd)
      if (res.error) {
        setError(res.error)
      } else {
        onSuccess()
        onClose()
      }
    })
  }

  // Fecha mínima en hora local (no UTC) para evitar desfase de zona horaria
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  // El admin no tiene límite de 60 días — puede agendar cualquier fecha futura

  const currentStepIdx = STEPS.indexOf(step)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-labelledby="modal-title"
        className="relative z-10 bg-zinc-950 border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg mx-0 sm:mx-4 max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-zinc-800 shrink-0">
          <div>
            <h2 id="modal-title" className="text-lg font-bold text-white">Nueva Reserva</h2>
            <p className="text-zinc-500 text-sm mt-0.5">Agenda un turno manualmente</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-zinc-800 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Indicador de pasos */}
        <div className="px-6 pt-5 pb-1 shrink-0">
          <div className="flex items-center">
            {STEPS.map((s, i) => {
              const isCompleted = i < currentStepIdx
              const isCurrent = s === step
              return (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCompleted
                          ? 'bg-amber-500 text-black'
                          : isCurrent
                          ? 'ring-2 ring-amber-500 bg-amber-500/10 text-amber-400'
                          : 'bg-zinc-800 text-zinc-600'
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-medium hidden sm:block ${
                        isCurrent ? 'text-amber-400' : isCompleted ? 'text-zinc-400' : 'text-zinc-600'
                      }`}
                    >
                      {STEP_LABELS[s]}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-px mx-2 mb-4 sm:mb-0 transition-colors ${
                        i < currentStepIdx ? 'bg-amber-500' : 'bg-zinc-800'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loadingInicial ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="w-6 h-6 text-amber-400" />
            </div>
          ) : (
            <>
              {/* PASO 1 — Cliente */}
              {step === 'cliente' && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                    Seleccioná el cliente
                  </p>
                  <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    autoFocus
                    className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 placeholder:text-zinc-600 transition-colors"
                  />
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {clientesFiltrados.length === 0 ? (
                      <div className="text-center py-8 text-zinc-500 text-sm">
                        No se encontraron clientes
                      </div>
                    ) : (
                      clientesFiltrados.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setClienteSeleccionado(c)
                            setStep('servicio')
                          }}
                          className="w-full text-left px-4 py-3 rounded-xl border transition-all cursor-pointer group border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/60"
                        >
                          <p className="text-white font-medium text-sm group-hover:text-amber-400 transition-colors">
                            {c.nombre} {c.apellido}
                          </p>
                          <p className="text-zinc-500 text-xs mt-0.5">{c.email}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* PASO 2 — Servicio */}
              {step === 'servicio' && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                    Seleccioná el servicio
                  </p>
                  <div className="space-y-2">
                    {servicios.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setServicioSeleccionado(s)
                          setStep('horario')
                        }}
                        className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all cursor-pointer ${
                          servicioSeleccionado?.id === s.id
                            ? 'border-amber-500/50 bg-amber-500/10'
                            : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/60'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-white font-medium text-sm">{s.nombre}</span>
                          <span className="text-amber-400 font-bold text-sm">${s.precio}</span>
                        </div>
                        <p className="text-zinc-500 text-xs mt-1">{s.duracion_minutos} min</p>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setStep('cliente')}
                    className="text-zinc-500 hover:text-white text-sm transition-colors mt-2 cursor-pointer"
                  >
                    ← Volver
                  </button>
                </div>
              )}

              {/* PASO 3 — Horario */}
              {step === 'horario' && (
                <div className="space-y-5">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Seleccioná barbero y horario
                  </p>

                  {/* Barbero */}
                  <div>
                    <label className="text-xs text-zinc-500 mb-2 block">Barbero</label>
                    <div className="grid grid-cols-2 gap-2">
                      {barberos.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => setBarberoSeleccionado(b)}
                          className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                            barberoSeleccionado?.id === b.id
                              ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                              : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60'
                          }`}
                        >
                          {b.nombre} {b.apellido}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fecha */}
                  <div>
                    <label className="text-xs text-zinc-500 mb-2 block">Fecha</label>
                    <input
                      type="date"
                      value={fecha}
                      min={today}
                      onChange={(e) => setFecha(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 cursor-pointer transition-colors [color-scheme:dark]"
                    />
                  </div>

                  {/* Horarios disponibles */}
                  {barberoSeleccionado && fecha && (
                    <div>
                      <label className="text-xs text-zinc-500 mb-2 block">Horario disponible</label>
                      {loadingHorarios ? (
                        <div className="flex items-center gap-2 text-zinc-500 text-sm py-3">
                          <Spinner className="w-4 h-4 text-amber-400" />
                          Cargando disponibilidad...
                        </div>
                      ) : horarios.length === 0 ? (
                        <p className="text-zinc-500 text-sm bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                          Sin horarios disponibles para este día
                        </p>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {horarios.map((h) => (
                            <button
                              key={h}
                              onClick={() => setHoraSeleccionada(h)}
                              className={`py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer ${
                                horaSeleccionada === h
                                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                                  : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'
                              }`}
                            >
                              {h}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setStep('servicio')}
                      className="text-zinc-500 hover:text-white text-sm transition-colors cursor-pointer"
                    >
                      ← Volver
                    </button>
                    <button
                      onClick={() => setStep('confirmar')}
                      disabled={!barberoSeleccionado || !fecha || !horaSeleccionada}
                      className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
                    >
                      Continuar →
                    </button>
                  </div>
                </div>
              )}

              {/* PASO 4 — Confirmar */}
              {step === 'confirmar' &&
                clienteSeleccionado &&
                servicioSeleccionado &&
                barberoSeleccionado && (
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                      Revisá el resumen
                    </p>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
                      <div className="flex justify-between items-center px-4 py-3">
                        <span className="text-zinc-500 text-sm">Cliente</span>
                        <span className="text-white font-medium text-sm">
                          {clienteSeleccionado.nombre} {clienteSeleccionado.apellido}
                        </span>
                      </div>
                      <div className="flex justify-between items-center px-4 py-3">
                        <span className="text-zinc-500 text-sm">Servicio</span>
                        <span className="text-white font-medium text-sm">{servicioSeleccionado.nombre}</span>
                      </div>
                      <div className="flex justify-between items-center px-4 py-3">
                        <span className="text-zinc-500 text-sm">Barbero</span>
                        <span className="text-white font-medium text-sm">
                          {barberoSeleccionado.nombre} {barberoSeleccionado.apellido}
                        </span>
                      </div>
                      <div className="flex justify-between items-center px-4 py-3">
                        <span className="text-zinc-500 text-sm">Fecha</span>
                        <span className="text-white font-medium text-sm">
                          {fecha.split('-').reverse().join('/')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center px-4 py-3">
                        <span className="text-zinc-500 text-sm">Hora</span>
                        <span className="text-white font-medium text-sm">{horaSeleccionada}</span>
                      </div>
                      <div className="flex justify-between items-center px-4 py-3.5">
                        <span className="text-zinc-400 text-sm font-medium">Total</span>
                        <span className="text-amber-400 font-bold text-lg">${servicioSeleccionado.precio}</span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-500 leading-relaxed">
                      El turno se creará como{' '}
                      <span className="text-emerald-400 font-medium">confirmado</span> y se enviará
                      un mail de confirmación al cliente automáticamente.
                    </p>

                    {error && (
                      <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                        <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-red-400 text-sm">{error}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => setStep('horario')}
                        disabled={isPending}
                        className="text-zinc-500 hover:text-white text-sm transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        ← Volver
                      </button>
                      <button
                        onClick={handleConfirmar}
                        disabled={isPending}
                        className="bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-black font-bold text-sm px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        {isPending && <Spinner className="w-4 h-4 text-black" />}
                        {isPending ? 'Guardando...' : 'Confirmar Turno'}
                      </button>
                    </div>
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
