import React from 'react'
import { planMinimoPara } from '@/lib/planes'
import { PRODUCTO } from '@/lib/producto'
import type { Capacidad, LocalPublico } from '@/lib/local-datos'

/**
 * Lo que se ve en una sección del panel que el plan del local no trae (Fase 7).
 * No es lo que protege (eso lo hace la base): es para que el dueño entienda
 * por qué no está, y qué plan lo trae.
 */
export async function NoIncluido({ local, capacidad, titulo, queHace }: {
  local: LocalPublico
  capacidad: Capacidad
  titulo: string
  queHace: string
}) {
  const plan = await planMinimoPara(capacidad)
  return (
    <div className="flex flex-col gap-6 w-full">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">{titulo}</h1>
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 sm:p-8 max-w-2xl" role="status">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-400 font-bold">Plan {plan} en adelante</p>
        <p className="text-white font-semibold mt-3">{queHace}</p>
        <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
          Tu plan hoy es <span className="text-white font-semibold">{local.plan.nombre}</span>. Para sumar esto, pasá al
          plan {plan}: avisale a tu contacto de {PRODUCTO.nombre}. No se pierde nada de lo que ya cargaste.
        </p>
      </div>
    </div>
  )
}
