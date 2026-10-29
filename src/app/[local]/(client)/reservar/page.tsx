import React from 'react'
import { notFound } from 'next/navigation'
import { requireProfile } from '@/lib/auth'
import { getLocal } from '@/lib/local'
import { rutaLocal } from '@/lib/local-datos'
import { getServicios, getBarberos } from '@/app/actions/reservas'
import { ReservaForm } from '@/components/client/ReservaForm'
import { modoDeCobro } from '@/lib/cobros'

// Reservar un turno en ESTE local: sus servicios, su equipo, y cómo cobra la
// seña (con Mercado Pago, de muestra en una demo, o solo por transferencia).
export default async function ReservarPage({ params }: { params: Promise<{ local: string }> }) {
  const local = await getLocal((await params).local)
  if (!local) notFound()
  const [, servicios, barberos, cobro] = await Promise.all([
    requireProfile(rutaLocal(local.slug, '/reservar')),
    getServicios(local.slug),
    getBarberos(local.slug),
    modoDeCobro(local),
  ])

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

      <ReservaForm servicios={servicios} barberos={barberos} cobro={cobro} />
    </div>
  )
}
