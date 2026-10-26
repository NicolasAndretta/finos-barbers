/**
 * src/lib/mp-conexion.ts — SOLO SERVIDOR.
 *
 * La cuenta de Mercado Pago de cada local (Mercado Pago Connect, OAuth).
 *
 * El dueño entra al panel de SU local → Cobros → "Conectar Mercado Pago", y
 * autoriza con su cuenta. La aplicación de Mercado Pago es una sola, la de la
 * plataforma (MP_CLIENT_ID / MP_CLIENT_SECRET), y sirve para todos los locales;
 * la plata de cada local cae en la cuenta de su dueño. Nadie ve su contraseña,
 * y nadie de la plataforma maneja su token a mano.
 *
 * Hasta la Fase 4 había UNA conexión para toda la web, y conectar una cuenta
 * borraba las demás. Ahora hay una por local (la base no deja guardar dos), y
 * todo lo de este archivo pide de qué local se trata.
 *
 * Tres cosas que vienen de Código Rojo, donde ya anda con una cuenta real:
 *   1. Se guarda CON QUÉ CUENTA se conectó, y el panel lo muestra. El 29/09 se
 *      confundió la cuenta de Nico con la de Agustina: así se ve de un vistazo
 *      en qué cuenta cae la plata.
 *   2. El token dura 180 días y se renueva cuando le quedan menos de 30 (no 5
 *      minutos): solo se renueva cuando se usa, y un local que pasa un tiempo
 *      sin cobrar se quedaba sin poder hacerlo.
 *   3. La dirección de vuelta (redirect URI) sale de la dirección pública del
 *      sitio, la misma que usa el aviso de pago. Es UNA para todos los locales
 *      y tiene que estar registrada en la aplicación de Mercado Pago.
 *
 * El token no se cifra dentro de la tabla (mismo criterio que Código Rojo): lo
 * protege RLS sin políticas, más los permisos de la 0011. Cifrarlo con una
 * clave guardada en las variables de Hostinger haría que un redeploy que las
 * borre (ya pasó) deje a TODOS los locales sin poder cobrar.
 *
 * NUNCA importar este archivo desde un componente del navegador.
 */

import 'server-only'
import { createServiceClient } from '@/lib/supabase'
import { urlPublica } from '@/lib/sitio'
import { leerCuenta, pedirToken, urlDeAutorizacion, type RespuestaToken } from '@/lib/mercadopago'

const DIA = 24 * 60 * 60 * 1000
/** Con cuánto margen se renueva el token. */
const RENOVAR_ANTES = 30 * DIA
/** Desde cuántos días antes de vencer el panel avisa. */
export const AVISAR_ANTES_DIAS = 15

/**
 * La cookie que acompaña la conexión: el `state` (protección contra que otro
 * sitio le conecte una cuenta ajena al local) y el id del local que conecta.
 * La pone y la lee solo el servidor; el local no viaja en la dirección.
 */
export const COOKIE_CONEXION = 'mp_conexion_estado'
export const RUTA_COOKIE_CONEXION = '/api/mp/oauth'

/** ¿Está todo lo necesario para conectar cuentas? (la app de MP y la dirección del sitio) */
export function mpConnectConfigurado(): boolean {
  return Boolean(process.env.MP_CLIENT_ID && process.env.MP_CLIENT_SECRET && urlPublica())
}

/** La dirección de vuelta: una sola para todos los locales (decisión 1). */
function redirectUri(): string {
  return `${urlPublica()}/api/mp/oauth/callback`
}

/** A dónde mandar al dueño para que autorice. `state` protege la vuelta. */
export function urlParaConectar(state: string): string {
  return urlDeAutorizacion({ clientId: process.env.MP_CLIENT_ID ?? '', redirectUri: redirectUri(), state })
}

/** Cambia el código que devuelve Mercado Pago por el token del local (servidor a servidor). */
export function canjearCodigo(code: string): Promise<RespuestaToken> {
  return pedirToken({ grant_type: 'authorization_code', code, redirect_uri: redirectUri() })
}

const venceEl = (t: RespuestaToken) => (t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null)

/** Guarda la conexión recién autorizada de un local. Si ya tenía una, la reemplaza. */
export async function guardarConexion(localId: string, t: RespuestaToken): Promise<void> {
  // Antes de guardar, se le pregunta a Mercado Pago de quién es el token.
  const cuenta = await leerCuenta(t.access_token)
  const ahora = new Date().toISOString()
  const { error } = await createServiceClient()
    .from('mp_conexion')
    .upsert(
      {
        local_id: localId,
        mp_user_id: cuenta.id,
        mp_nickname: cuenta.nickname,
        mp_email: cuenta.email,
        access_token: t.access_token,
        refresh_token: t.refresh_token ?? null,
        public_key: t.public_key ?? null,
        scope: t.scope ?? null,
        expires_at: venceEl(t),
        // created_at = cuándo se conectó esta cuenta; updated_at = última renovación.
        created_at: ahora,
        updated_at: ahora,
      },
      { onConflict: 'local_id' },
    )
  if (error) throw new Error(`No se pudo guardar la conexión de Mercado Pago: ${error.message}`)
}

type FilaConexion = {
  mp_user_id: string | null
  mp_nickname: string | null
  mp_email: string | null
  access_token: string
  refresh_token: string | null
  expires_at: string | null
  created_at: string | null
}

async function leerConexion(localId: string): Promise<FilaConexion | null> {
  const { data, error } = await createServiceClient()
    .from('mp_conexion')
    .select('mp_user_id, mp_nickname, mp_email, access_token, refresh_token, expires_at, created_at')
    .eq('local_id', localId)
    .maybeSingle()
  if (error) throw new Error(`No se pudo leer la conexión de Mercado Pago: ${error.message}`)
  return (data as FilaConexion | null) ?? null
}

const vencida = (c: FilaConexion) => (c.expires_at ? new Date(c.expires_at).getTime() <= Date.now() : false)

export type EstadoConexion =
  | { conectada: false }
  | {
      conectada: true
      /** false = venció y no se pudo renovar: hay que reconectar. */
      vigente: boolean
      nickname: string | null
      email: string | null
      conectadaEl: string | null
      venceEl: string | null
      diasRestantes: number | null
    }

/** Para el panel y para decidir si el local cobra online. Nunca devuelve el token. */
export async function estadoConexion(localId: string): Promise<EstadoConexion> {
  const c = await leerConexion(localId)
  if (!c) return { conectada: false }
  return {
    conectada: true,
    vigente: !vencida(c),
    nickname: c.mp_nickname,
    email: c.mp_email,
    conectadaEl: c.created_at,
    venceEl: c.expires_at,
    diasRestantes: c.expires_at ? Math.floor((new Date(c.expires_at).getTime() - Date.now()) / DIA) : null,
  }
}

/**
 * El token para cobrar en nombre del local, y de qué cuenta es (para comprobar
 * después que un pago lo cobró esa cuenta). Null si el local no conectó su
 * cuenta o si venció y no se pudo renovar. Si le quedan menos de 30 días, lo
 * renueva antes de devolverlo.
 */
export async function cuentaDelLocal(localId: string): Promise<{ token: string; mpUserId: string } | null> {
  const c = await leerConexion(localId)
  if (!c || !c.mp_user_id) return null
  const vence = c.expires_at ? new Date(c.expires_at).getTime() : Infinity

  if (vence - Date.now() > RENOVAR_ANTES || !c.refresh_token) {
    return vencida(c) ? null : { token: c.access_token, mpUserId: c.mp_user_id }
  }

  try {
    const nuevo = await pedirToken({ grant_type: 'refresh_token', refresh_token: c.refresh_token })
    const { error } = await createServiceClient()
      .from('mp_conexion')
      .update({
        access_token: nuevo.access_token,
        refresh_token: nuevo.refresh_token ?? c.refresh_token,
        expires_at: venceEl(nuevo),
        updated_at: new Date().toISOString(),
      })
      .eq('local_id', localId)
    if (error) console.error(`[mp-conexion] Se renovó el token del local ${localId} pero no se pudo guardar: ${error.message}`)
    return { token: nuevo.access_token, mpUserId: c.mp_user_id }
  } catch (err) {
    // Si todavía no venció, se sigue cobrando con el actual y se reintenta en
    // el próximo uso. Si ya venció, no hay con qué cobrar: el local deja de
    // ofrecer Mercado Pago y el panel pide reconectar.
    console.error(`[mp-conexion] No se pudo renovar el token del local ${localId}:`, err instanceof Error ? err.message : err)
    return vencida(c) ? null : { token: c.access_token, mpUserId: c.mp_user_id }
  }
}

/** Saca la conexión de un local. (La cuenta del dueño no se toca: puede revocar desde su Mercado Pago.) */
export async function desconectar(localId: string): Promise<void> {
  const { error } = await createServiceClient().from('mp_conexion').delete().eq('local_id', localId)
  if (error) throw new Error(`No se pudo desconectar: ${error.message}`)
}
