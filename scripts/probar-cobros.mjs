/**
 * scripts/probar-cobros.mjs
 *
 * Prueba la Fase 4a (cada local cobra en su propia cuenta de Mercado Pago) con
 * un navegador de verdad y un Mercado Pago de MENTIRA (scripts/mp-falso.mjs):
 * no sale nada a internet ni se mueve plata. Solo desarrollo: arma dos locales
 * activos de prueba (B con Mercado Pago, C sin) y cuentas de prueba, y borra
 * todo al final.
 *
 * Qué prueba:
 *   1. La dueña de B conecta su cuenta y el panel dice cuál es.
 *   2. Nadie más la ve ni la toca: el dueño de C no puede conectar la de B, y
 *      la comercial ve "conectado" pero no la cuenta ni los botones.
 *   3. Una reserva en B se cobra con la cuenta de B, y la seña queda pagada
 *      aunque el aviso de Mercado Pago no llegue (lo confirma la vuelta).
 *   4. Los intentos de dar algo por pagado sin pagarlo, frenados: número de
 *      pago inventado, pago de otra cuenta, monto distinto, pago pendiente,
 *      referencia de otro local, aviso al local equivocado.
 *   5. Una seña devuelta se ve como devuelta.
 *   6. Una compra en la tienda de B (sin cuenta): pagada, el stock baja y entra
 *      a la caja; devuelta, el stock vuelve y la salida queda en la caja.
 *   7. Dos compras de la última unidad: el stock nunca queda negativo, y la
 *      devolución repone solo lo que se descontó.
 *   8. C, sin Mercado Pago: la reserva ofrece solo transferencia, y la tienda
 *      es un catálogo con "Consultar por WhatsApp".
 *   9. Roble, en demo, nunca cobra (aunque tenga una cuenta conectada): el
 *      Mercado Pago de mentira no recibe ni un cobro.
 *  10. La conexión se renueva con 30 días de margen, y si vence y no se puede
 *      renovar, el local deja de ofrecer Mercado Pago.
 *  11. Desconectar.
 *  12. En celu y en compu, sin scroll de costado.
 *
 * Antes de correrla, la app tiene que estar levantada contra desarrollo y
 * apuntando al Mercado Pago de mentira (en Git Bash, parado en el proyecto):
 *   NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 npm run build
 *   NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 MP_CLIENT_ID=prueba MP_CLIENT_SECRET=prueba \
 *     MP_API_URL=http://127.0.0.1:3999 MP_AUTH_URL=http://127.0.0.1:3999/authorization \
 *     npx next start -H 127.0.0.1 -p 3000
 * y en otra terminal:
 *   node scripts/probar-cobros.mjs
 * (El Mercado Pago de mentira lo levanta esta prueba si no está corriendo.)
 */
import { createRequire } from 'module'
import { spawn } from 'child_process'
import { mkdirSync } from 'fs'
import { resolve } from 'path'
import { leerEnv } from './lib/entorno.mjs'

const PROYECTO = resolve(import.meta.dirname, '..')
const APP = (process.env.APP_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '')
const MP = 'http://127.0.0.1:3999'
const CAPTURAS = resolve(PROYECTO, '_e2e_shots')
const ROBLE = '00000000-0000-4000-a000-000000000001'

// ─── Preparación ─────────────────────────────────────────────────────────────

const env = leerEnv(resolve(PROYECTO, '.env.local'))
if ((env.SUPABASE_ENTORNO || '').toLowerCase() !== 'desarrollo') {
  console.error('✗ .env.local no dice SUPABASE_ENTORNO=desarrollo: esta prueba crea y borra datos, solo corre en desarrollo.')
  process.exit(1)
}
function cargarPlaywright() {
  for (const lugar of [PROYECTO, resolve(PROYECTO, '../codigo-rojo-web')]) {
    try { return createRequire(resolve(lugar, 'package.json'))('playwright') } catch { /* el siguiente */ }
  }
  console.error('✗ No encuentro Playwright. Instalalo en codigo-rojo-web: npm ci && npx playwright install chromium')
  process.exit(1)
}
const { chromium } = cargarPlaywright()
const pg = createRequire(resolve(PROYECTO, 'package.json'))('pg')
try {
  await fetch(`${APP}/roble`, { signal: AbortSignal.timeout(10_000) })
} catch {
  console.error(`✗ La app no responde en ${APP}. Levantala primero (ver el comentario de arriba de este archivo).`)
  process.exit(1)
}

// El Mercado Pago de mentira: si no está corriendo, lo levanta esta prueba.
const mpAnda = () => fetch(`${MP}/__control/salud`, { signal: AbortSignal.timeout(2_000) }).then((r) => r.ok).catch(() => false)
let mpPropio = null
if (!(await mpAnda())) {
  mpPropio = spawn(process.execPath, [resolve(PROYECTO, 'scripts/mp-falso.mjs')], { stdio: 'ignore' })
  for (let i = 0; i < 50 && !(await mpAnda()); i++) await new Promise((r) => setTimeout(r, 100))
  if (!(await mpAnda())) { console.error('✗ No pude levantar el Mercado Pago de mentira (scripts/mp-falso.mjs).'); process.exit(1) }
}
const mp = (ruta, cuerpo) => fetch(`${MP}${ruta}`, {
  method: cuerpo === undefined ? 'GET' : 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
}).then((r) => r.json())
await mp('/__control/reset', {})
const cobrosCreados = async () => (await mp('/__control/registro')).filter((r) => r.que === 'creó un cobro')

const SB = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, '')
const admin = (metodo, ruta, cuerpo) => fetch(`${SB}${ruta}`, {
  method: metodo,
  headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
  body: cuerpo ? JSON.stringify(cuerpo) : undefined,
}).then((r) => r.json().catch(() => ({})))

const db = new pg.Client({ connectionString: env.SUPABASE_DB_URL })
try { await db.connect() } catch {
  console.error('✗ No me puedo conectar a la base de desarrollo. ¿Está prendido el Supabase local? Abrí Docker Desktop y corré: npx supabase start')
  process.exit(1)
}
const q = async (sql, p = []) => (await db.query(sql, p)).rows
const uno = async (sql, p = []) => (await q(sql, p))[0]
mkdirSync(CAPTURAS, { recursive: true })
const navegador = await chromium.launch({ headless: true })

const sello = Date.now()
const SLUG_B = `cobros-b-${sello}`
const SLUG_C = `cobros-c-${sello}`
const cuentas = []
let localB = null
let localC = null
let robleConectado = false
let fallas = 0
const anotar = (ok, texto, detalle = '') => { if (!ok) fallas++; console.log(`  ${ok ? '✓' : '✗'} ${texto}${!ok && detalle ? ` — ${detalle}` : ''}`) }
const titulo = (t) => console.log(`\n${t}`)

async function crearCuenta(nombre) {
  const email = `${nombre}.${sello}@example.com`
  const clave = `Prueba-${sello}-x`
  const { id } = await admin('POST', '/auth/v1/admin/users', { email, password: clave, email_confirm: true, user_metadata: { nombre: 'Prueba', apellido: nombre } })
  cuentas.push(id)
  return { id, email, clave }
}
const PANTALLA = { compu: { viewport: { width: 1280, height: 860 } }, celu: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } }
const nuevaPagina = async (pantalla = 'compu') => (await navegador.newContext(PANTALLA[pantalla])).newPage()
const texto = async (p) => (await p.locator('body').innerText()).replace(/\s+/g, ' ')
const sinScrollDeCostado = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
const captura = (p, nombre) => p.screenshot({ path: resolve(CAPTURAS, `cobros-${nombre}.png`), fullPage: true })

/** Abre la dirección en cada ancho (celu chico, tablet, compu chica y grande) y devuelve en cuáles hay scroll de costado. */
async function anchosConScroll(p, url) {
  const malos = []
  for (const ancho of [320, 768, 1024, 1440]) {
    await p.setViewportSize({ width: ancho, height: 900 })
    await p.goto(url, { waitUntil: 'networkidle' })
    if (!(await sinScrollDeCostado(p))) malos.push(ancho)
  }
  return malos
}

/** Entra desde el login (con la página que pide) y espera salir del login. */
async function entrar(p, cuenta) {
  await p.fill('#email', cuenta.email); await p.fill('#password', cuenta.clave)
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 }), p.click('button[type="submit"]')])
}
async function entrarEn(p, cuenta, slug) {
  await p.goto(`${APP}/login?local=${slug}`, { waitUntil: 'networkidle' })
  await entrar(p, cuenta)
}

// Un lunes a más de 10 días, en la fecha de la PC (no en UTC: de noche cambia el día).
const lunes = (() => {
  const d = new Date(); d.setDate(d.getDate() + 10)
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()

/** Recorre la reserva hasta elegir el horario (en la página que ya está en /<local>/reservar). */
async function elegirTurno(p, { servicio, profesional, hora }) {
  await (servicio ? p.getByRole('button', { name: new RegExp(servicio) }) : p.locator('button:has-text("min")').first()).click()
  await (profesional ? p.getByRole('button', { name: new RegExp(profesional) }) : p.locator('button:has-text("✂️")').first()).click()
  await p.fill('input[type="date"]', lunes)
  const boton = hora ? p.getByRole('button', { name: hora, exact: true }) : p.getByRole('button', { name: /^\d\d:\d\d$/ }).first()
  await boton.click({ timeout: 30_000 })
}

/** Un aviso de Mercado Pago (de mentira) a la app, para el local que se diga. */
const avisar = (pagoId, local) => mp('/__control/avisar', { id: pagoId, aviso: `${APP}/api/mp/webhook?local=${local}` })
const senaDe = async (turnoId) => (await uno('select sena_estado, estado, mp_payment_id from public.turnos where id = $1', [turnoId]))

try {
  // ─── Los locales de prueba ─────────────────────────────────────────────────
  async function crearLocal(slug, nombre, whatsapp, alias) {
    const id = (await uno(
      `insert into public.locales (slug, nombre, estado, rubro, ciudad, direccion, whatsapp, alias_pago, sena_porcentaje)
       values ($1, $2, 'activo', 'barberia', 'Córdoba', 'Calle de Prueba 456', $3, $4, 30) returning id`, [slug, nombre, whatsapp, alias])).id
    const barbero = (await uno(`insert into public.barberos (nombre, apellido, dias, local_id) values ($1, 'Prueba', array['Lunes'], $2) returning id`, [`Beto ${nombre.slice(-1)}`, id])).id
    const servicio = (await uno(`insert into public.servicios (nombre, descripcion, precio, duracion_minutos, local_id) values ($1, 'Prueba', 10000, 30, $2) returning id`, [`Corte Cobros ${nombre.slice(-1)}`, id])).id
    await q(`insert into public.horarios (local_id, dia_semana, desde, hasta) select $1, d, '10:00', '20:00' from generate_series(1, 6) d`, [id])
    const producto = (await uno(`insert into public.productos (nombre, descripcion, precio, stock, local_id) values ($1, 'Prueba', 5000, 2, $2) returning id`, [`Pomada Cobros ${nombre.slice(-1)}`, id])).id
    return { id, barbero, servicio, producto }
  }
  const B = await crearLocal(SLUG_B, 'Barbería Cobros B', '5491100000001', 'cobros.b.prueba')
  const C = await crearLocal(SLUG_C, 'Barbería Cobros C', '5491100000002', 'cobros.c.prueba')
  localB = B.id
  localC = C.id
  const duenaB = await crearCuenta('duena-cobros-b')
  const duenoC = await crearCuenta('dueno-cobros-c')
  const comercial = await crearCuenta('comercial-cobros')
  const cliente = await crearCuenta('cliente-cobros')
  await q(`insert into public.membresias (user_id, local_id, rol) values ($1, $2, 'dueno'), ($3, $4, 'dueno')`, [duenaB.id, localB, duenoC.id, localC])
  await q(`insert into public.equipo (user_id, rol) values ($1, 'comercial')`, [comercial.id])

  // ─── 1. La dueña de B conecta su cuenta ────────────────────────────────────
  titulo('1. La dueña de B conecta SU Mercado Pago')
  const pB = await nuevaPagina()
  {
    await entrarEn(pB, duenaB, SLUG_B)
    await pB.goto(`${APP}/${SLUG_B}/admin/pagos`, { waitUntil: 'networkidle' })
    const antes = await texto(pB)
    if (antes.includes('Falta configurar')) throw new Error('La app no tiene MP_CLIENT_ID / MP_CLIENT_SECRET de prueba: levantala como dice el comentario de arriba de este archivo.')
    anotar(antes.includes('No conectado'), 'el panel arranca en "No conectado"')
    await pB.getByRole('link', { name: 'Conectar Mercado Pago' }).click()
    await pB.waitForURL((u) => u.origin !== new URL(APP).origin || u.searchParams.has('error'), { timeout: 30_000 })
    // Si la app mandara al Mercado Pago de verdad, se corta acá sin tocar nada.
    if (!pB.url().startsWith(MP)) throw new Error(`La app no apunta al Mercado Pago de mentira (fue a ${new URL(pB.url()).origin}). Levantala con MP_API_URL y MP_AUTH_URL.`)
    anotar(true, 'el botón lleva a autorizar a Mercado Pago (el de mentira)')
    await pB.getByRole('link', { name: 'Entrar como VENDEDORA_B' }).click()
    await pB.waitForURL((u) => u.pathname === `/${SLUG_B}/admin/pagos`, { timeout: 30_000 })
    const t = await texto(pB)
    anotar(new URL(pB.url()).searchParams.get('mp') === 'ok', 'vuelve al panel de B con "conectado"')
    anotar(t.includes('● Conectado') && t.includes('VENDEDORA_B') && t.includes('vendedora.b@prueba.mp'), 'el panel muestra con qué cuenta se conectó (apodo y mail)')
    anotar(t.includes('Vence') && /en 1[78]\d días/.test(t), 'y cuándo vence (en unos 180 días)')
    const fila = await uno('select mp_user_id, mp_nickname from public.mp_conexion where local_id = $1', [localB])
    anotar(fila?.mp_user_id === '900000001' && fila?.mp_nickname === 'VENDEDORA_B', 'la conexión quedó guardada para B, con la cuenta de la vendedora')
    const canje = (await mp('/__control/registro')).find((r) => r.que === 'canjeó un código')
    anotar(canje?.redirect_uri === `${APP}/api/mp/oauth/callback`, 'la dirección de vuelta es una sola, la de la plataforma', canje?.redirect_uri)
    const html = await pB.content()
    anotar(!html.includes('APP_USR-FALSO') && !html.includes('TG-FALSO'), 'el token no llega nunca al navegador')
    anotar(await sinScrollDeCostado(pB), 'el panel de Cobros, en compu, sin scroll de costado')
    await captura(pB, 'panel-conectado-compu')
    const malos = await anchosConScroll(pB, `${APP}/${SLUG_B}/admin/pagos`)
    anotar(malos.length === 0, 'y en 320, 768, 1024 y 1440 tampoco', `con scroll en ${malos.join(', ')}`)
    await pB.setViewportSize(PANTALLA.compu.viewport)
  }

  // ─── 2. Nadie más la ve ni la toca ─────────────────────────────────────────
  titulo('2. Nadie de otro local ve ni toca la cuenta de B')
  {
    const pC = await nuevaPagina('celu')
    await entrarEn(pC, duenoC, SLUG_C)
    await pC.goto(`${APP}/${SLUG_C}/admin/pagos`, { waitUntil: 'networkidle' })
    const t = await texto(pC)
    anotar(t.includes('No conectado') && !t.includes('VENDEDORA_B'), 'el panel de C dice "No conectado" y no muestra la cuenta de B')
    anotar(await sinScrollDeCostado(pC), 'el panel de Cobros, en celu, sin scroll de costado')
    await captura(pC, 'panel-sin-conectar-celu')
    const r = await pC.context().request.get(`${APP}/api/mp/oauth/connect?local=${SLUG_B}`, { maxRedirects: 0 })
    anotar(r.status() === 303 && (r.headers().location || '').includes(`/${SLUG_B}/admin/pagos?error=permiso`) && !(r.headers()['set-cookie'] || '').includes('mp_conexion_estado'),
      'el dueño de C no puede conectar una cuenta en B', `${r.status()} ${r.headers().location}`)
    await pC.context().close()

    const pCom = await nuevaPagina()
    await entrarEn(pCom, comercial, SLUG_B)
    await pCom.goto(`${APP}/${SLUG_B}/admin/pagos`, { waitUntil: 'networkidle' })
    const tc = await texto(pCom)
    anotar(tc.includes('● Conectado') && !tc.includes('VENDEDORA_B') && !tc.includes('vendedora.b@'), 'la comercial ve "Conectado", pero no la cuenta del dueño')
    anotar(await pCom.getByRole('button', { name: 'Desconectar' }).count() === 0 && await pCom.getByRole('link', { name: /Conectar/ }).count() === 0, 'y no tiene los botones de conectar ni desconectar')
    const rc = await pCom.context().request.get(`${APP}/api/mp/oauth/connect?local=${SLUG_B}`, { maxRedirects: 0 })
    anotar((rc.headers().location || '').includes('error=permiso'), 'si lo intenta igual, la frena')
    await pCom.context().close()
  }

  // ─── 3. Una reserva en B, cobrada con la cuenta de B ──────────────────────
  titulo('3. Una reserva en B se cobra con la cuenta de B')
  const pCli = await nuevaPagina()
  let turnoPagado = null
  let pagoTurno = null
  {
    await mp('/__control/config', { avisos: false }) // el aviso "no llega": tiene que confirmar la vuelta
    await pCli.goto(`${APP}/${SLUG_B}/reservar`, { waitUntil: 'networkidle' })
    await entrar(pCli, cliente)
    await elegirTurno(pCli, { servicio: 'Corte Cobros B', profesional: 'Beto B', hora: '11:00' })
    anotar(await pCli.getByText('Mercado Pago', { exact: true }).count() === 1, 'B ofrece pagar la seña con Mercado Pago')
    await pCli.getByText('Mercado Pago', { exact: true }).click()
    await pCli.getByRole('button', { name: /Pagar seña \$3\.000/ }).click()
    await pCli.waitForURL((u) => u.href.startsWith(`${MP}/checkout`), { timeout: 30_000 })
    const [cobro] = (await cobrosCreados()).slice(-1)
    turnoPagado = (cobro?.referencia || '').replace('turno:', '')
    anotar(cobro?.cuenta === 'vendedora-b', 'el cobro se armó con el token de la cuenta de B', cobro?.cuenta)
    anotar(/^turno:[0-9a-f-]{36}$/.test(cobro?.referencia || '') && cobro?.total === 3000, 'por la seña justa (30% de $10.000) y con la referencia del turno', JSON.stringify(cobro))
    anotar(cobro?.aviso === `${APP}/api/mp/webhook?local=${localB}`, 'el aviso de pago va a la app, con el local B')
    const antes = await uno('select sena_estado, mp_preference_id from public.turnos where id = $1', [turnoPagado])
    anotar(antes?.sena_estado === 'pendiente' && !!antes?.mp_preference_id, 'el turno espera el pago, con la referencia del cobro guardada (antes se perdía)')
    await pCli.getByRole('link', { name: 'Pagar (aprobado)' }).click()
    await pCli.waitForURL((u) => u.pathname === `/${SLUG_B}/turnos`, { timeout: 30_000 })
    pagoTurno = new URL(pCli.url()).searchParams.get('payment_id')
    const despues = await senaDe(turnoPagado)
    anotar(despues?.sena_estado === 'pagada' && despues?.estado === 'confirmado' && despues?.mp_payment_id === pagoTurno, 'sin aviso, la página de vuelta verificó el pago: seña pagada y turno confirmado')
    anotar((await texto(pCli)).includes('¡Seña pagada! Tu turno quedó confirmado.'), 'y el cliente lo ve')
    await mp('/__control/config', { avisos: true })
    const r = await avisar(pagoTurno, localB)
    anotar(r.respuesta === 200 && (await senaDe(turnoPagado))?.sena_estado === 'pagada', 'el aviso llega después, repetido: no pasa nada dos veces')
  }

  // ─── 4. Dar algo por pagado sin pagarlo ────────────────────────────────────
  titulo('4. Los intentos de dar algo por pagado sin pagarlo, frenados')
  {
    const turnoDePrueba = async (local, barbero, servicio, hora) => (await uno(
      `insert into public.turnos (local_id, cliente_id, barbero_id, servicio_id, fecha, hora, estado, metodo_pago, sena_monto, sena_estado)
       values ($1, $2, $3, $4, $5, $6, 'pendiente', 'mercadopago', 3000, 'pendiente') returning id`, [local, cliente.id, barbero, servicio, lunes, hora])).id
    // Cada intento con su propio turno: si uno fallara, no arrastra a los demás.
    let minutos = 12 * 60
    const turnoB = () => {
      const hora = `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}:00`
      minutos += 30
      return turnoDePrueba(localB, B.barbero, B.servicio, hora)
    }
    const sigue = async (id) => (await senaDe(id))?.sena_estado === 'pendiente'

    const T1 = await turnoB()
    await pCli.goto(`${APP}/${SLUG_B}/turnos?payment_id=123456789&status=approved&external_reference=turno:${T1}`, { waitUntil: 'networkidle' })
    const t = await texto(pCli)
    anotar(await sigue(T1) && !t.includes('Seña pagada') && !t.includes('Estamos confirmando'), 'la página de vuelta con un número de pago inventado: no marca nada ni muestra nada')
    await pCli.goto(`${APP}/${SLUG_B}/turnos?payment_id=&external_reference=${T1}&status=approved&collection_status=approved`, { waitUntil: 'networkidle' })
    anotar(await sigue(T1), 'con el formato viejo (sin número de pago): tampoco')

    const intentos = [
      ['un pago aprobado que cobró OTRA cuenta (aunque B lo pueda ver): no cuenta', { cuenta: 'otra-cuenta', estado: 'approved', monto: 3000, visiblePara: ['vendedora-b'] }],
      ['un pago de otra cuenta que B ni puede ver: no cuenta', { cuenta: 'otra-cuenta', estado: 'approved', monto: 3000 }],
      ['un pago de $1 por una seña de $3.000: no cuenta', { cuenta: 'vendedora-b', estado: 'approved', monto: 1 }],
      ['un pago pendiente (por ejemplo, en efectivo que nunca se pagó): no cuenta', { cuenta: 'vendedora-b', estado: 'pending', monto: 3000 }],
    ]
    for (const [que, pagoFalso] of intentos) {
      const T = await turnoB()
      const pago = await mp('/__control/pago', { ...pagoFalso, referencia: `turno:${T}` })
      await avisar(pago.id, localB)
      anotar(await sigue(T), que)
    }

    const TC = await turnoDePrueba(localC, C.barbero, C.servicio, '13:00:00')
    let pago = await mp('/__control/pago', { cuenta: 'vendedora-b', estado: 'approved', monto: 3000, referencia: `turno:${TC}` })
    await avisar(pago.id, localB)
    anotar(await sigue(TC), 'un pago de B con la referencia de un turno de C: el turno de C no se toca')

    const T2 = await turnoB()
    pago = await mp('/__control/pago', { cuenta: 'vendedora-b', estado: 'approved', monto: 3000, referencia: `turno:${T2}` })
    await avisar(pago.id, localC)
    anotar(await sigue(T2), 'el aviso de un pago de B mandado a C (que no tiene cuenta): no cuenta')
    await avisar(pago.id, localB)
    anotar((await senaDe(T2))?.sena_estado === 'pagada', 'y ese mismo pago, avisado a B, sí: el aviso solo alcanza para confirmar')
    const raro = await fetch(`${APP}/api/mp/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'payment', data: { id: pago.id } }) })
    anotar(raro.status === 200, 'un aviso sin local se descarta sin error')
  }

  // ─── 5. Una seña devuelta ──────────────────────────────────────────────────
  titulo('5. Una seña devuelta se ve como devuelta')
  {
    await mp('/__control/estado', { id: pagoTurno, estado: 'refunded' })
    await avisar(pagoTurno, localB)
    const s = await senaDe(turnoPagado)
    anotar(s?.sena_estado === 'devuelta' && s?.estado === 'confirmado', 'la seña queda "devuelta" y el turno no se toca (lo decide el dueño)')
    await pB.goto(`${APP}/${SLUG_B}/admin/turnos`, { waitUntil: 'networkidle' })
    anotar((await texto(pB)).includes('Seña devuelta'), 'la dueña lo ve en Turnos')
  }

  // ─── 6. La tienda de B, comprando sin cuenta ───────────────────────────────
  titulo('6. Una compra en la tienda de B (sin cuenta, en el celu)')
  {
    const pG = await nuevaPagina('celu')
    await pG.goto(`${APP}/${SLUG_B}/tienda`, { waitUntil: 'networkidle' })
    await pG.getByRole('button', { name: 'Agregar' }).first().click()
    await pG.goto(`${APP}/${SLUG_B}/checkout`, { waitUntil: 'networkidle' })
    await pG.getByPlaceholder('Nombre y apellido').fill('Invitada Prueba')
    await pG.getByPlaceholder('Email (para el comprobante)').fill(`invitada.${sello}@example.com`)
    await pG.getByRole('button', { name: 'Pagar con Mercado Pago' }).click()
    await pG.waitForURL((u) => u.href.startsWith(`${MP}/checkout`), { timeout: 30_000 })
    const [cobro] = (await cobrosCreados()).slice(-1)
    const pedidoId = (cobro?.referencia || '').replace('pedido:', '')
    anotar(cobro?.cuenta === 'vendedora-b' && cobro?.total === 5000 && /^pedido:/.test(cobro?.referencia || ''), 'el cobro se armó con la cuenta de B, por $5.000')
    await pG.getByRole('link', { name: 'Pagar (aprobado)' }).click()
    await pG.waitForURL((u) => u.pathname === `/${SLUG_B}/checkout/success`, { timeout: 30_000 })
    anotar((await texto(pG)).includes('¡Pago exitoso!'), 'vuelve a "¡Pago exitoso!"')
    const pedido = await uno('select estado, mp_payment_id from public.pedidos where id = $1', [pedidoId])
    const stock = async () => (await uno('select stock from public.productos where id = $1', [B.producto])).stock
    anotar(pedido?.estado === 'pagado', 'el pedido quedó pagado')
    anotar(await stock() === 1, 'el stock bajó de 2 a 1 (antes nunca bajaba)')
    const caja = await q(`select tipo, monto::int as monto, created_by from public.transacciones where pedido_id = $1 order by created_at`, [pedidoId])
    anotar(caja.length === 1 && caja[0].tipo === 'ingreso' && caja[0].monto === 5000 && caja[0].created_by === null, 'y la venta entró a la caja de B (antes las de invitados se perdían)', JSON.stringify(caja))
    anotar(await sinScrollDeCostado(pG), 'la vuelta, en celu, sin scroll de costado')
    await captura(pG, 'tienda-pago-exitoso-celu')

    await mp('/__control/estado', { id: pedido.mp_payment_id, estado: 'refunded' })
    await avisar(pedido.mp_payment_id, localB)
    const devuelto = await uno('select estado from public.pedidos where id = $1', [pedidoId])
    const caja2 = await q(`select tipo from public.transacciones where pedido_id = $1 order by created_at`, [pedidoId])
    anotar(devuelto?.estado === 'cancelado' && await stock() === 2 && caja2.map((c) => c.tipo).join(',') === 'ingreso,egreso', 'devuelto: pedido cancelado, el stock vuelve a 2 y la salida queda en la caja')

    await pG.goto(`${APP}/${SLUG_B}/checkout/success?payment_id=999999&status=approved&external_reference=pedido:${pedidoId}`, { waitUntil: 'networkidle' })
    anotar((await texto(pG)).includes('No encontramos un pago para mostrar'), 'la vuelta con un número de pago inventado no muestra ningún pedido como pagado')
    await pG.context().close()
  }

  // ─── 7. La última unidad, comprada dos veces ───────────────────────────────
  titulo('7. Dos compras de la última unidad')
  {
    await q('update public.productos set stock = 1 where id = $1', [B.producto])
    const pedidoDe = async () => {
      const id = (await uno(`insert into public.pedidos (local_id, estado, tipo_entrega, total, cliente_nombre, cliente_email) values ($1, 'pendiente', 'retiro', 5000, 'Prueba', 'x@example.com') returning id`, [localB])).id
      await q(`insert into public.items_pedido (local_id, pedido_id, producto_id, nombre, precio, cantidad) values ($1, $2, $3, 'Pomada', 5000, 1)`, [localB, id, B.producto])
      return id
    }
    const P1 = await pedidoDe()
    const P2 = await pedidoDe()
    const pago1 = await mp('/__control/pago', { cuenta: 'vendedora-b', estado: 'approved', monto: 5000, referencia: `pedido:${P1}` })
    const pago2 = await mp('/__control/pago', { cuenta: 'vendedora-b', estado: 'approved', monto: 5000, referencia: `pedido:${P2}` })
    await avisar(pago1.id, localB)
    await avisar(pago2.id, localB)
    const stock = (await uno('select stock from public.productos where id = $1', [B.producto])).stock
    const [e1, e2] = [await uno('select estado from public.pedidos where id = $1', [P1]), await uno('select estado from public.pedidos where id = $1', [P2])]
    anotar(e1?.estado === 'pagado' && e2?.estado === 'pagado' && stock === 0, 'los dos quedan pagados (la plata entró) y el stock queda en 0, nunca negativo')
    await mp('/__control/estado', { id: pago2.id, estado: 'refunded' })
    await avisar(pago2.id, localB)
    const despues = (await uno('select stock from public.productos where id = $1', [B.producto])).stock
    anotar(despues === 0, 'al devolver el que no tenía stock, no se inventa una unidad (repone solo lo que se descontó)', `stock ${despues}`)
  }

  // ─── 8. C, sin Mercado Pago ────────────────────────────────────────────────
  titulo('8. C, sin Mercado Pago (en el celu)')
  {
    const p = await nuevaPagina('celu')
    await p.goto(`${APP}/${SLUG_C}/reservar`, { waitUntil: 'networkidle' })
    await entrar(p, cliente)
    await elegirTurno(p, { servicio: 'Corte Cobros C', profesional: 'Beto C', hora: '11:00' })
    anotar(await p.getByText('Mercado Pago', { exact: true }).count() === 0 && await p.getByText('Transferencia', { exact: true }).count() === 1, 'la reserva ofrece solo transferencia')
    anotar(await p.getByRole('button', { name: 'Confirmar reserva' }).count() === 1, 'y el botón dice "Confirmar reserva"')
    await p.goto(`${APP}/${SLUG_C}/tienda`, { waitUntil: 'networkidle' })
    const enlace = p.getByRole('link', { name: 'Consultar por WhatsApp' })
    const href = (await enlace.count()) ? await enlace.first().getAttribute('href') : ''
    anotar(href.startsWith('https://wa.me/5491100000002') && decodeURIComponent(href).includes('Pomada Cobros C'), 'la tienda es un catálogo: cada producto se consulta por WhatsApp, con el mensaje escrito')
    anotar(await p.getByRole('button', { name: 'Agregar' }).count() === 0 && await p.locator('button[aria-label^="Carrito"]').count() === 0, 'sin "Agregar" ni carrito')
    anotar(await sinScrollDeCostado(p), 'la tienda-catálogo, en celu, sin scroll de costado')
    await captura(p, 'tienda-catalogo-celu')
    const malos = await anchosConScroll(p, `${APP}/${SLUG_C}/tienda`)
    anotar(malos.length === 0, 'y en 320, 768, 1024 y 1440 tampoco', `con scroll en ${malos.join(', ')}`)
    await p.setViewportSize(PANTALLA.celu.viewport)
    await p.goto(`${APP}/${SLUG_C}/checkout`, { waitUntil: 'networkidle' })
    anotar((await texto(p)).includes('Esta tienda todavía no cobra online'), 'y el checkout explica que no cobra online')
    await p.context().close()
  }

  // ─── 9. Roble, en demo, nunca cobra ────────────────────────────────────────
  titulo('9. Roble está en demo: se muestra el pago, pero nunca se cobra')
  {
    // Aunque tenga una cuenta conectada (el token ni se llega a usar).
    await q(`insert into public.mp_conexion (local_id, mp_user_id, mp_nickname, access_token, expires_at) values ($1, '900000002', 'VENDEDOR_C', 'APP_USR-FALSO-no-se-usa', now() + interval '100 days')`, [ROBLE])
    robleConectado = true
    const cobrosAntes = (await cobrosCreados()).length
    const pedidosAntes = (await uno('select count(*)::int as n from public.pedidos where local_id = $1', [ROBLE])).n
    const p = await nuevaPagina('celu')
    await p.goto(`${APP}/roble/reservar`, { waitUntil: 'networkidle' })
    await entrar(p, cliente)
    await elegirTurno(p, {})
    anotar((await texto(p)).includes('(en la muestra no se cobra)'), 'la opción de Mercado Pago avisa que en la muestra no se cobra')
    await p.getByText('Mercado Pago', { exact: true }).click()
    await p.getByRole('button', { name: /Pagar seña/ }).click()
    await p.getByText('Es una muestra: no se cobró nada').waitFor({ timeout: 30_000 })
    anotar((await texto(p)).includes('la plata te cae directo en tu cuenta'), 'la reserva termina en la pantalla de muestra, que explica cómo sería')
    anotar(await sinScrollDeCostado(p), 'en celu, sin scroll de costado')
    await captura(p, 'demo-reserva-muestra-celu')
    await p.goto(`${APP}/roble/tienda`, { waitUntil: 'networkidle' })
    await p.getByRole('button', { name: 'Agregar' }).first().click()
    await p.goto(`${APP}/roble/checkout`, { waitUntil: 'networkidle' })
    anotar((await texto(p)).includes('Es una muestra: no se cobra nada'), 'el checkout de la demo avisa que no se cobra')
    await p.getByRole('button', { name: 'Pagar con Mercado Pago' }).click()
    await p.getByText('¡Así se compra!').waitFor({ timeout: 30_000 })
    anotar(true, 'y termina en "¡Así se compra!"')
    await captura(p, 'demo-tienda-muestra-celu')
    anotar((await cobrosCreados()).length === cobrosAntes, 'el Mercado Pago de mentira no recibió ningún cobro de la demo')
    anotar((await uno('select count(*)::int as n from public.pedidos where local_id = $1', [ROBLE])).n === pedidosAntes, 'y no quedó ningún pedido de la muestra')
    await p.context().close()
  }

  // ─── 10. Renovación y vencimiento ─────────────────────────────────────────
  titulo('10. La conexión se renueva con margen, y si vence deja de cobrar')
  {
    const tokenAntes = (await uno('select access_token from public.mp_conexion where local_id = $1', [localB])).access_token
    await q(`update public.mp_conexion set expires_at = now() + interval '10 days' where local_id = $1`, [localB])
    const pago = await mp('/__control/pago', { cuenta: 'vendedora-b', estado: 'pending', monto: 1, referencia: `turno:${turnoPagado}` })
    await avisar(pago.id, localB) // cualquier uso de la cuenta la renueva
    const ahora = await uno(`select access_token, expires_at > now() + interval '170 days' as larga from public.mp_conexion where local_id = $1`, [localB])
    anotar(ahora.access_token !== tokenAntes && ahora.larga, 'a 10 días de vencer, al usarla se renovó sola (180 días más)')

    await mp('/__control/config', { fallarRenovacion: true })
    await q(`update public.mp_conexion set expires_at = now() - interval '1 day' where local_id = $1`, [localB])
    await pCli.goto(`${APP}/${SLUG_B}/reservar`, { waitUntil: 'networkidle' })
    await elegirTurno(pCli, { servicio: 'Corte Cobros B', profesional: 'Beto B', hora: '17:00' })
    anotar(await pCli.getByText('Mercado Pago', { exact: true }).count() === 0, 'vencida y sin poder renovarse: B deja de ofrecer Mercado Pago')
    await pB.goto(`${APP}/${SLUG_B}/admin/pagos`, { waitUntil: 'networkidle' })
    anotar((await texto(pB)).includes('La conexión venció'), 'y el panel pide volver a conectar')
    await mp('/__control/config', { fallarRenovacion: false })
  }

  // ─── 11. Desconectar ───────────────────────────────────────────────────────
  titulo('11. La dueña desconecta su cuenta')
  {
    await pB.getByRole('button', { name: 'Desconectar' }).click()
    await pB.getByText('○ No conectado').waitFor({ timeout: 30_000 })
    anotar(!(await uno('select 1 as hay from public.mp_conexion where local_id = $1', [localB])), 'la conexión de B se borró')
    anotar(!!(await uno('select 1 as hay from public.mp_conexion where local_id = $1', [ROBLE])), 'y la de otro local sigue en su lugar')
  }
  await pB.context().close()
  await pCli.context().close()
} catch (e) {
  fallas++
  console.error(`\n✗ La prueba se cortó: ${e.message.split('\n')[0]}`)
} finally {
  // Limpieza: todo lo de los locales de prueba, lo de las cuentas de prueba en
  // Roble, la conexión de mentira de Roble y las cuentas.
  await navegador.close()
  const ids = cuentas.filter(Boolean)
  for (const local of [localB, localC].filter(Boolean)) {
    for (const tabla of ['mp_conexion', 'transacciones', 'items_pedido', 'pedidos', 'horarios', 'ausencias', 'turnos', 'membresias', 'resenas', 'productos', 'servicios', 'barberos', 'categorias']) {
      await db.query(`delete from public.${tabla} where local_id = $1`, [local])
    }
  }
  if (robleConectado) await db.query(`delete from public.mp_conexion where local_id = $1 and access_token = 'APP_USR-FALSO-no-se-usa'`, [ROBLE])
  if (ids.length) {
    await db.query('delete from public.turnos where cliente_id = any($1::uuid[])', [ids])
    await db.query('delete from public.membresias where user_id = any($1::uuid[])', [ids])
    await db.query('delete from public.equipo where user_id = any($1::uuid[])', [ids])
  }
  for (const local of [localB, localC].filter(Boolean)) await db.query('delete from public.locales where id = $1', [local])
  await db.end()
  for (const id of ids) await admin('DELETE', `/auth/v1/admin/users/${id}`)
  if (mpPropio) mpPropio.kill()
}

console.log(fallas === 0 ? `\n✓ Cobros: todo bien. Capturas en _e2e_shots/` : `\n✗ Cobros: ${fallas} control(es) fallaron.`)
process.exit(fallas === 0 ? 0 : 1)
