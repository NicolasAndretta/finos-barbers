/**
 * scripts/probar-marca.mjs
 *
 * Prueba la marca de cada local (migración 0017): su color de acento y su logo,
 * con un navegador de verdad. Solo desarrollo: arma una muestra de prueba y
 * cuentas de prueba, y borra todo al final.
 *
 * Qué prueba:
 *   1. El dueño elige un color y sube su logo desde "Datos del local" (en el
 *      celu): se guardan, el logo en la carpeta del local y sin perder lo
 *      transparente.
 *   2. Su página y su panel toman ese color, y muestran su logo.
 *   3. Roble (y cualquier otro local) sigue en madera, con su nombre dibujado.
 *   4. Un color fuera de la paleta no entra, ni "a mano".
 *
 * Antes de correrla, la app tiene que estar levantada contra desarrollo
 * (npm run build && npx next start -H 127.0.0.1).
 */
import { createRequire } from 'module'
import { mkdirSync } from 'fs'
import { resolve } from 'path'
import { leerEnv } from './lib/entorno.mjs'

const PROYECTO = resolve(import.meta.dirname, '..')
const APP = (process.env.APP_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '')
const CAPTURAS = resolve(PROYECTO, '_e2e_shots')

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
const requerir = createRequire(resolve(PROYECTO, 'package.json'))
const pg = requerir('pg')
const sharp = requerir('sharp')
try {
  await fetch(`${APP}/roble`, { signal: AbortSignal.timeout(10_000) })
} catch {
  console.error(`✗ La app no responde en ${APP}. Levantala primero (ver el comentario de arriba de este archivo).`)
  process.exit(1)
}

const SB = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, '')
const PUBLICA = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const MAESTRA = env.SUPABASE_SERVICE_ROLE_KEY
async function pedir(metodo, ruta, { token, cuerpo, llave = PUBLICA } = {}) {
  const r = await fetch(`${SB}${ruta}`, {
    method: metodo,
    headers: { apikey: llave, Authorization: `Bearer ${token ?? llave}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
  const texto = await r.text()
  let datos = null
  try { datos = texto ? JSON.parse(texto) : null } catch { datos = texto }
  return { ok: r.ok, estado: r.status, datos, mensaje: datos?.message ?? '' }
}
const servidor = (metodo, ruta, cuerpo) => pedir(metodo, ruta, { llave: MAESTRA, cuerpo })

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
const SLUG = `marca-${sello}`
const cuentas = []
let fallas = 0
const anotar = (ok, texto, detalle = '') => { if (!ok) fallas++; console.log(`  ${ok ? '✓' : '✗'} ${texto}${!ok && detalle ? ` — ${detalle}` : ''}`) }
const titulo = (t) => console.log(`\n${t}`)

async function crearCuenta(nombre, apellido) {
  const email = `${nombre.toLowerCase()}.marca.${sello}@example.com`
  const clave = `Marca-${sello}-x`
  const alta = await servidor('POST', '/auth/v1/admin/users', { email, password: clave, email_confirm: true, user_metadata: { nombre, apellido } })
  if (!alta.datos?.id) throw new Error(`no pude crear la cuenta ${nombre} (${alta.estado})`)
  cuentas.push(alta.datos.id)
  const entrada = await pedir('POST', '/auth/v1/token?grant_type=password', { cuerpo: { email, password: clave } })
  return { id: alta.datos.id, email, clave, token: entrada.datos?.access_token }
}
async function nuevaPagina(celu) {
  const p = await (await navegador.newContext(celu ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 860 } })).newPage()
  p.on('dialog', (d) => d.accept())
  return p
}
async function entrar(p, cuenta, local) {
  await p.goto(`${APP}/login?local=${local}`, { waitUntil: 'networkidle' })
  await p.fill('#email', cuenta.email); await p.fill('#password', cuenta.clave)
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 }), p.click('button[type="submit"]')])
}
/** El color con el que el navegador pinta el botón principal de la portada, y el de un color de referencia. */
async function colorDelBoton(p, referencia) {
  return p.evaluate((ref) => {
    const boton = [...document.querySelectorAll('a')].find((a) => a.textContent?.trim() === 'Reservar turno')
    const muestra = document.createElement('div')
    muestra.style.background = ref
    document.body.appendChild(muestra)
    const esperado = getComputedStyle(muestra).backgroundColor
    muestra.remove()
    return { boton: boton ? getComputedStyle(boton).backgroundColor : null, esperado }
  }, referencia)
}
const VERDE_400 = 'oklch(76.5% 0.177 163.223)'
const MADERA_400 = '#c79c64'

try {
  const comercial = await crearCuenta('Mia', 'Comercial')
  const dueno = await crearCuenta('Teo', 'Dueño')
  await q(`insert into public.equipo (user_id, rol) values ($1, 'comercial')`, [comercial.id])
  const alta = await pedir('POST', '/rest/v1/rpc/crear_local', {
    token: comercial.token,
    cuerpo: { p_nombre: `Marca ${sello}`, p_slug: SLUG, p_rubro: 'barberia', p_datos: { whatsapp: '5491122223333' }, p_servicios: [{ nombre: 'Corte', descripcion: 'x', precio: 16000, duracion: 30 }], p_profesionales: [{ nombre: 'Ana', apellido: 'A' }] },
  })
  if (!alta.ok) throw new Error(`no pude crear la muestra: ${alta.mensaje}`)
  const L = await uno(`select id from public.locales where slug = $1`, [SLUG])
  await pedir('POST', '/rest/v1/rpc/sumar_dueno', { token: comercial.token, cuerpo: { p_local: L.id, p_usuario: dueno.id } })

  // ─── 1. Elegir el color y subir el logo, desde el celu ────────────────────
  titulo('1. El dueño elige su color y sube su logo (en el celu)')
  const logoPng = await sharp({ create: { width: 320, height: 120, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: Buffer.from('<svg width="320" height="120"><rect x="20" y="30" width="280" height="60" rx="12" fill="#ffffff"/></svg>') }])
    .png().toBuffer()
  const pc = await nuevaPagina(true)
  await entrar(pc, dueno, SLUG)
  await pc.goto(`${APP}/${SLUG}/admin/local`, { waitUntil: 'networkidle' })
  await pc.getByText('Verde', { exact: true }).click()
  await pc.locator('input[type="file"]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: logoPng })
  await pc.waitForFunction(() => document.querySelector('input[name="logo_url"]')?.value, null, { timeout: 30_000 })
  await pc.getByRole('button', { name: 'Guardar los datos' }).click()
  await pc.getByText('Datos guardados').waitFor({ timeout: 30_000 }).catch(() => {})
  const guardado = await uno(`select acento, logo_url from public.locales where id = $1`, [L.id])
  anotar(guardado.acento === 'verde', 'el color se guarda', guardado.acento)
  anotar(Boolean(guardado.logo_url?.startsWith(`${SB}/storage/v1/object/public/imagenes/${L.id}/`)), 'el logo va a la carpeta de ESE local', guardado.logo_url)
  const subido = guardado.logo_url ? Buffer.from(await (await fetch(guardado.logo_url)).arrayBuffer()) : null
  const meta = subido ? await sharp(subido).metadata() : null
  anotar(meta?.hasAlpha === true, 'y no pierde lo transparente', JSON.stringify({ formato: meta?.format, alfa: meta?.hasAlpha }))
  anotar(await pc.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), '"Datos del local", en el celu, sin scroll de costado')
  await pc.screenshot({ path: resolve(CAPTURAS, 'marca-datos-celu.png'), fullPage: true })

  // ─── 2. Su página y su panel ──────────────────────────────────────────────
  titulo('2. Su página y su panel toman su marca')
  const pv = await nuevaPagina(false)
  await pv.goto(`${APP}/${SLUG}`, { waitUntil: 'networkidle' })
  const enSuPagina = await colorDelBoton(pv, VERDE_400)
  anotar(Boolean(enSuPagina.boton) && enSuPagina.boton === enSuPagina.esperado, 'el botón "Reservar turno" de su portada es verde', JSON.stringify(enSuPagina))
  const logoArriba = pv.locator(`header img[src="${guardado.logo_url}"]`)
  anotar((await logoArriba.count()) > 0 && await logoArriba.first().isVisible(), 'arriba se ve su logo (no el nombre dibujado)')
  await pv.screenshot({ path: resolve(CAPTURAS, 'marca-portada.png'), fullPage: false })
  await pc.goto(`${APP}/${SLUG}/admin/dashboard`, { waitUntil: 'networkidle' })
  const enSuPanel = await pc.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-amber-400').trim())
  anotar(enSuPanel.includes('163.223'), 'y su panel también', enSuPanel)

  // ─── 3. Los demás locales, iguales ────────────────────────────────────────
  titulo('3. Los demás locales siguen igual')
  await pv.goto(`${APP}/roble`, { waitUntil: 'networkidle' })
  const enRoble = await colorDelBoton(pv, MADERA_400)
  anotar(Boolean(enRoble.boton) && enRoble.boton === enRoble.esperado, 'Roble sigue en madera', JSON.stringify(enRoble))
  anotar((await pv.locator('header svg[role="img"]').count()) > 0 && (await pv.locator('header img').count()) === 0, 'y con su nombre dibujado')

  // ─── 4. Fuera de la paleta ────────────────────────────────────────────────
  titulo('4. Un color fuera de la paleta no entra')
  const fucsia = await pedir('PATCH', `/rest/v1/locales?id=eq.${L.id}`, { token: dueno.token, cuerpo: { acento: 'fucsia' } })
  anotar(!(fucsia.ok && fucsia.datos?.length) && (await uno(`select acento from public.locales where id = $1`, [L.id])).acento === 'verde',
    'ni "a mano": la base solo acepta los de la paleta', fucsia.mensaje)
} catch (e) {
  fallas++
  console.error(`\n✗ La prueba se cortó: ${e.message}`)
} finally {
  await navegador.close()
  const local = await uno(`select id, logo_url from public.locales where slug = $1`, [SLUG])
  if (local) {
    if (local.logo_url) {
      const ruta = local.logo_url.split('/storage/v1/object/public/imagenes/')[1]
      if (ruta) await fetch(`${SB}/storage/v1/object/imagenes`, { method: 'DELETE', headers: { apikey: MAESTRA, Authorization: `Bearer ${MAESTRA}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [ruta] }) })
    }
    for (const t of ['turnos', 'horarios', 'ausencias', 'servicios', 'barberos', 'membresias']) {
      await q(`delete from public.${t} where local_id = $1`, [local.id])
    }
    await q(`delete from public.locales where id = $1`, [local.id])
  }
  if (cuentas.length) await q(`delete from public.equipo where user_id = any($1::uuid[])`, [cuentas])
  await db.end()
  for (const id of cuentas) await servidor('DELETE', `/auth/v1/admin/users/${id}`)
}

console.log(fallas === 0 ? '\n✓ La marca de cada local anda.' : `\n✗ ${fallas} control(es) fallaron.`)
process.exit(fallas === 0 ? 0 : 1)
