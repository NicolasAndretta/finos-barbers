/**
 * src/lib/cobros.ts — SOLO SERVIDOR.
 *
 * Las reglas de cobro de los locales, en un solo lugar:
 *
 *   1. modoDeCobro: cómo cobra un local.
 *        online          → activo y con su Mercado Pago conectado: se cobra de verdad.
 *        muestra         → en demo: el flujo se muestra entero pero NUNCA se
 *                          cobra (decisión 5), aunque tenga una cuenta conectada.
 *        sin_mercadopago → activo sin Mercado Pago (o con la conexión vencida):
 *                          la seña se paga por transferencia y la tienda queda
 *                          como catálogo.
 *
 *   2. Las referencias: cada cobro le dice a Mercado Pago qué se está cobrando
 *      ("turno:<id>" o "pedido:<id>"), y con eso se lo reconoce a la vuelta.
 *
 *   3. verificarPago: lo ÚNICO que decide si algo está pagado. Lo usan el aviso
 *      de Mercado Pago (el webhook) y las páginas a las que vuelve el cliente.
 *      Se le pregunta el pago a Mercado Pago con la cuenta del local, y para
 *      darlo por pagado tienen que coincidir cuatro cosas:
 *        - que esté aprobado;
 *        - que lo haya cobrado la cuenta de ESE local;
 *        - que sea de un turno o un pedido de ese mismo local;
 *        - que el monto sea el de la seña o el del pedido.
 *      Lo que la página de vuelta trae en la dirección (estado, número de
 *      pago) NO se cree: cualquiera la puede escribir a mano.
 */

import 'server-only'
import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase'
import { urlPublica } from '@/lib/sitio'
import { cuentaDelLocal, estadoConexion } from '@/lib/mp-conexion'
import { consultarPago, ErrorDeMercadoPago, type PagoMP } from '@/lib/mercadopago'
import type { LocalPublico } from '@/lib/local-datos'

// ─── 1. Cómo cobra cada local ───────────────────────────────────────────────

export type ModoDeCobro = 'online' | 'muestra' | 'sin_mercadopago'

// `cache`: dentro de un mismo pedido se consulta una sola vez (la página y el
// formulario preguntan lo mismo).
const modoPorLocal = cache(async (localId: string, estado: string, conSenas: boolean): Promise<ModoDeCobro> => {
  // Las señas con Mercado Pago son del plan Pro en adelante (Fase 7): sin
  // ellas, la seña va por transferencia (también en una muestra que se está
  // mostrando en el plan Básico).
  if (!conSenas) return 'sin_mercadopago'
  if (estado === 'demo') return 'muestra'
  if (estado !== 'activo') return 'sin_mercadopago'
  if (!urlPublica()) {
    console.error('[cobros] Falta NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_SITE_URL: ningún local cobra online hasta cargarla.')
    return 'sin_mercadopago'
  }
  try {
    const conexion = await estadoConexion(localId)
    return conexion.conectada && conexion.vigente ? 'online' : 'sin_mercadopago'
  } catch (err) {
    console.error('[cobros] No se pudo leer la conexión de Mercado Pago:', err instanceof Error ? err.message : err)
    return 'sin_mercadopago'
  }
})

export function modoDeCobro(local: Pick<LocalPublico, 'id' | 'estado' | 'plan'>): Promise<ModoDeCobro> {
  return modoPorLocal(local.id, local.estado, local.plan.senas)
}

// ─── 2. Referencias y direcciones ───────────────────────────────────────────

export type Referencia = { tipo: 'turno' | 'pedido'; id: string }

export const referenciaDe = (r: Referencia): string => `${r.tipo}:${r.id}`

/** "turno:<uuid>" → { tipo: 'turno', id }. Cualquier otra cosa → null. */
export function leerReferencia(texto: string | null | undefined): Referencia | null {
  const m = /^(turno|pedido):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(texto ?? '')
  return m ? { tipo: m[1] as Referencia['tipo'], id: m[2].toLowerCase() } : null
}

/**
 * Las direcciones que lleva cada cobro: a dónde vuelve el cliente después de
 * pagar, y a dónde avisa Mercado Pago (con el id del local, que nunca cambia;
 * el nombre de la dirección sí puede cambiar).
 */
export function direccionesDelCobro(local: Pick<LocalPublico, 'id' | 'slug'>, vuelta: { ok: string; error: string }) {
  const base = urlPublica()
  if (!base) throw new Error('Falta la dirección pública del sitio (NEXT_PUBLIC_APP_URL).')
  return {
    back_urls: { success: `${base}/${local.slug}${vuelta.ok}`, failure: `${base}/${local.slug}${vuelta.error}`, pending: `${base}/${local.slug}${vuelta.ok}` },
    // Mercado Pago solo vuelve solo (sin que el cliente toque "volver") a una dirección segura.
    ...(base.startsWith('https://') && { auto_return: 'approved' as const }),
    notification_url: `${base}/api/mp/webhook?local=${local.id}`,
  }
}

// ─── 3. Verificar un pago ───────────────────────────────────────────────────

export type ResultadoPago =
  | 'confirmado'     // se aplicó: seña pagada o pedido pagado
  | 'devuelto'       // se aplicó una devolución
  | 'ya_estaba'      // ya estaba aplicado (un aviso repetido): no pasó nada
  | 'pendiente'      // Mercado Pago todavía no lo aprobó
  | 'rechazado'      // no se pagó
  | 'no_corresponde' // no es de este local, otra cuenta, otro monto...: no se toca
  | 'revisar'        // algo que tiene que mirar una persona (quedó en el registro)
  | 'sin_conexion'   // el local no tiene una cuenta vigente para consultarlo
  | 'reintentar'     // Mercado Pago o la base no contestaron: probar más tarde

export type Verificacion = { resultado: ResultadoPago; referencia: Referencia | null }

type Accion = 'confirmar' | 'devolver' | 'pendiente' | 'rechazado'

/**
 * La decisión, sin tocar nada: ¿este pago es de este local y qué hay que
 * hacer con él? Separada para que se lea sola.
 */
export function decidirPago(pago: PagoMP, cuentaDelLocalId: string): { accion: Accion; referencia: Referencia } | { motivo: string } {
  if (pago.cobradorId !== cuentaDelLocalId) return { motivo: `lo cobró otra cuenta (${pago.cobradorId})` }
  const referencia = leerReferencia(pago.referencia)
  if (!referencia) return { motivo: `la referencia no es nuestra (${pago.referencia})` }
  if (pago.moneda !== 'ARS' || pago.monto === null) return { motivo: `moneda o monto raros (${pago.moneda} ${pago.monto})` }
  switch (pago.estado) {
    case 'approved':
      return { accion: 'confirmar', referencia }
    case 'refunded':
    case 'charged_back': // contracargo: el banco le devolvió la plata al cliente
      return { accion: 'devolver', referencia }
    case 'rejected':
    case 'cancelled':
      return { accion: 'rechazado', referencia }
    default: // pending, in_process, authorized, in_mediation...
      return { accion: 'pendiente', referencia }
  }
}

// Lo que contestan las funciones de la base (migración 0011), traducido.
const TRADUCCION: Record<string, ResultadoPago> = {
  confirmada: 'confirmado',
  confirmado: 'confirmado',
  pagada_turno_cancelado: 'revisar',
  confirmado_sin_stock: 'revisar',
  devuelta: 'devuelto',
  devuelto: 'devuelto',
  ya_estaba: 'ya_estaba',
  ya_devuelta: 'ya_estaba',
  revisar_enviado: 'revisar',
  monto_distinto: 'no_corresponde',
  no_existe: 'no_corresponde',
  no_corresponde: 'no_corresponde',
}

// Qué le avisa al registro cada respuesta que pide atención.
const PARA_REVISAR: Record<string, string> = {
  pagada_turno_cancelado: 'se cobró la seña de un turno que el cliente había cancelado',
  confirmado_sin_stock: 'se cobró un pedido y no alcanzaba el stock: reponer o devolver',
  revisar_enviado: 'llegó una devolución de un pedido que ya se había enviado: la mercadería salió',
  monto_distinto: 'el monto cobrado no coincide con el del turno o el pedido: NO se marcó pagado',
  no_existe: 'la referencia no es un turno ni un pedido de este local: NO se marcó pagado',
}

/**
 * Consulta un pago con la cuenta del local y, si corresponde, lo aplica.
 * Se puede llamar muchas veces con el mismo pago: solo la primera hace algo.
 * No refresca pantallas (lo hace quien la llama, si puede).
 */
export async function verificarPago(localId: string, pagoId: string): Promise<Verificacion> {
  // Los números de pago de Mercado Pago son solo dígitos. Cualquier otra cosa
  // es alguien probando a mano.
  if (!/^\d{1,20}$/.test(pagoId)) return { resultado: 'no_corresponde', referencia: null }

  let cuenta: Awaited<ReturnType<typeof cuentaDelLocal>>
  try {
    cuenta = await cuentaDelLocal(localId)
  } catch (err) {
    console.error(`[cobros] No se pudo leer la cuenta del local ${localId}:`, err instanceof Error ? err.message : err)
    return { resultado: 'reintentar', referencia: null }
  }
  if (!cuenta) return { resultado: 'sin_conexion', referencia: null }

  let pago: PagoMP | null
  try {
    pago = await consultarPago(cuenta.token, pagoId)
  } catch (err) {
    const estado = err instanceof ErrorDeMercadoPago ? err.estado : 0
    console.error(`[cobros] No se pudo consultar el pago ${pagoId} del local ${localId}:`, err instanceof Error ? err.message : err)
    // 401/403: el token del local no sirve más (revocó el permiso desde su
    // Mercado Pago). Reintentar no lo arregla: hay que reconectar.
    return { resultado: estado === 401 || estado === 403 ? 'sin_conexion' : 'reintentar', referencia: null }
  }
  if (!pago) return { resultado: 'no_corresponde', referencia: null } // no existe, o no es de esta cuenta

  const decision = decidirPago(pago, cuenta.mpUserId)
  if ('motivo' in decision) {
    console.error(`[cobros] Pago ${pagoId} del local ${localId} descartado: ${decision.motivo}.`)
    return { resultado: 'no_corresponde', referencia: null }
  }
  const { accion, referencia } = decision
  if (accion === 'pendiente') return { resultado: 'pendiente', referencia }
  if (accion === 'rechazado') return { resultado: 'rechazado', referencia }

  const funcion = `${accion === 'confirmar' ? 'confirmar' : 'devolver'}_pago_${referencia.tipo === 'turno' ? 'sena' : 'pedido'}`
  const { data, error } = await createServiceClient().rpc(funcion, {
    p_local: localId,
    [referencia.tipo === 'turno' ? 'p_turno' : 'p_pedido']: referencia.id,
    p_pago: pago.id,
    ...(accion === 'confirmar' && { p_monto: pago.monto }),
  })
  if (error) {
    console.error(`[cobros] La base no pudo aplicar el pago ${pagoId} (${funcion}): ${error.message}`)
    return { resultado: 'reintentar', referencia }
  }

  const respuesta = String(data)
  if (PARA_REVISAR[respuesta]) {
    console.error(`[cobros] ⚠️ REVISAR — local ${localId}, ${referencia.tipo} ${referencia.id}, pago ${pagoId}: ${PARA_REVISAR[respuesta]}.`)
  }
  return { resultado: TRADUCCION[respuesta] ?? 'revisar', referencia }
}
