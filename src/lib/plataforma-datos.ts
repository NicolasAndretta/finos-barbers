/**
 * src/lib/plataforma-datos.ts
 *
 * La forma de los datos de la plataforma (Fase 6) y cuentas chicas sobre
 * ellos. No habla con la base: por eso lo pueden importar el servidor y el
 * navegador. La lectura está en `lib/plataforma.ts`.
 */

export type RolEquipo = 'admin' | 'comercial'

export type DuenoDelLocal = { id: string; email: string; nombre: string; entro: boolean }

/** Una fila de `resumen_de_locales()` (migración 0014), con la forma que usa la web. */
export type ResumenLocal = {
  id: string
  slug: string
  nombre: string
  estado: 'demo' | 'activo' | 'suspendido' | 'archivado'
  rubro: string
  creadoEn: string
  creadoPor: string | null
  activadoEn: string | null
  servicios: number
  profesionales: number
  tramosHorario: number
  tieneWhatsapp: boolean
  tieneDireccion: boolean
  duenos: number
  /** null si quien mira no los puede ver (la comercial, en un local activo). */
  duenosDetalle: DuenoDelLocal[] | null
  mpConectado: boolean
  /** Solo en las muestras. */
  turnosDePrueba: number | null
}

/** Lo que le falta a un local para activarlo (lo obligatorio y lo recomendado). */
export function loQueFalta(r: ResumenLocal): { obligatorio: string[]; recomendado: string[] } {
  const obligatorio: string[] = []
  const recomendado: string[] = []
  if (r.duenos === 0) obligatorio.push('el dueño')
  if (r.servicios === 0) obligatorio.push('servicios')
  if (r.profesionales === 0) obligatorio.push('profesionales')
  if (r.tramosHorario === 0) obligatorio.push('horario')
  if (!r.tieneWhatsapp) recomendado.push('WhatsApp')
  if (!r.tieneDireccion) recomendado.push('dirección')
  if (!r.mpConectado) recomendado.push('Mercado Pago')
  return { obligatorio, recomendado }
}

export const NOMBRE_ESTADO: Record<ResumenLocal['estado'], string> = {
  demo: 'Muestra',
  activo: 'Activo',
  suspendido: 'Suspendido',
  archivado: 'Archivado',
}
