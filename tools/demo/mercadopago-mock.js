/**
 * tools/demo/mercadopago-mock.js — modo demo.
 *
 * No llama a Mercado Pago. Devuelve una preferencia cuyo init_point apunta a la
 * propia URL de retorno de la app, para poder recorrer el flujo completo del
 * sistema sin simular pantallas de un tercero.
 */
class MercadoPagoConfig {
  constructor(opts) { this.opts = opts }
}

class Preference {
  constructor(client) { this.client = client }
  async create({ body }) {
    const id = 'demo-pref-' + Date.now()
    const success = (body && body.back_urls && body.back_urls.success) || '/'
    const sep = success.includes('?') ? '&' : '?'
    const ref = (body && body.external_reference) || ''
    const init = `${success}${sep}payment_id=DEMO-${Date.now()}&status=approved&external_reference=${encodeURIComponent(ref)}`
    return { id, init_point: init, sandbox_init_point: init }
  }
}

class Payment {
  constructor(client) { this.client = client }
  async get() { return { status: 'approved' } }
}

module.exports = { MercadoPagoConfig, Preference, Payment }
