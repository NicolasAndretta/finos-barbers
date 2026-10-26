/**
 * scripts/probar-locales.mjs
 *
 * Prueba la Fase 3a con un navegador de verdad: dos locales en la misma web,
 * cada uno en su dirección (/roble y /prueba-...), y que ninguno muestre ni
 * toque lo del otro. Solo desarrollo: crea un local de prueba (de uñas, en
 * Rosario) con su catálogo y dos cuentas, y borra todo al final.
 *
 * Qué prueba:
 *   1. Cada home muestra lo suyo: servicios, equipo, reseñas, rubro.
 *   2. Cada tienda muestra sus productos.
 *   3. En celu y en compu, la home del local nuevo se ve sin scroll de costado.
 *   4. Un área privada sin sesión manda al login con la marca del local, y
 *      después del login vuelve a la misma página.
 *   5. Un cliente reserva en el local nuevo: ve solo su catálogo, el turno
 *      queda anotado en ese local y la seña es la de ese local.
 *   6. La dueña del local nuevo entra a SU panel y no al de Roble.
 *   7. Un local suspendido o archivado muestra un aviso (salvo a su dueña).
 *   8. Una dirección que no es de ningún local da 404, y los links viejos
 *      (/reservar, /tienda) llevan a Roble.
 *
 * Antes de correrla, la app tiene que estar levantada contra desarrollo:
 *   npm run build
 *   npx next start -H 127.0.0.1 -p 3000
 * y en otra terminal:
 *   node scripts/probar-locales.mjs
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
mkdirSync(CAPTURAS, { recursive: true })
const navegador = await chromium.launch({ headless: true })

const sello = Date.now()
const SLUG = `prueba-${sello}`
const NOMBRE = 'Uñas Mica Prueba'
const cuentas = []
let localB = null
let fallas = 0
const anotar = (ok, texto) => { if (!ok) fallas++; console.log(`  ${ok ? '✓' : '✗'} ${texto}`) }
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

/** Entra desde el login (con la página que pide) y espera salir del login. */
async function entrar(p, cuenta) {
  await p.fill('#email', cuenta.email); await p.fill('#password', cuenta.clave)
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 }), p.click('button[type="submit"]')])
}

try {
  // ─── El segundo local, con su catálogo ─────────────────────────────────────
  localB = (await q(
    `insert into public.locales (slug, nombre, estado, rubro, ciudad, direccion, whatsapp, alias_pago, sena_porcentaje, lema, descripcion)
     values ($1, $2, 'demo', 'unas', 'Rosario', 'Calle de Prueba 123', '5493410000000', 'mica.unas.prueba', 30,
             'Uñas prolijas, sin apuro', 'Local de prueba para la Fase 3a.') returning id`, [SLUG, NOMBRE]))[0].id
  await q(`insert into public.barberos (nombre, apellido, dias, local_id) values ('Mica', 'Prueba', array['Lunes'], $1)`, [localB])
  await q(`insert into public.servicios (nombre, descripcion, precio, duracion_minutos, local_id) values ('Esmaltado semipermanente', 'Prueba', 9000, 60, $1)`, [localB])
  // Fase 3b: sin horarios, un local está cerrado. Lunes a sábado de 10 a 20.
  await q(`insert into public.horarios (local_id, dia_semana, desde, hasta) select $1, d, '10:00', '20:00' from generate_series(1, 6) d`, [localB])
  await q(`insert into public.productos (nombre, descripcion, precio, stock, local_id) values ('Aceite de cutículas Prueba', 'x', 5000, 5, $1)`, [localB])
  await q(`insert into public.resenas (nombre, texto, rating, visible, local_id) values ('Clienta B', 'Reseña del local de prueba', 5, true, $1)`, [localB])
  const duenaB = await crearCuenta('duena-b')
  await q(`insert into public.membresias (user_id, local_id, rol) values ($1, $2, 'dueno')`, [duenaB.id, localB])
  const cliente = await crearCuenta('cliente-b')

  // ─── 1. Cada home, lo suyo ─────────────────────────────────────────────────
  titulo(`1. Cada home muestra lo suyo (/${SLUG} y /roble)`)
  {
    const p = await nuevaPagina()
    await p.goto(`${APP}/${SLUG}`, { waitUntil: 'networkidle' })
    const t = await texto(p)
    anotar(t.includes('Esmaltado semipermanente') && t.includes('Mica') && t.includes('Reseña del local de prueba'), 'la home del local nuevo muestra su servicio, su manicura y su reseña')
    anotar(!t.includes('Leandro') && !t.includes('Corte clásico'), 'y nada de Roble (ni Leandro ni el corte clásico)')
    anotar(t.includes('Uñas · Rosario') && t.includes('Manicura · Lunes'), 'las palabras son las del rubro (Uñas, Manicura)')
    anotar(!t.includes('Años de oficio') && !t.includes('Café de la casa'), 'sin el texto inventado de la demo de Roble')
    anotar((await p.title()).includes(NOMBRE), 'el título de la pestaña es el del local')
    anotar(await p.locator(`svg[aria-label="${NOMBRE}"]`).count() > 0, 'el logo dibuja el nombre del local')
    await p.goto(`${APP}/roble`, { waitUntil: 'networkidle' })
    const r = await texto(p)
    anotar(r.includes('Leandro') && !r.includes('Esmaltado semipermanente'), 'la home de Roble sigue con lo suyo y no muestra lo del local nuevo')
    await p.context().close()
  }

  // ─── 2. Cada tienda, sus productos ─────────────────────────────────────────
  titulo('2. Cada tienda muestra sus productos')
  {
    const p = await nuevaPagina()
    await p.goto(`${APP}/${SLUG}/tienda`, { waitUntil: 'networkidle' })
    anotar((await texto(p)).includes('Aceite de cutículas Prueba'), 'la tienda del local nuevo muestra su producto')
    await p.goto(`${APP}/roble/tienda`, { waitUntil: 'networkidle' })
    anotar(!(await texto(p)).includes('Aceite de cutículas Prueba'), 'la tienda de Roble no lo muestra')
    await p.context().close()
  }

  // ─── 3. Responsive ─────────────────────────────────────────────────────────
  titulo('3. La home del local nuevo, en celu y en compu')
  for (const [pantalla, ancho] of [['celu', 390], ['compu', 1280]]) {
    const p = await nuevaPagina(pantalla)
    await p.goto(`${APP}/${SLUG}`, { waitUntil: 'networkidle' })
    const real = await p.evaluate(() => document.documentElement.scrollWidth)
    anotar(real <= ancho, `${pantalla}: sin scroll de costado (${real} px de ${ancho})`)
    await p.screenshot({ path: resolve(CAPTURAS, `local-nuevo-${pantalla}.png`), fullPage: true })
    await p.context().close()
  }

  // ─── 4 y 5. Login que vuelve, y reserva en el local nuevo ──────────────────
  titulo('4. Un área privada sin sesión: al login del local, y de vuelta')
  const fecha = (() => { const d = new Date(); d.setDate(d.getDate() + 10); while (d.getDay() !== 1) d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) })()
  {
    const p = await nuevaPagina('celu')
    await p.goto(`${APP}/${SLUG}/reservar`, { waitUntil: 'networkidle' })
    const u = new URL(p.url())
    anotar(u.pathname === '/login' && u.searchParams.get('next') === `/${SLUG}/reservar` && u.searchParams.get('local') === SLUG, 'sin sesión, va al login con a dónde volver')
    anotar(await p.locator(`svg[aria-label="${NOMBRE}"]`).count() > 0, 'el login muestra el logo del local nuevo')
    await entrar(p, cliente)
    anotar(new URL(p.url()).pathname === `/${SLUG}/reservar`, 'después de entrar, vuelve a la reserva del local nuevo')

    titulo('5. El cliente reserva en el local nuevo')
    const t = await texto(p)
    anotar(t.includes('Esmaltado semipermanente') && !t.includes('Corte clásico'), 'la reserva ofrece solo los servicios del local nuevo')
    await p.getByRole('button', { name: /Esmaltado semipermanente/ }).click()
    anotar(await p.getByRole('button', { name: /Mica/ }).count() === 1 && await p.getByRole('button', { name: /Leandro/ }).count() === 0, 'y solo su equipo (Mica, no Leandro)')
    anotar((await texto(p)).includes('Manicura'), 'el paso del profesional dice "Manicura"')
    await p.getByRole('button', { name: /Mica/ }).click()
    await p.fill('input[type="date"]', fecha)
    await p.getByRole('button', { name: '11:00', exact: true }).click({ timeout: 30_000 })
    await p.getByText('Transferencia', { exact: true }).click()
    await p.getByRole('button', { name: 'Confirmar reserva' }).click()
    await p.getByText('¡Turno reservado!').waitFor({ timeout: 30_000 })
    anotar((await texto(p)).includes('mica.unas.prueba'), 'la confirmación muestra el alias del local nuevo')
    const [turno] = await q(`select local_id, sena_monto from public.turnos where cliente_id = $1`, [cliente.id])
    anotar(turno?.local_id === localB, 'el turno quedó anotado en el local nuevo')
    anotar(Number(turno?.sena_monto) === 2700, `la seña es la del local nuevo: 30% de 9000 = 2700 (quedó ${turno?.sena_monto})`)
    const [miembro] = await q(`select 1 from public.membresias where user_id = $1 and local_id = $2 and rol = 'cliente'`, [cliente.id, localB])
    anotar(!!miembro, 'al reservar, quedó como cliente del local nuevo (solo de ese)')
    await p.goto(`${APP}/roble/turnos`, { waitUntil: 'networkidle' })
    anotar(!(await texto(p)).includes('Esmaltado semipermanente'), 'en "Mis turnos" de Roble no aparece el turno del local nuevo')
    await p.screenshot({ path: resolve(CAPTURAS, 'local-nuevo-turnos-roble-celu.png') })
    await p.context().close()
  }

  // ─── 6. La dueña, en su panel y no en el de Roble ──────────────────────────
  titulo('6. La dueña del local nuevo entra a SU panel')
  const pDuena = await nuevaPagina()
  {
    await pDuena.goto(`${APP}/login?local=${SLUG}`, { waitUntil: 'networkidle' })
    await entrar(pDuena, duenaB)
    anotar(new URL(pDuena.url()).pathname === `/${SLUG}/admin/dashboard`, 'después de entrar, va al panel de su local')
    await pDuena.goto(`${APP}/${SLUG}/admin/servicios`, { waitUntil: 'networkidle' })
    await pDuena.getByText('Esmaltado semipermanente').first().waitFor({ timeout: 15_000 }).catch(() => {})
    const t = await texto(pDuena)
    anotar(t.includes('Esmaltado semipermanente') && !t.includes('Corte clásico'), 'en su panel ve sus servicios, no los de Roble')
    await pDuena.goto(`${APP}/roble/admin/dashboard`, { waitUntil: 'networkidle' })
    anotar(new URL(pDuena.url()).pathname === '/roble/dashboard', 'el panel de Roble no la deja entrar (la manda al área de cliente)')
  }

  // ─── 7. Suspendido y archivado ─────────────────────────────────────────────
  titulo('7. Un local suspendido o archivado')
  {
    const p = await nuevaPagina()
    await q(`update public.locales set estado = 'suspendido' where id = $1`, [localB])
    await p.goto(`${APP}/${SLUG}`, { waitUntil: 'networkidle' })
    anotar((await texto(p)).includes('no está tomando reservas'), 'suspendido: el visitante ve un aviso')
    await pDuena.goto(`${APP}/${SLUG}`, { waitUntil: 'networkidle' })
    anotar((await texto(pDuena)).includes('Esmaltado semipermanente'), 'su dueña lo sigue viendo (para arreglarlo)')
    await q(`update public.locales set estado = 'archivado' where id = $1`, [localB])
    await p.goto(`${APP}/${SLUG}`, { waitUntil: 'networkidle' })
    anotar((await texto(p)).includes('ya no está disponible'), 'archivado: el visitante ve "ya no está disponible"')
    await q(`update public.locales set estado = 'demo' where id = $1`, [localB])
    await p.context().close()
  }
  await pDuena.context().close()

  // ─── 8. Direcciones que no existen y links viejos ──────────────────────────
  titulo('8. Direcciones que no existen y links viejos')
  {
    const r = await fetch(`${APP}/no-existe-${sello}`, { redirect: 'manual' })
    anotar(r.status === 404, `una dirección que no es de ningún local da 404 (dio ${r.status})`)
    const p = await nuevaPagina()
    await p.goto(`${APP}/tienda`, { waitUntil: 'networkidle' })
    anotar(new URL(p.url()).pathname === '/roble/tienda', 'el link viejo /tienda lleva a /roble/tienda')
    await p.goto(`${APP}/reservar`, { waitUntil: 'networkidle' })
    const u = new URL(p.url())
    anotar(u.pathname === '/login' && u.searchParams.get('next') === '/roble/reservar', 'el link viejo /reservar lleva a la reserva de Roble (pasando por el login)')
    await p.context().close()
  }
} catch (e) {
  fallas++
  console.error(`\n✗ La prueba se cortó: ${e.message.split('\n')[0]}`)
} finally {
  // Limpieza: todo lo del local de prueba y las cuentas de prueba.
  await navegador.close()
  const ids = cuentas.filter(Boolean)
  if (localB) {
    for (const tabla of ['horarios', 'ausencias', 'turnos', 'items_pedido', 'pedidos', 'transacciones', 'membresias', 'resenas', 'productos', 'servicios', 'barberos', 'categorias']) {
      await db.query(`delete from public.${tabla} where local_id = $1`, [localB])
    }
  }
  if (ids.length) {
    await db.query('delete from public.turnos where cliente_id = any($1::uuid[])', [ids])
    await db.query('delete from public.membresias where user_id = any($1::uuid[])', [ids])
  }
  if (localB) await db.query('delete from public.locales where id = $1', [localB])
  await db.end()
  for (const id of ids) await admin('DELETE', `/auth/v1/admin/users/${id}`)
}

console.log(fallas === 0 ? `\n✓ Locales: todo bien. Capturas en _e2e_shots/` : `\n✗ Locales: ${fallas} control(es) fallaron.`)
process.exit(fallas === 0 ? 0 : 1)
