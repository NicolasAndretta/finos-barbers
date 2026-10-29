/**
 * src/lib/acentos.ts
 *
 * El color de acento de cada local (migración 0017): una paleta curada, no un
 * color libre. Sobre el fondo oscuro del sitio, un color cualquiera puede
 * quedar ilegible; estos están probados (son escalas pensadas para eso).
 *
 * Todo el sitio pinta sus acentos con las clases `amber-*` (globals.css las
 * remapea a madera). Elegir otro acento cambia esas 11 variables para la
 * página y el panel de ESE local. No habla con la base: lo puede importar el
 * servidor y el navegador.
 */

export const ESCALA = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const

export type Acento = 'madera' | 'dorado' | 'verde' | 'azul' | 'rojo' | 'violeta'

export const ACENTOS: Record<Acento, { nombre: string; tonos: string[] }> = {
  // La de siempre (la de Roble): la misma escala que globals.css.
  madera: {
    nombre: 'Madera',
    tonos: ['#faf6f0', '#f3e9da', '#e7d2b4', '#d8b98c', '#c79c64', '#b3854c', '#976c3c', '#785531', '#5b4126', '#44311e', '#281c11'],
  },
  dorado: {
    nombre: 'Dorado',
    tonos: ['oklch(98.7% 0.022 95.277)', 'oklch(96.2% 0.059 95.617)', 'oklch(92.4% 0.12 95.746)', 'oklch(87.9% 0.169 91.605)', 'oklch(82.8% 0.189 84.429)', 'oklch(76.9% 0.188 70.08)', 'oklch(66.6% 0.179 58.318)', 'oklch(55.5% 0.163 48.998)', 'oklch(47.3% 0.137 46.201)', 'oklch(41.4% 0.112 45.904)', 'oklch(27.9% 0.077 45.635)'],
  },
  verde: {
    nombre: 'Verde',
    tonos: ['oklch(97.9% 0.021 166.113)', 'oklch(95% 0.052 163.051)', 'oklch(90.5% 0.093 164.15)', 'oklch(84.5% 0.143 164.978)', 'oklch(76.5% 0.177 163.223)', 'oklch(69.6% 0.17 162.48)', 'oklch(59.6% 0.145 163.225)', 'oklch(50.8% 0.118 165.612)', 'oklch(43.2% 0.095 166.913)', 'oklch(37.8% 0.077 168.94)', 'oklch(26.2% 0.051 172.552)'],
  },
  azul: {
    nombre: 'Azul',
    tonos: ['oklch(97.7% 0.013 236.62)', 'oklch(95.1% 0.026 236.824)', 'oklch(90.1% 0.058 230.902)', 'oklch(82.8% 0.111 230.318)', 'oklch(74.6% 0.16 232.661)', 'oklch(68.5% 0.169 237.323)', 'oklch(58.8% 0.158 241.966)', 'oklch(50% 0.134 242.749)', 'oklch(44.3% 0.11 240.79)', 'oklch(39.1% 0.09 240.876)', 'oklch(29.3% 0.066 243.157)'],
  },
  rojo: {
    nombre: 'Rojo',
    tonos: ['oklch(96.9% 0.015 12.422)', 'oklch(94.1% 0.03 12.58)', 'oklch(89.2% 0.058 10.001)', 'oklch(81% 0.117 11.638)', 'oklch(71.2% 0.194 13.428)', 'oklch(64.5% 0.246 16.439)', 'oklch(58.6% 0.253 17.585)', 'oklch(51.4% 0.222 16.935)', 'oklch(45.5% 0.188 13.697)', 'oklch(41% 0.159 10.272)', 'oklch(27.1% 0.105 12.094)'],
  },
  violeta: {
    nombre: 'Violeta',
    tonos: ['oklch(96.9% 0.016 293.756)', 'oklch(94.3% 0.029 294.588)', 'oklch(89.4% 0.057 293.283)', 'oklch(81.1% 0.111 293.571)', 'oklch(70.2% 0.183 293.541)', 'oklch(60.6% 0.25 292.717)', 'oklch(54.1% 0.281 293.009)', 'oklch(49.1% 0.27 292.581)', 'oklch(43.2% 0.232 292.759)', 'oklch(38% 0.189 293.745)', 'oklch(28.3% 0.141 291.089)'],
  },
}

export function esAcento(valor: unknown): valor is Acento {
  return typeof valor === 'string' && valor in ACENTOS
}

/** Las 11 variables del acento, para un <style>. La madera no hace falta: es la de globals.css. */
export function cssDelAcento(acento: Acento): string | null {
  if (acento === 'madera') return null
  const tonos = ACENTOS[acento].tonos
  return `:root{${ESCALA.map((t, i) => `--color-amber-${t}:${tonos[i]}`).join(';')}}`
}
