/**
 * scripts/probar-plataforma.mjs
 *
 * Prueba la Fase 6 con un navegador de verdad: dar de alta un local desde el
 * panel de la plataforma, de punta a punta, como lo haría Delfina con el dueño
 * al lado. Solo desarrollo: crea sus cuentas y sus locales, y borra todo al final.
 *
 * Qué prueba:
 *   1. La comercial entra y cae en /plataforma. Crea una muestra desde el celu
 *      con solo lo que tiene a mano: queda en muestra, a su nombre, con la
 *      plantilla del rubro (servicios, horario de lunes a sábado, profesionales).
 *      Una dirección repetida o reservada no se acepta, y el formulario no se vacía.
 *   2. La muestra se ve: cartel de "Muestra", no se indexa, y un cliente reserva
 *      un turno (de prueba) con la plantilla.
 *   3. "Datos del local": la comercial carga la dirección y la página la muestra.
 *   4. Invitar al dueño con un mail nuevo: sale el link, el dueño elige su
 *      contraseña y entra directo a su panel. El link sirve una sola vez.
 *   5. Invitar una cuenta que ya existe: se suma sin link (no se le puede sacar
 *      la cuenta a nadie). Una cuenta del equipo no puede ser dueña.
 *   6. Activar: se borra lo de prueba, se va el cartel, se indexa, y la
 *      comercial deja de ver lo privado y de manejar los dueños.
 *   7. Suspender y reactivar: solo el admin. El dueño sigue entrando a su panel.
 *   8. Archivar y revivir una muestra.
 *   9. Por afuera de la pantalla: quien no es del equipo no entra ni puede usar
 *      las funciones de la plataforma.
 *  10. En celu y en compu, sin scroll de costado.
 *
 * Antes de correrla, la app tiene que estar levantada contra desarrollo, con la
 * dirección pública (para armar el link de invitación):
 *   npm run build
 *   NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 npx next start -H 127.0.0.1 -p 3000
 * y en otra terminal:
 *   node scripts/probar-plataforma.mjs
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
const PUBLICA = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const admin = (metodo, ruta, cuerpo) => fetch(`${SB}${ruta}`, {
  method: metodo,
  headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
  body: cuerpo ? JSON.stringify(cuerpo) : undefined,
}).then((r) => r.json().catch(() => ({})))
/** Un pedido a Supabase como lo haría alguien desde afuera de la app: clave pública + su sesión. */
async function comoUsuario(token, metodo, ruta, cuerpo) {
  const r = await fetch(`${SB}${ruta}`, {
    method: metodo,
    headers: { apikey: PUBLICA, Authorization: `Bearer ${token ?? PUBLICA}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  const datos = await r.json().catch(() => null)
  return { ok: r.ok, datos }
}
async function token(cuenta) {
  const r = await comoUsuario(null, 'POST', '/auth/v1/token?grant_type=password', { email: cuenta.email, password: cuenta.clave })
  return r.datos?.access_token
}

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
const NOMBRE = `Barbería Alta ${sello}`
const SLUG = `barberia-alta-${sello}`
const SLUG_ARCHIVO = `archivo-${sello}`
const MAIL_DUENO = `dueno.alta.${sello}@example.com`
const CLAVE_DUENO = `Dueno-${sello}-x`
const cuentas = []
let fallas = 0
const anotar = (ok, texto, detalle = '') => { if (!ok) fallas++; console.log(`  ${ok ? '✓' : '✗'} ${texto}${!ok && detalle ? ` — ${detalle}` : ''}`) }
const titulo = (t) => console.log(`\n${t}`)

async function crearCuenta(nombre, apellido) {
  const email = `${nombre.toLowerCase()}.alta.${sello}@example.com`
  const clave = `Prueba-${sello}-x`
  const { id } = await admin('POST', '/auth/v1/admin/users', { email, password: clave, email_confirm: true, user_metadata: { nombre, apellido } })
  cuentas.push(id)
  return { id, email, clave }
}
const PANTALLA = { compu: { viewport: { width: 1280, height: 860 } }, celu: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } }
async function nuevaPagina(pantalla = 'compu') {
  const p = await (await navegador.newContext(PANTALLA[pantalla])).newPage()
  p.on('dialog', (d) => d.accept()) // los "¿seguro?" se aceptan
  return p
}
const texto = async (p) => (await p.locator('body').innerText()).replace(/\s+/g, ' ')
const sinScrollDeCostado = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
// El aviso de error de la pantalla (Next tiene otro role="alert" suyo, fuera de <main>).
const alerta = (p) => p.locator('main [role="alert"]').first()
const robots = (p) => p.locator('meta[name="robots"]').getAttribute('content').catch(() => null)
async function entrar(p, cuenta, { local } = {}) {
  await p.goto(`${APP}/login${local ? `?local=${local}` : ''}`, { waitUntil: 'networkidle' })
  await p.fill('#email', cuenta.email); await p.fill('#password', cuenta.clave)
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 }), p.click('button[type="submit"]')])
}
const localPorSlug = (slug) => uno(`select * from public.locales where slug = $1`, [slug])
/** La sesión de Supabase que tiene un navegador: el nombre de la cookie y lo que guarda (juntando los pedazos). */
async function sesionDe(p) {
  const galletas = (await p.context().cookies()).filter((c) => /-auth-token(.d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  const nombre = galletas[0].name.replace(/.d+$/, '')
  const valor = galletas.map((c) => c.value).join('')
  const crudo = valor.startsWith('base64-') ? Buffer.from(valor.slice(7), 'base64url').toString() : decodeURIComponent(valor)
  return { nombre, datos: JSON.parse(crudo) }
}

try {
  const comercial = await crearCuenta('Delfi', 'Comercial')
  const jefe = await crearCuenta('Nico', 'Admin')
  const cliente = await crearCuenta('Carla', 'Cliente')
  const otra = await crearCuenta('Olga', 'Existente')
  await q(`insert into public.equipo (user_id, rol) values ($1, 'comercial'), ($2, 'admin')`, [comercial.id, jefe.id])

  // ─── 1. Crear una muestra desde el celu ───────────────────────────────────
  titulo('1. La comercial crea una muestra desde el celu')
  const pc = await nuevaPagina('celu')
  await entrar(pc, comercial)
  anotar(new URL(pc.url()).pathname === '/plataforma', 'al entrar, la comercial cae en /plataforma', pc.url())
  await pc.getByRole('link', { name: '+ Nueva muestra' }).click()
  await pc.waitForURL('**/plataforma/nuevo')
  await pc.fill('#nombre', NOMBRE)
  anotar((await pc.inputValue('#slug')) === SLUG, 'la dirección web se arma sola del nombre (sin acentos)', await pc.inputValue('#slug'))
  await pc.fill('#whatsapp', '+54 9 11 2345-6789')
  await pc.fill('#instagram', '@alta.barberia')
  await pc.fill('#profesionales', 'Tano Gómez\nLeo')
  anotar(await sinScrollDeCostado(pc), 'el formulario, en el celu, sin scroll de costado')
  await pc.screenshot({ path: resolve(CAPTURAS, 'plataforma-nueva-celu.png'), fullPage: true })
  await pc.getByRole('button', { name: 'Crear la muestra' }).click()
  await pc.waitForURL((u) => u.pathname === `/plataforma/${SLUG}` && u.searchParams.get('nueva') === '1', { timeout: 30_000 })
  const creado = await localPorSlug(SLUG)
  anotar(creado?.estado === 'demo' && creado?.creado_por === comercial.id, 'quedó en muestra, y a nombre de la comercial')
  anotar(creado?.whatsapp === '5491123456789' && creado?.instagram === 'alta.barberia', 'el WhatsApp y el Instagram se guardan limpios', `${creado?.whatsapp} · ${creado?.instagram}`)
  const conteo = await uno(`
    select (select count(*)::int from public.servicios where local_id = $1) as servicios,
           (select string_agg(nombre || ' ' || apellido, ', ' order by nombre) from public.barberos where local_id = $1) as profesionales,
           (select count(*)::int from public.horarios where local_id = $1 and barbero_id is null and dia_semana between 1 and 6 and desde = '10:00' and hasta = '20:00') as tramos,
           (select count(*)::int from public.horarios where local_id = $1 and dia_semana = 0) as domingo`, [creado.id])
  anotar(conteo.servicios === 3 && conteo.tramos === 6 && conteo.domingo === 0, 'con la plantilla: 3 servicios y horario de lunes a sábado de 10 a 20', JSON.stringify(conteo))
  anotar(conteo.profesionales === 'Leo , Tano Gómez', 'con los profesionales que se cargaron', conteo.profesionales)
  anotar((await texto(pc)).includes('¡Muestra creada!') && await sinScrollDeCostado(pc), 'la ficha avisa que se creó, sin scroll de costado')
  const dias = (await uno(`select extract(epoch from muestra_hasta - now()) / 86400 as d from public.locales where id = $1`, [creado.id])).d
  anotar(dias > 29.9 && dias <= 30, 'la muestra vence en 30 días', String(dias))
  anotar((await texto(pc)).includes('Se archiva sola el'), 'y la ficha dice cuándo se archiva sola')
  await pc.screenshot({ path: resolve(CAPTURAS, 'plataforma-ficha-celu.png'), fullPage: true })

  // Repetida y reservada: el error, sin vaciar el formulario.
  await pc.goto(`${APP}/plataforma/nuevo`, { waitUntil: 'networkidle' })
  await pc.fill('#nombre', NOMBRE)
  await pc.fill('#whatsapp', '5491100000000')
  await pc.getByRole('button', { name: 'Crear la muestra' }).click()
  await alerta(pc).waitFor({ timeout: 30_000 })
  anotar((await alerta(pc).innerText()).includes('ya es de otro local') && (await pc.inputValue('#whatsapp')) === '5491100000000',
    'una dirección repetida no se acepta, y el formulario no se vacía')
  await pc.fill('#slug', 'login')
  await pc.getByRole('button', { name: 'Crear la muestra' }).click()
  await pc.waitForFunction(() => document.querySelector('main [role="alert"]')?.textContent?.includes('reservada'), null, { timeout: 30_000 }).catch(() => {})
  anotar((await alerta(pc).innerText()).includes('reservada') && !(await localPorSlug('login')), 'una dirección reservada para la plataforma tampoco')

  // ─── 2. La muestra se ve, y se puede reservar ─────────────────────────────
  titulo('2. La muestra: cartel, sin Google, y la reserva anda con la plantilla')
  const pv = await nuevaPagina('celu')
  await pv.goto(`${APP}/${SLUG}`, { waitUntil: 'networkidle' })
  const home = await texto(pv)
  anotar(home.includes('Esto es una muestra') && home.includes('Corte + barba') && home.includes('Tano'), 'la página muestra el cartel, los servicios y los profesionales')
  anotar((await robots(pv))?.includes('noindex'), 'y le pide a Google que no la indexe', String(await robots(pv)))
  anotar(await sinScrollDeCostado(pv), 'la página de la muestra, en el celu, sin scroll de costado')

  await pv.goto(`${APP}/${SLUG}/reservar`, { waitUntil: 'networkidle' })
  await pv.fill('#email', cliente.email); await pv.fill('#password', cliente.clave)
  await Promise.all([pv.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 }), pv.click('button[type="submit"]')])
  if (!pv.url().includes('/reservar')) await pv.goto(`${APP}/${SLUG}/reservar`, { waitUntil: 'networkidle' })
  await pv.locator('button:has-text("min")').first().click()
  await pv.locator('button:has-text("✂️")').first().click()
  const d = new Date(); d.setDate(d.getDate() + 5); while (d.getDay() !== 2) d.setDate(d.getDate() + 1)
  await pv.fill('input[type="date"]', `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  await pv.getByRole('button', { name: /^\d\d:\d\d$/ }).first().click({ timeout: 30_000 })
  await pv.getByText('Transferencia', { exact: true }).click()
  await pv.getByRole('button', { name: 'Confirmar reserva' }).click()
  await pv.getByText('¡Turno reservado!').waitFor({ timeout: 30_000 })
  anotar((await uno(`select count(*)::int as n from public.turnos where local_id = $1`, [creado.id])).n === 1, 'un cliente reservó un turno de prueba')

  // ─── 3. Datos del local ───────────────────────────────────────────────────
  titulo('3. Datos del local, desde su panel')
  await pc.goto(`${APP}/${SLUG}/admin/local`, { waitUntil: 'networkidle' })
  anotar(await sinScrollDeCostado(pc), '"Datos del local", en el celu, sin scroll de costado')
  await pc.fill('#whatsapp', '123')
  await pc.getByRole('button', { name: 'Guardar los datos' }).click()
  await alerta(pc).waitFor({ timeout: 30_000 })
  anotar((await alerta(pc).innerText()).includes('código de país'), 'un WhatsApp mal cargado no se guarda')
  await pc.fill('#whatsapp', '5491123456789')
  await pc.fill('#direccion', 'Av. Prueba 123')
  await pc.fill('#ciudad', 'Mataderos')
  await pc.fill('#lema', 'Cortes de barrio, bien hechos.')
  await pc.getByRole('button', { name: 'Guardar los datos' }).click()
  await pc.getByText('Datos guardados').waitFor({ timeout: 30_000 })
  const conDatos = await localPorSlug(SLUG)
  anotar(conDatos.direccion === 'Av. Prueba 123' && conDatos.ciudad === 'Mataderos' && conDatos.estado === 'demo', 'se guardan (y el estado no cambia)')
  await pv.goto(`${APP}/${SLUG}`, { waitUntil: 'networkidle' })
  anotar((await texto(pv)).includes('Av. Prueba 123') && (await texto(pv)).includes('Cortes de barrio'), 'la página ya los muestra')

  // ─── 4. Invitar al dueño (mail nuevo) ─────────────────────────────────────
  titulo('4. Invitar al dueño con un mail nuevo')
  const pf = await nuevaPagina('compu')
  await entrar(pf, comercial)
  await pf.goto(`${APP}/plataforma/${SLUG}`, { waitUntil: 'networkidle' })
  await pf.getByLabel('Nombre del dueño').fill('Diego')
  await pf.getByLabel('Apellido del dueño').fill('Dueño')
  await pf.getByLabel('Mail del dueño').fill(MAIL_DUENO)
  await pf.getByRole('button', { name: 'Invitar', exact: true }).click()
  const campoLink = pf.getByLabel('El link de invitación')
  await campoLink.waitFor({ timeout: 30_000 })
  const link = await campoLink.inputValue()
  const cuentaDueno = await uno(`select id, raw_app_meta_data from auth.users where email = $1`, [MAIL_DUENO])
  if (cuentaDueno) cuentas.push(cuentaDueno.id)
  anotar(link.startsWith(`${APP}/auth/callback?token_hash=`) && link.includes('type=recovery'), 'sale el link para elegir la contraseña', link.slice(0, 60))
  anotar(cuentaDueno?.raw_app_meta_data?.invitado_a === creado.id &&
    Boolean(await uno(`select 1 as hay from public.membresias where user_id = $1 and local_id = $2 and rol = 'dueno'`, [cuentaDueno?.id, creado.id])),
    'la cuenta se creó y ya es dueña de ESE local')
  await pf.screenshot({ path: resolve(CAPTURAS, 'plataforma-invitacion-compu.png'), fullPage: true })

  const pd = await nuevaPagina('celu')
  await pd.goto(link, { waitUntil: 'networkidle' })
  anotar(pd.url().includes(`/restablecer?bienvenida=${SLUG}`) && (await texto(pd)).includes('¡Bienvenido!'), 'el link lleva a elegir la contraseña, con la bienvenida', pd.url())
  await pd.fill('#password', CLAVE_DUENO); await pd.fill('#confirm', CLAVE_DUENO)
  await Promise.all([pd.waitForURL((u) => u.pathname === `/${SLUG}/admin/dashboard`, { timeout: 30_000 }), pd.click('button[type="submit"]')])
  anotar(true, 'el dueño elige su contraseña y entra directo a su panel')
  const pd2 = await nuevaPagina('compu')
  await pd2.goto(link, { waitUntil: 'networkidle' })
  anotar(pd2.url().includes('error=1') && !pd2.url().includes('/restablecer'), 'el mismo link no sirve dos veces', pd2.url())
  await pf.reload({ waitUntil: 'networkidle' })
  anotar((await texto(pf)).includes('ya entró') && (await pf.getByRole('button', { name: 'Sacar otro link' }).count()) === 0,
    'en la ficha, el dueño figura como que ya entró (y no hay "otro link" para él)')
  const dueno = { id: cuentaDueno.id, email: MAIL_DUENO, clave: CLAVE_DUENO }

  // ─── 5. Una cuenta que ya existe, y una del equipo ─────────────────────────
  titulo('5. Invitar una cuenta que ya existe, y una del equipo')
  // Cada invitación arranca de la ficha recién cargada: así el aviso que aparece es el de
  // esta invitación (sea cual sea: "ya tenía cuenta", el link o un error).
  const invitar = async (nombre, email) => {
    await pf.reload({ waitUntil: 'networkidle' })
    await pf.getByLabel('Nombre del dueño').fill(nombre)
    await pf.getByLabel('Mail del dueño').fill(email)
    await pf.getByRole('button', { name: 'Invitar', exact: true }).click()
    await pf.waitForSelector('main form [role="status"], main form [role="alert"]', { timeout: 30_000 })
  }
  await invitar('Olga', otra.email)
  anotar((await texto(pf)).includes('ya tenía cuenta') && (await pf.getByLabel('El link de invitación').count()) === 0,
    'una cuenta en uso se suma sin link (nadie se puede quedar con la cuenta de otro)')
  anotar(Boolean(await uno(`select 1 as hay from public.membresias where user_id = $1 and local_id = $2 and rol = 'dueno'`, [otra.id, creado.id])), 'y queda como dueña')
  await pf.reload({ waitUntil: 'networkidle' })
  await pf.locator('li', { hasText: otra.email }).getByRole('button', { name: 'Sacar', exact: true }).click()
  await pf.waitForFunction((m) => !document.body.innerText.includes(m), otra.email, { timeout: 30_000 }).catch(() => {})
  anotar(!(await uno(`select 1 as hay from public.membresias where user_id = $1 and local_id = $2 and rol = 'dueno'`, [otra.id, creado.id])), 'se la puede sacar (la cuenta no se borra)')
  await invitar('Nico', jefe.email)
  anotar((await alerta(pf).innerText()).includes('equipo') &&
    !(await uno(`select 1 as hay from public.membresias where user_id = $1 and rol = 'dueno'`, [jefe.id])), 'una cuenta del equipo no puede ser dueña')

  // ─── 6. Activar ───────────────────────────────────────────────────────────
  titulo('6. Activar')
  await pf.reload({ waitUntil: 'networkidle' })
  await pf.getByRole('button', { name: 'Activar el local' }).click()
  anotar((await texto(pf)).includes('1 turno(s) de prueba'), 'antes de activar, avisa cuántos turnos de prueba se borran')
  await Promise.all([pf.waitForURL((u) => u.pathname === `/plataforma/${SLUG}` && u.searchParams.get('activado') === '1', { timeout: 30_000 }), pf.getByRole('button', { name: 'Sí, activar' }).click()])
  const activo = await localPorSlug(SLUG)
  const quedan = await uno(`select (select count(*)::int from public.turnos where local_id = $1) as turnos,
                                   (select count(*)::int from public.membresias where local_id = $1 and rol = 'cliente') as clientes`, [creado.id])
  anotar(activo.estado === 'activo' && activo.activado_por === comercial.id && activo.activado_en, 'quedó activo, con quién y cuándo')
  anotar(quedan.turnos === 0 && quedan.clientes === 0, 'lo de prueba se borró (turnos y clientes)', JSON.stringify(quedan))
  anotar((await texto(pf)).includes('¡Activado!'), 'la ficha avisa que se activó')
  await pv.goto(`${APP}/${SLUG}`, { waitUntil: 'networkidle' })
  anotar(!(await texto(pv)).includes('Esto es una muestra') && !(await robots(pv))?.includes('noindex'), 'la página ya no tiene el cartel, y Google la puede indexar')
  anotar((await texto(pf)).includes('los maneja el admin') && (await pf.getByLabel('Mail del dueño').count()) === 0,
    'la comercial ya no maneja los dueños de un local activo')
  await pc.goto(`${APP}/${SLUG}/admin/dashboard`, { waitUntil: 'networkidle' })
  anotar((await pc.getByRole('link', { name: 'Turnos', exact: true }).count()) === 0, 'y en el panel del local ya no ve los turnos (lo privado de un local activo)')

  // ─── 7. Suspender y reactivar: solo el admin ──────────────────────────────
  titulo('7. Suspender y reactivar: solo el admin')
  anotar((await texto(pf)).includes('Suspender: lo hace solo el admin'), 'a la comercial no le ofrece suspender')
  const pa = await nuevaPagina('compu')
  await entrar(pa, jefe)
  await pa.goto(`${APP}/plataforma/${SLUG}`, { waitUntil: 'networkidle' })
  anotar((await texto(pa)).includes(MAIL_DUENO), 'el admin sí ve los dueños de un local activo')
  await pa.getByRole('button', { name: 'Suspender' }).click()
  await pa.waitForFunction(() => document.body.innerText.includes('Reactivar'), null, { timeout: 30_000 })
  anotar((await localPorSlug(SLUG)).estado === 'suspendido', 'el admin lo suspende')
  await pv.goto(`${APP}/${SLUG}`, { waitUntil: 'networkidle' })
  anotar((await texto(pv)).includes('no está tomando reservas'), 'la página avisa que no toma reservas')
  await pd.goto(`${APP}/${SLUG}/admin/dashboard`, { waitUntil: 'networkidle' })
  anotar(pd.url().includes(`/${SLUG}/admin/dashboard`) && !(await texto(pd)).includes('no está tomando reservas'), 'el dueño sigue entrando a su panel')
  await pa.getByRole('button', { name: 'Reactivar' }).click()
  await pa.waitForFunction(() => document.body.innerText.includes('Suspender'), null, { timeout: 30_000 })
  anotar((await localPorSlug(SLUG)).estado === 'activo', 'y lo reactiva')

  // ─── 8. Archivar y revivir una muestra ────────────────────────────────────
  titulo('8. Archivar y revivir una muestra')
  const tokenComercial = await token(comercial)
  const alta = await comoUsuario(tokenComercial, 'POST', '/rest/v1/rpc/crear_local', {
    p_nombre: 'Muestra que no se vendió', p_slug: SLUG_ARCHIVO, p_rubro: 'unas', p_datos: {}, p_servicios: [], p_profesionales: [],
  })
  anotar(alta.ok, 'otra muestra, de uñas')
  // Recién creada (con el aviso de "creada" arriba), como le pasó a Nico el 29/10.
  await pf.goto(`${APP}/plataforma/${SLUG_ARCHIVO}?nueva=1`, { waitUntil: 'networkidle' })
  await pf.getByRole('button', { name: 'Sumar 30 días' }).click()
  let extendida = 0
  for (let i = 0; i < 60 && extendida < 59; i++) {
    await pf.waitForTimeout(500)
    extendida = (await uno(`select extract(epoch from muestra_hasta - now()) / 86400 as d from public.locales where slug = $1`, [SLUG_ARCHIVO])).d
  }
  anotar(extendida > 59.9 && extendida <= 60, '"Sumar 30 días" la estira a 60', String(extendida))
  await pf.getByRole('button', { name: 'Archivar la muestra' }).click()
  await pf.waitForFunction(() => document.body.innerText.includes('Revivir la muestra'), null, { timeout: 30_000 })
  await pv.goto(`${APP}/${SLUG_ARCHIVO}`, { waitUntil: 'networkidle' })
  anotar((await localPorSlug(SLUG_ARCHIVO)).estado === 'archivado' && (await texto(pv)).includes('ya no está disponible'), 'la comercial la archiva: el link deja de andar')
  const fichaArchivada = await texto(pf)
  anotar(fichaArchivada.includes('Archivada. El link ya no anda') && !fichaArchivada.includes('¡Muestra creada!'),
    'la ficha dice "Archivada" y ya no "¡Muestra creada!"')
  await q(`update public.locales set muestra_hasta = now() - interval '5 days' where slug = $1`, [SLUG_ARCHIVO])
  await pf.getByRole('button', { name: 'Revivir la muestra' }).click()
  await pf.waitForFunction(() => document.body.innerText.includes('Archivar la muestra'), null, { timeout: 30_000 })
  const revivida = (await uno(`select extract(epoch from muestra_hasta - now()) / 86400 as d from public.locales where slug = $1`, [SLUG_ARCHIVO])).d
  anotar((await localPorSlug(SLUG_ARCHIVO)).estado === 'demo' && revivida > 29.9 && revivida <= 30 && (await texto(pf)).includes('Revivida'),
    'y la revive: 30 días de nuevo', String(revivida))

  // El reloj de la base: lo que corre todas las noches, corrido ahora.
  const reloj = await uno(`select command, schedule from cron.job where jobname = 'archivar-muestras-vencidas'`)
  anotar(reloj?.schedule === '0 6 * * *', 'el reloj está programado todas las noches (3 de la mañana en Argentina)')
  await q(`update public.locales set muestra_hasta = now() - interval '1 minute' where slug = $1`, [SLUG_ARCHIVO])
  await q(reloj.command)
  anotar((await localPorSlug(SLUG_ARCHIVO)).estado === 'archivado', 'una muestra vencida se archiva sola')
  anotar((await localPorSlug(SLUG)).estado === 'activo' && (await localPorSlug('roble'))?.estado === 'demo' && !(await localPorSlug('roble')).muestra_hasta,
    'y no toca ni un local activo ni a Roble (que no vence)')
  await q(`update public.locales set estado = 'demo' where slug = $1`, [SLUG_ARCHIVO])

  // ─── 9. Por afuera de la pantalla ─────────────────────────────────────────
  titulo('9. Por afuera de la pantalla')
  const pcl = await nuevaPagina('compu')
  await pcl.goto(`${APP}/plataforma`, { waitUntil: 'networkidle' })
  anotar(new URL(pcl.url()).pathname === '/login', 'sin sesión, /plataforma lleva al login')
  await entrar(pcl, cliente, { local: SLUG })
  await pcl.goto(`${APP}/plataforma`, { waitUntil: 'networkidle' })
  anotar(!new URL(pcl.url()).pathname.startsWith('/plataforma'), 'un cliente no entra a /plataforma', pcl.url())
  await pd.goto(`${APP}/plataforma/${SLUG}`, { waitUntil: 'networkidle' })
  anotar(!new URL(pd.url()).pathname.startsWith('/plataforma'), 'el dueño tampoco', pd.url())

  // La sesión se verifica en el servidor con la firma del token (getClaims,
  // desde la tanda 6b). Contraprueba: el dueño edita su token para decir que
  // es el admin. La firma ya no coincide: no entra, ni a la plataforma ni a un
  // panel, y ni siquiera queda "con sesión".
  const sesionDelDueno = await sesionDe(pd)
  const conSesion = (sesion) => ({ cookie: `${sesion.nombre}=base64-${Buffer.from(JSON.stringify(sesion.datos)).toString('base64url')}` })
  const comoAdmin = structuredClone(sesionDelDueno)
  const [cab, carga, firma] = comoAdmin.datos.access_token.split('.')
  comoAdmin.datos.access_token = [cab, Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(carga, 'base64url')), sub: jefe.id })).toString('base64url'), firma].join('.')
  if (comoAdmin.datos.user) comoAdmin.datos.user.id = jefe.id
  const verdadera = await fetch(`${APP}/plataforma`, { redirect: 'manual', headers: conSesion(sesionDelDueno) })
  const falsa = await fetch(`${APP}/plataforma`, { redirect: 'manual', headers: conSesion(comoAdmin) })
  const panelFalso = await fetch(`${APP}/${SLUG}/admin/turnos`, { redirect: 'manual', headers: conSesion(comoAdmin) })
  const destino = (r) => new URL(r.headers.get('location') ?? '/', APP).pathname
  anotar(verdadera.status >= 300 && verdadera.status < 400 && destino(verdadera) === '/', 'con su sesión de verdad, el dueño va al inicio (no es del equipo)', `${verdadera.status} → ${destino(verdadera)}`)
  anotar(falsa.status >= 300 && falsa.status < 400 && destino(falsa) === '/login', 'con el token editado para ser el admin, no entra: va al login', `${falsa.status} → ${destino(falsa)}`)
  anotar(panelFalso.status >= 300 && panelFalso.status < 400 && destino(panelFalso) === '/login', 'y tampoco al panel del local', `${panelFalso.status} → ${destino(panelFalso)}`)

  const tCliente = await token(cliente)
  const tDueno = await token(dueno)
  const resumen = await comoUsuario(tCliente, 'POST', '/rest/v1/rpc/resumen_de_locales', {})
  anotar(resumen.ok && Array.isArray(resumen.datos) && resumen.datos.length === 0, 'el resumen de la plataforma, para un cliente, viene vacío')
  const archivo = await localPorSlug(SLUG_ARCHIVO)
  const r5 = await comoUsuario(tokenComercial, 'POST', '/rest/v1/rpc/activar_local', { p_local: archivo.id })
  anotar(!r5.ok && (await localPorSlug(SLUG_ARCHIVO)).estado === 'demo', 'una muestra sin dueño no se activa')
  // Con dueño, lo único que frena a los de abajo es el permiso (no que falte algo).
  await q(`insert into public.membresias (user_id, local_id, rol) values ($1, $2, 'dueno')`, [otra.id, archivo.id])
  for (const [quien, t] of [['un cliente', tCliente], ['un dueño', tDueno]]) {
    const r1 = await comoUsuario(t, 'POST', '/rest/v1/rpc/activar_local', { p_local: archivo.id })
    const r2 = await comoUsuario(t, 'POST', '/rest/v1/rpc/cambiar_estado_local', { p_local: archivo.id, p_estado: 'archivado' })
    const r3 = await comoUsuario(t, 'POST', '/rest/v1/rpc/sumar_dueno', { p_local: archivo.id, p_usuario: cliente.id })
    anotar(!r1.ok && !r2.ok && !r3.ok && (await localPorSlug(SLUG_ARCHIVO)).estado === 'demo' &&
      !(await uno(`select 1 as hay from public.membresias where local_id = $1 and user_id = $2`, [archivo.id, cliente.id])),
      `${quien} no puede activar una muestra lista, archivarla ni sumar dueños`)
  }
  const r4 = await comoUsuario(tokenComercial, 'POST', '/rest/v1/rpc/sumar_dueno', { p_local: activo.id, p_usuario: otra.id })
  anotar(!r4.ok && !(await uno(`select 1 as hay from public.membresias where user_id = $1 and local_id = $2`, [otra.id, activo.id])),
    'la comercial no puede sumar dueños a un local activo (ni por afuera de la pantalla)')
  const r6 = await comoUsuario(tokenComercial, 'PATCH', `/rest/v1/locales?id=eq.${archivo.id}`, { activado_en: new Date().toISOString() })
  anotar(!(r6.ok && r6.datos?.length) && !(await localPorSlug(SLUG_ARCHIVO)).activado_en, 'nadie cambia el registro de alta "a mano", ni el equipo')
  const r7 = await comoUsuario(tDueno, 'PATCH', `/rest/v1/locales?id=eq.${activo.id}`, { slug: `robado-${sello}` })
  anotar(!(r7.ok && r7.datos?.length) && (await localPorSlug(SLUG)), 'el dueño no puede cambiar la dirección web de su local')
  const lejos = new Date(Date.now() + 400 * 86_400_000).toISOString()
  const r9 = await comoUsuario(tokenComercial, 'PATCH', `/rest/v1/locales?id=eq.${archivo.id}`, { muestra_hasta: lejos })
  const r10 = await comoUsuario(tCliente, 'POST', '/rest/v1/rpc/extender_muestra', { p_local: archivo.id })
  const r11 = await comoUsuario(tDueno, 'POST', '/rest/v1/rpc/extender_muestra', { p_local: archivo.id })
  const diasArchivo = (await uno(`select extract(epoch from muestra_hasta - now()) / 86400 as d from public.locales where id = $1`, [archivo.id])).d
  anotar(!(r9.ok && r9.datos?.length) && !r10.ok && !r11.ok && diasArchivo <= 30,
    'nadie estira una muestra "a mano", y ni un cliente ni un dueño pueden extenderla', String(diasArchivo))
  const r8 = await comoUsuario(tDueno, 'PATCH', `/rest/v1/locales?id=eq.${activo.id}`, { lema: 'Lema del dueño' })
  anotar(r8.ok && r8.datos?.length === 1, 'pero sí los datos de su local')

  // ─── 10. En compu ─────────────────────────────────────────────────────────
  titulo('10. En compu')
  await pa.goto(`${APP}/plataforma`, { waitUntil: 'networkidle' })
  anotar(await sinScrollDeCostado(pa) && (await texto(pa)).includes(NOMBRE), 'la lista de la plataforma, en compu, con el local nuevo')
  await pa.screenshot({ path: resolve(CAPTURAS, 'plataforma-lista-compu.png'), fullPage: true })
  const pl = await nuevaPagina('celu')
  await entrar(pl, jefe)
  anotar(await sinScrollDeCostado(pl), 'y en el celu, sin scroll de costado')
  await pl.screenshot({ path: resolve(CAPTURAS, 'plataforma-lista-celu.png'), fullPage: true })
} catch (e) {
  fallas++
  console.error(`\n✗ La prueba se cortó: ${e.message.split('\n')[0]}`)
} finally {
  await navegador.close()
  // ─── Limpieza: todo lo que se creó ──────────────────────────────────────
  const ids = (await q(`select id from public.locales where slug = any($1::text[])`, [[SLUG, SLUG_ARCHIVO]])).map((f) => f.id)
  if (ids.length) {
    for (const t of ['transacciones', 'pedidos', 'turnos', 'mp_conexion', 'horarios', 'ausencias', 'resenas', 'productos', 'servicios', 'categorias', 'barberos', 'membresias']) {
      await q(`delete from public.${t} where local_id = any($1::uuid[])`, [ids])
    }
    await q(`delete from public.locales where id = any($1::uuid[])`, [ids])
  }
  const dueno = await uno(`select id from auth.users where email = $1`, [MAIL_DUENO])
  if (dueno && !cuentas.includes(dueno.id)) cuentas.push(dueno.id)
  if (cuentas.length) await q(`delete from public.equipo where user_id = any($1::uuid[])`, [cuentas])
  await db.end()
  for (const id of cuentas) await admin('DELETE', `/auth/v1/admin/users/${id}`)
}

console.log(fallas === 0 ? '\n✓ El alta de locales anda de punta a punta.' : `\n✗ ${fallas} control(es) fallaron.`)
process.exit(fallas === 0 ? 0 : 1)
