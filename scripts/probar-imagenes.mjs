/**
 * scripts/probar-imagenes.mjs
 *
 * Prueba las fotos de la Fase 4b con un navegador de verdad. Solo desarrollo:
 * arma dos locales activos de prueba (B y C) con sus dueños, y al final borra
 * todo, filas y archivos.
 *
 * Qué prueba:
 *   1. Una foto de cámara de 6000×4000 (8 MB, con la ubicación GPS adentro),
 *      subida desde el panel en el celu: llega achicada a 1600 px, en WebP,
 *      liviana, SIN datos ocultos, y en la carpeta del local (su id).
 *   2. Al cambiar la foto, la vieja se borra; al quitarla, también.
 *   3. El servidor rechaza lo que no es una foto aunque se mande sin pasar por
 *      la pantalla: un SVG con código, un HTML disfrazado, un archivo vacío,
 *      una foto rota, un archivo enorme.
 *   4. Nadie sube a la carpeta de otro local; sin sesión, tampoco; desde otro
 *      sitio, tampoco.
 *   5. Pegar el link de una foto de otro sitio (llamando a la acción a mano):
 *      rechazado.
 *   6. El tope del local: lleno a propósito, la foto siguiente se rechaza con
 *      un aviso claro.
 *   7. La foto de un profesional: sube y reemplaza igual.
 *   8. El formulario con la foto, sin scroll de costado de 320 a 1440.
 *
 * Antes de correrla, la app tiene que estar levantada contra desarrollo:
 *   npm run build
 *   npx next start -H 127.0.0.1 -p 3000
 * y en otra terminal:
 *   node scripts/probar-imagenes.mjs
 */
import { createRequire } from 'module'
import { mkdirSync } from 'fs'
import { resolve } from 'path'
import { leerEnv } from './lib/entorno.mjs'

const PROYECTO = resolve(import.meta.dirname, '..')
const APP = (process.env.APP_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '')
const CAPTURAS = resolve(PROYECTO, '_e2e_shots')

// ─── Preparación ─────────────────────────────────────────────────────────────

const env = leerEnv(resolve(PROYECTO, '.env.local'))
if ((env.SUPABASE_ENTORNO || '').toLowerCase() !== 'desarrollo') {
  console.error('✗ .env.local no dice SUPABASE_ENTORNO=desarrollo: esta prueba crea y borra datos, solo corre en desarrollo.')
  process.exit(1)
}
const requerir = createRequire(resolve(PROYECTO, 'package.json'))
function cargarPlaywright() {
  for (const lugar of [PROYECTO, resolve(PROYECTO, '../codigo-rojo-web')]) {
    try { return createRequire(resolve(lugar, 'package.json'))('playwright') } catch { /* el siguiente */ }
  }
  console.error('✗ No encuentro Playwright. Instalalo en codigo-rojo-web: npm ci && npx playwright install chromium')
  process.exit(1)
}
const { chromium } = cargarPlaywright()
const pg = requerir('pg')
const sharp = requerir('sharp')
try {
  await fetch(`${APP}/roble`, { signal: AbortSignal.timeout(10_000) })
} catch {
  console.error(`✗ La app no responde en ${APP}. Levantala primero (ver el comentario de arriba de este archivo).`)
  process.exit(1)
}

const SB = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, '')
const LLAVE = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }
const admin = (metodo, ruta, cuerpo) => fetch(`${SB}${ruta}`, {
  method: metodo, headers: { ...LLAVE, 'Content-Type': 'application/json' }, body: cuerpo ? JSON.stringify(cuerpo) : undefined,
}).then((r) => r.json().catch(() => ({})))
/** Los archivos de la carpeta de un local en el bucket. */
const archivosDe = async (localId) => {
  const lista = await admin('POST', '/storage/v1/object/list/imagenes', { prefix: localId, limit: 1000, offset: 0 })
  return (Array.isArray(lista) ? lista : []).filter((a) => a.id).map((a) => `${localId}/${a.name}`)
}
const borrarArchivos = async (rutas) => { if (rutas.length) await admin('DELETE', '/storage/v1/object/imagenes', { prefixes: rutas }) }
const subirDirecto = (ruta, buffer) => fetch(`${SB}/storage/v1/object/imagenes/${ruta}`, {
  method: 'POST', headers: { ...LLAVE, 'Content-Type': 'image/webp', 'x-upsert': 'true' }, body: buffer,
})
const rutaDe = (url) => (url || '').split('/storage/v1/object/public/imagenes/')[1] ?? null

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
const SLUG_B = `fotos-b-${sello}`
const SLUG_C = `fotos-c-${sello}`
const cuentas = []
let localB = null
let localC = null
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
async function entrarEn(p, cuenta, slug) {
  await p.goto(`${APP}/login?local=${slug}`, { waitUntil: 'networkidle' })
  await p.fill('#email', cuenta.email); await p.fill('#password', cuenta.clave)
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 }), p.click('button[type="submit"]')])
}
/** Espera hasta que la base diga lo esperado (lo que se guarda desde la pantalla tarda un instante). */
async function esperar(consulta, cumple, ms = 15_000) {
  const hasta = Date.now() + ms
  let valor
  do { valor = await consulta(); if (cumple(valor)) return valor; await new Promise((r) => setTimeout(r, 300)) } while (Date.now() < hasta)
  return valor
}
const tieneGPS = (exif) => !!exif && (exif.includes(Buffer.from([0x88, 0x25])) || exif.includes(Buffer.from([0x25, 0x88])))

// Las fotos de prueba.
const ruido = await sharp({ create: { width: 6000, height: 4000, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 18 } } }).png().toBuffer()
const FOTO_CAMARA = await sharp({ create: { width: 6000, height: 4000, channels: 3, background: { r: 120, g: 90, b: 60 } } })
  .composite([{ input: ruido, blend: 'overlay' }])
  .jpeg({ quality: 90 })
  .withExif({ IFD0: { Make: 'CamaraDePrueba', Model: 'Modelo 1' }, IFD3: { GPSLatitudeRef: 'S', GPSLatitude: '34/1 36/1 0/1', GPSLongitudeRef: 'W', GPSLongitude: '58/1 22/1 0/1' } })
  .toBuffer()
const FOTO_CHICA = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 30, g: 120, b: 200 } } }).png().toBuffer()
const FOTO_CHICA_JPG = await sharp({ create: { width: 900, height: 700, channels: 3, background: { r: 200, g: 60, b: 40 } } }).jpeg().toBuffer()

/** Subir directo a /api/imagenes, sin pasar por la pantalla (con la sesión de la página, o sin). */
const subirPorApi = (contexto, slug, archivo, encabezados = { Origin: APP }) => contexto.request.post(`${APP}/api/imagenes`, {
  multipart: { local: slug, archivo }, headers: encabezados, failOnStatusCode: false,
})

try {
  // ─── Los locales de prueba ─────────────────────────────────────────────────
  async function crearLocal(slug, nombre) {
    const id = (await uno(`insert into public.locales (slug, nombre, estado, rubro, ciudad) values ($1, $2, 'activo', 'barberia', 'Mendoza') returning id`, [slug, nombre])).id
    const producto = (await uno(`insert into public.productos (nombre, descripcion, precio, stock, local_id) values ($1, 'Prueba', 4000, 3, $2) returning id`, [`Pomada ${nombre}`, id])).id
    const barbero = (await uno(`insert into public.barberos (nombre, apellido, dias, local_id) values ('Fede', 'Fotos', array['Lunes'], $1) returning id`, [id])).id
    return { id, producto, barbero }
  }
  const B = await crearLocal(SLUG_B, 'Fotos B')
  const C = await crearLocal(SLUG_C, 'Fotos C')
  localB = B.id
  localC = C.id
  const duenaB = await crearCuenta('duena-fotos-b')
  const duenoC = await crearCuenta('dueno-fotos-c')
  await q(`insert into public.membresias (user_id, local_id, rol) values ($1, $2, 'dueno'), ($3, $4, 'dueno')`, [duenaB.id, localB, duenoC.id, localC])
  const fotoDelProducto = async () => (await uno('select imagen_url from public.productos where id = $1', [B.producto])).imagen_url

  // ─── 1. Una foto de cámara, desde el celu ──────────────────────────────────
  titulo('1. Una foto de cámara de 8 MB con GPS, subida desde el celu')
  const p = await nuevaPagina('celu')
  let primera = null
  {
    const original = await sharp(FOTO_CAMARA).metadata()
    anotar(original.width === 6000 && tieneGPS(original.exif) && FOTO_CAMARA.length > 5 * 1024 * 1024,
      `la foto de prueba es como la de un celu: 6000×4000, ${(FOTO_CAMARA.length / 1024 / 1024).toFixed(1)} MB y con la ubicación GPS adentro`)
    await entrarEn(p, duenaB, SLUG_B)
    await p.goto(`${APP}/${SLUG_B}/admin/productos`, { waitUntil: 'networkidle' })
    await p.getByRole('button', { name: 'Editar' }).first().click()
    await p.locator('input[aria-label="Imagen del producto"]').setInputFiles({ name: 'IMG_0001.jpg', mimeType: 'image/jpeg', buffer: FOTO_CAMARA })
    await p.locator('img[alt="Vista previa"]').waitFor({ timeout: 60_000 })
    const vista = await p.locator('img[alt="Vista previa"]').getAttribute('src')
    anotar((vista || '').includes(`/imagenes/${localB}/`), 'subió a la carpeta del local (su id), y el panel la muestra')
    anotar(await sinScrollDeCostado(p), 'el formulario con la foto, en celu, sin scroll de costado')
    await p.screenshot({ path: resolve(CAPTURAS, 'imagenes-producto-celu.png'), fullPage: true })
    await p.getByRole('button', { name: 'Actualizar' }).click()
    primera = await esperar(fotoDelProducto, (v) => !!v)
    anotar(primera === vista, 'al guardar, el producto quedó con esa foto')
    const guardada = Buffer.from(await (await fetch(primera)).arrayBuffer())
    const meta = await sharp(guardada).metadata()
    anotar(meta.format === 'webp', `se guardó en WebP (${meta.format})`)
    anotar(Math.max(meta.width, meta.height) <= 1600, `achicada a 1600 px de lado como mucho (${meta.width}×${meta.height})`)
    anotar(guardada.length < 600 * 1024, `liviana: ${Math.round(guardada.length / 1024)} KB (la original pesaba ${Math.round(FOTO_CAMARA.length / 1024 / 1024)} MB)`)
    anotar(!meta.exif && !tieneGPS(meta.exif), 'sin datos ocultos: ni el modelo de la cámara ni la ubicación GPS')
  }

  // ─── 2. Cambiar y quitar la foto ───────────────────────────────────────────
  titulo('2. Al cambiar o quitar la foto, la vieja se borra')
  {
    await p.goto(`${APP}/${SLUG_B}/admin/productos`, { waitUntil: 'networkidle' })
    await p.getByRole('button', { name: 'Editar' }).first().click()
    await p.locator('input[aria-label="Imagen del producto"]').setInputFiles({ name: 'otra.png', mimeType: 'image/png', buffer: FOTO_CHICA })
    await p.waitForFunction((anterior) => { const img = document.querySelector('img[alt="Vista previa"]'); return img && img.getAttribute('src') !== anterior }, primera, { timeout: 60_000 })
    await p.getByRole('button', { name: 'Actualizar' }).click()
    const segunda = await esperar(fotoDelProducto, (v) => !!v && v !== primera)
    // La foto vieja se borra justo después de guardar el cambio: se espera a que no esté.
    const enCarpeta = await esperar(() => archivosDe(localB), (lista) => !lista.includes(rutaDe(primera)))
    anotar(segunda !== primera && enCarpeta.includes(rutaDe(segunda)), 'el producto quedó con la foto nueva')
    anotar(!enCarpeta.includes(rutaDe(primera)), 'y la vieja ya no está en el bucket (no ocupa espacio)')

    await p.goto(`${APP}/${SLUG_B}/admin/productos`, { waitUntil: 'networkidle' })
    await p.getByRole('button', { name: 'Editar' }).first().click()
    await p.getByRole('button', { name: 'Quitar' }).click()
    await p.getByRole('button', { name: 'Actualizar' }).click()
    const sinFoto = await esperar(fotoDelProducto, (v) => v === null)
    const vacia = await esperar(() => archivosDe(localB), (lista) => lista.length === 0)
    anotar(sinFoto === null && vacia.length === 0, 'al quitarla, el producto queda sin foto y la carpeta del local, vacía')
  }

  // ─── 3. Lo que no es una foto, rechazado por el servidor ──────────────────
  titulo('3. El servidor rechaza lo que no es una foto (sin pasar por la pantalla)')
  {
    const ctx = p.context()
    const casos = [
      ['un SVG con código adentro', { name: 'foto.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>') }, 415],
      ['un HTML disfrazado de PNG', { name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from('<html><body>hola</body></html>') }, 415],
      ['un archivo vacío', { name: 'vacia.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(0) }, 400],
      ['una foto rota (empieza como JPG y sigue con basura)', { name: 'rota.jpg', mimeType: 'image/jpeg', buffer: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(4000, 7)]) }, 422],
      ['un archivo de 9 MB', { name: 'enorme.jpg', mimeType: 'image/jpeg', buffer: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(9 * 1024 * 1024, 1)]) }, 413],
    ]
    for (const [que, archivo, esperado] of casos) {
      const r = await subirPorApi(ctx, SLUG_B, archivo)
      anotar(r.status() === esperado, `${que}: rechazado (${r.status()})`, `esperaba ${esperado}`)
    }
    anotar((await archivosDe(localB)).length === 0, 'y no quedó ningún archivo de esos en el bucket')
  }

  // ─── 4. Nadie sube a la carpeta de otro ────────────────────────────────────
  titulo('4. Nadie sube a la carpeta de otro local')
  {
    const pC = await nuevaPagina()
    await entrarEn(pC, duenoC, SLUG_C)
    const foto = { name: 'ok.jpg', mimeType: 'image/jpeg', buffer: FOTO_CHICA_JPG }
    anotar((await subirPorApi(pC.context(), SLUG_B, foto)).status() === 403, 'el dueño de C no puede subir a la carpeta de B')
    const propia = await subirPorApi(pC.context(), SLUG_C, foto)
    const url = (await propia.json()).url
    anotar(propia.status() === 200 && (url || '').includes(`/imagenes/${localC}/`), 'y a la suya sí: queda en la carpeta de C')
    await pC.context().close()
    const sinSesion = await navegador.newContext()
    anotar((await subirPorApi(sinSesion, SLUG_B, foto)).status() === 401, 'sin sesión: no')
    await sinSesion.close()
    anotar((await subirPorApi(p.context(), SLUG_B, foto, { Origin: 'https://otro-sitio.example' })).status() === 403, 'desde otro sitio, aunque traiga la sesión: no')
    anotar((await subirPorApi(p.context(), `no-existe-${sello}`, foto)).status() === 404, 'a un local que no existe: no')
  }

  // ─── 5. Pegar un link de otro sitio ────────────────────────────────────────
  titulo('5. Pegar el link de una foto de otro sitio, llamando a la acción a mano')
  {
    await p.goto(`${APP}/${SLUG_B}/admin/productos`, { waitUntil: 'networkidle' })
    let cambiado = false
    await p.route('**/*', async (route) => {
      const pedido = route.request()
      if (pedido.method() === 'POST' && pedido.headers()['next-action']) {
        const cuerpo = pedido.postData() ?? ''
        // Next manda los campos de la acción con un prefijo ("_1_imagen_url").
        const nuevo = cuerpo.replace(/(name="(?:_?\d+_)?imagen_url"\r\n\r\n)[^\r]*/, '$1https://otro-sitio.example/foto.jpg')
        if (nuevo !== cuerpo) { cambiado = true; return route.continue({ postData: nuevo }) }
        console.log(`    (diagnóstico) ${pedido.headers()['content-type']} · campos: ${[...cuerpo.matchAll(/name="([^"]+)"/g)].map((m) => m[1]).join(', ') || cuerpo.slice(0, 300)}`)
      }
      return route.continue()
    })
    await p.getByRole('button', { name: 'Editar' }).first().click()
    await p.getByRole('button', { name: 'Actualizar' }).click()
    await p.getByText('La foto se sube desde el panel').waitFor({ timeout: 15_000 }).catch(() => {})
    await p.unroute('**/*')
    anotar(cambiado, 'la prueba metió el link en lo que manda la pantalla')
    anotar((await texto(p)).includes('La foto se sube desde el panel') && (await fotoDelProducto()) === null, 'la acción lo rechaza y el producto no cambia')
  }

  // ─── 6. El tope del local ──────────────────────────────────────────────────
  titulo('6. El tope de fotos del local (25 MB)')
  {
    const relleno = Buffer.alloc(Math.round(4.5 * 1024 * 1024), 3)
    for (let i = 0; i < 6; i++) await subirDirecto(`${localB}/relleno-${i}.webp`, relleno) // 27 MB
    const r = await subirPorApi(p.context(), SLUG_B, { name: 'ok.jpg', mimeType: 'image/jpeg', buffer: FOTO_CHICA_JPG })
    const cuerpo = await r.json().catch(() => ({}))
    anotar(r.status() === 413 && (cuerpo.error || '').includes('Llegaste al tope'), `con la carpeta llena, la foto siguiente se rechaza con un aviso claro (${r.status()})`)
    await borrarArchivos(await archivosDe(localB))
    const otra = await subirPorApi(p.context(), SLUG_B, { name: 'ok.jpg', mimeType: 'image/jpeg', buffer: FOTO_CHICA_JPG })
    anotar(otra.status() === 200, 'con lugar otra vez, sube')
    await borrarArchivos(await archivosDe(localB))
  }

  // ─── 7. La foto de un profesional ──────────────────────────────────────────
  titulo('7. La foto de un profesional')
  {
    const fotoBarbero = async () => (await uno('select foto_url from public.barberos where id = $1', [B.barbero])).foto_url
    await p.goto(`${APP}/${SLUG_B}/admin/barberos`, { waitUntil: 'networkidle' })
    await p.getByRole('button', { name: 'Editar' }).first().click()
    await p.locator('input[aria-label="Foto del barbero"]').setInputFiles({ name: 'cara.jpg', mimeType: 'image/jpeg', buffer: FOTO_CHICA_JPG })
    await p.locator('img[alt="Vista previa"]').waitFor({ timeout: 60_000 })
    await p.getByRole('button', { name: 'Actualizar' }).click()
    const una = await esperar(fotoBarbero, (v) => !!v)
    anotar((una || '').includes(`/imagenes/${localB}/`), 'sube a la carpeta del local')
    await p.goto(`${APP}/${SLUG_B}/admin/barberos`, { waitUntil: 'networkidle' })
    await p.getByRole('button', { name: 'Editar' }).first().click()
    await p.locator('input[aria-label="Foto del barbero"]').setInputFiles({ name: 'otra-cara.png', mimeType: 'image/png', buffer: FOTO_CHICA })
    await p.waitForFunction((anterior) => { const img = document.querySelector('img[alt="Vista previa"]'); return img && img.getAttribute('src') !== anterior }, una, { timeout: 60_000 })
    await p.getByRole('button', { name: 'Actualizar' }).click()
    const otra = await esperar(fotoBarbero, (v) => !!v && v !== una)
    const enCarpeta = await esperar(() => archivosDe(localB), (lista) => !lista.includes(rutaDe(una)))
    anotar(otra !== una && enCarpeta.includes(rutaDe(otra)) && !enCarpeta.includes(rutaDe(una)), 'y al cambiarla, la vieja se borra')
  }

  // ─── 8. Todos los tamaños ──────────────────────────────────────────────────
  titulo('8. El formulario con la foto, en todos los tamaños')
  {
    const malos = []
    for (const ancho of [320, 768, 1024, 1440]) {
      await p.setViewportSize({ width: ancho, height: 900 })
      await p.goto(`${APP}/${SLUG_B}/admin/barberos`, { waitUntil: 'networkidle' })
      await p.getByRole('button', { name: 'Editar' }).first().click()
      if (!(await sinScrollDeCostado(p))) malos.push(ancho)
    }
    anotar(malos.length === 0, 'sin scroll de costado en 320, 768, 1024 ni 1440', `con scroll en ${malos.join(', ')}`)
    await p.screenshot({ path: resolve(CAPTURAS, 'imagenes-barbero-1440.png') })
  }
  await p.context().close()
} catch (e) {
  fallas++
  console.error(`\n✗ La prueba se cortó: ${e.message.split('\n')[0]}`)
} finally {
  // Limpieza: los archivos y todo lo de los locales de prueba, y las cuentas.
  await navegador.close()
  for (const local of [localB, localC].filter(Boolean)) {
    await borrarArchivos(await archivosDe(local))
    for (const tabla of ['membresias', 'productos', 'barberos']) await db.query(`delete from public.${tabla} where local_id = $1`, [local])
    await db.query('delete from public.locales where id = $1', [local])
  }
  await db.end()
  for (const id of cuentas.filter(Boolean)) await admin('DELETE', `/auth/v1/admin/users/${id}`)
}

console.log(fallas === 0 ? `\n✓ Imágenes: todo bien. Capturas en _e2e_shots/` : `\n✗ Imágenes: ${fallas} control(es) fallaron.`)
process.exit(fallas === 0 ? 0 : 1)
