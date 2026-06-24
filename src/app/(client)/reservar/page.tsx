import React from 'react'
import { requireClient } from '@/lib/auth'
import { getServicios, getBarberos } from '@/app/actions/reservas'
import { ReservaForm } from '@/components/client/ReservaForm'

export default async function ReservarPage() {
  await requireClient()
  const servicios = await getServicios()
  const barberos = await getBarberos()

  return (
    <div className="flex flex-col items-center justify-start text-center pb-12 animate-fade-in w-full">
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-500">Reservá online</span>
        <h1 className="font-display uppercase text-4xl sm:text-5xl font-extrabold text-white tracking-tight mt-1">
          Nueva Reserva
        </h1>
        <p className="mt-4 text-zinc-400 max-w-md text-sm md:text-base mx-auto">
          En 3 pasos. Seleccioná el servicio, elegí a tu barbero y encontrá el horario perfecto.
        </p>
      </div>

      <ReservaForm servicios={servicios} barberos={barberos} />
    </div>
  )
}
