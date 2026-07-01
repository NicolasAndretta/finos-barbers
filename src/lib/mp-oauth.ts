/**
 * Mercado Pago Connect (OAuth) — SOLO SERVIDOR.
 *
 * Permite que el comercio (Leandro) conecte su propia cuenta de Mercado Pago con
 * un clic, sin compartir credenciales. El token se guarda en `mp_conexion` y se
 * usa para crear los pagos en nombre del comercio (la plata cae en su cuenta).
 *
 * Requiere en .env.local:
 *   MP_CLIENT_ID       (Application ID de la app de MP de Andretta Studio)
 *   MP_CLIENT_SECRET   (Client Secret de esa app)
 *   NEXT_PUBLIC_SITE_URL (URL pública del sitio, para el redirect)
 *
 * NUNCA importar este archivo desde un client component.
 */
import { createServiceClient } from '@/lib/supabase'

const AUTH_BASE = 'https://auth.mercadopago.com.ar/authorization'
const TOKEN_URL = 'https://api.mercadopago.com/oauth/token'

/**
 * Base pública del sitio tomada del request real (funciona detrás del proxy de
 * Hostinger vía x-forwarded-*). Es lo más confiable para que el redirect_uri
 * coincida SIEMPRE con el dominio por el que entró el usuario (y con el que está
 * registrado en la app de MP), sin depender de que una env NEXT_PUBLIC_ se haya
 * horneado bien en el build.
 */
function baseFromRequest(req?: Request): string | null {
  if (!req) return null
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  if (!host) return null
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

/**
 * Base pública del sitio para redirects internos (post-callback). Igual criterio
 * que el redirect_uri: usa el dominio real del request para no depender de que
 * una env NEXT_PUBLIC_ se haya horneado bien en el build.
 */
export function publicBaseUrl(req?: Request): string {
  const base =
    baseFromRequest(req) ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  return base.replace(/\/$/, '')
}

function redirectUri(req?: Request) {
  return `${publicBaseUrl(req)}/api/mp/oauth/callback`
}

export function mpOAuthConfigurado() {
  return Boolean(process.env.MP_CLIENT_ID && process.env.MP_CLIENT_SECRET)
}

/** URL a la que mandamos al comercio para que autorice. */
export function getAuthorizationUrl(state: string, req?: Request) {
  const params = new URLSearchParams({
    client_id: process.env.MP_CLIENT_ID || '',
    response_type: 'code',
    platform_id: 'mp',
    redirect_uri: redirectUri(req),
    state,
  })
  return `${AUTH_BASE}?${params.toString()}`
}

type TokenResponse = {
  access_token: string
  refresh_token?: string
  user_id?: number | string
  public_key?: string
  expires_in?: number
  scope?: string
}

/** Cambia el código de autorización por un access token (server-to-server). */
export async function exchangeCodeForToken(code: string, req?: Request): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(req),
    }),
  })
  if (!res.ok) throw new Error(`MP token exchange falló: ${res.status} ${await res.text()}`)
  return res.json()
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) throw new Error(`MP refresh falló: ${res.status} ${await res.text()}`)
  return res.json()
}

/** Guarda (reemplaza) la conexión del comercio. Finos = un solo comercio. */
export async function guardarConexion(t: TokenResponse) {
  const supabase = createServiceClient()
  const expiresAt = t.expires_in
    ? new Date(Date.now() + t.expires_in * 1000).toISOString()
    : null
  await supabase.from('mp_conexion').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  const { error } = await supabase.from('mp_conexion').insert({
    mp_user_id: t.user_id ? String(t.user_id) : null,
    access_token: t.access_token,
    refresh_token: t.refresh_token ?? null,
    public_key: t.public_key ?? null,
    expires_at: expiresAt,
    scope: t.scope ?? null,
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}

type ConexionRow = {
  id: string
  mp_user_id: string | null
  access_token: string
  refresh_token: string | null
  expires_at: string | null
}

async function getConexion(): Promise<ConexionRow | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('mp_conexion')
    .select('id, mp_user_id, access_token, refresh_token, expires_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as ConexionRow) ?? null
}

/** ¿El comercio ya conectó su Mercado Pago? (sin exponer el token) */
export async function estaConectado(): Promise<boolean> {
  const c = await getConexion()
  return Boolean(c?.access_token)
}

/**
 * Devuelve un access token válido del comercio (refresca si está por vencer).
 * Si no hay conexión OAuth, devuelve null y el caller cae al token del .env
 * (MERCADOPAGO_ACCESS_TOKEN) como respaldo.
 */
export async function getAccessTokenComercio(): Promise<string | null> {
  const c = await getConexion()
  if (!c?.access_token) return null

  const venceEn = c.expires_at ? new Date(c.expires_at).getTime() : Infinity
  const margen = 5 * 60 * 1000 // refrescar 5 min antes de vencer
  if (venceEn - Date.now() < margen && c.refresh_token) {
    try {
      const nuevo = await refreshAccessToken(c.refresh_token)
      await guardarConexion(nuevo)
      return nuevo.access_token
    } catch (err) {
      console.error('[MP OAuth] No se pudo refrescar el token:', err)
      return c.access_token // intentamos con el actual igualmente
    }
  }
  return c.access_token
}
