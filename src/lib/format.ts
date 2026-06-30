/**
 * Formatea un precio en pesos argentinos con separador de miles.
 * Ej: 8500 → "$8.500" · 4500.5 → "$4.501" (sin decimales, redondeado).
 */
export function formatPrecio(n: number | null | undefined): string {
  const valor = typeof n === 'number' && !Number.isNaN(n) ? n : 0
  return (
    '$' +
    valor.toLocaleString('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  )
}
