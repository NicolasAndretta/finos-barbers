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

  const today = new Date().toISOString().split('T')[0]
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 60)
  const maxDateStr = maxDate.toISOString().split('T')[0]

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
    <div className="w-full max-w-2xl mx-auto bg-zinc-950 border border-zinc-900 rounded-2xl p-6 md:p-8 shadow-xl">
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3].map((num) => (
          <div key={num} className="flex flex-col items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${step >= num ? 'bg-white border-white text-zinc-950' : 'bg-transparent border-zinc-800 text-zinc-600'}`}>
              {num}
            </div>
            <span className={`text-xs ${step >= num ? 'text-white font-medium' : 'text-zinc-600'}`}>
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
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white mb-4">Elegí tu servicio</h2>
          {servicios.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setServicioSeleccionado(s)
                setStep(2)
              }}
              className="w-full text-left p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-white/30 transition-all flex justify-between items-center"
            >
              <div>
                <p className="font-bold text-zinc-100">{s.nombre}</p>
                <p className="text-xs text-zinc-400 mt-1">{s.descripcion}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-white">${s.precio}</p>
                <p className="text-xs text-zinc-500 mt-1">{s.duracion_minutos} min</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => setStep(1)} className="text-zinc-500 hover:text-white">
              &larr; Volver
            </button>
            <h2 className="text-xl font-bold text-white">Con quien te atendés?</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {barberos.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setBarberoSeleccionado(b)
                  setStep(3)
                }}
                className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-white/30 transition-all flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-full bg-zinc-800 mb-3 flex items-center justify-center text-2xl">
                  ✂️
                </div>
                <p className="font-bold text-zinc-100">{b.nombre}</p>
                <p className="text-xs text-zinc-500">{b.apellido}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && servicioSeleccionado && barberoSeleccionado && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => setStep(2)} className="text-zinc-500 hover:text-white">
              &larr; Volver
            </button>
            <h2 className="text-xl font-bold text-white">Elegí fecha y hora</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Fecha</label>
            <input
              type="date"
              min={today}
              max={maxDateStr}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-white/20 focus:border-white outline-none"
            />
          </div>

          {fecha && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Horarios disponibles</label>
              {isLoadingHorarios ? (
                <div className="py-8 flex justify-center">
                  <Spinner className="w-6 h-6 text-white" />
                </div>
              ) : horarios.length > 0 ? (
                <div className="grid grid-cols-4 gap-3">
                  {horarios.map((h) => (
                    <button
                      key={h}
                      onClick={() => setHoraSeleccionada(h)}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${horaSeleccionada === h ? 'bg-white text-zinc-950' : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-white/30'}`}
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
            <div className="pt-6 border-t border-zinc-900">
              <h3 className="text-lg font-bold text-white mb-4">Resumen</h3>
              <div className="space-y-2 text-sm text-zinc-400 mb-6 bg-zinc-900/50 p-4 rounded-xl">
                <p><strong>Servicio:</strong> {servicioSeleccionado.nombre} (${servicioSeleccionado.precio})</p>
                <p><strong>Barbero:</strong> {barberoSeleccionado.nombre} {barberoSeleccionado.apellido}</p>
                <p><strong>Fecha:</strong> {fecha}</p>
                <p><strong>Hora:</strong> {horaSeleccionada}</p>
              </div>

              <form action={handleConfirmar}>
                <input type="hidden" name="servicio_id" value={servicioSeleccionado.id} />
                <input type="hidden" name="barbero_id" value={barberoSeleccionado.id} />
                <input type="hidden" name="fecha" value={fecha} />
                <input type="hidden" name="hora" value={horaSeleccionada} />
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-white hover:bg-zinc-200 text-zinc-950 font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
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