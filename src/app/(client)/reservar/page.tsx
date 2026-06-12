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
        <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
          Nueva Reserva
        </h1>
        <p className="mt-4 text-zinc-400 max-w-md text-sm md:text-base mx-auto">
          Reserva tu turno online de forma rápida. Selecciona el servicio, elige a tu barbero y encuentra el horario perfecto.
        </p>
      </div>

      <ReservaForm servicios={servicios} barberos={barberos} />
    </div>
  )
}
