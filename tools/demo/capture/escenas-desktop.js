/**
 * tools/demo/capture/escenas-desktop.js
 *
 * Grabaciones en formato escritorio para la pieza "responsive".
 * Salida: andmar-content/finos-barbers/videos/bruto/desktop-<escena>.mp4
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const L = require('./lib')
const { Grabador } = require('./grabador')

const OUT = path.join(L.ROOT, 'videos/bruto')

const escenas = {
  async home(g) {
    await g.page.goto(L.BASE + '/', { waitUntil: 'networkidle' })
    await L.limpiarUI(g.page)
    await g.page.waitForTimeout(800)
    await g.quieto(1.6)
    await g.scroll({ distancia: 950, duracion: 2.2 })
    await g.quieto(1.2)
    await g.scroll({ distancia: 1050, duracion: 2.2 })
    await g.quieto(1.4)
  },
  async panel(g) {
    const p = g.page
    await L.login(p, 'admin')
    await p.goto(L.BASE + '/admin/calendario', { waitUntil: 'networkidle' })
    await p.waitForFunction(() => !/Cargando/i.test(document.body.innerText), null, { timeout: 20000 }).catch(() => {})
    await L.limpiarUI(p)
    await p.waitForTimeout(900)
    await g.quieto(2.2)
    await g.scroll({ distancia: 420, duracion: 1.8 })
    await g.quieto(1.6)
  },
  async finanzas(g) {
    const p = g.page
    await L.login(p, 'admin')
    await p.goto(L.BASE + '/admin/finanzas', { waitUntil: 'networkidle' })
    await L.limpiarUI(p)
    await p.waitForTimeout(1200)
    await g.quieto(2.2)
    await g.scroll({ distancia: 700, duracion: 2.2 })
    await g.quieto(2.0)
  },
}

;(async () => {
  const pedidas = process.argv.slice(2)
  const lista = pedidas.length ? pedidas : Object.keys(escenas)
  L.ensureDir(OUT)
  const browser = await L.launch()
  await L.calentar(browser)   // que el server compile todo antes de grabar
  for (const nombre of lista) {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1.5,
      locale: 'es-AR',
      timezoneId: 'America/Argentina/Buenos_Aires',
    })
    const page = await ctx.newPage()
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `cuadros-desk-${nombre}-`))
    const g = new Grabador(page, tmp)
    let fallo = null
    try { await escenas[nombre](g) } catch (e) { fallo = e.message.split('\n')[0] }
    const destino = path.join(OUT, `desktop-${nombre}.mp4`)
    g.render(destino)
    console.log(`${fallo ? '⚠' : '✓'} desktop-${nombre.padEnd(12)} ${g.segundos.toFixed(1)}s${fallo ? ' · ' + fallo : ''}`)
    fs.rmSync(tmp, { recursive: true, force: true })
    await ctx.close()
  }
  await browser.close()
})()
