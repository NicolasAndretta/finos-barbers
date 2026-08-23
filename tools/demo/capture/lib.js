/**
 * tools/demo/capture/lib.js
 *
 * Utilidades compartidas para grabar y capturar la app en modo demo.
 */
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE = process.env.DEMO_BASE_URL || 'http://localhost:3000'
const ROOT = path.join(process.cwd(), 'andmar-content/finos-barbers')

const CUENTAS = {
  admin:   { email: 'admin@finosbarbers.demo',   password: 'demo1234' },
  cliente: { email: 'cliente@finosbarbers.demo', password: 'demo1234' },
  barbero: { email: 'facundo@finosbarbers.demo', password: 'demo1234' },
}

const REEL = { width: 1080, height: 1920 }
const MOBILE_VIEWPORT = { width: 540, height: 960 } // ×2 = 1080×1920
const DESKTOP_VIEWPORT = { width: 1440, height: 900 }

async function launch() {
  return chromium.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--lang=es-AR', '--font-render-hinting=none'],
    env: { ...process.env, LANG: 'es_AR.UTF-8', LANGUAGE: 'es_AR' },
  })
}

/** Contexto vertical 9:16 listo para reels (opcionalmente grabando). */
async function newReelContext(browser, { record, dir } = {}) {
  return browser.newContext({
    viewport: MOBILE_VIEWPORT,
    deviceScaleFactor: 2,
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    reducedMotion: 'no-preference',
    ...(record ? { recordVideo: { dir, size: REEL } } : {}),
  })
}

async function newDesktopContext(browser, { record, dir, size } = {}) {
  return browser.newContext({
    viewport: DESKTOP_VIEWPORT,
    deviceScaleFactor: 1,
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    ...(record ? { recordVideo: { dir, size: size || { width: 1440, height: 900 } } } : {}),
  })
}

/** Inicia sesión con una de las cuentas de demo. */
async function login(page, cuenta) {
  const { email, password } = CUENTAS[cuenta]
  // El server de desarrollo a veces tarda en compilar la ruta: reintentamos.
  for (let intento = 1; intento <= 3; intento++) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }).catch(() => {})
    try {
      await page.waitForSelector('input[name="email"]', { timeout: 15000 })
      break
    } catch (e) {
      if (intento === 3) throw e
    }
  }
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ])
  await page.waitForLoadState('networkidle').catch(() => {})
}

/**
 * Oculta elementos que ensucian la grabacion.
 *
 *  - El mapa de Google no carga en este entorno y deja un recuadro vacio con
 *    borde, que en video se lee como un error de la web.
 *  - La franja de datos del negocio ("+10 años de oficio", "+2.000 cortes al
 *    año", "4.9★ reseñas Google") son metricas del comercio que no podemos
 *    respaldar: no van en material de andmar.studio.
 */
async function limpiarUI(page, {
  ocultarWhatsapp = true,
  ocultarMapa = true,
  ocultarMetricas = true,
} = {}) {
  await page.addStyleTag({
    content: `
      ${ocultarWhatsapp ? 'a[aria-label*="WhatsApp"], a[href*="wa.me"].fixed { display: none !important; }' : ''}
      * { scrollbar-width: none !important; }
      ::-webkit-scrollbar { display: none !important; }
    `,
  })
  await page.evaluate(([mapa, metricas]) => {
    if (mapa) {
      const iframe = document.querySelector('iframe[title*="Ubicación"]')
      if (iframe && iframe.parentElement) iframe.parentElement.style.display = 'none'
    }
    if (metricas) {
      const marca = [...document.querySelectorAll('p, span, div')]
        .find((e) => /Años de oficio/i.test(e.textContent) && e.children.length === 0)
      const seccion = marca && marca.closest('section')
      if (seccion) seccion.style.display = 'none'
    }
  }, [ocultarMapa, ocultarMetricas]).catch(() => {})
}

/** Scroll suave y constante — queda mucho mejor que el scroll nativo. */
async function scrollSuave(page, { distancia, duracion = 3000, desde = null }) {
  await page.evaluate(
    ([distancia, duracion, desde]) =>
      new Promise((resolve) => {
        const inicio = desde === null ? window.scrollY : desde
        if (desde !== null) window.scrollTo(0, desde)
        const t0 = performance.now()
        const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
        function paso(t) {
          const p = Math.min(1, (t - t0) / duracion)
          window.scrollTo(0, inicio + distancia * ease(p))
          if (p < 1) requestAnimationFrame(paso)
          else resolve()
        }
        requestAnimationFrame(paso)
      }),
    [distancia, duracion, desde],
  )
}

/** Mueve el "foco" visual: hover + pequeña pausa antes de hacer click. */
async function clickSuave(page, selector, { pausa = 700, despues = 1200 } = {}) {
  const el = page.locator(selector).first()
  await el.scrollIntoViewIfNeeded()
  await el.hover().catch(() => {})
  await page.waitForTimeout(pausa)
  await el.click()
  await page.waitForTimeout(despues)
}

/**
 * Visita todas las rutas una vez para que el server de desarrollo las compile.
 * Sin esto, la primera grabacion de cada ruta se corta a mitad de camino.
 */
async function calentar(browser) {
  const ctx = await browser.newContext({ viewport: MOBILE_VIEWPORT, locale: 'es-AR' })
  const page = await ctx.newPage()
  const publicas = ['/', '/tienda', '/login', '/register', '/recuperar', '/checkout']
  for (const ruta of publicas) {
    await page.goto(BASE + ruta, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
  }
  await login(page, 'admin').catch(() => {})
  const privadas = [
    '/admin/dashboard', '/admin/turnos', '/admin/calendario', '/admin/servicios',
    '/admin/productos', '/admin/categorias', '/admin/barberos', '/admin/resenas',
    '/admin/pagos', '/admin/finanzas',
  ]
  for (const ruta of privadas) {
    await page.goto(BASE + ruta, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
  }
  await ctx.close()

  const ctx2 = await browser.newContext({ viewport: MOBILE_VIEWPORT, locale: 'es-AR' })
  const page2 = await ctx2.newPage()
  await login(page2, 'cliente').catch(() => {})
  for (const ruta of ['/dashboard', '/reservar', '/turnos']) {
    await page2.goto(BASE + ruta, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
  }
  await ctx2.close()

  const ctx3 = await browser.newContext({ viewport: MOBILE_VIEWPORT, locale: 'es-AR' })
  const page3 = await ctx3.newPage()
  await login(page3, 'barbero').catch(() => {})
  for (const ruta of ['/barbero/calendario', '/barbero/clientes']) {
    await page3.goto(BASE + ruta, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
  }
  await ctx3.close()
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
  return p
}

/** Cierra el contexto y renombra el .webm resultante. */
async function guardarVideo(page, context, destino) {
  const video = page.video()
  await context.close()
  if (!video) return null
  ensureDir(path.dirname(destino))
  await video.saveAs(destino)
  await video.delete().catch(() => {})
  return destino
}

module.exports = {
  BASE, ROOT, CUENTAS, REEL, MOBILE_VIEWPORT, DESKTOP_VIEWPORT,
  launch, newReelContext, newDesktopContext, login, limpiarUI, calentar,
  scrollSuave, clickSuave, ensureDir, guardarVideo,
}
