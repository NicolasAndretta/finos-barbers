/**
 * tools/demo/brand/render.js
 *
 * Renderiza HTML de plantillas a PNG con Chromium.
 */
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

async function abrirRenderizador() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const ctx = await browser.newContext({ deviceScaleFactor: 1, locale: 'es-AR' })
  const page = await ctx.newPage()

  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'andmar-render-'))

  async function png(html, { ancho, alto, destino, transparente = false }) {
    await page.setViewportSize({ width: ancho, height: alto })
    // Servimos desde file:// — con setContent (about:blank) el navegador no
    // puede descargar las tipografias de Google Fonts.
    const archivo = path.join(tmpDir, 'pieza.html')
    fs.writeFileSync(archivo, html)
    await page.goto('file://' + archivo, { waitUntil: 'networkidle' })
    // Esperar a que las fuentes esten realmente listas antes de capturar.
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(220)
    fs.mkdirSync(path.dirname(destino), { recursive: true })
    await page.screenshot({ path: destino, omitBackground: transparente })
    return destino
  }

  async function cerrar() { await browser.close() }
  return { png, cerrar, page }
}

module.exports = { abrirRenderizador }
