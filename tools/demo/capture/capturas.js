/**
 * tools/demo/capture/capturas.js
 *
 * Capturas curadas (1080×1920 mobile y 1440×900 escritorio) para posts,
 * historias y documentacion.
 * Salida: andmar-content/finos-barbers/capturas/
 */
const path = require('path')
const { execFileSync } = require('child_process')
const L = require('./lib')

const OUT = path.join(L.ROOT, 'capturas')

const espera = (p, ms) => p.waitForTimeout(ms)

async function preparar(page) {
  await L.limpiarUI(page)
  await espera(page, 600)
}

/** Espera a que desaparezcan los estados de carga del cliente. */
async function esperarCarga(page) {
  await page
    .waitForFunction(() => !/Cargando/i.test(document.body.innerText), null, { timeout: 20000 })
    .catch(() => {})
  await espera(page, 700)
}

/** Capturas del sitio publico. */
async function publicas(ctx, sufijo) {
  const p = await ctx.newPage()
  const shot = async (nombre) => {
    await preparar(p)
    await p.screenshot({ path: path.join(OUT, `${nombre}-${sufijo}.png`) })
  }

  await p.goto(L.BASE + '/', { waitUntil: 'networkidle' })
  await espera(p, 1200); await shot('home-hero')
  await p.evaluate(() => window.scrollTo(0, 2050)); await espera(p, 900); await shot('home-servicios')
  await p.evaluate(() => window.scrollTo(0, 3600)); await espera(p, 900); await shot('home-equipo')
  await p.evaluate(() => window.scrollTo(0, 6600)); await espera(p, 900); await shot('home-resenas')
  await p.evaluate(() => window.scrollTo(0, 8200)); await espera(p, 900); await shot('home-galeria')

  await p.goto(L.BASE + '/tienda', { waitUntil: 'networkidle' })
  await espera(p, 1200); await shot('tienda-catalogo')
  await p.evaluate(() => window.scrollTo(0, 700)); await espera(p, 800); await shot('tienda-productos')

  await p.goto(L.BASE + '/login', { waitUntil: 'networkidle' })
  await espera(p, 900); await shot('login')
  await p.close()
}

/** Capturas del flujo de reserva y del area del cliente. */
async function cliente(ctx, sufijo) {
  const p = await ctx.newPage()
  const shot = async (nombre) => {
    await preparar(p)
    await p.screenshot({ path: path.join(OUT, `${nombre}-${sufijo}.png`) })
  }
  await L.login(p, 'cliente')

  await p.goto(L.BASE + '/dashboard', { waitUntil: 'networkidle' })
  await espera(p, 900); await shot('cliente-panel')

  await p.goto(L.BASE + '/turnos', { waitUntil: 'networkidle' })
  await espera(p, 900); await shot('cliente-turnos')

  await p.goto(L.BASE + '/reservar', { waitUntil: 'networkidle' })
  await espera(p, 1000)
  await p.evaluate(() => window.scrollTo(0, 520)); await espera(p, 500)
  await shot('reservar-1-servicio')
  await p.locator('button:has-text("Corte & Barba Premium")').first().click()
  await espera(p, 900)
  await p.evaluate(() => window.scrollTo(0, 520)); await espera(p, 400)
  await shot('reservar-2-barbero')
  await p.locator('button:has-text("Leandro")').first().click()
  await espera(p, 900)
  const d = new Date(); d.setDate(d.getDate() + 3)
  const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  await p.fill('input[type="date"]', fecha)
  await espera(p, 1600)
  await p.evaluate(() => window.scrollTo(0, 620)); await espera(p, 600)
  await shot('reservar-3-horarios')
  await p.locator('button:has-text("16:00")').first().click()
  await espera(p, 900)
  await p.evaluate(() => window.scrollTo(0, 1050)); await espera(p, 800)
  await shot('reservar-4-sena')
  await p.close()
}

/** Capturas del panel administrativo. */
async function admin(ctx, sufijo) {
  const p = await ctx.newPage()
  const shot = async (nombre, y = 0) => {
    await p.evaluate((v) => window.scrollTo(0, v), y)
    await espera(p, 700)
    await preparar(p)
    await p.screenshot({ path: path.join(OUT, `${nombre}-${sufijo}.png`) })
  }
  await L.login(p, 'admin')

  await p.goto(L.BASE + '/admin/dashboard', { waitUntil: 'networkidle' }); await espera(p, 900)
  await shot('admin-dashboard')
  await p.goto(L.BASE + '/admin/turnos', { waitUntil: 'networkidle' }); await espera(p, 900)
  await shot('admin-turnos')
  await p.goto(L.BASE + '/admin/calendario', { waitUntil: 'networkidle' }); await esperarCarga(p)
  await shot('admin-calendario')
  await p.goto(L.BASE + '/admin/servicios', { waitUntil: 'networkidle' }); await espera(p, 900)
  await shot('admin-servicios')
  await p.goto(L.BASE + '/admin/productos', { waitUntil: 'networkidle' }); await espera(p, 900)
  await shot('admin-productos')
  await p.goto(L.BASE + '/admin/barberos', { waitUntil: 'networkidle' }); await espera(p, 900)
  await shot('admin-barberos')
  await p.goto(L.BASE + '/admin/resenas', { waitUntil: 'networkidle' }); await espera(p, 900)
  await shot('admin-resenas')
  await p.goto(L.BASE + '/admin/pagos', { waitUntil: 'networkidle' }); await espera(p, 900)
  await shot('admin-cobros')
  await p.goto(L.BASE + '/admin/finanzas', { waitUntil: 'networkidle' }); await esperarCarga(p); await espera(p, 900)
  await shot('admin-finanzas')
  await shot('admin-finanzas-graficos', 700)
  await p.close()
}

/** Panel del barbero. */
async function barbero(ctx, sufijo) {
  const p = await ctx.newPage()
  await L.login(p, 'barbero')
  await p.goto(L.BASE + '/barbero/calendario', { waitUntil: 'networkidle' })
  await esperarCarga(p); await preparar(p)
  await p.screenshot({ path: path.join(OUT, `barbero-agenda-${sufijo}.png`) })
  await p.close()
}

;(async () => {
  L.ensureDir(OUT)
  const browser = await L.launch()
  await L.calentar(browser)   // que el server compile todo antes de grabar

  for (const [sufijo, mk] of [['mobile', L.newReelContext], ['desktop', L.newDesktopContext]]) {
    for (const paso of [publicas, cliente, admin, barbero]) {
      const ctx = await mk(browser, {})
      try { await paso(ctx, sufijo) } catch (e) { console.log(`⚠ ${paso.name} ${sufijo}: ${e.message.split('\n')[0]}`) }
      await ctx.close()
    }
    console.log(`✓ capturas ${sufijo}`)
  }

  await browser.close()

  // Recorte del bloque de resumen y sena: en las piezas graficas se ve dentro
  // de un marco bajo y, sin recortar, sólo entraría la grilla de horarios.
  try {
    execFileSync(process.env.FFMPEG_BIN || 'ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', path.join(OUT, 'reservar-4-sena-mobile.png'),
      '-vf', 'crop=1080:1180:0:740',
      path.join(OUT, 'reservar-4-sena-detalle.png'),
    ])
    console.log('✓ recorte reservar-4-sena-detalle')
  } catch (e) {
    console.log('⚠ no se pudo recortar reservar-4-sena:', e.message.split('\n')[0])
  }

  console.log('Capturas en', path.relative(process.cwd(), OUT))
})()
