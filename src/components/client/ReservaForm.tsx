'use client'

import React, { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getDisponibilidad, crearReserva, type MetodoPago } from '@/app/actions/reservas'
import { ahoraEnZona, sumarDias, MENSAJE_SIN_HORARIOS, type MotivoSinHorarios } from '@/lib/horarios'
import { Spinner } from '@/components/ui/Spinner'
import { useLocal } from '@/components/local/LocalProvider'
import { rutaLocal } from '@/lib/local-datos'
import { conMayuscula } from '@/lib/rubros'
import { formatPrecio } from '@/lib/format'
import type { ModoDeCobro } from '@/lib/cobros'

type Servicio = { id: string; nombre: string; duracion_minutos: number; precio: number; descripcion: string }
type Barbero = { id: string; nombre: string; apellido: string }

/**
 * `cobro` dice cómo cobra la seña este local (lo decide el servidor, ver
 * lib/cobros.ts):
 *   online          → Mercado Pago o transferencia;
 *   muestra         → una demo: se puede elegir Mercado Pago para verlo, pero
 *                     no se cobra nada;
 *   sin_mercadopago → solo transferencia.
 */
export function ReservaForm({ servicios, barberos, cobro }: { servicios: Servicio[], barberos: Barbero[], cobro: ModoDeCobro }) {
  // El local de la página: su seña, su alias y sus palabras ("barbero", "manicura").
  const local = useLocal()
  const Profesional = conMayuscula(local.palabras.profesional)
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null)
  const [barberoSeleccionado, setBarberoSeleccionado] = useState<Barbero | null>(null)
  const [fecha, setFecha] = useState<string>('')
  const [horarios, setHorarios] = useState<string[]>([])
  // Por qué no hay horarios ese día (cerrado, de licencia...), para explicarlo.
  const [motivo, setMotivo] = useState<MotivoSinHorarios | undefined>()
  const [horaSeleccionada, setHoraSeleccionada] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const [isLoadingHorarios, setIsLoadingHorarios] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(cobro === 'sin_mercadopago' ? 'transferencia' : 'mercadopago')
  // metodo: 'transferencia', 'mercadopago' (no se pudo abrir el pago) o 'muestra' (una demo).
  const [confirmacion, setConfirmacion] = useState<{ metodo: string; sena: number; alias: string } | null>(null)
  const avisoRef = useRef<HTMLDivElement>(null)

  // El aviso de error está arriba del formulario y el botón de confirmar
  // abajo: en el celu quedaba fuera de la vista. Se lo trae al centro.
  useEffect(() => {
    if (errorMsg) avisoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [errorMsg])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (step === 3 && fecha && barberoSeleccionado && servicioSeleccionado) {
      setHoraSeleccionada('')
      setIsLoadingHorarios(true)
      getDisponibilidad(barberoSeleccionado.id, fecha, servicioSeleccionado.id)
        .then((d) => { setHorarios(d.horarios); setMotivo(d.motivo) })
        .catch(() => { setHorarios([]); setMotivo(undefined) })
        .finally(() => setIsLoadingHorarios(false))
    }
  }, [fecha, barberoSeleccionado, servicioSeleccionado, step])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Qué días se pueden elegir: de hoy hasta los días adelante que permite el
  // local, contando en la hora del local (no la del celular de quien reserva).
  const today = ahoraEnZona(local.zonaHoraria).fecha
  const maxDateStr = sumarDias(today, local.diasReserva)

  async function handleConfirmar(formData: FormData) {
    setErrorMsg('')
    startTransition(async () => {
      const res = await crearReserva(formData)
      if ('error' in res && res.error) {
        setErrorMsg(res.error)
        // Si otro ocupó el horario mientras el cliente decidía, se vuelve a
        // pedir la lista para que elija entre los que de verdad quedan libres.
        if ('horarioOcupado' in res && barberoSeleccionado && servicioSeleccionado) {
          setHoraSeleccionada('')
          getDisponibilidad(barberoSeleccionado.id, fecha, servicioSeleccionado.id)
            .then((d) => { setHorarios(d.horarios); setMotivo(d.motivo) })
            .catch(() => { setHorarios([]); setMotivo(undefined) })
        }
        return
      }
      if ('mp' in res && res.mp && res.url_checkout) {
        window.location.href = res.url_checkout
        return
      }
      if ('muestra' in res && res.muestra) {
        setConfirmacion({ metodo: 'muestra', sena: res.sena ?? 0, alias: '' })
        return
      }
      if ('metodo' in res) {
        setConfirmacion({
          metodo: res.metodo as string,
          sena: (res.sena as number) ?? 0,
          alias: (res.alias as string) ?? local.aliasPago,
        })
      } else {
        router.push(rutaLocal(local.slug, '/turnos?reserva=success'))
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
              {num === 1 ? 'Servicio' : num === 2 ? Profesional : 'Fecha'}
            </span>
          </div>
        ))}
      </div>

      {errorMsg && (
        <div ref={avisoRef} className="mb-6 p-4 rounded-lg bg-red-950/30 border border-red-800/50 text-red-400 text-sm">
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
                <p className="font-bold text-white">{formatPrecio(s.precio)}</p>
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
            <h2 className="text-xl font-bold text-white">¿Con quién te atendés?</h2>
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
                  {motivo ? MENSAJE_SIN_HORARIOS[motivo] : 'No hay horarios disponibles para esta fecha.'}
                </div>
              )}
            </div>
          )}

          {horaSeleccionada && !confirmacion && (() => {
            const sena = Math.round((servicioSeleccionado.precio * local.senaPorcentaje) / 100)
            // La seña se paga siempre por adelantado — sin opción de pagar en el local.
            // Mercado Pago aparece solo si el local cobra online (o, en una demo, para mostrarlo).
            const metodos: { value: MetodoPago; label: string; desc: string }[] = [
              ...(cobro !== 'sin_mercadopago'
                ? [{ value: 'mercadopago' as const, label: 'Mercado Pago', desc: cobro === 'muestra' ? 'Tarjeta o dinero en cuenta (en la muestra no se cobra)' : 'Tarjeta o dinero en cuenta' }]
                : []),
              { value: 'transferencia', label: 'Transferencia', desc: local.aliasPago ? `Alias ${local.aliasPago}` : 'El local te pasa los datos para transferir' },
            ]
            return (
            <div className="pt-6 border-t border-zinc-900">
              <h3 className="text-lg font-bold text-white mb-4">Resumen</h3>
              <div className="space-y-2 text-sm text-zinc-400 mb-5 bg-zinc-900/50 p-4 rounded-xl">
                <p><strong className="text-zinc-200">Servicio:</strong> {servicioSeleccionado.nombre} ({formatPrecio(servicioSeleccionado.precio)})</p>
                <p><strong className="text-zinc-200">{Profesional}:</strong> {barberoSeleccionado.nombre} {barberoSeleccionado.apellido}</p>
                <p><strong className="text-zinc-200">Fecha:</strong> {fecha.split('-').reverse().join('/')}</p>
                <p><strong className="text-zinc-200">Hora:</strong> {horaSeleccionada}</p>
                <div className="pt-2 mt-2 border-t border-zinc-800 flex justify-between items-center">
                  <span>Seña ({local.senaPorcentaje}%) para reservar</span>
                  <span className="text-amber-400 font-bold text-base">{formatPrecio(sena)}</span>
                </div>
                <p className="text-xs text-zinc-600">El resto ({formatPrecio(servicioSeleccionado.precio - sena)}) se abona en el local.</p>
              </div>

              <p className="text-sm font-semibold text-white mb-3">¿Cómo querés dejar la seña?</p>
              <div className="space-y-2 mb-5">
                {metodos.map(m => (
                  <label key={m.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      metodoPago === m.value ? 'border-amber-500/60 bg-amber-500/5' : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                    }`}>
                    <input type="radio" name="metodo_radio" value={m.value} checked={metodoPago === m.value}
                      onChange={() => setMetodoPago(m.value)} className="mt-0.5 accent-amber-500" />
                    <div>
                      <p className="text-white text-sm font-semibold">{m.label}</p>
                      <p className="text-zinc-500 text-xs">{m.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <form action={handleConfirmar}>
                <input type="hidden" name="local" value={local.slug} />
                <input type="hidden" name="servicio_id" value={servicioSeleccionado.id} />
                <input type="hidden" name="barbero_id" value={barberoSeleccionado.id} />
                <input type="hidden" name="fecha" value={fecha} />
                <input type="hidden" name="hora" value={horaSeleccionada} />
                <input type="hidden" name="metodo_pago" value={metodoPago} />
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                >
                  {isPending && <Spinner className="w-5 h-5 text-zinc-950" />}
                  {metodoPago === 'mercadopago' ? `Pagar seña ${formatPrecio(sena)}` : 'Confirmar reserva'}
                </button>
              </form>
            </div>
            )
          })()}

          {confirmacion && (
            <div className="pt-6 border-t border-zinc-900 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">¡Turno reservado!</h3>
              {confirmacion.metodo === 'muestra' ? (
                // Una demo: se muestra cómo sería el pago, sin cobrar nada (decisión 5).
                <div className="mt-3 text-sm text-zinc-400 max-w-md mx-auto space-y-2">
                  <p className="inline-block rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-300">Es una muestra: no se cobró nada</p>
                  <p>
                    En tu local, acá se abre Mercado Pago, se paga la seña de <span className="text-amber-400 font-bold">{formatPrecio(confirmacion.sena)}</span> y
                    la plata te cae directo en tu cuenta.
                  </p>
                </div>
              ) : (
                <div className="mt-3 text-sm text-zinc-400">
                  {confirmacion.metodo === 'mercadopago' && (
                    <p className="mb-2">No pudimos abrir el pago de Mercado Pago en este momento.</p>
                  )}
                  {confirmacion.alias ? (
                    <>
                      <p>Para confirmarlo, transferí la seña de <span className="text-amber-400 font-bold">{formatPrecio(confirmacion.sena)}</span> al alias:</p>
                      <p className="mt-2 inline-block max-w-full break-all bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white font-mono">{confirmacion.alias}</p>
                      <p className="mt-2 text-xs text-zinc-600">Mandanos el comprobante por WhatsApp y listo.</p>
                    </>
                  ) : (
                    <p>Para confirmarlo, el local te pasa los datos para transferir la seña de <span className="text-amber-400 font-bold">{formatPrecio(confirmacion.sena)}</span>.</p>
                  )}
                </div>
              )}
              <button onClick={() => router.push(rutaLocal(local.slug, '/turnos'))}
                className="mt-6 bg-white hover:bg-zinc-200 text-zinc-950 font-bold px-6 py-3 rounded-xl transition-colors">
                Ver mis turnos
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}