/**
 * tools/demo/resend-mock.js — modo demo: no envía correo real, solo loguea.
 */
class Resend {
  constructor() {
    this.emails = {
      send: async (payload) => {
        console.log('[demo][resend] email simulado →', payload && payload.to)
        return { data: { id: 'demo-email-' + Date.now() }, error: null }
      },
    }
  }
}
module.exports = { Resend }
