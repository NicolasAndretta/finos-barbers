/**
 * scripts/probar-horarios.mjs
 *
 * Prueba la Fase 3b (horarios reales) con un navegador de verdad. Solo
 * desarrollo: arma un local de prueba y lo borra al final.
 *
 * El local de prueba:
 *   - lunes con horario cortado: de 10 a 13 y de 15 a 20;
 *   - martes a sábado de 10 a 20; domingo cerrado;
 *   - Ana usa el horario del local; Beto tiene horario propio: solo martes de 15 a 18;
 *   - Ana de licencia un miércoles; el local cerrado por feriado un jueves;
 *   - se puede reservar hasta 14 días adelante, con 1 hora de anticipación.
 *
 * Qué prueba:
 *   1. La reserva ofrece solo lo que está abierto, y explica por qué cuando no hay nada.
 *   2. Para hoy, nada antes de "ahora + 1 hora" (en la hora del local).
 *   3. La web muestra los mismos horarios.
 *   4. La dueña cambia el horario desde el panel y la reserva lo respeta;
 *      el panel frena tramos que se pisan y carga ausencias. En celu y en compu.
 *
 * Antes de correrla, la app tiene que estar levantada contra desarrollo:
 *   npm run build
 *   npx next start -H 127.0.0.1 -p 3000
 * y en otra terminal:
 *   node scripts/probar-horarios.mjs
 */
import { createRequire } from 'module'
import { mkdirSync } from 'fs'
import { resolve } from 'path'
import { leerEnv } from './lib/entorno.mjs'

const PROYECTO = resolve(import.meta.dirname, '..')
const APP = (process.env.APP_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '')
const CAPTURAS = resolve(PROYECTO, '_e2e_shots')
const ZONA = 'America/Argentina/Buenos_Aires'

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
try { await fetch(`${APP}/roble`, { signal: AbortSignal.timeout(10_000) }) } catch {
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
const SLUG = `horarios-${sello}`
const cuentas = []
let localP = null
let fallas = 0
const anotar = (ok, texto) => { if (!ok) fallas++; console.log(`  ${ok ? '✓' : '✗'} ${texto}`) }
const titulo = (t) => console.log(`\n${t}`)

// Fechas en la hora del local (como la app).
function ahoraEnZona() {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date())
  const p = (t) => partes.find((x) => x.type === t).value
  return { fecha: `${p('year')}-${p('month')}-${p('day')}`, minutos: Number(p('hour')) * 60 + Number(p('minute')) }
}
const sumarDias = (f, n) => { const d = new Date(`${f}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const diaSemana = (f) => new Date(`${f}T12:00:00Z`).getUTCDay()
const HOY = ahoraEnZona()
/** El próximo día de la semana pedido, a partir de mañana. */
const proximo = (dia) => { let f = sumarDias(HOY.fecha, 1); while (diaSemana(f) !== dia) f = sumarDias(f, 1); return f }
const aMin = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b }

async function crearCuenta(nombre) {
  const email = `${nombre}.${sello}@example.com`
  const clave = `Prueba-${sello}-x`
  const { id } = await admin('POST', '/auth/v1/admin/users', { email, password: clave, email_confirm: true, user_metadata: { nombre: 'Prueba', apellido: nombre } })
  cuentas.push(id)
  return { id, email, clave }
}
const PANTALLA = { compu: { viewport: { width: 1280, height: 860 } }, celu: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } }
async function entrar(pantalla, cuenta, volver) {
  const p = await (await navegador.newContext(PANTALLA[pantalla])).newPage()
  await p.goto(`${APP}/login?local=${SLUG}&next=${encodeURIComponent(volver)}`, { waitUntil: 'networkidle' })
  await p.fill('#email', cuenta.email); await p.fill('#password', cuenta.clave)
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 }), p.click('button[type="submit"]')])
  return p
}
const MENSAJES = /Ese día|No quedan|Todavía no se puede|Esa fecha ya pasó|No hay horarios/

/** Qué ofrece la reserva para un profesional y una fecha: los horarios, o el mensaje. */
async function ofrece(p, profesional, fecha) {
  await p.goto(`${APP}/${SLUG}/reservar`, { waitUntil: 'networkidle' })
  await p.getByRole('button', { name: /Corte prueba/ }).click()
  await p.getByRole('button', { name: new RegExp(profesional) }).click()
  await p.fill('input[type="date"]', fecha)
  const hora = p.getByRole('button', { name: /^\d{1,2}:\d{2}$/ }).first()
  const mensaje = p.getByText(MENSAJES).first()
  await hora.or(mensaje).waitFor({ timeout: 30_000 })
  await p.waitForTimeout(300)
  const horarios = (await p.getByRole('button', { name: /^\d{1,2}:\d{2}$/ }).allTextContents()).map((h) => h.trim())
  const texto = horarios.length ? '' : (await mensaje.textContent())?.trim() ?? ''
  return { horarios, texto }
}

try {
  // ─── El local de prueba ────────────────────────────────────────────────────
  localP = (await q(
    `insert into public.locales (slug, nombre, estado, rubro, ciudad, dias_reserva, anticipacion_minutos)
     values ($1, 'Peluquería Horarios Prueba', 'demo', 'peluqueria', 'CABA', 14, 60) returning id`, [SLUG]))[0].id
  const ana = (await q(`insert into public.barberos (nombre, apellido, local_id) values ('Ana', 'Prueba', $1) returning id`, [localP]))[0].id
  const beto = (await q(`insert into public.barberos (nombre, apellido, local_id) values ('Beto', 'Prueba', $1) returning id`, [localP]))[0].id
  await q(`insert into public.servicios (nombre, precio, duracion_minutos, local_id) values ('Corte prueba', 5000, 30, $1)`, [localP])
  await q(`insert into public.horarios (local_id, dia_semana, desde, hasta) values ($1, 1, '10:00', '13:00'), ($1, 1, '15:00', '20:00')`, [localP])
  await q(`insert into public.horarios (local_id, dia_semana, desde, hasta) select $1, d, '10:00', '20:00' from generate_series(2, 6) d`, [localP])
  await q(`insert into public.horarios (local_id, barbero_id, dia_semana, desde, hasta) values ($1, $2, 2, '15:00', '18:00')`, [localP, beto])
  const lunes = proximo(1), martes = proximo(2), miercoles = proximo(3), jueves = proximo(4), viernes = proximo(5), sabado = proximo(6), domingo = proximo(0)
  await q(`insert into public.ausencias (local_id, barbero_id, desde, hasta, motivo) values ($1, $2, $3, $3, 'Licencia de prueba')`, [localP, ana, miercoles])
  await q(`insert into public.ausencias (local_id, desde, hasta, motivo) values ($1, $2, $2, 'Feriado de prueba')`, [localP, jueves])
  const duena = await crearCuenta('duena-horarios')
  await q(`insert into public.membresias (user_id, local_id, rol) values ($1, $2, 'dueno')`, [duena.id, localP])
  const cliente = await crearCuenta('cliente-horarios')

  // ─── 1. La reserva ofrece solo lo abierto ──────────────────────────────────
  titulo('1. La reserva ofrece solo lo que está abierto')
  const pc = await entrar('compu', cliente, `/${SLUG}/reservar`)
  {
    const d = await ofrece(pc, 'Ana', domingo)
    anotar(d.horarios.length === 0 && d.texto.includes('cerrado'), `domingo: nada, "${d.texto}"`)
  }
  {
    const d = await ofrece(pc, 'Ana', lunes)
    const enElHueco = d.horarios.filter((h) => aMin(h) > aMin('12:30') && aMin(h) < aMin('15:00'))
    anotar(d.horarios[0] === '10:00' && d.horarios.includes('12:30') && enElHueco.length === 0 && d.horarios.includes('15:00') && d.horarios.at(-1) === '19:30',
      `lunes cortado: de 10:00 a 12:30 y de 15:00 a 19:30, nada en el hueco (${enElHueco.length ? `ofrece ${enElHueco.join(', ')}` : 'ok'})`)
  }
  {
    const d = await ofrece(pc, 'Beto', martes)
    anotar(d.horarios[0] === '15:00' && d.horarios.at(-1) === '17:30', `Beto, martes: solo su horario, de 15:00 a 17:30 (ofrece de ${d.horarios[0]} a ${d.horarios.at(-1)})`)
  }
  {
    const d = await ofrece(pc, 'Beto', lunes)
    anotar(d.horarios.length === 0 && d.texto.includes('no atiende'), `Beto, lunes (no trabaja): "${d.texto}"`)
  }
  {
    const d = await ofrece(pc, 'Ana', miercoles)
    anotar(d.horarios.length === 0 && d.texto.includes('licencia'), `Ana, miércoles (de licencia): "${d.texto}"`)
  }
  {
    const d = await ofrece(pc, 'Ana', jueves)
    anotar(d.horarios.length === 0 && d.texto.includes('cerrado'), `jueves (feriado del local): "${d.texto}"`)
  }
  {
    const lejos = sumarDias(HOY.fecha, 20)
    const d = await ofrece(pc, 'Ana', lejos)
    anotar(d.horarios.length === 0 && d.texto.includes('Todavía no'), `a 20 días (el local permite 14): "${d.texto}"`)
    const max = await pc.locator('input[type="date"]').getAttribute('max')
    anotar(max === sumarDias(HOY.fecha, 14), `el calendario no deja elegir más allá de 14 días (max ${max})`)
  }

  // ─── 2. Hoy: nada antes de ahora + 1 hora ──────────────────────────────────
  titulo('2. Para hoy, nada antes de "ahora + 1 hora" (en la hora del local)')
  {
    // Para que el control pruebe algo a cualquier hora, el local de prueba se
    // "muda" a una zona donde ahora sea de día. De paso prueba que "hoy" y
    // "ya pasó" se miden en la zona del local, no en la del servidor.
    const zonas = ['America/Argentina/Buenos_Aires', 'Pacific/Honolulu', 'America/Los_Angeles', 'Europe/Madrid', 'Asia/Tokyo', 'Australia/Sydney']
    const enZona = (zona) => {
      const partes = new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date())
      const p = (t) => partes.find((x) => x.type === t).value
      return { fecha: `${p('year')}-${p('month')}-${p('day')}`, minutos: Number(p('hour')) * 60 + Number(p('minute')) }
    }
    const zona = zonas.find((z) => { const m = enZona(z).minutos; return m >= 6 * 60 && m <= 18 * 60 })
    const ahora = enZona(zona)
    await q(`update public.locales set zona_horaria = $1 where id = $2`, [zona, localP])
    // Ese día (en esa zona) abierto todo el día, para poder mirar el límite.
    await q(`delete from public.horarios where local_id = $1 and barbero_id is null and dia_semana = $2`, [localP, diaSemana(ahora.fecha)])
    await q(`insert into public.horarios (local_id, dia_semana, desde, hasta) values ($1, $2, '00:00', '23:45')`, [localP, diaSemana(ahora.fecha)])
    const d = await ofrece(pc, 'Ana', ahora.fecha)
    const limite = ahora.minutos + 60
    const antes = d.horarios.filter((h) => aMin(h) < limite)
    const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
    anotar(antes.length === 0, antes.length
      ? `ofrece ${antes.join(', ')}, antes de ahora + 1 hora`
      : `en ${zona} son las ${hhmm(ahora.minutos)}: ningún horario antes de las ${hhmm(limite)}`)
    anotar(d.horarios.length > 0 && aMin(d.horarios[0]) - limite < 15, `y el primero que ofrece es el siguiente libre (${d.horarios[0]})`)
    // Se vuelve todo como estaba.
    await q(`update public.locales set zona_horaria = $1 where id = $2`, [ZONA, localP])
    await q(`delete from public.horarios where local_id = $1 and barbero_id is null and dia_semana = $2`, [localP, diaSemana(ahora.fecha)])
    const dia = diaSemana(ahora.fecha)
    if (dia === 1) await q(`insert into public.horarios (local_id, dia_semana, desde, hasta) values ($1, 1, '10:00', '13:00'), ($1, 1, '15:00', '20:00')`, [localP])
    else if (dia !== 0) await q(`insert into public.horarios (local_id, dia_semana, desde, hasta) values ($1, $2, '10:00', '20:00')`, [localP, dia])
  }
  await pc.context().close()

  // ─── 3. La web muestra los mismos horarios ─────────────────────────────────
  titulo('3. La web muestra los mismos horarios que usa la reserva')
  {
    const p = await (await navegador.newContext(PANTALLA.compu)).newPage()
    await p.goto(`${APP}/${SLUG}`, { waitUntil: 'networkidle' })
    const t = (await p.locator('#ubicacion').innerText()).replace(/\s+/g, ' ')
    anotar(t.includes('Lunes 10:00 – 13:00 y 15:00 – 20:00') && t.includes('Martes a Sábado 10:00 – 20:00') && t.includes('Domingo Cerrado'),
      'la web dice: Lunes 10–13 y 15–20 · Martes a Sábado 10–20 · Domingo cerrado')
    await p.context().close()
  }

  // ─── 4. La dueña, desde el panel ───────────────────────────────────────────
  titulo('4. La dueña cambia el horario desde el panel')
  for (const pantalla of ['celu', 'compu']) {
    const p = await entrar(pantalla, duena, `/${SLUG}/admin/horarios`)
    await p.getByRole('heading', { name: 'Horario del local' }).waitFor({ timeout: 30_000 })
    const ancho = await p.evaluate(() => document.documentElement.scrollWidth)
    anotar(ancho <= PANTALLA[pantalla].viewport.width, `${pantalla}: la pantalla Horarios se ve sin scroll de costado (${ancho} px)`)
    await p.screenshot({ path: resolve(CAPTURAS, `horarios-panel-${pantalla}.png`), fullPage: true })
    if (pantalla === 'compu') {
      // a) Cerrar los sábados.
      await p.getByRole('checkbox', { name: 'Sábado abierto' }).uncheck()
      await p.getByRole('button', { name: 'Guardar horario del local' }).click()
      await p.getByRole('status').filter({ hasText: 'Horario guardado' }).first().waitFor({ timeout: 15_000 })
      const filasSabado = (await q(`select count(*)::int n from public.horarios where local_id = $1 and barbero_id is null and dia_semana = 6`, [localP]))[0].n
      anotar(filasSabado === 0, 'cerró los sábados desde el panel')
      // b) Dos tramos que se pisan: el panel avisa y no guarda nada.
      await p.getByRole('button', { name: 'Agregar tramo el viernes' }).click()
      await p.getByLabel('Viernes, desde (tramo 2)').fill('19:00')
      await p.getByLabel('Viernes, hasta (tramo 2)').fill('21:00')
      await p.getByRole('button', { name: 'Guardar horario del local' }).click()
      await p.getByRole('status').filter({ hasText: 'se pisan' }).first().waitFor({ timeout: 15_000 })
      const filasViernes = (await q(`select count(*)::int n from public.horarios where local_id = $1 and barbero_id is null and dia_semana = 5`, [localP]))[0].n
      anotar(filasViernes === 1, 'tramos que se pisan: avisa "se pisan" y deja el viernes como estaba')
      // c) Un feriado el viernes, desde el panel.
      await p.getByLabel('Ausencia desde').fill(viernes)
      await p.getByRole('button', { name: 'Agregar ausencia' }).click()
      await p.getByRole('status').filter({ hasText: 'Ausencia agregada' }).first().waitFor({ timeout: 15_000 })
      anotar((await p.locator('body').innerText()).includes('Todo el local'), 'cargó un feriado desde el panel y aparece en la lista')
    }
    await p.context().close()
  }
  {
    const pc2 = await entrar('celu', cliente, `/${SLUG}/reservar`)
    const s = await ofrece(pc2, 'Ana', sabado)
    anotar(s.horarios.length === 0 && s.texto.includes('cerrado'), `la reserva ya no ofrece el sábado: "${s.texto}"`)
    const v = await ofrece(pc2, 'Ana', viernes)
    anotar(v.horarios.length === 0 && v.texto.includes('cerrado'), `ni el viernes del feriado: "${v.texto}"`)
    await pc2.screenshot({ path: resolve(CAPTURAS, 'horarios-reserva-cerrado-celu.png') })
    await pc2.context().close()
  }
} catch (e) {
  fallas++
  console.error(`\n✗ La prueba se cortó: ${e.message.split('\n')[0]}`)
} finally {
  await navegador.close()
  const ids = cuentas.filter(Boolean)
  if (localP) {
    for (const tabla of ['horarios', 'ausencias', 'turnos', 'items_pedido', 'pedidos', 'transacciones', 'membresias', 'resenas', 'productos', 'servicios', 'barberos', 'categorias']) {
      await db.query(`delete from public.${tabla} where local_id = $1`, [localP])
    }
  }
  if (ids.length) {
    await db.query('delete from public.turnos where cliente_id = any($1::uuid[])', [ids])
    await db.query('delete from public.membresias where user_id = any($1::uuid[])', [ids])
  }
  if (localP) await db.query('delete from public.locales where id = $1', [localP])
  await db.end()
  for (const id of ids) await admin('DELETE', `/auth/v1/admin/users/${id}`)
}

console.log(fallas === 0 ? `\n✓ Horarios: todo bien. Capturas en _e2e_shots/` : `\n✗ Horarios: ${fallas} control(es) fallaron.`)
process.exit(fallas === 0 ? 0 : 1)
