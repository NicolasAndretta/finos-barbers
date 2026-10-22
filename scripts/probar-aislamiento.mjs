/**
 * scripts/probar-aislamiento.mjs
 *
 * Prueba el cuadro de permisos de la Fase 2 con cuentas de verdad: que cada
 * persona vea y toque exactamente lo que le corresponde en cada local, y nada
 * de otro.
 *
 *   node scripts/probar-aislamiento.mjs
 *
 * Qué arma (y borra al final):
 *   - un segundo local, "B", en estado activo (Roble está en demo);
 *   - catálogo, turnos, pedidos y caja en los dos locales;
 *   - una cuenta de cada tipo: cliente (reservó en los dos), "ajeno" (no tiene
 *     nada que ver con ningún local), barbero de Roble, dueño de Roble, dueño
 *     de B, comercial y admin.
 * Después, cada cuenta le pide a la base lo mismo que pediría la app (con la
 * clave pública y su sesión) y se compara con el cuadro de
 * docs/MULTITENANT.md ("Fase 2 — Plan aprobado").
 *
 * Solo corre en DESARROLLO. Es la base de la prueba completa de la Fase 5.
 *
 * Opciones:
 *   --env ARCHIVO   de qué archivo leer las credenciales (por defecto .env.local)
 */
import { describirDestino, exigirDesarrollo, leerArgumentos, leerEnv } from './lib/entorno.mjs'
import { conectar } from './lib/postgres.mjs'

const { opciones } = leerArgumentos(['env'])
const env = leerEnv(opciones.env || '.env.local')
exigirDesarrollo(env) // nunca corre fuera de desarrollo

const BASE = (env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
const PUBLICA = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const MAESTRA = env.SUPABASE_SERVICE_ROLE_KEY
if (!BASE || !PUBLICA || !MAESTRA) {
  console.error('✗ Faltan NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}
const ROBLE = '00000000-0000-4000-a000-000000000001'
const sello = Date.now()

// ─── Ayudantes ───────────────────────────────────────────────────────────────

/** Un pedido a Supabase como lo haría la app: clave pública + sesión (si hay). */
async function pedir(metodo, ruta, { token, cuerpo, llave = PUBLICA } = {}) {
  const r = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: {
      apikey: llave,
      Authorization: `Bearer ${token ?? llave}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
  const texto = await r.text()
  let datos = null
  try { datos = texto ? JSON.parse(texto) : null } catch { datos = texto }
  return { ok: r.ok, estado: r.status, datos }
}

/** Crea una cuenta ya confirmada y devuelve { id, token }. */
async function crearCuenta(nombre) {
  const email = `aislamiento.${nombre}.${sello}@example.com`
  const password = `Aislamiento-${sello}-x`
  const alta = await pedir('POST', '/auth/v1/admin/users', {
    llave: MAESTRA,
    cuerpo: { email, password, email_confirm: true, user_metadata: { nombre, apellido: 'Prueba' } },
  })
  if (!alta.ok || !alta.datos?.id) throw new Error(`no pude crear la cuenta ${nombre} (respuesta ${alta.estado})`)
  const entrada = await pedir('POST', '/auth/v1/token?grant_type=password', { cuerpo: { email, password } })
  if (!entrada.datos?.access_token) throw new Error(`la cuenta ${nombre} no pudo iniciar sesión`)
  return { id: alta.datos.id, token: entrada.datos.access_token }
}

let fallas = 0
const anotar = (ok, texto, detalle = '') => {
  if (!ok) fallas++
  console.log(`  ${ok ? '✓' : '✗'} ${texto}${detalle ? ` — ${detalle}` : ''}`)
}
const titulo = (texto) => console.log(`\n${texto}`)

// ─── Preparación (directo en la base, como el servidor) ──────────────────────
console.log(`Probando el aislamiento entre locales (${describirDestino(env)})`)
const db = await conectar(env)
const q = async (sql, params = []) => (await db.query(sql, params)).rows
const uno = async (sql, params = []) => (await q(sql, params))[0]

const creadas = [] // cuentas a borrar al final
let localB = null

try {
  titulo('Preparación')
  localB = (await uno(
    `insert into public.locales (slug, nombre, estado) values ($1, 'Barbería de prueba B', 'activo') returning id`,
    [`aislamiento-${sello}`])).id
  const barberoB = (await uno(`insert into public.barberos (nombre, apellido, local_id) values ('Barbero', 'B', $1) returning id`, [localB])).id
  const servicioB = (await uno(`insert into public.servicios (nombre, precio, duracion_minutos, local_id) values ('Corte B', 1000, 30, $1) returning id`, [localB])).id
  const productoB = (await uno(`insert into public.productos (nombre, descripcion, precio, stock, local_id) values ('Pomada B', 'x', 1000, 10, $1) returning id`, [localB])).id
  const resenaB = (await uno(`insert into public.resenas (nombre, texto, rating, visible, local_id) values ('Cliente B', 'Muy bien', 5, true, $1) returning id`, [localB])).id
  const [b1, b2] = await q(`select id from public.barberos where local_id = $1 order by nombre limit 2`, [ROBLE])
  const servicioA = (await uno(`select id from public.servicios where local_id = $1 order by nombre limit 1`, [ROBLE])).id
  const productoA = (await uno(`select id from public.productos where local_id = $1 and activo order by nombre limit 1`, [ROBLE])).id
  if (!b1 || !b2 || !servicioA || !productoA) throw new Error('falta el catálogo de Roble: corré antes node scripts/preparar-desarrollo.mjs')

  const c = {}
  for (const nombre of ['cliente', 'ajeno', 'barbero', 'duenoA', 'duenoB', 'comercial', 'admin']) {
    c[nombre] = await crearCuenta(nombre)
    creadas.push(c[nombre].id)
  }
  c.visitante = { id: null, token: undefined }

  await q(`insert into public.membresias (user_id, local_id, rol) values ($1, $2, 'dueno'), ($3, $4, 'dueno')`,
    [c.duenoA.id, ROBLE, c.duenoB.id, localB])
  // El barbero se crea como lo hace hoy la app: rol y agenda en el perfil.
  // La membresía la tiene que crear sola la base (mecanismo temporal).
  await q(`update public.profiles set role = 'barbero', barbero_id = $2 where id = $1`, [c.barbero.id, b1.id])
  await q(`insert into public.equipo (user_id, rol) values ($1, 'comercial'), ($2, 'admin')`, [c.comercial.id, c.admin.id])

  // El cliente reserva en los dos locales, como en la app (con su sesión).
  const reservar = async (local, barbero, servicio, hora) => {
    const r = await pedir('POST', '/rest/v1/turnos', {
      token: c.cliente.token,
      cuerpo: { cliente_id: c.cliente.id, barbero_id: barbero, servicio_id: servicio, fecha: '2031-03-01', hora,
                estado: 'pendiente', metodo_pago: 'transferencia', sena_monto: 100, sena_estado: 'pendiente', local_id: local },
    })
    if (!r.ok) throw new Error(`el cliente no pudo reservar (${r.estado}: ${JSON.stringify(r.datos).slice(0, 120)})`)
    return r.datos[0].id
  }
  const tA1 = await reservar(ROBLE, b1.id, servicioA, '10:00:00') // en la agenda del barbero de prueba
  const tA2 = await reservar(ROBLE, b2.id, servicioA, '11:00:00') // en la agenda de otro barbero
  const tB = await reservar(localB, barberoB, servicioB, '10:00:00')
  const tGuardia = await reservar(ROBLE, b2.id, servicioA, '12:00:00') // para las pruebas de cancelar

  // Pedidos y caja: los crea el servidor (como en la app).
  const pA = (await uno(`insert into public.pedidos (user_id, total, local_id) values ($1, 100, $2) returning id`, [c.cliente.id, ROBLE])).id
  const pB = (await uno(`insert into public.pedidos (user_id, total, local_id) values ($1, 100, $2) returning id`, [c.cliente.id, localB])).id
  const iA = (await uno(`insert into public.items_pedido (pedido_id, producto_id, nombre, precio, cantidad, local_id) values ($1, $2, 'x', 100, 1, $3) returning id`, [pA, productoA, ROBLE])).id
  const iB = (await uno(`insert into public.items_pedido (pedido_id, producto_id, nombre, precio, cantidad, local_id) values ($1, $2, 'x', 100, 1, $3) returning id`, [pB, productoB, localB])).id
  const caja = `insert into public.transacciones (tipo, categoria, monto, descripcion, fecha, created_by, local_id)
                values ('ingreso', 'prueba', 1, 'prueba de aislamiento', '2031-03-01', $1, $2) returning id`
  const xA = (await uno(caja, [c.admin.id, ROBLE])).id
  const xB = (await uno(caja, [c.admin.id, localB])).id

  const m = async (persona, local, rol) => (await uno(
    `select id from public.membresias where user_id = $1 and local_id = $2 and rol = $3`, [persona, local, rol]))?.id
  const mClienteA = await m(c.cliente.id, ROBLE, 'cliente')
  const mClienteB = await m(c.cliente.id, localB, 'cliente')
  const mBarbero = await m(c.barbero.id, ROBLE, 'barbero')
  const mDuenoA = await m(c.duenoA.id, ROBLE, 'dueno')
  const mDuenoB = await m(c.duenoB.id, localB, 'dueno')
  anotar(Boolean(mClienteA && mClienteB), 'reservar te hace cliente del local (en Roble y en B)')
  anotar(Boolean(mBarbero), 'el barbero creado como hoy (rol en el perfil) quedó como barbero de Roble')
  console.log('  Local B, 7 cuentas, 4 turnos, 2 pedidos y 2 movimientos de caja, listos.')

  // ─── 1. Quién ve qué ──────────────────────────────────────────────────────
  // Para cada dato de prueba: qué filas TIENE que ver cada cuenta. Todo lo
  // demás no lo tiene que ver.
  const quienes = ['visitante', 'cliente', 'ajeno', 'barbero', 'duenoA', 'duenoB', 'comercial', 'admin']
  const nombreDe = {
    visitante: 'visitante', cliente: 'cliente', ajeno: 'ajeno', barbero: 'barbero de Roble',
    duenoA: 'dueño de Roble', duenoB: 'dueño de B', comercial: 'comercial', admin: 'admin',
  }
  const casos = [
    {
      que: 'Servicios (catálogo)', tabla: 'servicios', ids: { 'Roble': servicioA, 'B': servicioB },
      ve: Object.fromEntries(quienes.map((x) => [x, ['Roble', 'B']])), // los dos locales son públicos
    },
    {
      que: 'Turnos', tabla: 'turnos', ids: { 'Roble (su agenda)': tA1, 'Roble (otra agenda)': tA2, 'B': tB },
      ve: {
        visitante: [], ajeno: [],
        cliente: ['Roble (su agenda)', 'Roble (otra agenda)', 'B'],
        barbero: ['Roble (su agenda)'],
        duenoA: ['Roble (su agenda)', 'Roble (otra agenda)'], duenoB: ['B'],
        comercial: ['Roble (su agenda)', 'Roble (otra agenda)'], // Roble es demo; B está activo
        admin: ['Roble (su agenda)', 'Roble (otra agenda)', 'B'],
      },
    },
    {
      que: 'Pedidos', tabla: 'pedidos', ids: { 'Roble': pA, 'B': pB },
      ve: { visitante: [], ajeno: [], barbero: [], cliente: ['Roble', 'B'], duenoA: ['Roble'], duenoB: ['B'], comercial: ['Roble'], admin: ['Roble', 'B'] },
    },
    {
      que: 'Renglones de pedidos', tabla: 'items_pedido', ids: { 'Roble': iA, 'B': iB },
      ve: { visitante: [], ajeno: [], barbero: [], cliente: ['Roble', 'B'], duenoA: ['Roble'], duenoB: ['B'], comercial: ['Roble'], admin: ['Roble', 'B'] },
    },
    {
      que: 'Caja', tabla: 'transacciones', ids: { 'Roble': xA, 'B': xB },
      ve: { visitante: [], ajeno: [], barbero: [], cliente: [], comercial: [], duenoA: ['Roble'], duenoB: ['B'], admin: ['Roble', 'B'] },
    },
    {
      que: 'Datos de personas', tabla: 'profiles',
      ids: { 'el cliente': c.cliente.id, 'el ajeno': c.ajeno.id, 'el barbero': c.barbero.id, 'el dueño de B': c.duenoB.id },
      ve: {
        visitante: [],
        cliente: ['el cliente'], ajeno: ['el ajeno'],
        barbero: ['el cliente', 'el barbero'], // el cliente está en su agenda
        duenoA: ['el cliente', 'el barbero'],
        duenoB: ['el cliente', 'el dueño de B'],
        comercial: ['el cliente', 'el barbero'], // gente de Roble (demo); el dueño de B no
        admin: ['el cliente', 'el ajeno', 'el barbero', 'el dueño de B'],
      },
    },
    {
      que: 'Locales', tabla: 'locales', ids: { 'Roble': ROBLE, 'B': localB },
      ve: { visitante: [], cliente: [], ajeno: [], barbero: ['Roble'], duenoA: ['Roble'], duenoB: ['B'], comercial: ['Roble', 'B'], admin: ['Roble', 'B'] },
    },
    {
      que: 'Membresías', tabla: 'membresias',
      ids: { 'cliente en Roble': mClienteA, 'cliente en B': mClienteB, 'barbero en Roble': mBarbero, 'dueño de Roble': mDuenoA, 'dueño de B': mDuenoB },
      ve: {
        visitante: [], ajeno: [],
        cliente: ['cliente en Roble', 'cliente en B'], barbero: ['barbero en Roble'],
        duenoA: ['cliente en Roble', 'barbero en Roble', 'dueño de Roble'],
        duenoB: ['cliente en B', 'dueño de B'],
        comercial: ['cliente en Roble', 'barbero en Roble', 'dueño de Roble'],
        admin: ['cliente en Roble', 'cliente en B', 'barbero en Roble', 'dueño de Roble', 'dueño de B'],
      },
    },
    {
      que: 'Equipo', tabla: 'equipo', clave: 'user_id', ids: { 'la comercial': c.comercial.id, 'el admin': c.admin.id },
      ve: { visitante: [], cliente: [], ajeno: [], barbero: [], duenoA: [], duenoB: [], comercial: ['la comercial'], admin: ['la comercial', 'el admin'] },
    },
  ]

  for (const caso of casos) {
    titulo(`1. Quién ve qué — ${caso.que}`)
    const clave = caso.clave || 'id'
    const porId = Object.fromEntries(Object.entries(caso.ids).map(([etiqueta, id]) => [id, etiqueta]))
    for (const quien of quienes) {
      const r = await pedir('GET', `/rest/v1/${caso.tabla}?${clave}=in.(${Object.values(caso.ids).join(',')})&select=${clave}`,
        { token: c[quien].token })
      const vio = r.ok && Array.isArray(r.datos) ? r.datos.map((f) => porId[f[clave]]).sort() : []
      const debia = [...caso.ve[quien]].sort()
      const ok = JSON.stringify(vio) === JSON.stringify(debia)
      anotar(ok, `${nombreDe[quien].padEnd(16)} ve: ${debia.length ? debia.join(', ') : 'nada'}`,
        ok ? '' : `en cambio vio: ${vio.length ? vio.join(', ') : 'nada'}`)
    }
  }

  // ─── 2. Quién puede cambiar qué ───────────────────────────────────────────
  titulo('2. Quién puede cambiar qué')
  const precio = async (id) => Number((await uno('select precio from public.servicios where id = $1', [id])).precio)
  /** Intenta un cambio con la sesión de alguien y dice si de verdad se hizo. */
  const intentar = async (quien, metodo, ruta, cuerpo) => {
    const r = await pedir(metodo, ruta, { token: c[quien].token, cuerpo })
    return r.ok && Array.isArray(r.datos) && r.datos.length > 0
  }

  // Catálogo
  anotar(await intentar('duenoA', 'PATCH', `/rest/v1/servicios?id=eq.${servicioA}`, { precio: 4321 }) && (await precio(servicioA)) === 4321,
    'el dueño de Roble cambia un precio de Roble')
  anotar(!(await intentar('duenoA', 'PATCH', `/rest/v1/servicios?id=eq.${servicioB}`, { precio: 1 })) && (await precio(servicioB)) === 1000,
    'el dueño de Roble NO puede cambiar un precio de B')
  anotar(!(await intentar('duenoA', 'POST', '/rest/v1/servicios', { nombre: 'Colado', precio: 1, duracion_minutos: 30, local_id: localB })),
    'el dueño de Roble NO puede crear un servicio en B')
  anotar(!(await intentar('duenoA', 'PATCH', `/rest/v1/servicios?id=eq.${servicioA}`, { local_id: localB })),
    'el dueño de Roble NO puede mudar un servicio suyo a B')
  anotar(!(await intentar('barbero', 'PATCH', `/rest/v1/servicios?id=eq.${servicioA}`, { precio: 1 })) && (await precio(servicioA)) === 4321,
    'el barbero NO puede cambiar precios')
  anotar(!(await intentar('cliente', 'POST', '/rest/v1/servicios', { nombre: 'Colado', precio: 1, duracion_minutos: 30, local_id: ROBLE })),
    'el cliente NO puede crear servicios')
  anotar(await intentar('comercial', 'PATCH', `/rest/v1/servicios?id=eq.${servicioB}`, { precio: 1500 }) && (await precio(servicioB)) === 1500,
    'la comercial cambia un precio de B (el catálogo lo edita en cualquier local)')
  await q('update public.servicios set precio = 3500 where id = $1', [servicioA]) // se deja como estaba
  anotar(!(await intentar('comercial', 'DELETE', `/rest/v1/resenas?id=eq.${resenaB}`)) &&
    Boolean(await uno('select 1 as hay from public.resenas where id = $1', [resenaB])),
    'la comercial NO puede borrar')
  anotar(await intentar('duenoB', 'DELETE', `/rest/v1/resenas?id=eq.${resenaB}`) &&
    !(await uno('select 1 as hay from public.resenas where id = $1', [resenaB])),
    'el dueño de B borra una reseña de B')

  // Caja
  const movimiento = { tipo: 'ingreso', categoria: 'prueba', monto: 1, descripcion: 'prueba', fecha: '2031-03-01' }
  // Con el local dicho: así lo que frena es el permiso, no que falte el local.
  anotar(!(await intentar('comercial', 'POST', '/rest/v1/transacciones', { ...movimiento, created_by: c.comercial.id, local_id: ROBLE })),
    'la comercial NO puede cargar caja')
  anotar(await intentar('duenoA', 'POST', '/rest/v1/transacciones', { ...movimiento, created_by: c.duenoA.id, local_id: ROBLE }),
    'el dueño de Roble carga caja en Roble')
  anotar(!(await intentar('duenoA', 'POST', '/rest/v1/transacciones', { ...movimiento, created_by: c.duenoA.id, local_id: localB })),
    'el dueño de Roble NO puede cargar caja en B')

  // Locales
  anotar(await intentar('duenoA', 'PATCH', `/rest/v1/locales?id=eq.${ROBLE}`, { lema: 'Lema de prueba' }),
    'el dueño de Roble edita los datos de Roble')
  await q(`update public.locales set lema = 'El oficio de la barbería, bien hecho.' where id = $1`, [ROBLE])
  anotar(!(await intentar('duenoA', 'PATCH', `/rest/v1/locales?id=eq.${ROBLE}`, { estado: 'activo' })) &&
    (await uno('select estado from public.locales where id = $1', [ROBLE])).estado === 'demo',
    'el dueño de Roble NO puede cambiar el estado de su local (eso es del equipo)')
  anotar(!(await intentar('duenoA', 'PATCH', `/rest/v1/locales?id=eq.${localB}`, { nombre: 'Hackeado' })),
    'el dueño de Roble NO puede editar B')
  anotar(await intentar('comercial', 'POST', '/rest/v1/locales', { slug: `aislamiento-nuevo-${sello}`, nombre: 'Creado por la comercial' }),
    'la comercial crea un local')
  anotar(await intentar('comercial', 'PATCH', `/rest/v1/locales?id=eq.${localB}`, { estado: 'suspendido' }),
    'la comercial cambia el estado de un local')

  // B quedó suspendido: deja de ser público.
  titulo('3. Un local suspendido desaparece de la vista pública')
  const veServicioB = async () => (await pedir('GET', `/rest/v1/servicios?id=eq.${servicioB}&select=id`)).datos?.length === 1
  anotar(!(await veServicioB()), 'el visitante ya no ve el catálogo de B')
  anotar(!(await intentar('cliente', 'POST', '/rest/v1/turnos', {
    cliente_id: c.cliente.id, barbero_id: barberoB, servicio_id: servicioB, fecha: '2031-03-02', hora: '10:00:00', estado: 'pendiente', local_id: localB,
  })), 'el cliente no puede reservar en B')
  await q(`update public.locales set estado = 'activo' where id = $1`, [localB])
  anotar(await veServicioB(), 'vuelve a estar activo: el visitante lo ve de nuevo')

  // ─── 4. Las guardias ──────────────────────────────────────────────────────
  titulo('4. Las guardias')
  anotar(!(await intentar('cliente', 'PATCH', `/rest/v1/profiles?id=eq.${c.cliente.id}`, { email: 'otro@example.com' })),
    'el cliente NO puede cambiar su mail desde la app')
  anotar(await intentar('cliente', 'PATCH', `/rest/v1/profiles?id=eq.${c.cliente.id}`, { nombre: 'Nuevo nombre' }),
    'el cliente sí cambia su nombre')
  anotar(!(await intentar('cliente', 'PATCH', `/rest/v1/turnos?id=eq.${tGuardia}`, { estado: 'cancelado', fecha: '2031-05-05' })) &&
    (await uno('select estado from public.turnos where id = $1', [tGuardia])).estado === 'pendiente',
    'al cancelar, el cliente NO puede cambiar también la fecha')
  anotar(await intentar('cliente', 'PATCH', `/rest/v1/turnos?id=eq.${tGuardia}`, { estado: 'cancelado' }),
    'el cliente sí cancela su turno')

  // ─── 5. El mecanismo temporal del barbero ─────────────────────────────────
  titulo('5. El mecanismo temporal de los barberos')
  await q(`update public.profiles set role = 'client', barbero_id = null where id = $1`, [c.barbero.id])
  anotar(!(await m(c.barbero.id, ROBLE, 'barbero')), 'si deja de ser barbero, pierde su membresía de barbero')
  const turnosVisibles = await pedir('GET', `/rest/v1/turnos?id=eq.${tA1}&select=id`, { token: c.barbero.token })
  anotar((turnosVisibles.datos ?? []).length === 0, 'y deja de ver la agenda')
} catch (e) {
  fallas++
  console.error(`\n✗ La prueba se cortó: ${e.message}`)
} finally {
  // ─── Limpieza: todo lo que se creó ──────────────────────────────────────
  if (creadas.length) {
    await q(`delete from public.transacciones where descripcion in ('prueba de aislamiento', 'prueba') and created_by = any ($1::uuid[])`, [creadas])
    await q(`delete from public.pedidos where user_id = any ($1::uuid[])`, [creadas]) // los renglones se van solos
    await q(`delete from public.turnos where cliente_id = any ($1::uuid[])`, [creadas])
  }
  if (localB) {
    for (const t of ['resenas', 'productos', 'servicios', 'categorias', 'barberos', 'membresias']) {
      await q(`delete from public.${t} where local_id = $1`, [localB])
    }
    await q(`delete from public.locales where id = $1`, [localB])
  }
  await q(`delete from public.locales where slug like 'aislamiento-%'`)
  await db.end()
  for (const id of creadas) await pedir('DELETE', `/auth/v1/admin/users/${id}`, { llave: MAESTRA })
}

console.log(fallas === 0 ? '\n✓ Cada uno ve y toca solo lo suyo.' : `\n✗ ${fallas} control(es) fallaron.`)
process.exit(fallas === 0 ? 0 : 1)
