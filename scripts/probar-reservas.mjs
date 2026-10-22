/**
 * scripts/probar-reservas.mjs
 *
 * Prueba la reserva de turnos con un navegador de verdad, como lo haría un
 * cliente. Solo desarrollo: crea cuentas y turnos de prueba y los borra al final.
 *
 * Qué prueba (salieron del arreglo del 14/10/2026, ver docs/MULTITENANT.md):
 *   1. La lista de horarios no ofrece los que ocupó OTRO cliente.
 *   2. Si otro reserva mientras el cliente mira la lista, al confirmar no se
 *      guarda un turno que se pisa: avisa, actualiza la lista y, en el celu,
 *      el aviso queda a la vista.
 *   3. Una reserva normal, en el celu, se sigue guardando.
 *
 * Antes de correrla, la app tiene que estar levantada contra la base de
 * desarrollo:
 *   npm run build
 *   npx next start -H 127.0.0.1 -p 3000
 * y en otra terminal:
 *   node scripts/probar-reservas.mjs
 *
 * Usa Playwright. Si este proyecto no lo tiene instalado, lo toma de
 * codigo-rojo-web, que está al lado (ahí se instala con
 * "npx playwright install chromium").
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

// Playwright: el de este proyecto, o si no está, el de codigo-rojo-web.
function cargarPlaywright() {
  for (const lugar of [PROYECTO, resolve(PROYECTO, '../codigo-rojo-web')]) {
    try { return createRequire(resolve(lugar, 'package.json'))('playwright') } catch { /* probar el siguiente */ }
  }
  console.error('✗ No encuentro Playwright. Instalalo en codigo-rojo-web: npm ci && npx playwright install chromium')
  process.exit(1)
}
const { chromium } = cargarPlaywright()
const pg = createRequire(resolve(PROYECTO, 'package.json'))('pg')

// ¿La app está levantada?
try {
  await fetch(`${APP}/roble`, { signal: AbortSignal.timeout(10_000) })
} catch {
  console.error(`✗ La app no responde en ${APP}. Levantala primero (ver el comentario de arriba de este archivo).`)
  process.exit(1)
}

// Cuentas de prueba con la API de administración de Supabase (con fetch:
// supabase-js necesita WebSocket, que Node 20 no trae).
const SB = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, '')
const admin = (metodo, ruta, cuerpo) => fetch(`${SB}${ruta}`, {
  method: metodo,
  headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
  body: cuerpo ? JSON.stringify(cuerpo) : undefined,
}).then((r) => r.json().catch(() => ({})))

const db = new pg.Client({ connectionString: env.SUPABASE_DB_URL })
try {
  await db.connect()
} catch {
  console.error('✗ No me puedo conectar a la base de desarrollo. ¿Está prendido el Supabase local? Abrí Docker Desktop y corré: npx supabase start')
  process.exit(1)
}
mkdirSync(CAPTURAS, { recursive: true })
const navegador = await chromium.launch({ headless: true })

const sello = Date.now()
const cuentas = [] // todo lo que se crea, para borrarlo al final
let fallas = 0
const anotar = (ok, texto) => { if (!ok) fallas++; console.log(`  ${ok ? '✓' : '✗'} ${texto}`) }

// El primer día de la semana pedido (1 = lunes) que caiga a partir de N días.
function proximo(diaSemana, desdeDias) {
  const d = new Date(); d.setDate(d.getDate() + desdeDias)
  while (d.getDay() !== diaSemana) d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function crearCuenta(nombre) {
  const email = `${nombre}.${sello}@example.com`
  const clave = `Prueba-${sello}-x`
  const { id } = await admin('POST', '/auth/v1/admin/users', { email, password: clave, email_confirm: true, user_metadata: { nombre: 'Prueba', apellido: nombre } })
  cuentas.push(id)
  return { id, email, clave }
}

const PANTALLA = { compu: { viewport: { width: 1280, height: 860 } }, celu: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } }

// Entra con la cuenta, va a reservar y elige Corte clásico (30 min) con Leandro en esa fecha.
async function abrirReserva(cuenta, fecha, pantalla) {
  const p = await (await navegador.newContext(PANTALLA[pantalla])).newPage()
  // Desde la Fase 3a cada local vive en su carpeta: Roble es /roble.
  await p.goto(`${APP}/login?local=roble`, { waitUntil: 'networkidle' })
  await p.fill('#email', cuenta.email); await p.fill('#password', cuenta.clave)
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 }), p.click('button[type="submit"]')])
  await p.goto(`${APP}/roble/reservar`, { waitUntil: 'networkidle' })
  await p.getByRole('button', { name: /Corte clásico/ }).click()
  await p.getByRole('button', { name: /Leandro/ }).click()
  await p.fill('input[type="date"]', fecha)
  await p.getByRole('button', { name: /^\d{1,2}:\d{2}$/ }).first().waitFor({ timeout: 30_000 })
  return p
}
const horariosEnPantalla = async (p) => (await p.getByRole('button', { name: /^\d{1,2}:\d{2}$/ }).allTextContents()).map((h) => h.trim())

const leandro = (await db.query(`select id from public.barberos where nombre = 'Leandro' limit 1`)).rows[0]?.id
const largo = (await db.query(`select id from public.servicios where nombre = 'Corte + Barba' limit 1`)).rows[0]?.id
if (!leandro || !largo) {
  console.error('✗ Falta el barbero Leandro o el servicio "Corte + Barba": corré node scripts/preparar-desarrollo.mjs')
  process.exit(1)
}
const turnoDeOtro = (cliente, fecha, hora) => db.query(
  // Desde la 0009 la base no completa el local sola: el turno dice que es de Roble.
  `insert into public.turnos (local_id, cliente_id, barbero_id, servicio_id, fecha, hora, estado) values ($6, $1, $2, $3, $4, $5, 'pendiente')`,
  [cliente, leandro, largo, fecha, hora, '00000000-0000-4000-a000-000000000001'])

try {
  // ─── 1. La lista no ofrece los horarios que ocupó otro ─────────────────────
  {
    const fecha = proximo(1, 3)
    console.log(`\n1. Lista de horarios (Leandro, ${fecha}: otra persona tiene 10:00 a 10:45)`)
    const otra = await crearCuenta('otra-lista')
    await turnoDeOtro(otra.id, fecha, '10:00')
    const p = await abrirReserva(await crearCuenta('cliente-lista'), fecha, 'compu')
    const horarios = await horariosEnPantalla(p)
    const pisan = ['09:45', '10:00', '10:15', '10:30'].filter((h) => horarios.includes(h))
    anotar(pisan.length === 0, pisan.length ? `ofrece ${pisan.join(', ')}, que se pisan con el turno de otra persona` : 'no ofrece ningún horario que se pise')
    anotar(horarios.includes('09:30') && horarios.includes('10:45'), 'sí ofrece 09:30 y 10:45, que no se pisan')
    await p.context().close()
  }

  // ─── 2. Lista vieja: otro reserva mientras el cliente decide (en el celu) ──
  {
    const fecha = proximo(1, 10)
    console.log(`\n2. Al confirmar con la lista vieja (Leandro, ${fecha}, en el celu)`)
    const otra = await crearCuenta('otra-pisada')
    const cliente = await crearCuenta('cliente-pisada')
    const p = await abrirReserva(cliente, fecha, 'celu')
    await p.getByRole('button', { name: '10:00', exact: true }).click()
    await p.getByText('Transferencia', { exact: true }).click()
    await turnoDeOtro(otra.id, fecha, '10:15') // 10:15 a 11:00, mientras el cliente mira
    await p.getByRole('button', { name: 'Confirmar reserva' }).click()
    const resultado = await Promise.race([
      p.getByText('¡Turno reservado!').waitFor({ timeout: 30_000 }).then(() => 'guardado'),
      p.getByText(/ya no está libre/).waitFor({ timeout: 30_000 }).then(() => 'frenado'),
    ])
    const guardados = Number((await db.query('select count(*) from public.turnos where cliente_id = $1', [cliente.id])).rows[0].count)
    anotar(resultado === 'frenado' && guardados === 0, resultado === 'frenado' ? 'no guardó el turno de las 10:00 y avisó que ya no está libre' : 'GUARDÓ el turno de las 10:00 encima del de las 10:15')
    if (resultado === 'frenado') {
      await p.waitForTimeout(1500) // que termine de subir la pantalla y de llegar la lista nueva
      await p.screenshot({ path: resolve(CAPTURAS, 'reserva-aviso-celu.png') })
      const aviso = p.getByText(/ya no está libre/)
      const caja = await aviso.boundingBox()
      const visto = !!caja && caja.y >= 0 && caja.y + caja.height <= 844 &&
        await aviso.evaluate((el, [x, y]) => el.contains(document.elementFromPoint(x, y)), [caja.x + caja.width / 2, caja.y + caja.height / 2])
      anotar(visto, 'en el celu el aviso queda a la vista, sin que lo tape el menú')
      // Con 30 minutos, 09:45 termina 10:15 (justo cuando empieza el otro): no se pisa.
      const horarios = await horariosEnPantalla(p)
      const pisan = ['10:00', '10:15', '10:30', '10:45'].filter((h) => horarios.includes(h))
      anotar(pisan.length === 0 && horarios.includes('09:45') && horarios.includes('11:00'),
        pisan.length ? `la lista nueva todavía ofrece ${pisan.join(', ')}` : 'la lista se actualizó sola (ofrece 09:45 y 11:00, no 10:00 a 10:45)')
    }
    await p.context().close()
  }

  // ─── 3. Una reserva normal, en el celu, se sigue guardando ─────────────────
  {
    const fecha = proximo(2, 10)
    console.log(`\n3. Reserva normal (Leandro, ${fecha}, 11:00, en el celu)`)
    const cliente = await crearCuenta('cliente-normal')
    const p = await abrirReserva(cliente, fecha, 'celu')
    await p.getByRole('button', { name: '11:00', exact: true }).click()
    await p.getByText('Transferencia', { exact: true }).click()
    await p.getByRole('button', { name: 'Confirmar reserva' }).click()
    await p.getByText('¡Turno reservado!').waitFor({ timeout: 30_000 })
    await p.screenshot({ path: resolve(CAPTURAS, 'reserva-normal-celu.png'), fullPage: true })
    const filas = (await db.query(`select to_char(hora, 'HH24:MI') as hora, estado from public.turnos where cliente_id = $1`, [cliente.id])).rows
    anotar(filas.length === 1 && filas[0].hora === '11:00' && filas[0].estado === 'pendiente', 'el turno quedó guardado: 11:00, pendiente')
    await p.context().close()
  }
} catch (e) {
  fallas++
  console.error(`\n✗ La prueba se cortó: ${e.message.split('\n')[0]}`)
} finally {
  // Limpieza: los turnos y las cuentas de prueba (borrar la cuenta borra su perfil).
  await navegador.close()
  const ids = cuentas.filter(Boolean)
  if (ids.length) await db.query('delete from public.turnos where cliente_id = any($1::uuid[])', [ids])
  await db.end()
  for (const id of ids) await admin('DELETE', `/auth/v1/admin/users/${id}`)
}

console.log(fallas === 0 ? `\n✓ Reservas: todo bien. Capturas en _e2e_shots/` : `\n✗ Reservas: ${fallas} control(es) fallaron.`)
process.exit(fallas === 0 ? 0 : 1)
