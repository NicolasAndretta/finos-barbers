/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  // El indicador de dev estorba en las grabaciones del modo demo.
  devIndicators: process.env.DEMO_MODE === '1' ? false : undefined,
  webpack: (config, { nextRuntime, webpack }) => {
    // ─── MODO DEMO ────────────────────────────────────────────────────────
    // Solo se activa con DEMO_MODE=1 (grabación de material audiovisual).
    // Reemplaza los servicios externos por mocks locales para poder correr la
    // UI real sin credenciales. En producción no cambia nada.
    if (process.env.DEMO_MODE === '1') {
      const demo = path.join(__dirname, 'tools/demo')
      // Los datos del comercio (alias de cobro, WhatsApp) se reemplazan por
      // marcadores para que las grabaciones no expongan informacion privada.
      // Va por plugin y no por alias: el mapeo '@/…' de Next gana al alias.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^@\/lib\/site$/, (recurso) => {
          recurso.request = path.join(demo, 'site-demo.js')
        }),
      )
      config.resolve.alias = {
        ...config.resolve.alias,
        '@supabase/ssr': path.join(
          demo,
          nextRuntime === 'edge' ? 'supabase-mock-edge.js' : 'supabase-mock.js',
        ),
        resend: path.join(demo, 'resend-mock.js'),
        mercadopago: path.join(demo, 'mercadopago-mock.js'),
      }
    }
    return config
  },
}

module.exports = nextConfig
