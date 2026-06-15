import React from 'react'
import Link from 'next/link'
import { requireClient } from '@/lib/auth'
import { getTurnosCliente } from '@/app/actions/reservas'
import { TurnoCard } from '@/components/client/TurnoCard'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function TurnosPage({ searchParams }: { searchParams: SearchParams }) {
  await requireClient()
  const resolvedParams = await searchParams
  const isSuccess = resolvedParams.reserva === 'success'
  const turnos = await getTurnosCliente()

  return (
    <div className="flex flex-col items-center justify-start pb-12 animate-fade-in w-full max-w-3xl mx-auto">
      {isSuccess && (
        <div className="mb-8 w-full p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-emerald-400 text-sm flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-emerald-500/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-bold">¡Reserva confirmada con éxito!</p>
              <p className="text-emerald-500/80 text-xs">Hemos enviado los detalles a tu correo electrónico.</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 text-center sm:text-left w-full flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Mis Turnos</h1>
          <p className="mt-2 text-zinc-400 text-sm">
            Gestiona tus próximas citas o revisa el historial.
          </p>
        </div>
        <Link
          href="/reservar"
          className="bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold px-5 py-2.5 rounded-lg transition-colors shadow-lg shadow-amber-500/20"
        >
          Nuevo Turno
        </Link>
      </div>

      <div className="w-full space-y-4">
        {turnos.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-600 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-zinc-400 font-medium">Aún no tienes turnos registrados.</p>
            <p className="text-sm text-zinc-500 mt-1">¡Reserva tu primer turno para empezar!</p>
          </div>
        ) : (
          turnos.map((turno) => (
            <TurnoCard key={turno.id} turno={{
              ...turno,
              barberos: Array.isArray(turno.barberos) ? turno.barberos[0] ?? { nombre: '', apellido: '' } : turno.barberos,
              servicios: Array.isArray(turno.servicios) ? turno.servicios[0] ?? { nombre: '', duracion_minutos: 0, precio: 0 } : turno.servicios,
            } as { id: string; fecha: string; hora: string; estado: string; barberos: { nombre: string; apellido: string }; servicios: { nombre: string; duracion_minutos: number; precio: number } }} />
          ))
        )}
      </div>
    </div>
  )
}
