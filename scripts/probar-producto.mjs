/**
 * scripts/probar-producto.mjs
 *
 * Prueba la página de Retoque (04/11/2026) y sus páginas legales, con un
 * navegador de verdad. Solo lee: no crea ni borra nada (lo de la base va en
 * una transacción que se deshace).
 *
 * Qué prueba:
 *   1. "/" es la página del producto (ya no lleva a Roble), con su título y su
 *      imagen para compartir; Roble sigue igual, y los links viejos de la demo
 *      (/reservar, /tienda) siguen yendo a Roble.
 *   2. Los planes que muestra son los de la tabla `planes`: los mismos, en el
 *      mismo orden, con su precio (si PRODUCTO.mostrarPrecios) y su límite de
 *      profesionales.
 *   3. Sin WhatsApp cargado no hay botón de WhatsApp y el llamado es "Mirá la
 *      demo" (con WhatsApp, "Pedí tu muestra").
 *   4. Términos, privacidad y los botones de arrepentimiento y de baja: se ven,
 *      se llega desde el pie de la página, desde el login y desde el registro, y
 *      los botones dan un código sin registrarse. Los datos provisorios del
 *      titular se ven resaltados.
 *   5. La base no deja crear un local con esos nombres (0018).
 *   6. En celu y en compu, sin scroll de costado.
 *
 * Antes de correrla, la app tiene que estar levantada contra desarrollo
 * (npm run build && npx next start -H 127.0.0.1).
 */
import { createRequire } from 'module'
import { mkdirSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { leerEnv } from './lib/entorno.mjs'

const PROYECTO = resolve(import.meta.dirname, '..')
const APP = (process.env.APP_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '')
const CAPTURAS = resolve(PROYECTO, '_e2e_shots')

const requerir = createRequire(resolve(PROYECTO, 'package.json'))
const pg = requerir('pg')
function cargarPlaywright() {
  for (const lugar of [PROYECTO, resolve(PROYECTO, '../codigo-rojo-web')]) {
    try { return createRequire(resolve(lugar, 'package.json'))('playwright') } catch { /* el siguiente */ }
  }
  console.error('✗ No encuentro Playwright. Instalalo en codigo-rojo-web: npm ci && npx playwright install chromium')
  process.exit(1)
}
const { chromium } = cargarPlaywright()

const env = leerEnv(resolve(PROYECTO, '.env.local'))
if ((env.SUPABASE_ENTORNO || '').toLowerCase() !== 'desarrollo') {
  console.error('✗ .env.local no dice SUPABASE_ENTORNO=desarrollo: esta prueba solo corre en desarrollo.')
  process.exit(1)
}
try {
  await fetch(`${APP}/roble`, { signal: AbortSignal.timeout(10_000) })
} catch {
  console.error(`✗ La app no responde en ${APP}. Levantala primero (ver el comentario de arriba de este archivo).`)
  process.exit(1)
}

// Lo que dice src/lib/producto.ts (la prueba sigue a lo que cargue Nico).
const fuente = readFileSync(resolve(PROYECTO, 'src/lib/producto.ts'), 'utf8')
const NOMBRE = fuente.match(/nombre: '([^']+)'/)[1]
const MOSTRAR_PRECIOS = /mostrarPrecios: true/.test(fuente)
const HAY_WHATSAPP = /whatsapp: '\+?\d/.test(fuente)
const HAY_PROVISORIOS = /: '\[/.test(fuente)

const db = new pg.Client({ connectionString: env.SUPABASE_DB_URL })
try { await db.connect() } catch {
  console.error('✗ No me puedo conectar a la base de desarrollo. ¿Está prendido el Supabase local? Abrí Docker Desktop y corré: npx supabase start')
  process.exit(1)
}
const q = async (sql, p = []) => (await db.query(sql, p)).rows
mkdirSync(CAPTURAS, { recursive: true })
const navegador = await chromium.launch({ headless: true })

let fallas = 0
const anotar = (ok, texto, detalle = '') => { if (!ok) fallas++; console.log(`  ${ok ? '✓' : '✗'} ${texto}${!ok && detalle ? ` — ${detalle}` : ''}`) }
const titulo = (t) => console.log(`\n${t}`)
async function nuevaPagina(ancho = 390) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: ancho < 768 ? 844 : 900 } })
  return ctx.newPage()
}
const sinScrollDeCostado = (p) => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)

try {
  // ─── 1. La página del producto ──────────────────────────────────────────
  titulo('1. "/" es la página del producto, y Roble sigue siendo la demo')
  const p = await nuevaPagina(390)
  const r = await p.goto(`${APP}/`, { waitUntil: 'networkidle' })
  anotar(r.status() === 200 && new URL(p.url()).pathname === '/', '"/" ya no lleva a Roble', p.url())
  anotar((await p.title()).includes(NOMBRE), `el título de la pestaña dice ${NOMBRE}`, await p.title())
  anotar((await p.locator('h1').innerText()).length > 0 && (await p.locator('header svg[role="img"]').first().getAttribute('aria-label')) === NOMBRE,
    `el logo de arriba dibuja ${NOMBRE}`)
  const og = await p.locator('meta[property="og:image"]').getAttribute('content').catch(() => null)
  const ogImagen = og ? await fetch(og.replace(/^https?:\/\/[^/]+/, APP)) : null
  anotar(!!ogImagen && ogImagen.ok && ogImagen.headers.get('content-type') === 'image/png', 'tiene su imagen para compartir (Open Graph)', og ?? 'sin og:image')
  anotar((await p.getByText('Te armamos una muestra con el nombre de tu barbería', { exact: false }).count()) > 0, 'el gancho de la muestra gratis está a la vista')
  const demo = p.locator('main a[href="/roble"]')
  anotar((await demo.count()) > 0, 'hay links a la demo en vivo (/roble)')

  const roble = await nuevaPagina(390)
  await roble.goto(`${APP}/roble`, { waitUntil: 'networkidle' })
  anotar((await roble.title()).includes('Roble') && (await roble.locator('meta[property="og:image"]').count()) === 0,
    'Roble sigue igual, sin la imagen del producto')
  for (const viejo of ['/reservar', '/tienda']) {
    const v = await fetch(`${APP}${viejo}`, { redirect: 'manual' })
    anotar(v.status === 308 && v.headers.get('location')?.endsWith(`/roble${viejo}`), `el link viejo ${viejo} sigue yendo a Roble`, `${v.status} ${v.headers.get('location')}`)
  }

  // ─── 2. Los planes, de la tabla ─────────────────────────────────────────
  titulo('2. Los planes son los de la tabla `planes`')
  const planes = await q('select nombre, precio_usd, max_profesionales from public.planes order by orden')
  const tarjetas = p.locator('#planes article')
  anotar((await tarjetas.count()) === planes.length, `muestra ${planes.length} planes`, `muestra ${await tarjetas.count()}`)
  const nombres = await tarjetas.locator('h3').allInnerTexts()
  anotar(JSON.stringify(nombres) === JSON.stringify(planes.map((x) => x.nombre)), 'los mismos nombres, en el mismo orden', nombres.join(', '))
  const textos = await tarjetas.allInnerTexts()
  anotar(planes.every((pl, i) => MOSTRAR_PRECIOS ? textos[i]?.includes(`u$s ${pl.precio_usd}`) : !textos[i]?.includes('u$s')),
    MOSTRAR_PRECIOS ? 'cada uno con el precio de la tabla' : 'sin precios (PRODUCTO.mostrarPrecios apagado)')
  anotar(planes.every((pl, i) => textos[i]?.includes(pl.max_profesionales === null ? 'sin límite' : `Hasta ${pl.max_profesionales} profesionales`)),
    'y con su límite de profesionales')

  // ─── 3. El llamado según el WhatsApp ────────────────────────────────────
  titulo('3. El llamado principal, según haya WhatsApp del producto')
  const wa = await p.locator('a[href^="https://wa.me/"]').count()
  if (HAY_WHATSAPP) {
    anotar(wa > 0 && (await p.getByRole('link', { name: 'Pedí tu muestra' }).count()) > 0, 'con WhatsApp: "Pedí tu muestra" lleva al WhatsApp')
  } else {
    anotar(wa === 0, 'sin WhatsApp cargado: no hay ningún botón de WhatsApp')
    anotar((await p.locator('header a', { hasText: 'Mirá la demo' }).getAttribute('href')) === '/roble', 'y el llamado de arriba es "Mirá la demo"')
  }
  await p.screenshot({ path: resolve(CAPTURAS, 'producto-celu.png'), fullPage: true })

  // ─── 4. Lo legal ────────────────────────────────────────────────────────
  titulo('4. Términos, privacidad y los botones de arrepentimiento y de baja')
  const legales = { '/terminos': 'Términos y condiciones', '/privacidad': 'Política de privacidad', '/arrepentimiento': 'Botón de arrepentimiento', '/baja': 'Botón de baja' }
  for (const [ruta, h1] of Object.entries(legales)) {
    const pl = await nuevaPagina(390)
    const rr = await pl.goto(`${APP}${ruta}`, { waitUntil: 'networkidle' })
    anotar(rr.status() === 200 && (await pl.locator('h1').innerText()) === h1, `${ruta}: "${h1}"`)
    anotar(await sinScrollDeCostado(pl), `${ruta}, en el celu, sin scroll de costado`)
    await pl.context().close()
  }
  for (const ruta of Object.keys(legales)) {
    anotar((await p.locator(`footer a[href="${ruta}"]`).count()) > 0, `el pie de la página lleva a ${ruta}`)
  }
  for (const acceso of ['/login', '/register']) {
    const pa = await nuevaPagina(390)
    await pa.goto(`${APP}${acceso}`, { waitUntil: 'networkidle' })
    anotar((await pa.locator('a[href="/terminos"]').count()) > 0 && (await pa.locator('a[href="/privacidad"]').count()) > 0,
      `${acceso} lleva a los términos y a la privacidad`)
    await pa.context().close()
  }
  const t = await nuevaPagina(390)
  await t.goto(`${APP}/terminos`, { waitUntil: 'networkidle' })
  anotar(HAY_PROVISORIOS ? (await t.locator('mark').count()) > 0 : (await t.locator('mark').count()) === 0,
    HAY_PROVISORIOS ? 'los datos provisorios del titular se ven resaltados' : 'no queda ningún dato provisorio')
  await t.context().close()

  for (const [ruta, prefijo] of [['/baja', 'BAJ'], ['/arrepentimiento', 'ARR']]) {
    const pb = await nuevaPagina(390)
    await pb.goto(`${APP}${ruta}`, { waitUntil: 'networkidle' })
    await pb.fill('input[name="nombre"]', 'Carla Prueba')
    await pb.fill('input[name="mail"]', 'carla@example.com')
    await pb.fill('input[name="local"]', 'Barbería de Prueba')
    await pb.click('form button[type="submit"]')
    const estado = pb.locator('[role="status"]')
    await estado.waitFor({ timeout: 10_000 })
    const contenido = await estado.innerText()
    anotar(new RegExp(`RT-${prefijo}-\\d{6}-[A-Z0-9]{4}`).test(contenido) && contenido.includes('Carla Prueba') && contenido.includes('Barbería de Prueba'),
      `${ruta}: sin registrarse, da el código de la solicitud con sus datos`)
    if (ruta === '/baja') await pb.screenshot({ path: resolve(CAPTURAS, 'producto-baja-celu.png'), fullPage: true })
    await pb.context().close()
  }

  // ─── 5. La base: los nombres de las páginas nuevas, reservados ──────────
  titulo('5. La base no deja crear un local con esos nombres (0018)')
  for (const slug of ['terminos', 'privacidad', 'arrepentimiento', 'baja']) {
    await q('begin')
    let frenado = false
    try { await q(`insert into public.locales (slug, nombre) values ($1, 'Prueba')`, [slug]) } catch (e) { frenado = e.constraint === 'locales_slug_no_reservado' }
    await q('rollback')
    anotar(frenado, `"${slug}" no se puede usar`)
  }

  // ─── 6. Todos los tamaños ───────────────────────────────────────────────
  titulo('6. La página del producto, sin scroll de costado')
  for (const ancho of [320, 390, 768, 1024, 1280, 1920]) {
    const pt = await nuevaPagina(ancho)
    await pt.goto(`${APP}/`, { waitUntil: 'networkidle' })
    anotar(await sinScrollDeCostado(pt), `a ${ancho} px`)
    if (ancho === 1280) await pt.screenshot({ path: resolve(CAPTURAS, 'producto-compu.png'), fullPage: true })
    await pt.context().close()
  }
} catch (e) {
  fallas++
  console.error(`\n✗ La prueba se cortó: ${e.message}`)
} finally {
  await navegador.close()
  await db.end()
}

console.log(fallas === 0 ? `\n✓ La página de ${NOMBRE} anda.` : `\n✗ ${fallas} control(es) fallaron.`)
process.exit(fallas === 0 ? 0 : 1)
