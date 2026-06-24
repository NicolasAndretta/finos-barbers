'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getHorariosDisponibles, crearReserva } from '@/app/actions/reservas'
import { Spinner } from '@/components/ui/Spinner'

type Servicio = { id: string; nombre: string; duracion_minutos: number; precio: number; descripcion: string }
type Barbero = { id: string; nombre: string; apellido: string }

export function ReservaForm({ servicios, barberos }: { servicios: Servicio[], barberos: Barbero[] }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null)
  const [barberoSeleccionado, setBarberoSeleccionado] = useState<Barbero | null>(null)
  const [fecha, setFecha] = useState<string>('')
  const [horarios, setHorarios] = useState<string[]>([])
  const [horaSeleccionada, setHoraSeleccionada] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const [isLoadingHorarios, setIsLoadingHorarios] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (step === 3 && fecha && barberoSeleccionado && servicioSeleccionado) {
      setHoraSeleccionada('')
      setIsLoadingHorarios(true)
      getHorariosDisponibles(barberoSeleccionado.id, fecha, servicioSeleccionado.id)
        .then((h) => setHorarios(h))
        .catch(() => setHorarios([]))
        .finally(() => setIsLoadingHorarios(false))
    }
  }, [fecha, barberoSeleccionado, servicioSeleccionado, step])
  /* eslint-enable react-hooks/set-state-in-effect */

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const maxDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 60)
  const maxDateStr = `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, '0')}-${String(maxDate.getDate()).padStart(2, '0')}`

  async function handleConfirmar(formData: FormData) {
    setErrorMsg('')
    startTransition(async () => {
      const res = await crearReserva(formData)
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        router.push('/turnos?reserva=success')
      }
    })
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl text-left">
      <div className="relative flex items-center justify-between mb-8">
        {/* línea conectora */}
        <div className="absolute left-4 right-4 top-4 h-px bg-zinc-800 -z-0" />
        {[1, 2, 3].map((num) => (
          <div key={num} className="relative z-10 flex flex-col items-center gap-2 bg-transparent">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${step >= num ? 'bg-amber-500 border-amber-500 text-zinc-950 shadow-lg shadow-amber-500/25' : 'bg-zinc-950 border-zinc-700 text-zinc-600'}`}>
              {step > num ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              ) : num}
            </div>
            <span className={`text-xs uppercase tracking-wider ${step >= num ? 'text-amber-400 font-semibold' : 'text-zinc-600'}`}>
              {num === 1 ? 'Servicio' : num === 2 ? 'Barbero' : 'Fecha'}
            </span>
          </div>
        ))}
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-lg bg-red-950/30 border border-red-800/50 text-red-400 text-sm">
          {errorMsg}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3 animate-fade-in">
          <h2 className="font-display uppercase text-xl font-bold tracking-wide text-white mb-4">Elegí tu servicio</h2>
          {servicios.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setServicioSeleccionado(s)
                setStep(2)
              }}
              className="group w-full text-left p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-amber-500/40 transition-all flex justify-between items-center gap-4"
            >
              <div>
                <p className="font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">{s.nombre}</p>
                <p className="text-xs text-zinc-400 mt-1">{s.descripcion}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display text-xl font-bold text-amber-500">${s.precio}</p>
                <p className="text-xs text-zinc-500 mt-1">{s.duracion_minutos} min</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => setStep(1)} className="text-zinc-500 hover:text-amber-400 transition-colors text-sm">
              &larr; Volver
            </button>
            <h2 className="font-display uppercase text-xl font-bold tracking-wide text-white">¿Con quién te atendés?</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {barberos.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setBarberoSeleccionado(b)
                  setStep(3)
                }}
                className="group p-5 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-amber-500/40 transition-all flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-full bg-zinc-800 group-hover:bg-amber-500/15 border border-zinc-700 group-hover:border-amber-500/40 mb-3 flex items-center justify-center text-2xl transition-colors">
                  ✂️
                </div>
                <p className="font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">{b.nombre}</p>
                <p className="text-xs text-zinc-500">{b.apellido}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && servicioSeleccionado && barberoSeleccionado && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => setStep(2)} className="text-zinc-500 hover:text-amber-400 transition-colors text-sm">
              &larr; Volver
            </button>
            <h2 className="font-display uppercase text-xl font-bold tracking-wide text-white">Elegí fecha y hora</h2>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-2">Fecha</label>
            <input
              type="date"
              min={today}
              max={maxDateStr}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 outline-none transition-all"
            />
          </div>

          {fecha && (
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-2">Horarios disponibles</label>
              {isLoadingHorarios ? (
                <div className="py-8 flex justify-center">
                  <Spinner className="w-6 h-6 text-amber-500" />
                </div>
              ) : horarios.length > 0 ? (
                <div className="grid grid-cols-4 gap-2.5">
                  {horarios.map((h) => (
                    <button
                      key={h}
                      onClick={() => setHoraSeleccionada(h)}
                      className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${horaSeleccionada === h ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/25 scale-105' : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-amber-500/40 hover:text-amber-400'}`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 text-center text-sm text-zinc-500">
                  No hay horarios disponibles para esta fecha.
                </div>
              )}
            </div>
          )}

          {horaSeleccionada && (
            <div className="pt-6 border-t border-zinc-800 animate-fade-in">
              <h3 className="font-display uppercase text-lg font-bold tracking-wide text-white mb-4">Resumen</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-6 bg-zinc-900/60 border border-zinc-800 p-5 rounded-xl">
                <div className="col-span-2 flex justify-between items-baseline pb-3 border-b border-zinc-800">
                  <dt className="text-zinc-400">Servicio</dt>
                  <dd className="text-white font-semibold text-right">{servicioSeleccionado.nombre}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[11px] uppercase tracking-wider text-zinc-500">Barbero</dt>
                  <dd className="text-zinc-200 font-medium">{barberoSeleccionado.nombre} {barberoSeleccionado.apellido}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[11px] uppercase tracking-wider text-zinc-500">Fecha y hora</dt>
                  <dd className="text-zinc-200 font-medium">{fecha.split('-').reverse().join('/')} · {horaSeleccionada}</dd>
                </div>
                <div className="col-span-2 flex justify-between items-baseline pt-3 border-t border-zinc-800">
                  <dt className="text-zinc-400">Total</dt>
                  <dd className="font-display text-2xl font-bold text-amber-500">${servicioSeleccionado.precio}</dd>
                </div>
              </dl>

              <form action={handleConfirmar}>
                <input type="hidden" name="servicio_id" value={servicioSeleccionado.id} />
                <input type="hidden" name="barbero_id" value={barberoSeleccionado.id} />
                <input type="hidden" name="fecha" value={fecha} />
                <input type="hidden" name="hora" value={horaSeleccionada} />
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isPending && <Spinner className="w-5 h-5 text-zinc-950" />}
                  Confirmar Reserva
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}