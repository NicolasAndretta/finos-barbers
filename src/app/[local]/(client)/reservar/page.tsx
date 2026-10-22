import React from 'react'
import { notFound } from 'next/navigation'
import { requireProfile } from '@/lib/auth'
import { getLocal } from '@/lib/local'
import { rutaLocal } from '@/lib/local-datos'
import { getServicios, getBarberos } from '@/app/actions/reservas'
import { ReservaForm } from '@/components/client/ReservaForm'

// Reservar un turno en ESTE local: sus servicios y su equipo.
export default async function ReservarPage({ params }: { params: Promise<{ local: string }> }) {
  const local = await getLocal((await params).local)
  if (!local) notFound()
  await requireProfile(rutaLocal(local.slug, '/reservar'))
  const [servicios, barberos] = await Promise.all([getServicios(local.slug), getBarberos(local.slug)])

  return (
    <div className="flex flex-col items-center justify-start text-center pb-12 animate-fade-in w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
          Nueva Reserva
        </h1>
        <p className="mt-4 text-zinc-400 max-w-md text-sm md:text-base mx-auto">
          Reservá tu turno online en un minuto: elegí el servicio, con quién atenderte y el horario que te quede cómodo.
        </p>
      </div>

      <ReservaForm servicios={servicios} barberos={barberos} />
    </div>
  )
}
