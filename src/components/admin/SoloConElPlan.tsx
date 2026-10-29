import React from 'react'
import { notFound } from 'next/navigation'
import { getLocal } from '@/lib/local'
import { NoIncluido } from '@/components/admin/NoIncluido'
import type { Capacidad } from '@/lib/local-datos'

/**
 * Para el layout de una sección del panel que no traen todos los planes
 * (Fase 7): si el plan del local la trae, la sección; si no, qué plan la trae.
 * Las acciones de la sección y la base frenan igual a quien la llame a mano.
 */
export async function SoloConElPlan({ params, capacidad, titulo, queHace, children }: {
  params: Promise<{ local: string }>
  capacidad: Capacidad
  titulo: string
  queHace: string
  children: React.ReactNode
}) {
  const local = await getLocal((await params).local)
  if (!local) notFound()
  if (!local.plan[capacidad]) return <NoIncluido local={local} capacidad={capacidad} titulo={titulo} queHace={queHace} />
  return <>{children}</>
}
