/**
 * src/lib/planes.ts
 *
 * Los planes (Fase 7), leídos de la base: la tabla `planes` es la única fuente
 * de qué trae cada uno (migración 0016). SOLO SERVIDOR.
 *
 * Lo que trae el plan de un local ya viene en sus datos (`local.plan`); esto
 * sirve para decir "esto es del plan Pro en adelante" y para elegir un plan en
 * la plataforma.
 */
import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase'
import type { Capacidad, PlanDelLocal } from '@/lib/local-datos'

export type Plan = PlanDelLocal & { orden: number; precioUsd: number }

type FilaPlan = {
  codigo: PlanDelLocal['codigo']; nombre: string; orden: number; precio_usd: number; max_profesionales: number | null
  cuentas_profesionales: boolean; senas: boolean; resenas: boolean; reportes: boolean
  tienda: boolean; finanzas: boolean; exportar: boolean
}

/** Los tres planes, de menor a mayor. Una vez por pedido. */
export const getPlanes = cache(async (): Promise<Plan[]> => {
  const supabase = await createClient()
  const { data, error } = await supabase.from('planes').select('*').order('orden')
  if (error) throw new Error(`No se pudieron leer los planes: ${error.message}`)
  return ((data ?? []) as FilaPlan[]).map((f) => ({
    codigo: f.codigo, nombre: f.nombre, orden: f.orden, precioUsd: f.precio_usd,
    maxProfesionales: f.max_profesionales,
    cuentasProfesionales: f.cuentas_profesionales, senas: f.senas, resenas: f.resenas,
    reportes: f.reportes, tienda: f.tienda, finanzas: f.finanzas, exportar: f.exportar,
  }))
})

/** El plan más chico que trae esto: "Pro", "Premium". */
export async function planMinimoPara(capacidad: Capacidad): Promise<string> {
  const plan = (await getPlanes()).find((p) => p[capacidad])
  return plan?.nombre ?? 'Premium'
}
