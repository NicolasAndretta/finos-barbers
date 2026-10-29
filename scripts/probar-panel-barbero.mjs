/**
 * scripts/probar-panel-barbero.mjs
 *
 * Prueba la otra mitad de la Fase 4b con un navegador de verdad: las cuentas de
 * barbero sin el mecanismo temporal, y el panel del barbero con la sesión (ya
 * no con la llave del servidor). Solo desarrollo: arma un local activo de
 * prueba con dos barberos y dos clientes, y borra todo al final.
 *
 * Qué prueba:
 *   1. La dueña le crea la cuenta a un barbero desde el panel: queda como
 *      barbero de ESE local (su membresía), y el perfil (que es de toda la
 *      plataforma) no cambia de rol.
 *   2. El barbero entra y cae en su agenda, con sus turnos y no los del otro.
 *   3. En "Clientes" ve solo a los que tienen turno con él (antes veía a todos
 *      los clientes del local); la dueña, a todos.
 *   4. En otro local no es barbero de nada.
 *   5. En celu y en compu, sin scroll de costado.
 *
 * Antes de correrla, la app tiene que estar levantada contra desarrollo:
 *   npm run build
 *   npx next start -H 127.0.0.1 -p 3000
 * y en otra terminal:
 *   node scripts/probar-panel-barbero.mjs
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
const uno = async (sql, p = []) => (await q(sql, p))[0]
mkdirSync(CAPTURAS, { recursive: true })
const navegador = await chromium.launch({ headless: true })

const sello = Date.now()
const SLUG = `barbero-${sello}`
const cuentas = []
let localB = null
let fallas = 0
const anotar = (ok, texto, detalle = '') => { if (!ok) fallas++; console.log(`  ${ok ? '✓' : '✗'} ${texto}${!ok && detalle ? ` — ${detalle}` : ''}`) }
const titulo = (t) => console.log(`\n${t}`)

async function crearCuenta(nombre, apellido) {
  const email = `${nombre.toLowerCase()}.${sello}@example.com`
  const clave = `Prueba-${sello}-x`
  const { id } = await admin('POST', '/auth/v1/admin/users', { email, password: clave, email_confirm: true, user_metadata: { nombre, apellido } })
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
const lunes = (() => {
  const d = new Date(); d.setDate(d.getDate() + 10)
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()

try {
  // ─── El local de prueba: dos barberos, dos clientes ────────────────────────
  localB = (await uno(`insert into public.locales (slug, nombre, estado, rubro, ciudad) values ($1, 'Barbería Panel', 'activo', 'barberia', 'Salta') returning id`, [SLUG])).id
  const beto = (await uno(`insert into public.barberos (nombre, apellido, dias, local_id) values ('Beto', 'Panel', array['Lunes'], $1) returning id`, [localB])).id
  const carla = (await uno(`insert into public.barberos (nombre, apellido, dias, local_id) values ('Carla', 'Panel', array['Lunes'], $1) returning id`, [localB])).id
  const servicio = (await uno(`insert into public.servicios (nombre, precio, duracion_minutos, local_id) values ('Corte Panel', 8000, 30, $1) returning id`, [localB])).id
  const duena = await crearCuenta('Duena', 'Panel')
  await q(`insert into public.membresias (user_id, local_id, rol) values ($1, $2, 'dueno')`, [duena.id, localB])
  const cliUno = await crearCuenta('Ulises', 'ConBeto')
  const cliDos = await crearCuenta('Dora', 'ConCarla')
  const turno = (cliente, barbero, hora) => q(
    `insert into public.turnos (local_id, cliente_id, barbero_id, servicio_id, fecha, hora, estado, metodo_pago, sena_monto, sena_estado)
     values ($1, $2, $3, $4, $5, $6, 'confirmado', 'transferencia', 2400, 'pagada')`, [localB, cliente, barbero, servicio, lunes, hora])
  await turno(cliUno.id, beto, '11:00:00')
  await turno(cliDos.id, carla, '11:00:00')

  // ─── 1. La dueña le crea la cuenta a Beto ──────────────────────────────────
  titulo('1. La dueña le crea la cuenta a un barbero desde el panel')
  const emailBeto = `beto.${sello}@example.com`
  const claveBeto = `Beto-${sello}-x`
  {
    const p = await nuevaPagina()
    await entrarEn(p, duena, SLUG)
    await p.goto(`${APP}/${SLUG}/admin/barberos`, { waitUntil: 'networkidle' })
    // La lista va por nombre: el primer botón es el de Beto (abajo se comprueba en la base).
    await p.getByRole('button', { name: '+ Crear cuenta de acceso' }).first().click()
    await p.getByPlaceholder('email del barbero').fill(emailBeto)
    await p.getByPlaceholder('contraseña (mín. 6)').fill(claveBeto)
    await p.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
    await p.getByText(`Tiene cuenta: ${emailBeto}`).waitFor({ timeout: 30_000 })
    anotar(true, 'el panel muestra que Beto ya tiene cuenta, con su mail')
    const cuenta = await uno(`select u.id, (select count(*)::int from public.equipo e where e.user_id = u.id) as equipo
                                from auth.users u join public.profiles p on p.id = u.id where u.email = $1`, [emailBeto])
    if (cuenta) cuentas.push(cuenta.id)
    const membresia = cuenta && await uno(`select local_id, barbero_id from public.membresias where user_id = $1 and rol = 'barbero'`, [cuenta.id])
    anotar(membresia?.local_id === localB && membresia?.barbero_id === beto, 'quedó como barbero de ESTE local, con la agenda de Beto (su membresía)')
    anotar(cuenta?.equipo === 0, 'y no es nada en la plataforma: solo barbero de este local')
    await p.context().close()
  }

  // ─── 2 y 3. Beto entra: su agenda y sus clientes ───────────────────────────
  titulo('2. Beto entra y ve su agenda (en el celu)')
  {
    const p = await nuevaPagina('celu')
    await entrarEn(p, { email: emailBeto, clave: claveBeto }, SLUG)
    anotar(new URL(p.url()).pathname === `/${SLUG}/barbero/calendario`, 'después de entrar, cae en su agenda')
    const t = await texto(p)
    anotar(t.includes('Ulises ConBeto') && !t.includes('Dora ConCarla'), 've su turno (Ulises) y no el de Carla (Dora)')
    anotar(await sinScrollDeCostado(p), 'su agenda, en celu, sin scroll de costado')

    titulo('3. En "Clientes" ve solo a los suyos')
    await p.goto(`${APP}/${SLUG}/barbero/clientes`, { waitUntil: 'networkidle' })
    const c = await texto(p)
    anotar(c.includes('Ulises ConBeto') && !c.includes('Dora ConCarla'), 've a Ulises, que tiene turno con él, y no a Dora (antes veía a todos los del local)')
    anotar(c.includes('Los que tienen o tuvieron turno con vos'), 'y la pantalla lo dice')
    anotar(await sinScrollDeCostado(p), 'en celu, sin scroll de costado')
    await p.screenshot({ path: resolve(CAPTURAS, 'panel-barbero-clientes-celu.png'), fullPage: true })

    titulo('4. En otro local no es barbero de nada')
    await p.goto(`${APP}/roble/barbero/calendario`, { waitUntil: 'networkidle' })
    anotar(new URL(p.url()).pathname !== '/roble/barbero/calendario', 'la agenda de Roble no lo deja entrar')
    await p.context().close()
  }
  {
    const p = await nuevaPagina()
    await entrarEn(p, duena, SLUG)
    await p.goto(`${APP}/${SLUG}/barbero/clientes`, { waitUntil: 'networkidle' })
    const c = await texto(p)
    anotar(c.includes('Ulises ConBeto') && c.includes('Dora ConCarla') && c.includes('Los clientes del local'), 'la dueña, en esa misma pantalla, ve a todos los clientes del local')
    const malos = []
    for (const ancho of [320, 768, 1024, 1440]) {
      await p.setViewportSize({ width: ancho, height: 900 })
      await p.goto(`${APP}/${SLUG}/barbero/clientes`, { waitUntil: 'networkidle' })
      if (!(await sinScrollDeCostado(p))) malos.push(ancho)
    }
    anotar(malos.length === 0, 'la pantalla de clientes, sin scroll de costado en 320, 768, 1024 y 1440', `con scroll en ${malos.join(', ')}`)
    await p.context().close()
  }
} catch (e) {
  fallas++
  console.error(`\n✗ La prueba se cortó: ${e.message.split('\n')[0]}`)
} finally {
  await navegador.close()
  if (localB) {
    for (const tabla of ['turnos', 'membresias', 'servicios', 'barberos']) await db.query(`delete from public.${tabla} where local_id = $1`, [localB])
    await db.query('delete from public.locales where id = $1', [localB])
  }
  const ids = cuentas.filter(Boolean)
  if (ids.length) await db.query('delete from public.membresias where user_id = any($1::uuid[])', [ids])
  await db.end()
  for (const id of ids) await admin('DELETE', `/auth/v1/admin/users/${id}`)
}

console.log(fallas === 0 ? `\n✓ Panel del barbero: todo bien. Capturas en _e2e_shots/` : `\n✗ Panel del barbero: ${fallas} control(es) fallaron.`)
process.exit(fallas === 0 ? 0 : 1)
