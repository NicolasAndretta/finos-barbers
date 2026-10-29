/**
 * src/lib/plantillas.ts
 *
 * Con qué arranca una muestra nueva (Fase 6): los servicios de su rubro, con
 * precios de referencia para ajustar con el dueño. La base los carga con
 * `crear_local` (migración 0014), junto con el horario de lunes a sábado de 10
 * a 20 y los profesionales.
 *
 * ⚠️ Los precios son de REFERENCIA (pesos, octubre de 2026): están para que la
 * muestra no diga $0. Se ajustan acá, y en cada local desde su panel.
 */

import { conMayuscula, palabrasDe, type Rubro } from '@/lib/rubros'

export type ServicioDePlantilla = { nombre: string; descripcion: string; precio: number; duracion: number }

export const PLANTILLAS: Record<Rubro, ServicioDePlantilla[]> = {
  barberia: [
    { nombre: 'Corte', descripcion: 'Corte a tijera o máquina, con lavado', precio: 16000, duracion: 30 },
    { nombre: 'Barba', descripcion: 'Perfilado y afeitado con toalla caliente', precio: 11000, duracion: 20 },
    { nombre: 'Corte + barba', descripcion: 'El combo completo', precio: 24000, duracion: 50 },
  ],
  peluqueria: [
    { nombre: 'Corte', descripcion: 'Corte con lavado y secado', precio: 15000, duracion: 45 },
    { nombre: 'Brushing', descripcion: 'Lavado y peinado', precio: 10000, duracion: 30 },
    { nombre: 'Color', descripcion: 'Tintura completa', precio: 35000, duracion: 90 },
  ],
  unas: [
    { nombre: 'Esmaltado semipermanente', descripcion: 'Manos, con preparación de uñas', precio: 15000, duracion: 60 },
    { nombre: 'Kapping', descripcion: 'Refuerzo sobre la uña natural', precio: 20000, duracion: 75 },
    { nombre: 'Retiro', descripcion: 'Retiro de semipermanente o kapping', precio: 6000, duracion: 30 },
  ],
  pestanas: [
    { nombre: 'Lifting de pestañas', descripcion: 'Con tinte incluido', precio: 20000, duracion: 60 },
    { nombre: 'Extensiones pelo a pelo', descripcion: 'Colocación completa', precio: 35000, duracion: 120 },
    { nombre: 'Perfilado de cejas', descripcion: 'Diseño y depilación', precio: 9000, duracion: 30 },
  ],
  estetica: [
    { nombre: 'Limpieza facial', descripcion: 'Profunda, con extracción', precio: 25000, duracion: 60 },
    { nombre: 'Perfilado de cejas', descripcion: 'Diseño y depilación', precio: 9000, duracion: 30 },
    { nombre: 'Masaje descontracturante', descripcion: 'Espalda y cuello', precio: 25000, duracion: 60 },
  ],
}

export const RUBROS: { valor: Rubro; nombre: string }[] = [
  { valor: 'barberia', nombre: 'Barbería' },
  { valor: 'peluqueria', nombre: 'Peluquería' },
  { valor: 'unas', nombre: 'Uñas' },
  { valor: 'pestanas', nombre: 'Pestañas' },
  { valor: 'estetica', nombre: 'Estética' },
]

export function esRubro(valor: unknown): valor is Rubro {
  return typeof valor === 'string' && valor in PLANTILLAS
}

/**
 * Los profesionales de la muestra: los nombres que se cargaron (uno por
 * renglón, "Nombre Apellido"), o uno "de ejemplo" si no hay ninguno, así la
 * reserva se puede probar igual.
 */
export function profesionalesDe(texto: string, rubro: Rubro): { nombre: string; apellido: string }[] {
  const renglones = texto.split(/\r?\n/).map((r) => r.trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 30)
  if (!renglones.length) return [{ nombre: conMayuscula(palabrasDe(rubro).profesional), apellido: 'de ejemplo' }]
  return renglones.map((r) => {
    const [nombre, ...resto] = r.split(' ')
    return { nombre: nombre.slice(0, 60), apellido: resto.join(' ').slice(0, 60) }
  })
}

/**
 * La dirección web a partir del nombre: "Barbería El Tano" → "barberia-el-tano".
 * Minúsculas, sin acentos, números y guiones (la misma regla que la base).
 */
export function slugDe(nombre: string): string {
  return nombre
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
}
