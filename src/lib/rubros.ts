/**
 * src/lib/rubros.ts
 *
 * Las palabras que cambian según el rubro del local. Una barbería tiene
 * "barberos"; un local de uñas, "manicuras". El resto del sistema (turnos,
 * seña, tienda) es igual para todos.
 *
 * El rubro lo guarda la base (`locales.rubro`, migración 0008). Si llega uno
 * desconocido, se usan las palabras de barbería, que es lo que había antes.
 */

export type Rubro = 'barberia' | 'unas' | 'pestanas' | 'peluqueria' | 'estetica'

export type Palabras = {
  /** Cómo se llama el tipo de negocio, para el logo y los títulos. */
  negocio: string
  /** Quien atiende, en singular y en plural (en minúscula). */
  profesional: string
  profesionales: string
}

export const PALABRAS: Record<Rubro, Palabras> = {
  barberia:   { negocio: 'Barbería',   profesional: 'barbero',     profesionales: 'barberos' },
  unas:       { negocio: 'Uñas',       profesional: 'manicura',    profesionales: 'manicuras' },
  pestanas:   { negocio: 'Pestañas',   profesional: 'profesional', profesionales: 'profesionales' },
  peluqueria: { negocio: 'Peluquería', profesional: 'peluquero',   profesionales: 'peluqueros' },
  estetica:   { negocio: 'Estética',   profesional: 'profesional', profesionales: 'profesionales' },
}

export function palabrasDe(rubro: string): Palabras {
  return PALABRAS[rubro as Rubro] ?? PALABRAS.barberia
}

/** "barbero" → "Barbero" */
export function conMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
