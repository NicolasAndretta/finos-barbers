/**
 * scripts/probar-planes.mjs
 *
 * Prueba la Fase 7 (los planes) en la base y con un navegador de verdad. Solo
 * desarrollo: arma un local de prueba y cuentas de prueba, y borra todo al final.
 *
 * Qué prueba:
 *   1. La tabla de planes: la ve cualquiera, nadie la cambia. Los datos de un
 *      local traen su plan.
 *   2. Cambiar el plan: en una muestra, el equipo (no el dueño, y nadie "a
 *      mano"); en un local activo, solo el admin, y con los profesionales que
 *      entran.
 *   3. Los candados de la base en el plan Básico: profesionales de más,
 *      cuentas de profesionales, conectar Mercado Pago, la tienda (lo que ve el
 *      público y los pedidos), la caja, las reseñas a la vista.
 *   4. El panel y la web en Básico y en Pro: el menú, las secciones que el
 *      plan no trae, la tienda que no existe, el límite de profesionales.
 *   5. Reseñas verificadas: solo el cliente del turno, después del turno, una
 *      vez; el dueño las oculta pero no las edita ni las borra; a mano, solo en
 *      una muestra. Y desde "Mis turnos", en el navegador.
 *   6. Reportes: las cuentas que da la base, y quién los ve.
 *   7. Exportar: el CSV de turnos y de clientes, solo para quien administra.
 *   8. Activar eligiendo el plan, desde la plataforma, y bajar de plan sin
 *      perder nada (la cuenta del barbero queda, sin acceso).
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
const pg = createRequire(resolve(PROYECTO, 'package.json'))('pg')
try {
  await fetch(`${APP}/roble`, { signal: AbortSignal.timeout(10_000) })
} catch {
  console.error(`✗ La app no responde en ${APP}. Levantala primero (ver el comentario de arriba de este archivo).`)
  process.exit(1)
}

const SB = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, '')
const PUBLICA = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const MAESTRA = env.SUPABASE_SERVICE_ROLE_KEY
/** Un pedido a Supabase: con la clave pública y una sesión, o con la llave del servidor. */
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
const rpc = (token, funcion, cuerpo) => pedir('POST', `/rest/v1/rpc/${funcion}`, { token, cuerpo })
const filas = (r) => (r.ok && Array.isArray(r.datos) ? r.datos : [])

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
const SLUG = `planes-${sello}`
const cuentas = []
let fallas = 0
const anotar = (ok, texto, detalle = '') => { if (!ok) fallas++; console.log(`  ${ok ? '✓' : '✗'} ${texto}${!ok && detalle ? ` — ${detalle}` : ''}`) }
const titulo = (t) => console.log(`\n${t}`)

async function crearCuenta(nombre, apellido) {
  const email = `${nombre.toLowerCase()}.planes.${sello}@example.com`
  const clave = `Planes-${sello}-x`
  const alta = await servidor('POST', '/auth/v1/admin/users', { email, password: clave, email_confirm: true, user_metadata: { nombre, apellido } })
  if (!alta.datos?.id) throw new Error(`no pude crear la cuenta ${nombre} (${alta.estado})`)
  cuentas.push(alta.datos.id)
  const entrada = await pedir('POST', '/auth/v1/token?grant_type=password', { cuerpo: { email, password: clave } })
  return { id: alta.datos.id, email, clave, token: entrada.datos?.access_token }
}
const PANTALLA = { compu: { viewport: { width: 1280, height: 860 } }, celu: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } }
async function nuevaPagina(pantalla = 'compu') {
  const p = await (await navegador.newContext(PANTALLA[pantalla])).newPage()
  p.on('dialog', (d) => d.accept())
  return p
}
async function entrar(p, cuenta, { local } = {}) {
  await p.goto(`${APP}/login${local ? `?local=${local}` : ''}`, { waitUntil: 'networkidle' })
  await p.fill('#email', cuenta.email); await p.fill('#password', cuenta.clave)
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 }), p.click('button[type="submit"]')])
}
// En minúsculas: algunos textos se ven en mayúsculas por el estilo (y así los devuelve innerText).
const texto = async (p) => (await p.locator('body').innerText()).replace(/\s+/g, ' ').toLowerCase()
const sinScrollDeCostado = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
const local = () => uno(`select * from public.locales where slug = $1`, [SLUG])
/** Las cookies de la sesión de un navegador, para pedir con fetch como esa persona. */
async function galletas(p) {
  return (await p.context().cookies()).map((c) => `${c.name}=${c.value}`).join('; ')
}
const menu = async (p) => (await p.locator('header nav').first().innerText()).replace(/\s+/g, ' ')
/** Una fecha relativa a hoy en Argentina: -1 = ayer. */
const dia = async (n) => (await uno(`select ((now() at time zone 'America/Argentina/Buenos_Aires')::date + $1::int)::text as d`, [n])).d

try {
  const comercial = await crearCuenta('Dana', 'Comercial')
  const jefe = await crearCuenta('Nico', 'Admin')
  const dueno = await crearCuenta('Dario', 'Dueño')
  const cliente = await crearCuenta('Carla', 'Clienta')
  const otra = await crearCuenta('Olga', 'Otra')
  const barbero = await crearCuenta('Beto', 'Barbero')
  await q(`insert into public.equipo (user_id, rol) values ($1, 'comercial'), ($2, 'admin')`, [comercial.id, jefe.id])

  // Una muestra con tres profesionales, y su dueño.
  const alta = await rpc(comercial.token, 'crear_local', {
    p_nombre: `Planes ${sello}`, p_slug: SLUG, p_rubro: 'barberia', p_datos: { whatsapp: '5491122223333' },
    p_servicios: [{ nombre: 'Corte', descripcion: 'x', precio: 16000, duracion: 30 }, { nombre: 'Barba', descripcion: 'x', precio: 11000, duracion: 20 }],
    p_profesionales: [{ nombre: 'Ana', apellido: 'A' }, { nombre: 'Beto', apellido: 'B' }, { nombre: 'Caro', apellido: 'C' }],
  })
  if (!alta.ok) throw new Error(`no pude crear la muestra: ${alta.mensaje}`)
  const L = await local()
  await rpc(comercial.token, 'sumar_dueno', { p_local: L.id, p_usuario: dueno.id })
  const [ana, beto, caro] = await q(`select id from public.barberos where local_id = $1 order by nombre`, [L.id])
  // precio::int: Postgres devuelve los numeric como texto.
  const [corte, barba] = await q(`select id, precio::int as precio from public.servicios where local_id = $1 order by nombre desc`, [L.id])

  // ─── 1. La tabla de planes ────────────────────────────────────────────────
  titulo('1. La tabla de planes')
  const planesPublicos = await pedir('GET', '/rest/v1/planes?select=codigo,max_profesionales&order=orden')
  anotar(filas(planesPublicos).map((p) => `${p.codigo}:${p.max_profesionales ?? '∞'}`).join(' ') === 'basico:2 pro:5 premium:∞',
    'la ve cualquiera (sin cuenta): Básico 2, Pro 5, Premium sin límite', JSON.stringify(planesPublicos.datos))
  const tocar = [
    await pedir('PATCH', '/rest/v1/planes?codigo=eq.basico', { cuerpo: { max_profesionales: 99 } }),
    await pedir('PATCH', '/rest/v1/planes?codigo=eq.basico', { token: jefe.token, cuerpo: { max_profesionales: 99 } }),
    await pedir('POST', '/rest/v1/planes', { token: jefe.token, cuerpo: { codigo: 'gratis', nombre: 'Gratis', orden: 0, precio_usd: 0, cuentas_profesionales: true, senas: true, resenas: true, reportes: true, tienda: true, finanzas: true, exportar: true } }),
  ]
  anotar(tocar.every((r) => !(r.ok && r.datos?.length)) && (await uno(`select max_profesionales from public.planes where codigo = 'basico'`)).max_profesionales === 2,
    'nadie la cambia desde afuera, ni el admin')
  const datos = filas(await rpc(null, 'datos_del_local', { p_slug: SLUG }))[0]
  anotar(datos?.plan === 'premium' && datos?.tienda === true && datos?.max_profesionales === null, 'una muestra nueva nace en Premium, y sus datos lo dicen', JSON.stringify({ plan: datos?.plan, tienda: datos?.tienda }))

  // ─── 2. Cambiar el plan ───────────────────────────────────────────────────
  titulo('2. Cambiar el plan de una muestra')
  const porDueno = await rpc(dueno.token, 'cambiar_plan', { p_local: L.id, p_plan: 'basico' })
  const aMano = await pedir('PATCH', `/rest/v1/locales?id=eq.${L.id}`, { token: comercial.token, cuerpo: { plan: 'basico' } })
  anotar(!porDueno.ok && !(aMano.ok && aMano.datos?.length) && (await local()).plan === 'premium', 'ni el dueño ni nadie "a mano" (ni el equipo) le cambia el plan')
  const aBasico = await rpc(comercial.token, 'cambiar_plan', { p_local: L.id, p_plan: 'basico' })
  anotar(aBasico.ok && (await local()).plan === 'basico', 'la comercial la muestra en Básico (aunque tenga 3 profesionales: es para mirar)', aBasico.mensaje)
  const activarBasico = await rpc(comercial.token, 'activar_local', { p_local: L.id, p_plan: 'basico' })
  anotar(!activarBasico.ok && /hasta 2/.test(activarBasico.mensaje) && (await local()).estado === 'demo',
    'pero no se activa en Básico con 3 profesionales a la vista: pide desactivar los que sobran', activarBasico.mensaje)

  // ─── 3. Los candados en Básico ────────────────────────────────────────────
  titulo('3. Los candados de la base, en Básico')
  const cuarto = await servidor('POST', '/rest/v1/barberos', { local_id: L.id, nombre: 'Dani', apellido: 'D', activo: true })
  anotar(!cuarto.ok && /permite hasta 2/.test(cuarto.mensaje), 'un profesional de más no entra, ni con la llave del servidor', cuarto.mensaje)
  await pedir('PATCH', `/rest/v1/barberos?id=eq.${caro.id}`, { token: dueno.token, cuerpo: { activo: false } })
  const reactivar = await pedir('PATCH', `/rest/v1/barberos?id=eq.${caro.id}`, { token: dueno.token, cuerpo: { activo: true } })
  anotar(!reactivar.ok && (await uno(`select activo from public.barberos where id = $1`, [caro.id])).activo === false,
    'ocultar uno anda; volver a mostrarlo, con 2 a la vista, no', reactivar.mensaje)
  const cuenta = await servidor('POST', '/rest/v1/membresias', { user_id: barbero.id, local_id: L.id, rol: 'barbero', barbero_id: ana.id })
  anotar(!cuenta.ok && /plan Pro/.test(cuenta.mensaje), 'la cuenta propia de un profesional no se crea (es del Pro)', cuenta.mensaje)
  const mp = await servidor('POST', '/rest/v1/mp_conexion', { local_id: L.id, access_token: 'APP_USR-prueba' })
  anotar(!mp.ok && /plan Pro/.test(mp.mensaje), 'Mercado Pago no se conecta (es del Pro)', mp.mensaje)
  const producto = await servidor('POST', '/rest/v1/productos', { local_id: L.id, nombre: 'Cera', descripcion: 'x', precio: 5000, activo: true, stock: 5 })
  const vePublico = async () => filas(await pedir('GET', `/rest/v1/productos?local_id=eq.${L.id}&select=id`)).length
  anotar(producto.ok && (await vePublico()) === 0, 'la tienda: el producto se guarda, pero el público no lo ve', producto.mensaje)
  const pedido = await servidor('POST', '/rest/v1/pedidos', { local_id: L.id, total: 5000 })
  anotar(!pedido.ok && /plan Premium/.test(pedido.mensaje), 'y no entra ningún pedido, ni con la llave del servidor', pedido.mensaje)
  const caja = await pedir('POST', '/rest/v1/transacciones', { token: dueno.token, cuerpo: { local_id: L.id, tipo: 'ingreso', categoria: 'otro', monto: 100, descripcion: 'x', fecha: await dia(0) } })
  anotar(!(caja.ok && caja.datos?.length), 'la caja: el dueño no la usa (es del Premium)', caja.mensaje)
  const resenaMano = await pedir('POST', '/rest/v1/resenas', { token: dueno.token, cuerpo: { local_id: L.id, nombre: 'Martín G.', texto: 'De muestra', rating: 5, visible: true } })
  const veResenas = async () => filas(await pedir('GET', `/rest/v1/resenas?local_id=eq.${L.id}&select=id`)).length
  anotar(resenaMano.ok && (await veResenas()) === 0, 'una reseña de muestra se carga, pero en Básico no se ve en la web', resenaMano.mensaje)

  // ─── 4. El panel y la web en Básico ───────────────────────────────────────
  titulo('4. El panel y la web, en Básico')
  const pd = await nuevaPagina('celu')
  await entrar(pd, dueno, { local: SLUG })
  await pd.goto(`${APP}/${SLUG}/admin/barberos`, { waitUntil: 'networkidle' })
  await pd.getByText('Tu plan (Básico) permite hasta 2').waitFor({ timeout: 30_000 }).catch(() => {})
  anotar((await texto(pd)).includes('tu plan (básico) permite hasta 2'), 'la página de profesionales dice el límite del plan')
  anotar((await texto(pd)).includes('son del plan pro en adelante'), 'y que las cuentas propias son del Pro')
  const pc = await nuevaPagina('compu')
  await entrar(pc, dueno, { local: SLUG })
  await pc.goto(`${APP}/${SLUG}/admin/dashboard`, { waitUntil: 'networkidle' })
  const menuBasico = await menu(pc)
  anotar(!/Productos|Categorías|Reseñas|Reportes|Cobros|Finanzas/.test(menuBasico) && /Turnos/.test(menuBasico), 'el menú no muestra lo que el plan no trae', menuBasico)
  anotar((await texto(pc)).includes('plan básico'), 'y el encabezado dice el plan')
  await pc.goto(`${APP}/${SLUG}/admin/productos`, { waitUntil: 'networkidle' })
  anotar((await texto(pc)).includes('plan premium en adelante'), 'una sección que no trae (Productos), abierta igual, dice qué plan la trae')
  const tienda = await fetch(`${APP}/${SLUG}/tienda`)
  anotar(tienda.status === 404, 'la tienda no existe', String(tienda.status))
  await pc.goto(`${APP}/${SLUG}`, { waitUntil: 'networkidle' })
  anotar(!(await texto(pc)).includes('ver tienda'), 'y la portada no lleva a la tienda')
  await pc.screenshot({ path: resolve(CAPTURAS, 'planes-basico.png'), fullPage: false })

  // ─── 5. En Pro ────────────────────────────────────────────────────────────
  titulo('5. En Pro')
  await rpc(comercial.token, 'cambiar_plan', { p_local: L.id, p_plan: 'pro' })
  await pc.goto(`${APP}/${SLUG}/admin/dashboard`, { waitUntil: 'networkidle' })
  const menuPro = await menu(pc)
  anotar(/Reseñas/.test(menuPro) && /Reportes/.test(menuPro) && /Cobros/.test(menuPro) && !/Productos|Finanzas/.test(menuPro), 'el menú suma Reseñas, Reportes y Cobros (no la tienda ni la caja)', menuPro)
  anotar((await veResenas()) === 1 && (await vePublico()) === 0, 'la reseña de muestra ya se ve en la web; los productos, todavía no')
  const cuentaPro = await servidor('POST', '/rest/v1/membresias', { user_id: barbero.id, local_id: L.id, rol: 'barbero', barbero_id: ana.id })
  const permisosBarbero = filas(await rpc(barbero.token, 'permisos_en_local', { p_local: L.id }))[0]
  anotar(cuentaPro.ok && permisosBarbero?.barbero_id === ana.id, 'la cuenta del barbero se crea, y es barbero en el local', cuentaPro.mensaje)

  // ─── 6. Reseñas verificadas ───────────────────────────────────────────────
  titulo('6. Reseñas verificadas')
  const turno = async (fecha, hora, extra = {}) => (await uno(
    `insert into public.turnos (cliente_id, barbero_id, servicio_id, fecha, hora, local_id, estado, no_vino)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [extra.cliente ?? cliente.id, extra.barbero ?? ana.id, extra.servicio ?? corte.id, fecha, hora, L.id, extra.estado ?? 'confirmado', extra.noVino ?? false])).id
  const ayer = await dia(-1)
  const t1 = await turno(ayer, '10:00')
  const t2 = await turno(ayer, '11:00', { barbero: beto.id, servicio: barba.id })
  const tCancelado = await turno(ayer, '12:00', { estado: 'cancelado' })
  const tNoVino = await turno(ayer, '13:00', { noVino: true })
  const tFuturo = await turno(await dia(3), '10:00')
  const r1 = await rpc(cliente.token, 'dejar_resena', { p_turno: t1, p_rating: 5, p_texto: 'Excelente corte' })
  const verificada = await uno(`select nombre, turno_id, cliente_id from public.resenas where turno_id = $1`, [t1])
  anotar(r1.ok && verificada?.cliente_id === cliente.id && verificada?.nombre === 'Carla C.', 'el cliente deja la reseña de su turno, con su nombre y la inicial del apellido', r1.mensaje || verificada?.nombre)
  const repetida = await rpc(cliente.token, 'dejar_resena', { p_turno: t1, p_rating: 1, p_texto: 'Otra vez' })
  const ajena = await rpc(otra.token, 'dejar_resena', { p_turno: t2, p_rating: 1, p_texto: 'No fui' })
  const futura = await rpc(cliente.token, 'dejar_resena', { p_turno: tFuturo, p_rating: 5, p_texto: 'Todavía no' })
  const cancelada = await rpc(cliente.token, 'dejar_resena', { p_turno: tCancelado, p_rating: 5, p_texto: 'Cancelado' })
  const sinIr = await rpc(cliente.token, 'dejar_resena', { p_turno: tNoVino, p_rating: 5, p_texto: 'No fui' })
  anotar(!repetida.ok && /Ya dejaste/.test(repetida.mensaje), 'una sola vez por turno', repetida.mensaje)
  anotar(!ajena.ok && /no es tuyo/.test(ajena.mensaje), 'nadie reseña un turno ajeno', ajena.mensaje)
  anotar(!futura.ok && !cancelada.ok && !sinIr.ok, 'ni uno que no pasó, ni uno cancelado, ni uno al que no fue', [futura.mensaje, cancelada.mensaje, sinIr.mensaje].join(' | '))
  const resenaId = (await uno(`select id from public.resenas where turno_id = $1`, [t1])).id
  const editar = await pedir('PATCH', `/rest/v1/resenas?id=eq.${resenaId}`, { token: dueno.token, cuerpo: { texto: 'Malísimo' } })
  const borrar = await pedir('DELETE', `/rest/v1/resenas?id=eq.${resenaId}`, { token: dueno.token })
  anotar(!(editar.ok && editar.datos?.length) && !(borrar.ok && borrar.datos?.length) && (await uno(`select texto from public.resenas where id = $1`, [resenaId]))?.texto === 'Excelente corte',
    'el dueño no la edita ni la borra')
  const ocultar = await pedir('PATCH', `/rest/v1/resenas?id=eq.${resenaId}`, { token: dueno.token, cuerpo: { visible: false } })
  anotar(ocultar.ok && ocultar.datos?.length === 1, 'pero sí la oculta')
  const inventada = await pedir('POST', '/rest/v1/resenas', { token: dueno.token, cuerpo: { local_id: L.id, nombre: 'X', texto: 'Inventada', rating: 5, turno_id: t2 } })
  anotar(!(inventada.ok && inventada.datos?.length), 'nadie inventa una "de un cliente" a mano')

  // Desde "Mis turnos", en el navegador.
  const pcl = await nuevaPagina('celu')
  await entrar(pcl, cliente, { local: SLUG })
  await pcl.goto(`${APP}/${SLUG}/turnos`, { waitUntil: 'networkidle' })
  const botones = pcl.getByRole('button', { name: 'Dejar reseña' })
  anotar((await botones.count()) === 1 && (await texto(pcl)).includes('ya dejaste tu reseña'), '"Mis turnos": "Dejar reseña" solo en el turno que falta (el otro ya está reseñado)')
  await botones.first().click()
  await pcl.getByRole('radio', { name: '4 estrellas' }).click()
  await pcl.getByLabel('Tu reseña').fill('Muy buena barba')
  await pcl.getByRole('button', { name: 'Publicar reseña' }).click()
  await pcl.getByText('¡Gracias por tu reseña!').waitFor({ timeout: 30_000 }).catch(() => {})
  const desdeLaWeb = await uno(`select rating, texto from public.resenas where turno_id = $1`, [t2])
  anotar(desdeLaWeb?.rating === 4 && desdeLaWeb?.texto === 'Muy buena barba' && await sinScrollDeCostado(pcl), 'la deja desde el celu, sin scroll de costado', JSON.stringify(desdeLaWeb))
  await pcl.screenshot({ path: resolve(CAPTURAS, 'planes-resena-celu.png'), fullPage: true })

  // ─── 7. Reportes ──────────────────────────────────────────────────────────
  titulo('7. Reportes')
  const desde = await dia(-30)
  const hasta = await dia(30)
  const rep = await rpc(dueno.token, 'reporte_del_local', { p_local: L.id, p_desde: desde, p_hasta: hasta })
  const t = rep.datos?.totales
  anotar(rep.ok && t?.turnos === 5 && t?.cancelados === 1 && t?.no_vinieron === 1 && t?.hechos === 2 && t?.facturado === corte.precio + barba.precio,
    'las cuentas: 5 turnos, 1 cancelado, 1 no vino, 2 atendidos y lo facturado', JSON.stringify(t))
  const porProfesional = rep.datos?.por_profesional ?? []
  anotar(porProfesional.length === 2 && porProfesional.some((p) => p.nombre === 'Beto B' && p.facturado === barba.precio), 'y por profesional', JSON.stringify(porProfesional))
  const repCliente = await rpc(cliente.token, 'reporte_del_local', { p_local: L.id, p_desde: desde, p_hasta: hasta })
  anotar(!repCliente.ok, 'un cliente no los ve', repCliente.mensaje)
  await pc.goto(`${APP}/${SLUG}/admin/reportes`, { waitUntil: 'networkidle' })
  anotar((await texto(pc)).includes('no vinieron') && (await texto(pc)).includes('mes a mes'), 'la página de Reportes, en el panel')

  // ─── 8. Exportar ──────────────────────────────────────────────────────────
  titulo('8. Exportar')
  const conSesion = { headers: { cookie: await galletas(pc) }, redirect: 'manual' }
  const csvTurnos = await fetch(`${APP}/${SLUG}/admin/exportar/turnos`, conSesion)
  const cuerpo = await csvTurnos.text()
  anotar(csvTurnos.status === 200 && (csvTurnos.headers.get('content-type') ?? '').includes('text/csv') && cuerpo.includes('Fecha,Hora,Cliente') && cuerpo.trim().split('\r\n').length === 6,
    'el dueño baja sus turnos en CSV (5 turnos + el encabezado)', `${csvTurnos.status} · ${cuerpo.trim().split('\r\n').length} líneas`)
  const csvClientes = await fetch(`${APP}/${SLUG}/admin/exportar/clientes`, conSesion)
  anotar(csvClientes.status === 200 && (await csvClientes.text()).includes(cliente.email), 'y sus clientes')
  const deCliente = await fetch(`${APP}/${SLUG}/admin/exportar/turnos`, { headers: { cookie: await galletas(pcl) }, redirect: 'manual' })
  const sinCuenta = await fetch(`${APP}/${SLUG}/admin/exportar/turnos`, { redirect: 'manual' })
  anotar(deCliente.status === 403 && sinCuenta.status >= 300 && sinCuenta.status < 400, 'un cliente no puede (403), y sin cuenta va al login', `${deCliente.status} · ${sinCuenta.status}`)

  // ─── 9. Activar con el plan elegido, desde la plataforma ───────────────────
  titulo('9. Activar eligiendo el plan, y bajar de plan sin perder nada')
  const pp = await nuevaPagina('celu')
  await entrar(pp, comercial)
  await pp.goto(`${APP}/plataforma/${SLUG}`, { waitUntil: 'networkidle' })
  anotar((await texto(pp)).includes('plan: pro'), 'la ficha dice en qué plan se está mostrando')
  await pp.getByRole('button', { name: 'Activar el local' }).click()
  await pp.getByRole('radiogroup', { name: 'El plan con el que arranca' }).getByRole('radio', { name: /^Básico/ }).click()
  await pp.getByRole('button', { name: 'Sí, activar' }).click()
  await pp.waitForURL((u) => u.searchParams.has('activado'), { timeout: 30_000 }).catch(() => {})
  let ahora = await local()
  anotar(ahora.estado === 'activo' && ahora.plan === 'basico', 'la comercial la activa eligiendo Básico', `${ahora.estado} · ${ahora.plan}`)
  anotar(!(await uno(`select 1 as hay from public.resenas where local_id = $1`, [L.id])), 'y se borraron las reseñas de la muestra (y lo demás de prueba)')
  const permisosBasico = filas(await rpc(barbero.token, 'permisos_en_local', { p_local: L.id }))[0]
  anotar(permisosBasico?.barbero_id === null && Boolean(await uno(`select 1 as hay from public.membresias where user_id = $1 and local_id = $2 and rol = 'barbero'`, [barbero.id, L.id])),
    'en Básico, la cuenta del barbero queda guardada pero sin acceso a su agenda')
  const manualActivo = await pedir('POST', '/rest/v1/resenas', { token: dueno.token, cuerpo: { local_id: L.id, nombre: 'X', texto: 'Inventada', rating: 5 } })
  anotar(!(manualActivo.ok && manualActivo.datos?.length), 'en un local activo, nadie carga reseñas a mano')
  const porComercial = await rpc(comercial.token, 'cambiar_plan', { p_local: L.id, p_plan: 'pro' })
  anotar(!porComercial.ok && (await local()).plan === 'basico', 'el plan de un local activo no lo cambia la comercial', porComercial.mensaje)
  const aPro = await rpc(jefe.token, 'cambiar_plan', { p_local: L.id, p_plan: 'pro' })
  const caroVuelve = await pedir('PATCH', `/rest/v1/barberos?id=eq.${caro.id}`, { token: dueno.token, cuerpo: { activo: true } })
  anotar(aPro.ok && caroVuelve.ok && caroVuelve.datos?.length === 1, 'el admin lo pasa a Pro, y ahí entra el tercer profesional')
  const bajar = await rpc(jefe.token, 'cambiar_plan', { p_local: L.id, p_plan: 'basico' })
  anotar(!bajar.ok && /tiene 3/.test(bajar.mensaje) && (await local()).plan === 'pro', 'bajar a Básico con 3 a la vista no se puede: dice cuántos sobran', bajar.mensaje)
  ahora = await local()
  anotar((await uno(`select count(*)::int as n from public.turnos where local_id = $1`, [L.id])).n === 0, 'al activar se borraron los turnos de prueba')
  anotar(await sinScrollDeCostado(pp), 'la ficha, en el celu, sin scroll de costado')
  await pp.screenshot({ path: resolve(CAPTURAS, 'planes-ficha-celu.png'), fullPage: true })
} catch (e) {
  fallas++
  console.error(`\n✗ La prueba se cortó: ${e.message}`)
} finally {
  await navegador.close()
  // ─── Limpieza: todo lo que se creó ──────────────────────────────────────
  const ids = (await q(`select id from public.locales where slug = $1`, [SLUG])).map((f) => f.id)
  if (ids.length) {
    for (const t of ['transacciones', 'pedidos', 'resenas', 'turnos', 'mp_conexion', 'horarios', 'ausencias', 'productos', 'servicios', 'categorias', 'barberos', 'membresias']) {
      await q(`delete from public.${t} where local_id = any($1::uuid[])`, [ids])
    }
    await q(`delete from public.locales where id = any($1::uuid[])`, [ids])
  }
  if (cuentas.length) await q(`delete from public.equipo where user_id = any($1::uuid[])`, [cuentas])
  await db.end()
  for (const id of cuentas) await servidor('DELETE', `/auth/v1/admin/users/${id}`)
}

console.log(fallas === 0 ? '\n✓ Los planes andan de punta a punta.' : `\n✗ ${fallas} control(es) fallaron.`)
process.exit(fallas === 0 ? 0 : 1)
