'use client'

import React, { useTransition } from 'react'
import { cancelarTurno } from '@/app/actions/reservas'
import { Spinner } from '@/components/ui/Spinner'

type Turno = {
  id: string
  fecha: string
  hora: string
  estado: string
  barberos: { nombre: string; apellido: string }
  servicios: { nombre: string; duracion_minutos: number; precio: number }
}

export function TurnoCard({ turno }: { turno: Turno }) {
  const [isPending, startTransition] = useTransition()

  const [year, month, day] = turno.fecha.split('-')
  const fechaLegible = `${day}/${month}/${year}`
  const horaLegible = turno.hora.slice(0, 5)
  const isCancelable = turno.estado === 'pendiente' || turno.estado === 'confirmado'

  const handleCancelar = () => {
    if (confirm('¿Estás seguro de que deseas cancelar este turno?')) {
      startTransition(async () => {
        const res = await cancelarTurno(turno.id)
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
      </div>

      <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
        <p className="font-bold text-white">${turno.servicios.precio}</p>
        {isCancelable && (
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