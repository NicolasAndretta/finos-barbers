/**
 * scripts/mp-falso.mjs
 *
 * Un Mercado Pago de MENTIRA, para probar los cobros en la PC (Fase 4a). No
 * habla con internet ni mueve plata: imita las cinco cosas que usa la app,
 * con las mismas direcciones y respuestas que el de verdad.
 *
 *   GET  /authorization          donde el dueño autoriza: un botón por cuenta de prueba
 *   POST /oauth/token            código de autorización o de renovación → token
 *   GET  /users/me               de quién es un token
 *   POST /checkout/preferences   armar un cobro
 *   GET  /v1/payments/:id        cómo está un pago. Como el de verdad: un pago
 *                                solo lo ve la cuenta que lo cobró
 *
 * Y la "caja" donde se paga:
 *   GET  /checkout?pref=...      botones Aprobar / Pendiente / Rechazar. Al
 *                                pagar, avisa a la app (el webhook) y vuelve a
 *                                la dirección de vuelta, como el de verdad.
 *
 * Para las pruebas (scripts/probar-cobros.mjs), un tablero de control:
 *   POST /__control/reset        empezar de cero
 *   POST /__control/config       { avisos: true|false, fallarRenovacion: true|false }
 *   POST /__control/pago         crear un pago a medida (otro monto, otra cuenta...)
 *   POST /__control/estado       cambiarle el estado a un pago (por ejemplo, devolverlo)
 *   POST /__control/avisar       mandarle a la app el aviso de un pago
 *   GET  /__control/registro     qué le pidió la app y con qué cuenta
 *
 * Uso: node scripts/mp-falso.mjs        (escucha en 127.0.0.1:3999)
 * La app le habla solo si corre en desarrollo y con
 *   MP_API_URL=http://127.0.0.1:3999  MP_AUTH_URL=http://127.0.0.1:3999/authorization
 * (ver src/lib/mercadopago.ts). probar-cobros.mjs lo levanta solo.
 */
import http from 'node:http'

const PUERTO = Number(process.env.MP_FALSO_PUERTO || 3999)
const BASE = `http://127.0.0.1:${PUERTO}`

/** Las cuentas de Mercado Pago de prueba. */
const CUENTAS = {
  'vendedora-b': { id: '900000001', nickname: 'VENDEDORA_B', email: 'vendedora.b@prueba.mp' },
  'vendedor-c': { id: '900000002', nickname: 'VENDEDOR_C', email: 'vendedor.c@prueba.mp' },
  'otra-cuenta': { id: '900000099', nickname: 'OTRA_CUENTA', email: 'otra@prueba.mp' },
}
const DIAS_180 = 180 * 24 * 60 * 60

// ─── El estado del Mercado Pago de mentira (en memoria) ─────────────────────

let estado
function empezarDeCero() {
  estado = {
    contador: 1000,
    codigos: new Map(),      // código de autorización → cuenta
    tokens: new Map(),       // access token → cuenta
    renovaciones: new Map(), // refresh token → cuenta
    preferencias: new Map(), // id → { cuenta, cuerpo }
    pagos: new Map(),        // id → pago
    registro: [],            // lo que pidió la app
    config: { avisos: true, fallarRenovacion: false },
  }
}
empezarDeCero()

const nuevoId = () => ++estado.contador
const anotar = (que, detalle = {}) => estado.registro.push({ que, ...detalle, cuando: new Date().toISOString() })

function emitirToken(cuenta) {
  const n = nuevoId()
  const access = `APP_USR-FALSO-${cuenta}-${n}`
  const refresh = `TG-FALSO-${cuenta}-${n}`
  estado.tokens.set(access, cuenta)
  estado.renovaciones.set(refresh, cuenta)
  return { access_token: access, refresh_token: refresh, user_id: Number(CUENTAS[cuenta].id), public_key: `APP_USR-PUB-${n}`, expires_in: DIAS_180, scope: 'offline_access read write', token_type: 'bearer' }
}

/** De qué cuenta es el token del pedido (Authorization: Bearer ...), o null. */
function cuentaDelToken(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '')
  return m ? estado.tokens.get(m[1]) ?? null : null
}

function pagoComoMP(p) {
  return {
    id: p.id, status: p.status, status_detail: p.status, collector_id: Number(CUENTAS[p.cuenta].id),
    transaction_amount: p.monto, currency_id: p.moneda, external_reference: p.referencia,
    date_created: p.creado,
  }
}

function crearPago({ cuenta, status, monto, referencia, moneda = 'ARS', visiblePara = [], aviso = null }) {
  const pago = { id: nuevoId(), cuenta, status, monto, referencia, moneda, visiblePara, aviso, creado: new Date().toISOString() }
  estado.pagos.set(String(pago.id), pago)
  return pago
}

/** Le avisa a la app de un pago, como Mercado Pago: a la dirección del cobro, con el número agregado. */
async function avisar(pago, url = pago.aviso) {
  if (!url) return { enviado: false, motivo: 'sin dirección de aviso' }
  const destino = new URL(url)
  destino.searchParams.set('data.id', String(pago.id))
  destino.searchParams.set('type', 'payment')
  try {
    const r = await fetch(destino, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'payment.updated', api_version: 'v1', type: 'payment', data: { id: String(pago.id) }, live_mode: false }),
    })
    anotar('aviso enviado', { pago: pago.id, respuesta: r.status })
    return { enviado: true, respuesta: r.status }
  } catch (e) {
    anotar('aviso fallido', { pago: pago.id, error: e.message })
    return { enviado: false, motivo: e.message }
  }
}

// ─── Ayudantes HTTP ─────────────────────────────────────────────────────────

async function leerCuerpo(req) {
  let texto = ''
  for await (const parte of req) texto += parte
  if (!texto) return {}
  try { return JSON.parse(texto) } catch { return Object.fromEntries(new URLSearchParams(texto)) }
}
const json = (res, codigo, datos) => { res.writeHead(codigo, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(datos)) }
const html = (res, cuerpo) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Mercado Pago de mentira</title>
<style>body{font-family:system-ui,sans-serif;max-width:28rem;margin:3rem auto;padding:0 1rem;background:#f4f4f4;color:#222}a.b{display:block;margin:.6rem 0;padding:.8rem 1rem;border-radius:.5rem;background:#009ee3;color:#fff;text-decoration:none;text-align:center;font-weight:600}a.g{background:#888}</style>
</head><body><p><strong>Mercado Pago de mentira</strong> (solo para pruebas en la PC)</p>${cuerpo}</body></html>`)
}
const irA = (res, url) => { res.writeHead(302, { Location: url }); res.end() }
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

// ─── El servidor ────────────────────────────────────────────────────────────

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, BASE)
  const ruta = url.pathname
  try {
    // ── Autorizar (OAuth) ──────────────────────────────────────────────────
    if (req.method === 'GET' && ruta === '/authorization') {
      const q = url.searchParams
      anotar('pidió autorizar', { client_id: q.get('client_id'), redirect_uri: q.get('redirect_uri') })
      const enlaces = Object.entries(CUENTAS).map(([clave, c]) => {
        const destino = new URL('/authorization/aceptar', BASE)
        for (const k of ['redirect_uri', 'state']) destino.searchParams.set(k, q.get(k) ?? '')
        destino.searchParams.set('cuenta', clave)
        return `<a class="b" href="${esc(destino)}">Entrar como ${esc(c.nickname)}</a>`
      }).join('')
      const cancelar = new URL(q.get('redirect_uri') || BASE)
      cancelar.searchParams.set('error', 'access_denied')
      cancelar.searchParams.set('state', q.get('state') ?? '')
      return html(res, `<h1>Autorizar a la aplicación</h1>${enlaces}<a class="b g" href="${esc(cancelar)}">Cancelar</a>`)
    }
    if (req.method === 'GET' && ruta === '/authorization/aceptar') {
      const cuenta = url.searchParams.get('cuenta')
      if (!CUENTAS[cuenta]) return json(res, 400, { message: 'cuenta desconocida' })
      const code = `TG-CODE-${cuenta}-${nuevoId()}`
      estado.codigos.set(code, { cuenta, redirect_uri: url.searchParams.get('redirect_uri') })
      const vuelta = new URL(url.searchParams.get('redirect_uri'))
      vuelta.searchParams.set('code', code)
      vuelta.searchParams.set('state', url.searchParams.get('state') ?? '')
      return irA(res, vuelta.toString())
    }
    if (req.method === 'POST' && ruta === '/oauth/token') {
      const b = await leerCuerpo(req)
      if (b.grant_type === 'authorization_code') {
        const guardado = estado.codigos.get(b.code)
        estado.codigos.delete(b.code) // un código sirve una sola vez
        anotar('canjeó un código', { valido: !!guardado, redirect_uri: b.redirect_uri, client_id: b.client_id })
        if (!guardado) return json(res, 400, { message: 'invalid_grant' })
        if (guardado.redirect_uri !== b.redirect_uri) return json(res, 400, { message: 'redirect_uri no coincide' })
        return json(res, 200, emitirToken(guardado.cuenta))
      }
      if (b.grant_type === 'refresh_token') {
        const cuenta = estado.renovaciones.get(b.refresh_token)
        anotar('renovó un token', { valido: !!cuenta, fallar: estado.config.fallarRenovacion })
        if (!cuenta || estado.config.fallarRenovacion) return json(res, 400, { message: 'invalid_grant' })
        return json(res, 200, emitirToken(cuenta))
      }
      return json(res, 400, { message: 'grant_type no soportado' })
    }

    // ── La cuenta de un token ──────────────────────────────────────────────
    if (req.method === 'GET' && ruta === '/users/me') {
      const cuenta = cuentaDelToken(req)
      anotar('leyó la cuenta', { cuenta })
      if (!cuenta) return json(res, 401, { message: 'invalid_token' })
      const c = CUENTAS[cuenta]
      return json(res, 200, { id: Number(c.id), nickname: c.nickname, email: c.email })
    }

    // ── Cobros ─────────────────────────────────────────────────────────────
    if (req.method === 'POST' && ruta === '/checkout/preferences') {
      const cuenta = cuentaDelToken(req)
      const cuerpo = await leerCuerpo(req)
      const total = (cuerpo.items || []).reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity), 0)
      anotar('creó un cobro', { cuenta, referencia: cuerpo.external_reference, aviso: cuerpo.notification_url, total, vuelta: cuerpo.back_urls?.success })
      if (!cuenta) return json(res, 401, { message: 'invalid_token' })
      const id = `PREF-${nuevoId()}`
      estado.preferencias.set(id, { cuenta, cuerpo, total })
      return json(res, 201, { id, init_point: `${BASE}/checkout?pref=${id}` })
    }
    if (req.method === 'GET' && ruta === '/checkout') {
      const pref = estado.preferencias.get(url.searchParams.get('pref'))
      if (!pref) return html(res, '<p>Ese cobro no existe.</p>')
      const boton = (st, texto) => `<a class="b" href="/checkout/pagar?pref=${esc(url.searchParams.get('pref'))}&estado=${st}">${texto}</a>`
      return html(res, `<h1>Pagar $${pref.total}</h1><p>Cobra: ${esc(CUENTAS[pref.cuenta].nickname)}</p>
        ${boton('approved', 'Pagar (aprobado)')}${boton('pending', 'Pagar (queda pendiente)')}${boton('rejected', 'Rechazar')}`)
    }
    if (req.method === 'GET' && ruta === '/checkout/pagar') {
      const prefId = url.searchParams.get('pref')
      const pref = estado.preferencias.get(prefId)
      if (!pref) return html(res, '<p>Ese cobro no existe.</p>')
      const status = url.searchParams.get('estado')
      const pago = crearPago({ cuenta: pref.cuenta, status, monto: pref.total, referencia: pref.cuerpo.external_reference, aviso: pref.cuerpo.notification_url })
      anotar('se pagó', { pago: pago.id, status, referencia: pago.referencia })
      // Como el de verdad: avisa a la app y después vuelve a la dirección de vuelta.
      if (estado.config.avisos) await avisar(pago)
      const vuelta = new URL(pref.cuerpo.back_urls[status === 'approved' ? 'success' : status === 'pending' ? 'pending' : 'failure'])
      for (const [k, v] of Object.entries({ payment_id: pago.id, collection_id: pago.id, status, collection_status: status, external_reference: pago.referencia, preference_id: prefId })) {
        vuelta.searchParams.set(k, String(v))
      }
      return irA(res, vuelta.toString())
    }
    if (req.method === 'GET' && ruta.startsWith('/v1/payments/')) {
      const cuenta = cuentaDelToken(req)
      const pago = estado.pagos.get(decodeURIComponent(ruta.slice('/v1/payments/'.length)))
      anotar('consultó un pago', { cuenta, pago: pago?.id ?? null })
      if (!cuenta) return json(res, 401, { message: 'invalid_token' })
      // Un pago solo lo ve la cuenta que lo cobró (o a quien se lo mostramos a propósito en una prueba).
      if (!pago || (pago.cuenta !== cuenta && !pago.visiblePara.includes(cuenta))) return json(res, 404, { message: 'Payment not found' })
      return json(res, 200, pagoComoMP(pago))
    }

    // ── El tablero de control de las pruebas ───────────────────────────────
    if (ruta === '/__control/salud') return json(res, 200, { ok: true })
    if (req.method === 'POST' && ruta === '/__control/reset') { empezarDeCero(); return json(res, 200, { ok: true }) }
    if (req.method === 'POST' && ruta === '/__control/config') {
      Object.assign(estado.config, await leerCuerpo(req))
      return json(res, 200, estado.config)
    }
    if (req.method === 'POST' && ruta === '/__control/pago') {
      const b = await leerCuerpo(req)
      if (!CUENTAS[b.cuenta]) return json(res, 400, { message: 'cuenta desconocida' })
      return json(res, 200, pagoComoMP(crearPago({ cuenta: b.cuenta, status: b.estado || 'approved', monto: Number(b.monto), referencia: b.referencia, moneda: b.moneda || 'ARS', visiblePara: b.visiblePara || [], aviso: b.aviso || null })))
    }
    if (req.method === 'POST' && ruta === '/__control/estado') {
      const b = await leerCuerpo(req)
      const pago = estado.pagos.get(String(b.id))
      if (!pago) return json(res, 404, { message: 'no existe' })
      pago.status = b.estado
      return json(res, 200, pagoComoMP(pago))
    }
    if (req.method === 'POST' && ruta === '/__control/avisar') {
      const b = await leerCuerpo(req)
      const pago = estado.pagos.get(String(b.id))
      if (!pago) return json(res, 404, { message: 'no existe' })
      return json(res, 200, await avisar(pago, b.aviso || pago.aviso))
    }
    if (req.method === 'GET' && ruta === '/__control/registro') return json(res, 200, estado.registro)

    json(res, 404, { message: `no existe ${req.method} ${ruta}` })
  } catch (e) {
    json(res, 500, { message: e.message })
  }
})

servidor.listen(PUERTO, '127.0.0.1', () => console.log(`Mercado Pago de mentira escuchando en ${BASE}`))
