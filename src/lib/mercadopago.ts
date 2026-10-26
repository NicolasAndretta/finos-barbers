/**
 * src/lib/mercadopago.ts — SOLO SERVIDOR.
 *
 * Las cuatro llamadas que la app le hace a Mercado Pago, escritas directo (sin
 * la librería `mercadopago`):
 *   - pedirToken: cambiar el código de autorización (o el de renovación) por
 *     el token de un local;
 *   - leerCuenta: con qué cuenta es un token (apodo y mail);
 *   - crearPreferencia: armar un cobro (la seña de un turno o un pedido);
 *   - consultarPago: preguntar cómo está un pago.
 *
 * Por qué sin la librería: no deja cambiar a qué dirección le habla, y para
 * probar en la PC hace falta apuntarla a un Mercado Pago de mentira
 * (scripts/mp-falso.mjs). Son pocas llamadas y así se ve exactamente qué se
 * manda.
 *
 * El Mercado Pago de mentira se acepta SOLO si se dan las dos cosas: la app
 * corre contra la base de desarrollo (SUPABASE_ENTORNO=desarrollo) y las
 * direcciones apuntan a la propia PC (127.0.0.1 o localhost). En producción
 * siempre se habla con el Mercado Pago de verdad.
 */

import 'server-only'

const API_REAL = 'https://api.mercadopago.com'
const AUTORIZAR_REAL = 'https://auth.mercadopago.com.ar/authorization'

const enEstaPC = (url: string | undefined): url is string =>
  !!url && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(url)

/** A dónde hablarle: al Mercado Pago de verdad o, en desarrollo, al de mentira. */
function direcciones(): { api: string; autorizar: string } {
  const api = process.env.MP_API_URL
  const autorizar = process.env.MP_AUTH_URL
  if (process.env.SUPABASE_ENTORNO === 'desarrollo' && enEstaPC(api) && enEstaPC(autorizar)) {
    return { api: api.replace(/\/+$/, ''), autorizar }
  }
  if (api || autorizar) {
    console.warn('[mercadopago] MP_API_URL / MP_AUTH_URL se ignoran: solo valen en desarrollo y apuntando a esta PC.')
  }
  return { api: API_REAL, autorizar: AUTORIZAR_REAL }
}

/** Un error que vino de Mercado Pago, con su código (401: token inválido; 404: no existe...). */
export class ErrorDeMercadoPago extends Error {
  constructor(public estado: number, mensaje: string) {
    super(mensaje)
  }
}

async function pedir<T>(metodo: 'GET' | 'POST', ruta: string, { token, cuerpo }: { token?: string; cuerpo?: unknown } = {}): Promise<T> {
  const res = await fetch(`${direcciones().api}${ruta}`, {
    method: metodo,
    headers: {
      Accept: 'application/json',
      ...(cuerpo !== undefined && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    cache: 'no-store',
    // Si Mercado Pago no contesta, mejor cortar y reintentar después que
    // dejar colgado al cliente (o al aviso de pago, que tiene que contestar rápido).
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) {
    // La respuesta de error dice qué falló (código vencido, dirección de vuelta
    // que no coincide...) y no trae secretos: va al registro, recortada.
    const detalle = (await res.text().catch(() => '')).slice(0, 300)
    throw new ErrorDeMercadoPago(res.status, `Mercado Pago respondió ${res.status} en ${ruta}: ${detalle}`)
  }
  return res.json() as Promise<T>
}

// ─── Conexión de cuentas (OAuth) ─────────────────────────────────────────────

/** La página de Mercado Pago donde el dueño autoriza con SU cuenta. */
export function urlDeAutorizacion(params: { clientId: string; redirectUri: string; state: string }): string {
  const q = new URLSearchParams({
    client_id: params.clientId,
    response_type: 'code',
    platform_id: 'mp',
    state: params.state,
    redirect_uri: params.redirectUri,
  })
  return `${direcciones().autorizar}?${q.toString()}`
}

export type RespuestaToken = {
  access_token: string
  refresh_token?: string
  user_id?: number | string
  public_key?: string
  expires_in?: number
  scope?: string
}

/** Pide un token: con el código de autorización, o con el de renovación. */
export function pedirToken(datos: Record<string, string>): Promise<RespuestaToken> {
  return pedir<RespuestaToken>('POST', '/oauth/token', {
    cuerpo: {
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      ...datos,
    },
  })
}

export type CuentaMP = { id: string; nickname: string | null; email: string | null }

/** De quién es un token. Es lo que el panel muestra como "conectado con…". */
export async function leerCuenta(token: string): Promise<CuentaMP> {
  const u = await pedir<{ id: number | string; nickname?: string; email?: string }>('GET', '/users/me', { token })
  return { id: String(u.id), nickname: u.nickname ?? null, email: u.email ?? null }
}

// ─── Cobros ──────────────────────────────────────────────────────────────────

export type Preferencia = {
  items: { id: string; title: string; quantity: number; unit_price: number; currency_id: 'ARS' }[]
  payer?: { email?: string }
  back_urls: { success: string; failure: string; pending: string }
  auto_return?: 'approved'
  /** Qué se está cobrando: "turno:<id>" o "pedido:<id>" (ver lib/cobros.ts). */
  external_reference: string
  /** A dónde avisa Mercado Pago cuando el pago cambia (el webhook). */
  notification_url: string
}

/** Arma un cobro con el token del local. Devuelve la dirección a la que mandar al cliente. */
export async function crearPreferencia(token: string, preferencia: Preferencia): Promise<{ id: string; url: string }> {
  const r = await pedir<{ id: string; init_point?: string; sandbox_init_point?: string }>('POST', '/checkout/preferences', {
    token,
    cuerpo: preferencia,
  })
  const url = r.init_point ?? r.sandbox_init_point
  if (!url) throw new ErrorDeMercadoPago(502, 'Mercado Pago no devolvió la dirección del cobro')
  return { id: r.id, url }
}

/** Lo que nos importa de un pago, con nombres en castellano. */
export type PagoMP = {
  id: string
  /** approved, pending, in_process, rejected, cancelled, refunded, charged_back... */
  estado: string
  /** La cuenta que cobró. Tiene que ser la del local. */
  cobradorId: string | null
  monto: number | null
  moneda: string | null
  /** El "turno:<id>" o "pedido:<id>" que mandamos al crear el cobro. */
  referencia: string | null
}

/**
 * Cómo está un pago, preguntado con el token del local. Si no existe, o no lo
 * puede ver esa cuenta (un pago de otra cuenta no se puede ver), devuelve null.
 */
export async function consultarPago(token: string, pagoId: string): Promise<PagoMP | null> {
  try {
    const p = await pedir<{
      id: number | string
      status: string
      collector_id?: number | string | null
      transaction_amount?: number | null
      currency_id?: string | null
      external_reference?: string | null
    }>('GET', `/v1/payments/${encodeURIComponent(pagoId)}`, { token })
    return {
      id: String(p.id),
      estado: p.status,
      cobradorId: p.collector_id == null ? null : String(p.collector_id),
      monto: typeof p.transaction_amount === 'number' ? p.transaction_amount : null,
      moneda: p.currency_id ?? null,
      referencia: p.external_reference ?? null,
    }
  } catch (err) {
    if (err instanceof ErrorDeMercadoPago && err.estado === 404) return null
    throw err
  }
}
