/**
 * src/lib/plataforma.ts — SOLO SERVIDOR.
 *
 * El panel de la plataforma (Fase 6): donde el equipo (Nico, admin; Delfina,
 * comercial) crea las muestras, invita a los dueños y activa los locales.
 *
 * Quién es del equipo lo dice la tabla `equipo` (Fase 2), que se carga solo con
 * scripts/equipo.mjs. Acá se pregunta para decidir qué mostrar; lo que frena de
 * verdad son las funciones de la base (migración 0014), que lo revisan otra vez.
 */

import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getProfile, rutaLogin } from '@/lib/auth'
import type { Profile } from '@/types'
import type { DuenoDelLocal, ResumenLocal, RolEquipo } from '@/lib/plataforma-datos'

export * from '@/lib/plataforma-datos'

/** El rol en el equipo de quien está conectado, o null si no es del equipo. */
export const getRolEquipo = cache(async (): Promise<RolEquipo | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  // La política "equipo: la ve cada uno" deja leer la fila propia.
  const { data } = await supabase.from('equipo').select('rol').eq('user_id', user.id).maybeSingle()
  return data?.rol === 'admin' || data?.rol === 'comercial' ? data.rol : null
})

/** Para las páginas de la plataforma: sin sesión, al login; sin ser del equipo, al inicio. */
export async function requireEquipo(volver = '/plataforma'): Promise<{ rol: RolEquipo; profile: Profile }> {
  const profile = await getProfile()
  if (!profile) redirect(rutaLogin(volver))
  const rol = await getRolEquipo()
  if (!rol) redirect('/')
  return { rol, profile }
}

type FilaResumen = {
  id: string; slug: string; nombre: string; estado: ResumenLocal['estado']; rubro: string
  creado_en: string; creado_por: string | null; activado_en: string | null
  servicios: number; profesionales: number; tramos_horario: number
  tiene_whatsapp: boolean; tiene_direccion: boolean
  duenos: number; duenos_detalle: DuenoDelLocal[] | null; mp_conectado: boolean; turnos_de_prueba: number | null
}

/** Todos los locales, con lo que le falta a cada uno. Para quien no es del equipo, vacío. */
export const getResumenLocales = cache(async (): Promise<ResumenLocal[]> => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('resumen_de_locales')
  if (error) throw new Error(`No se pudo leer la lista de locales: ${error.message}`)
  return ((data ?? []) as FilaResumen[]).map((f) => ({
    id: f.id, slug: f.slug, nombre: f.nombre, estado: f.estado, rubro: f.rubro,
    creadoEn: f.creado_en, creadoPor: f.creado_por, activadoEn: f.activado_en,
    servicios: f.servicios, profesionales: f.profesionales, tramosHorario: f.tramos_horario,
    tieneWhatsapp: f.tiene_whatsapp, tieneDireccion: f.tiene_direccion,
    duenos: f.duenos, duenosDetalle: f.duenos_detalle, mpConectado: f.mp_conectado,
    turnosDePrueba: f.turnos_de_prueba,
  }))
})

