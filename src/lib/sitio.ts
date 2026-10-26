/**
 * src/lib/sitio.ts — SOLO SERVIDOR.
 *
 * La dirección pública del sitio, para armar los links que salen de la app
 * hacia afuera: la vuelta de Mercado Pago después de pagar, su aviso de pago
 * (webhook) y la vuelta de conectar una cuenta.
 *
 * Sale de NEXT_PUBLIC_APP_URL o, si no está, de NEXT_PUBLIC_SITE_URL (el mismo
 * orden que ya usaban los cobros).
 *
 * En producción, si falta, devuelve null en vez de inventar "localhost". En
 * Código Rojo pasó: sin esa variable, Mercado Pago quedaba avisando los pagos a
 * una dirección que no existe, el cliente pagaba y la venta no se registraba.
 * Con null, el local no ofrece cobrar online y el panel avisa qué falta.
 */

import 'server-only'

export function urlPublica(): string | null {
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (url) return url.replace(/\/+$/, '')
  return process.env.NODE_ENV === 'production' ? null : 'http://localhost:3000'
}
