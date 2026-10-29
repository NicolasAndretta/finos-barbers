/**
 * scripts/probar-seguridad.mjs
 *
 * Prueba la base como lo haría alguien que NO usa la app: con la clave pública
 * (la que viaja en el navegador de cualquiera) le habla directo a Supabase e
 * intenta leer y escribir lo que no debería.
 *
 *   node scripts/probar-seguridad.mjs
 *
 * Qué intenta:
 *   - como visitante sin cuenta: leer datos privados;
 *   - registrarse pidiendo ser admin, y cambiarse el rol después;
 *   - tocar lo de la web de 369 (tablas y archivos);
 *   - ver o tocar la lista de locales;
 *   - crear un pedido ya "pagado", colarle renglones a un pedido propio;
 *   - crear un turno con la seña "pagada" o con un pago inventado;
 *   - usar las funciones que marcan un pago (Fase 4a): solo el servidor.
 * Y comprueba que lo normal siga andando: ver el catálogo, reservar y cancelar.
 *
 * Solo corre en DESARROLLO: crea una cuenta de prueba (y la borra al final).
 *
 * Por qué usa fetch y no la librería de Supabase: así se ve exactamente qué se
 * le pide a la base, y además la librería no arranca en Node 20 fuera de la
 * app (necesita WebSocket). Es la base de la prueba de aislamiento entre
 * locales de las Fases 2 y 5.
 *
 * Opciones:
 *   --env ARCHIVO   de qué archivo leer las credenciales (por defecto .env.local)
 */
import { describirDestino, exigirDesarrollo, leerArgumentos, leerEnv } from './lib/entorno.mjs'

const { opciones } = leerArgumentos(['env'])
const env = leerEnv(opciones.env || '.env.local')
exigirDesarrollo(env) // nunca corre fuera de desarrollo

const BASE = (env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
const PUBLICA = env.NEXT_PUBLIC_SUPABASE_ANON_KEY // la clave del navegador
const MAESTRA = env.SUPABASE_SERVICE_ROLE_KEY // la del servidor: solo para preparar y limpiar
if (!BASE || !PUBLICA || !MAESTRA) {
  console.error('✗ Faltan NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY en el archivo .env.')
  process.exit(1)
}
const ROBLE = '00000000-0000-4000-a000-000000000001'

// ─── Ayudantes ───────────────────────────────────────────────────────────────

/**
 * Le hace un pedido a Supabase y devuelve { ok, estado, datos }.
 *   llave → qué clave presenta (por defecto, la pública)
 *   token → la sesión de un usuario logueado (si no hay, va como visitante)
 *   cuerpo → lo que se manda (un objeto, o texto para subir un archivo)
 * "Prefer: return=representation" pide que devuelva las filas que escribió:
 * así se sabe si de verdad escribió algo.
 */
async function pedir(metodo, ruta, { llave = PUBLICA, token, cuerpo, tipo = 'application/json' } = {}) {
  const r = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: {
      apikey: llave,
      Authorization: `Bearer ${token ?? llave}`,
      'Content-Type': tipo,
      Prefer: 'return=representation',
    },
    body: cuerpo === undefined ? undefined : typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
  })
  const texto = await r.text()
  let datos = null
  try { datos = texto ? JSON.parse(texto) : null } catch { datos = texto }
  return { ok: r.ok, estado: r.status, datos }
}
const tabla = (nombre, filtro = '') => `/rest/v1/${nombre}${filtro}`
/** ¿Cuántas filas devolvió? (0 si lo rechazó) */
const filas = (r) => (r.ok && Array.isArray(r.datos) ? r.datos.length : 0)
/** ¿La respuesta trae una fila con ese id? */
const trae = (r, id) => r.ok && Array.isArray(r.datos) && r.datos.some((f) => f.id === id)
/** Lo mismo que pedir(), pero con la llave del servidor (saltea RLS). */
const servidor = (metodo, ruta, cuerpo) => pedir(metodo, ruta, { llave: MAESTRA, cuerpo })

let fallas = 0
const anotar = (ok, texto, detalle = '') => {
  if (!ok) fallas++
  console.log(`  ${ok ? '✓' : '✗'} ${texto}${detalle ? ` — ${detalle}` : ''}`)
}
const titulo = (texto) => console.log(`\n${texto}`)

console.log(`Probando la seguridad (${describirDestino(env)})`)

// ─── 1. Visitante sin cuenta ─────────────────────────────────────────────────
titulo('1. Visitante sin cuenta')
for (const nombre of ['barberos', 'servicios', 'productos', 'resenas', 'categorias']) {
  const r = await pedir('GET', tabla(nombre, '?select=id'))
  anotar(filas(r) > 0, `ve el catálogo: ${nombre}`, r.ok ? `${filas(r)} fila(s)` : `respuesta ${r.estado}`)
}
{
  const r = await pedir('GET', tabla('productos', '?select=id,activo'))
  anotar(r.ok && r.datos.every((p) => p.activo), 'no ve productos inactivos')
}
for (const nombre of ['profiles', 'turnos', 'pedidos', 'items_pedido', 'transacciones', 'mp_conexion', 'locales', 'trabajos', 'fotos', 'videos']) {
  const r = await pedir('GET', tabla(nombre, '?select=*'))
  anotar(filas(r) === 0, `no ve nada de ${nombre}`, r.ok ? '' : `rechazado (${r.estado})`)
}

// Fase 4a: las funciones que aplican un pago (migración 0011) las usa solo el
// servidor, después de verificar el pago con Mercado Pago. Si alguien más
// pudiera llamarlas, marcaría pagado lo que quisiera (fue el agujero de
// mark_order_paid en Código Rojo).
const FUNCIONES_DE_PAGO = [
  ['confirmar_pago_sena', { p_local: ROBLE, p_turno: ROBLE, p_pago: '1', p_monto: 1 }],
  ['devolver_pago_sena', { p_local: ROBLE, p_turno: ROBLE, p_pago: '1' }],
  ['confirmar_pago_pedido', { p_local: ROBLE, p_pedido: ROBLE, p_pago: '1', p_monto: 1 }],
  ['devolver_pago_pedido', { p_local: ROBLE, p_pedido: ROBLE, p_pago: '1' }],
]
for (const [funcion, cuerpo] of FUNCIONES_DE_PAGO) {
  const r = await pedir('POST', `/rest/v1/rpc/${funcion}`, { cuerpo })
  anotar(!r.ok, `no puede usar ${funcion}`, r.ok ? `respondió ${JSON.stringify(r.datos)}` : `rechazado (${r.estado})`)
}

// ─── 2. Registrarse pidiendo ser admin ───────────────────────────────────────
titulo('2. Registrarse pidiendo rol admin')
const email = `prueba.seguridad.${Date.now()}@example.com`
const clave = `Prueba-${Math.random().toString(36).slice(2)}-9x`
const alta = await pedir('POST', '/auth/v1/signup', {
  // Lo mismo que manda el formulario de registro, más un "role" de contrabando
  // (hoy la base lo ignora: los poderes están en equipo y membresias).
  cuerpo: { email, password: clave, data: { nombre: 'Prueba', apellido: 'Seguridad', role: 'admin' } },
})
const uid = alta.datos?.user?.id ?? alta.datos?.id
let token = alta.datos?.access_token
if (!alta.ok || !uid) {
  console.error(`✗ No pude crear la cuenta de prueba (respuesta ${alta.estado}).`)
  process.exit(1)
}
if (!token) {
  // Si el proyecto pide confirmar el mail, el registro no devuelve sesión.
  const entrada = await pedir('POST', '/auth/v1/token?grant_type=password', { cuerpo: { email, password: clave } })
  token = entrada.datos?.access_token
}
if (!token) {
  await servidor('DELETE', `/auth/v1/admin/users/${uid}`)
  console.error('✗ La cuenta de prueba no pudo iniciar sesión (¿el proyecto pide confirmar el mail?).')
  process.exit(1)
}
/** Un pedido hecho por el cliente de prueba, ya logueado. */
const cliente = (metodo, ruta, cuerpo, tipo) => pedir(metodo, ruta, { token, cuerpo, tipo })
// Qué puede hacer una cuenta lo dicen `equipo` y `membresias` (desde la 0015 el
// perfil no tiene rol): una cuenta nueva no está en ninguna de las dos.
const poderes = async () => filas(await servidor('GET', tabla('equipo', `?user_id=eq.${uid}&select=rol`)))
  + filas(await servidor('GET', tabla('membresias', `?user_id=eq.${uid}&rol=neq.cliente&select=rol`)))
const mailDelPerfil = async () => (await servidor('GET', tabla('profiles', `?id=eq.${uid}&select=email`))).datos?.[0]?.email

try {
  anotar((await poderes()) === 0, 'la cuenta nace sin ningún poder aunque el formulario pida admin')

  // ─── 3. Darse poderes ──────────────────────────────────────────────────────
  titulo('3. Cliente logueado: su propio perfil')
  await cliente('POST', tabla('equipo'), { user_id: uid, rol: 'admin' })
  await cliente('POST', tabla('membresias'), { user_id: uid, local_id: ROBLE, rol: 'dueno' })
  anotar((await poderes()) === 0, 'no puede sumarse al equipo ni hacerse dueño de un local')
  const mailAntes = await mailDelPerfil()
  await cliente('PATCH', tabla('profiles', `?id=eq.${uid}`), { email: `otro.${uid}@example.com` })
  anotar(Boolean(mailAntes) && (await mailDelPerfil()) === mailAntes, 'no puede cambiarse el mail del perfil')
  anotar(filas(await cliente('GET', tabla('profiles', '?select=id'))) === 1, 'solo ve su propio perfil')

  // ─── 4. Lo de 369 ──────────────────────────────────────────────────────────
  titulo('4. Cliente logueado: lo de la web de 369')
  for (const nombre of ['trabajos', 'fotos', 'videos']) {
    anotar(filas(await cliente('GET', tabla(nombre, '?select=*'))) === 0, `no lee ${nombre}`)
  }
  anotar(filas(await cliente('POST', tabla('trabajos'), { servicio: 'x', categoria: 'x' })) === 0, 'no puede crear un trabajo en la galería')
  for (const [bucket, ruta, tipo] of [['galeria', `trabajos/prueba-${uid}.txt`, 'text/plain'], ['imagenes', `prueba-${uid}.png`, 'image/png']]) {
    const r = await cliente('POST', `/storage/v1/object/${bucket}/${ruta}`, 'x', tipo)
    anotar(!r.ok, `no puede subir un archivo a ${bucket}`, r.ok ? 'SE SUBIÓ' : '')
  }

  // ─── 5. La lista de locales ────────────────────────────────────────────────
  titulo('5. Cliente logueado: la lista de locales')
  anotar(filas(await cliente('GET', tabla('locales', '?select=*'))) === 0, 'no ve los locales')
  anotar(filas(await cliente('POST', tabla('locales'), { slug: `colado-${Date.now()}`, nombre: 'Colado' })) === 0, 'no puede crear un local')
  await cliente('PATCH', tabla('locales', `?id=eq.${ROBLE}`), { nombre: 'Hackeado' })
  {
    const r = await servidor('GET', tabla('locales', `?id=eq.${ROBLE}&select=nombre`))
    anotar(r.ok && r.datos[0]?.nombre !== 'Hackeado', 'no puede editar un local')
  }

  // ─── 6. Pedidos ────────────────────────────────────────────────────────────
  titulo('6. Cliente logueado: pedidos, sin pasar por la app')
  anotar(filas(await cliente('POST', tabla('pedidos'), { user_id: uid, estado: 'pagado', total: 1, local_id: ROBLE })) === 0, 'no puede crear un pedido ya "pagado"')
  {
    // Un pedido legítimo: lo crea el servidor, como hace la app.
    const pedido = (await servidor('POST', tabla('pedidos'), { user_id: uid, estado: 'pendiente', total: 100, local_id: ROBLE })).datos?.[0]
    const producto = (await pedir('GET', tabla('productos', `?select=id&local_id=eq.${ROBLE}&limit=1`))).datos?.[0]
    if (!pedido || !producto) {
      anotar(false, 'preparar un pedido de prueba', 'faltan productos: corré antes node scripts/preparar-desarrollo.mjs')
    } else {
      const colado = await cliente('POST', tabla('items_pedido'), { pedido_id: pedido.id, producto_id: producto.id, nombre: 'colado', precio: 0, cantidad: 99, local_id: ROBLE })
      anotar(filas(colado) === 0, 'no puede agregarle renglones a un pedido propio')
      const propios = await cliente('GET', tabla('pedidos', '?select=id'))
      anotar(trae(propios, pedido.id), 'sigue viendo sus propios pedidos')
      await cliente('PATCH', tabla('pedidos', `?id=eq.${pedido.id}`), { estado: 'pagado' })
      const despues = (await servidor('GET', tabla('pedidos', `?id=eq.${pedido.id}&select=estado`))).datos?.[0]
      anotar(despues?.estado === 'pendiente', 'no puede marcar como pagado un pedido existente')
    }
  }

  // ─── 7. Turnos ─────────────────────────────────────────────────────────────
  titulo('7. Cliente logueado: turnos')
  const barbero = (await pedir('GET', tabla('barberos', `?select=id&local_id=eq.${ROBLE}&limit=1`))).datos?.[0]
  const servicio = (await pedir('GET', tabla('servicios', `?select=id&local_id=eq.${ROBLE}&limit=1`))).datos?.[0]
  if (!barbero || !servicio) {
    anotar(false, 'preparar un turno de prueba', 'faltan barberos o servicios: corré antes node scripts/preparar-desarrollo.mjs')
  } else {
    const base = { cliente_id: uid, barbero_id: barbero.id, servicio_id: servicio.id, fecha: '2031-01-15', local_id: ROBLE }
    // Lo mismo que manda la app (src/app/actions/reservas.ts): tiene que andar.
    const normal = await cliente('POST', tabla('turnos'), {
      ...base, hora: '10:00:00', estado: 'pendiente', metodo_pago: 'transferencia', sena_monto: 1000, sena_estado: 'pendiente',
    })
    anotar(filas(normal) === 1, 'reserva normal, como la hace la app', normal.ok ? '' : `respuesta ${normal.estado}`)
    if (filas(normal) === 1) {
      const id = normal.datos[0].id
      anotar(normal.datos[0].local_id === ROBLE, 'el turno queda anotado en su local')
      await cliente('PATCH', tabla('turnos', `?id=eq.${id}`), { estado: 'cancelado' })
      const t = (await servidor('GET', tabla('turnos', `?id=eq.${id}&select=estado`))).datos?.[0]
      anotar(t?.estado === 'cancelado', 'puede cancelar su turno')
    }
    const intentos = [
      ['un turno ya confirmado', { hora: '11:00:00', estado: 'confirmado' }],
      ['un turno con la seña ya "pagada"', { hora: '12:00:00', estado: 'pendiente', sena_estado: 'pagada', sena_monto: 1000 }],
      ['un turno con un pago inventado', { hora: '13:00:00', estado: 'pendiente', mp_payment_id: 'inventado' }],
      ['un turno a nombre de otro', { hora: '14:00:00', estado: 'pendiente', cliente_id: '00000000-0000-0000-0000-000000000001' }],
    ]
    for (const [texto, cambios] of intentos) {
      anotar(filas(await cliente('POST', tabla('turnos'), { ...base, ...cambios })) === 0, `no puede crear ${texto}`)
    }
  }

  // ─── 8. Plata ──────────────────────────────────────────────────────────────
  titulo('8. Cliente logueado: caja y Mercado Pago')
  anotar(filas(await cliente('GET', tabla('transacciones', '?select=*'))) === 0, 'no ve la caja')
  anotar(filas(await cliente('GET', tabla('mp_conexion', '?select=*'))) === 0, 'no ve la conexión de Mercado Pago')
  for (const [funcion, cuerpo] of FUNCIONES_DE_PAGO) {
    const r = await cliente('POST', `/rest/v1/rpc/${funcion}`, cuerpo)
    anotar(!r.ok, `no puede marcar pagos con ${funcion}`, r.ok ? `respondió ${JSON.stringify(r.datos)}` : `rechazado (${r.estado})`)
  }
} finally {
  // Limpieza: lo que creó la cuenta de prueba, y la cuenta.
  await servidor('DELETE', tabla('pedidos', `?user_id=eq.${uid}`)) // sus renglones se van solos
  await servidor('DELETE', tabla('turnos', `?cliente_id=eq.${uid}`))
  await servidor('DELETE', `/auth/v1/admin/users/${uid}`)
}

console.log(fallas === 0 ? '\n✓ Todo cerrado como corresponde.' : `\n✗ ${fallas} control(es) fallaron.`)
process.exit(fallas === 0 ? 0 : 1)
