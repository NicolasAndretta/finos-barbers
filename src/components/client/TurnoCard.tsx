'use client'

import React, { useState, useTransition } from 'react'
import { cancelarTurno } from '@/app/actions/reservas'
import { dejarResena } from '@/app/actions/resenas'
import { ahoraEnZona } from '@/lib/horarios'
import { Spinner } from '@/components/ui/Spinner'
import { formatPrecio } from '@/lib/format'
import { useLocalOpcional } from '@/components/local/LocalProvider'

type Turno = {
  id: string
  fecha: string
  hora: string
  estado: string
  /** Lo marcó el local: el cliente no vino (Fase 7). */
  no_vino?: boolean
  /** Ya dejó su reseña de este turno (Fase 7). */
  resenado?: boolean
  barberos: { nombre: string; apellido: string }
  servicios: { nombre: string; duracion_minutos: number; precio: number }
}

export function TurnoCard({ turno }: { turno: Turno }) {
  const [isPending, startTransition] = useTransition()
  // El local de la página: el mail de la cancelación sale con su nombre.
  const local = useLocalOpcional()

  const [year, month, day] = turno.fecha.split('-')
  const fechaLegible = `${day}/${month}/${year}`
  const horaLegible = turno.hora.slice(0, 5)
  const isCancelable = turno.estado === 'pendiente' || turno.estado === 'confirmado'
  // Reseña verificada (Fase 7): de un turno que ya pasó, al que fue, si el
  // plan del local trae reseñas. La base revisa todo igual.
  const ahora = local ? ahoraEnZona(local.zonaHoraria) : null
  const [hh, mm] = turno.hora.split(':').map(Number)
  const yaPaso = Boolean(ahora && (turno.fecha < ahora.fecha || (turno.fecha === ahora.fecha && hh * 60 + mm <= ahora.minutos)))
  const puedeResenar = Boolean(local?.plan.resenas) && yaPaso && turno.estado !== 'cancelado' && !turno.no_vino && !turno.resenado
  // Un turno que ya pasó no se cancela (la acción tampoco lo deja).
  const cancelable = isCancelable && !yaPaso

  const handleCancelar = () => {
    if (confirm('¿Estás seguro de que deseas cancelar este turno?')) {
      startTransition(async () => {
        const res = await cancelarTurno(turno.id, local?.slug)
        if (res.error) alert(res.error)
      })
    }
  }

  const statusColors: Record<string, string> = {
    pendiente: 'bg-zinc-700/50 text-zinc-300 border-zinc-600',
    confirmado: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    cancelado: 'bg-red-500/10 text-red-400 border-red-500/20',
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-lg font-bold text-white">{turno.servicios.nombre}</h3>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${statusColors[turno.estado] || 'bg-zinc-800 text-zinc-400'}`}>
            {turno.estado}
          </span>
        </div>
        <p className="text-sm text-zinc-400 mb-1">
          <span className="font-medium text-zinc-300">Con:</span> {turno.barberos.nombre} {turno.barberos.apellido}
        </p>
        <p className="text-sm text-zinc-400">
          <span className="font-medium text-zinc-300">Fecha:</span> {fechaLegible} a las {horaLegible}
        </p>
        {turno.resenado && <p className="text-xs text-emerald-400 mt-2">Ya dejaste tu reseña. ¡Gracias!</p>}
        {puedeResenar && local && <DejarResena turnoId={turno.id} slug={local.slug} />}
      </div>

      <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
        <p className="font-bold text-white">{formatPrecio(turno.servicios.precio)}</p>
        {cancelable && (
          <button onClick={handleCancelar} disabled={isPending}
            className="w-full sm:w-auto text-xs font-bold text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer">
            {isPending && <Spinner className="w-3 h-3 text-red-400" />}
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
/** Las estrellas y un texto corto: la reseña de un turno que ya pasó. */
function DejarResena({ turnoId, slug }: { turnoId: string; slug: string }) {
  const [abierta, setAbierta] = useState(false)
  const [rating, setRating] = useState(5)
  const [texto, setTexto] = useState('')
  const [estado, setEstado] = useState<{ ok: boolean; texto: string } | null>(null)
  const [pendiente, startTransition] = useTransition()

  if (estado?.ok) return <p className="text-xs text-emerald-400 mt-2" role="status">{estado.texto}</p>
  if (!abierta) {
    return (
      <button type="button" onClick={() => setAbierta(true)}
        className="mt-3 text-xs font-bold text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 px-3 py-1.5 rounded-lg cursor-pointer">
        Dejar reseña
      </button>
    )
  }
  const enviar = () => startTransition(async () => {
    const fd = new FormData()
    fd.append('local', slug)
    fd.append('turno', turnoId)
    fd.append('rating', String(rating))
    fd.append('texto', texto)
    const r = await dejarResena(fd)
    setEstado(r.error ? { ok: false, texto: r.error } : { ok: true, texto: '¡Gracias por tu reseña!' })
  })
  return (
    <div className="mt-3 flex flex-col gap-2 w-full max-w-sm">
      <div role="radiogroup" aria-label="Estrellas" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
            onClick={() => setRating(n)} className={`text-2xl leading-none cursor-pointer ${n <= rating ? 'text-amber-400' : 'text-zinc-700'}`}>★</button>
        ))}
      </div>
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} maxLength={500} aria-label="Tu reseña"
        placeholder="¿Cómo te fue?" className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none" />
      {estado && !estado.ok && <p className="text-xs text-red-400" role="alert">{estado.texto}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={enviar} disabled={pendiente || texto.trim().length < 3}
          className="text-xs font-bold text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-50 px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5">
          {pendiente && <Spinner className="w-3 h-3 text-black" />}Publicar reseña
        </button>
        <button type="button" onClick={() => setAbierta(false)} disabled={pendiente}
          className="text-xs font-bold text-zinc-400 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg cursor-pointer">Cancelar</button>
      </div>
    </div>
  )
}
