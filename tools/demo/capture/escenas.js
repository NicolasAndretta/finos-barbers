/**
 * tools/demo/capture/escenas.js
 *
 * Graba las escenas en bruto (1080×1920 reales) de cada flujo del sistema.
 * Salida: andmar-content/finos-barbers/videos/bruto/<escena>.mp4
 *
 * Uso:  node tools/demo/capture/escenas.js [nombre-escena ...]
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const L = require('./lib')
const { Grabador } = require('./grabador')

const OUT = path.join(L.ROOT, 'videos/bruto')

/** Fecha (yyyy-mm-dd) a N dias de hoy. */
function enDias(n) {
  const d = new Date(); d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const escenas = {
  /* 1 — Recorrido de la home publica.
     Cada tramo se ancla a su seccion con irA() y la marca se pone DESPUES de
     llegar: avanzando por pixeles fijos los sobreimpresos terminaban sobre la
     seccion equivocada. Termina en las resenas, sin llegar al mapa ni al pie. */
  async hero(g) {
    await g.page.goto(L.BASE + '/', { waitUntil: 'networkidle' })
    await L.limpiarUI(g.page)
    await g.page.waitForTimeout(900)
    g.marca('hero')
    await g.quieto(2.2)

    await g.irA('#servicios', { duracion: 2.2, margen: 40 })
    g.marca('servicios')
    await g.quieto(1.4)
    await g.scroll({ distancia: 700, duracion: 1.8 })
    await g.quieto(0.8)

    await g.irA('#barberos', { duracion: 2.0, margen: 40 })
    g.marca('equipo')
    await g.quieto(1.4)
    await g.scroll({ distancia: 520, duracion: 1.6 })
    await g.quieto(0.8)

    await g.irA('En 3 pasos', { duracion: 2.0, margen: 160 })
    g.marca('pasos')
    await g.quieto(1.4)
    await g.scroll({ distancia: 620, duracion: 1.8 })
    await g.quieto(0.8)

    await g.irA('Lo que dicen de nosotros', { duracion: 2.0, margen: 160 })
    g.marca('resenas')
    await g.quieto(1.4)
    await g.scroll({ distancia: 620, duracion: 1.8 })
    await g.quieto(1.4)
    g.marca('fin')
  },

  /* 2 — Reserva completa: servicio → barbero → fecha → hora → sena. */
  async turnos(g) {
    const p = g.page
    await L.login(p, 'cliente')
    await p.goto(L.BASE + '/reservar', { waitUntil: 'networkidle' })
    await L.limpiarUI(p)
    await p.waitForTimeout(700)
    g.marca('paso1')
    await g.quieto(1.0)
    await g.scroll({ distancia: 430, duracion: 1.1 })
    await g.quieto(0.7)
    await g.click('button:has-text("Corte & Barba Premium")', { antes: 0.5, despues: 1.4 })
    g.marca('paso2')
    await g.click('button:has-text("Leandro")', { antes: 0.6, despues: 1.4 })
    g.marca('paso3')
    await g.accion(async (pg) => { await pg.fill('input[type="date"]', enDias(3)) }, { despues: 0.4 })
    await p.waitForTimeout(1400)
    await g.quieto(0.9)
    await g.scroll({ distancia: 430, duracion: 1.2 })
    await g.quieto(0.8)
    await g.click('button:has-text("16:00")', { antes: 0.5, despues: 1.2 })
    g.marca('paso4')
    await g.scroll({ distancia: 640, duracion: 1.5 })
    await g.quieto(2.6)                                   // resumen + sena + medios
  },

  /* 3 — Seleccion de barbero. */
  async barberos(g) {
    const p = g.page
    await L.login(p, 'cliente')
    await p.goto(L.BASE + '/reservar', { waitUntil: 'networkidle' })
    await L.limpiarUI(p)
    await p.waitForTimeout(700)
    await g.scroll({ distancia: 430, duracion: 1.0 })
    await g.click('button:has-text("Corte de Autor")', { antes: 0.5, despues: 1.6 })
    g.marca('equipo')
    await g.quieto(1.8)
    await g.click('button:has-text("Facundo")', { antes: 0.6, despues: 1.6 })
    await g.quieto(1.2)
  },

  /* 4 — Servicios: alta real desde el panel y como aparece en la reserva.
     Ojo: la seccion de servicios de la HOME esta escrita a mano en el codigo
     (src/app/page.tsx, arreglo `serviciosDestacados`), asi que NO sirve para
     afirmar que se carga desde el panel. Lo que si es dinamico es el ABM del
     panel y el catalogo de /reservar: eso es lo que se graba aca. */
  async servicios(g) {
    const p = g.page
    await L.login(p, 'admin')
    await p.goto(L.BASE + '/admin/servicios', { waitUntil: 'networkidle' })
    await L.limpiarUI(p)
    await p.waitForTimeout(700)
    g.marca('panel')
    await g.quieto(1.6)
    await g.scroll({ distancia: 700, duracion: 1.8 })
    await g.quieto(1.0)
    await g.scrollA(0, { duracion: 1.0 })

    await g.click('button:has-text("Nuevo Servicio")', { antes: 0.5, despues: 1.2 })
    g.marca('formulario')
    await g.escribir('input[placeholder="Ej: Corte Clásico"]', 'Ritual de Barba')
    await g.escribir('textarea', 'Toalla caliente, aceites y navaja.')
    await g.escribir('input[placeholder="0.00"]', '5200')
    await g.escribir('input[placeholder="30"]', '30')
    await g.quieto(0.8)
    await g.click('button:text-is("Crear")', { antes: 0.5, despues: 2.4 })
    g.marca('creado')
    await g.quieto(1.4)
    await g.scroll({ distancia: 650, duracion: 1.8 })
    await g.quieto(1.2)
    g.marca('corte')

    // Cambio de sesion. Este tramo NO entra en el reel: se salta con marcas.
    await p.context().clearCookies()
    await L.login(p, 'cliente')
    await p.goto(L.BASE + '/reservar', { waitUntil: 'networkidle' })
    await L.limpiarUI(p)
    await p.waitForTimeout(800)
    await p.evaluate(() => window.scrollTo(0, 430))
    await p.waitForTimeout(400)

    g.marca('reserva')
    await g.quieto(1.8)
    await g.scroll({ distancia: 520, duracion: 1.8 })
    await g.quieto(1.6)
    g.marca('fin')
  },

  /* 6 — Tienda: catalogo, filtros y stock. */
  async ecommerce(g) {
    const p = g.page
    await p.goto(L.BASE + '/tienda', { waitUntil: 'networkidle' })
    await L.limpiarUI(p)
    await p.waitForTimeout(800)
    g.marca('catalogo')
    await g.quieto(1.4)
    await g.scroll({ distancia: 720, duracion: 1.8 })
    await g.quieto(1.2)
    await g.scroll({ distancia: 780, duracion: 1.8 })
    await g.quieto(1.2)
    await g.scrollA(0, { duracion: 1.2 })
    g.marca('filtros')
    await g.click('button:has-text("Cabello")', { antes: 0.5, despues: 1.6 })
    await g.scroll({ distancia: 600, duracion: 1.6 })
    await g.quieto(1.6)
  },

  /* 7 — Carrito y checkout de invitado. */
  async carrito(g) {
    const p = g.page
    await p.goto(L.BASE + '/tienda', { waitUntil: 'networkidle' })
    await L.limpiarUI(p)
    await p.waitForTimeout(800)
    await g.scroll({ distancia: 520, duracion: 1.3 })
    await g.quieto(0.6)
    g.marca('agregar')
    await g.click('button:has-text("Agregar")', { antes: 0.5, despues: 2.0 })  // abre el carrito
    await g.quieto(1.4)
    await g.click('a:has-text("Ir al checkout")', { antes: 0.6, despues: 0.6 })
    await p.waitForURL('**/checkout', { timeout: 20000 }).catch(() => {})
    await p.waitForLoadState('networkidle').catch(() => {})
    await L.limpiarUI(p)
    await p.waitForTimeout(600)
    g.marca('checkout')
    await g.quieto(1.6)
    await g.scroll({ distancia: 520, duracion: 1.5 })
    await g.quieto(0.8)
    await g.escribir('input[placeholder="Nombre y apellido"]', 'Martín Gómez')
    await g.escribir('input[placeholder="Email (para el comprobante)"]', 'martin@ejemplo.com')
    await g.escribir('input[placeholder="WhatsApp / teléfono"]', '11 5555 5555')
    await g.quieto(0.8)
    g.marca('entrega')
    await g.scroll({ distancia: 640, duracion: 1.6 })
    await g.quieto(2.4)
  },

  /* 8 — Panel administrativo: recorrido general. */
  async panel(g) {
    const p = g.page
    await L.login(p, 'admin')
    await p.goto(L.BASE + '/admin/dashboard', { waitUntil: 'networkidle' })
    await L.limpiarUI(p)
    await p.waitForTimeout(700)
    g.marca('dashboard')
    await g.quieto(1.8)
    await g.scroll({ distancia: 700, duracion: 1.8 })
    await g.quieto(1.2)
    for (const ruta of ['/admin/turnos', '/admin/productos', '/admin/categorias', '/admin/resenas']) {
      await p.goto(L.BASE + ruta, { waitUntil: 'networkidle' })
      await L.limpiarUI(p)
      await p.waitForTimeout(600)
      g.marca(ruta.split('/').pop())
      await g.quieto(1.5)
      await g.scroll({ distancia: 820, duracion: 1.9 })
      await g.quieto(1.1)
    }
  },

  /* 9 — Agenda: lista + calendario semanal. */
  async agenda(g) {
    const p = g.page
    await L.login(p, 'admin')
    await p.goto(L.BASE + '/admin/turnos', { waitUntil: 'networkidle' })
    await L.limpiarUI(p)
    await p.waitForTimeout(700)
    g.marca('lista')
    await g.quieto(1.6)
    await g.scroll({ distancia: 1000, duracion: 2.2 })
    await g.quieto(1.4)
    await p.goto(L.BASE + '/admin/calendario', { waitUntil: 'networkidle' })
    await p.waitForFunction(() => !/Cargando/i.test(document.body.innerText), null, { timeout: 20000 }).catch(() => {})
    await L.limpiarUI(p)
    await p.waitForTimeout(900)
    g.marca('calendario')
    await g.quieto(2.0)
    await g.scroll({ distancia: 900, duracion: 2.2 })
    await g.quieto(1.8)
  },

  /* 10 — Gestion de barberos: alta real desde el panel. */
  async gestionBarberos(g) {
    const p = g.page
    await L.login(p, 'admin')
    await p.goto(L.BASE + '/admin/barberos', { waitUntil: 'networkidle' })
    await L.limpiarUI(p)
    await p.waitForTimeout(700)
    await g.quieto(1.5)
    await g.scroll({ distancia: 700, duracion: 1.8 })
    await g.quieto(1.0)
    await g.scrollA(0, { duracion: 1.0 })
    g.marca('equipo')
    await g.click('button:has-text("Nuevo Barbero")', { antes: 0.5, despues: 1.2 })
    g.marca('formulario')
    await g.escribir('input[placeholder="Leandro"]', 'Bruno')
    await g.escribir('div:has(> label:text-is("Apellido")) input', 'Alsina')
    await g.escribir('input[placeholder="Cortes clásicos y barba"]', 'Barber · Fades y color')
    await g.escribir('input[placeholder="Lunes, Martes, Sábado"]', 'Miércoles, Jueves, Viernes')
    await g.escribir('textarea', 'Fades limpios y mucha paciencia con el detalle.')
    await g.quieto(0.8)
    // Ojo: el boton de "Cerrar Sesion" del layout tambien es un submit, asi que
    // apuntamos al texto exacto del boton del formulario.
    await g.click('button:text-is("Crear")', { antes: 0.5, despues: 2.4 })
    g.marca('alta')
    await g.quieto(1.4)
    await g.scroll({ distancia: 900, duracion: 2.0 })
    await g.quieto(1.6)
  },

  /* 11 — Finanzas: KPIs, graficos y transacciones. */
  async finanzas(g) {
    const p = g.page
    await L.login(p, 'admin')
    await p.goto(L.BASE + '/admin/finanzas', { waitUntil: 'networkidle' })
    await L.limpiarUI(p)
    await p.waitForTimeout(1200)
    g.marca('kpis')
    await g.quieto(2.0)
    g.marca('grafico')
    await g.scroll({ distancia: 800, duracion: 2.0 })
    await g.quieto(2.0)
    g.marca('categorias')
    await g.scroll({ distancia: 900, duracion: 2.0 })
    await g.quieto(1.8)
    g.marca('transacciones')
    await g.click('button:has-text("Transacciones")', { antes: 0.5, despues: 1.8 })
    await g.scroll({ distancia: 800, duracion: 2.0 })
    await g.quieto(1.4)
  },

  /* 12 — Experiencia del cliente: panel propio y sus turnos. */
  async cliente(g) {
    const p = g.page
    await L.login(p, 'cliente')
    await p.goto(L.BASE + '/dashboard', { waitUntil: 'networkidle' })
    await L.limpiarUI(p)
    await p.waitForTimeout(700)
    g.marca('panel')
    await g.quieto(1.8)
    await g.scroll({ distancia: 700, duracion: 1.8 })
    await g.quieto(1.2)
    await p.goto(L.BASE + '/turnos', { waitUntil: 'networkidle' })
    await L.limpiarUI(p)
    await p.waitForTimeout(600)
    g.marca('misTurnos')
    await g.quieto(1.8)
    await g.scroll({ distancia: 900, duracion: 2.2 })
    await g.quieto(1.6)
  },

  /* 13 — Panel del barbero (acceso limitado). */
  async barberoPanel(g) {
    const p = g.page
    await L.login(p, 'barbero')
    await p.goto(L.BASE + '/barbero/calendario', { waitUntil: 'networkidle' })
    await L.limpiarUI(p)
    await p.waitForTimeout(700)
    g.marca('agenda')
    await g.quieto(2.0)
    await g.scroll({ distancia: 800, duracion: 2.0 })
    await g.quieto(1.4)
    await p.goto(L.BASE + '/barbero/clientes', { waitUntil: 'networkidle' })
    await L.limpiarUI(p)
    await p.waitForTimeout(600)
    g.marca('clientes')
    await g.quieto(1.8)
    await g.scroll({ distancia: 700, duracion: 1.8 })
    await g.quieto(1.4)
  },

  /* 14 — Autenticacion. */
  async auth(g) {
    const p = g.page
    await p.goto(L.BASE + '/login', { waitUntil: 'networkidle' })
    await L.limpiarUI(p)
    await p.waitForTimeout(700)
    await g.quieto(1.4)
    await g.escribir('input[name="email"]', 'cliente@finosbarbers.demo')
    await g.escribir('input[name="password"]', 'demo1234')
    await g.quieto(0.8)
    await g.click('button[type="submit"]', { antes: 0.4, despues: 0.3 })
    await p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }).catch(() => {})
    await p.waitForLoadState('networkidle').catch(() => {})
    await L.limpiarUI(p)
    await p.waitForTimeout(500)
    await g.quieto(2.2)
  },

  /* 15 — Cobros: sena del 40% y Mercado Pago conectado por OAuth. */
  async cobros(g) {
    const p = g.page
    await L.login(p, 'admin')
    await p.goto(L.BASE + '/admin/pagos', { waitUntil: 'networkidle' })
    await L.limpiarUI(p)
    await p.waitForTimeout(700)
    g.marca('cobros')
    await g.quieto(2.2)
    await g.scroll({ distancia: 600, duracion: 1.8 })
    await g.quieto(1.8)
    await p.goto(L.BASE + '/admin/turnos', { waitUntil: 'networkidle' })
    await L.limpiarUI(p)
    await p.waitForTimeout(600)
    g.marca('senas')
    await g.quieto(1.6)
    await g.scroll({ distancia: 700, duracion: 1.8 })
    await g.quieto(1.8)
  },
}

;(async () => {
  const pedidas = process.argv.slice(2)
  const lista = pedidas.length ? pedidas : Object.keys(escenas)
  L.ensureDir(OUT)
  const browser = await L.launch()
  await L.calentar(browser)   // que el server compile todo antes de grabar

  for (const nombre of lista) {
    const fn = escenas[nombre]
    if (!fn) { console.log('escena desconocida:', nombre); continue }
    const ctx = await L.newReelContext(browser, {})
    const page = await ctx.newPage()
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `cuadros-${nombre}-`))
    const g = new Grabador(page, tmp)
    const t0 = Date.now()
    let fallo = null
    try {
      await fn(g)
    } catch (e) {
      fallo = e.message.split('\n')[0]
    }
    const destino = path.join(OUT, `${nombre}.mp4`)
    try {
      g.render(destino)
      console.log(`${fallo ? '⚠' : '✓'} ${nombre.padEnd(17)} ${g.segundos.toFixed(1)}s de video · ${((Date.now() - t0) / 1000).toFixed(0)}s de captura${fallo ? ' · ' + fallo : ''}`)
    } catch (e) {
      console.log(`✗ ${nombre}: ${e.message.split('\n')[0]}`)
    }
    fs.rmSync(tmp, { recursive: true, force: true })
    await ctx.close()
  }

  await browser.close()
})()
