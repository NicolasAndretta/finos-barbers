/**
 * scripts/probar-matriz.mjs
 *
 * La prueba completa de aislamiento (Fase 5). Para CADA tabla de la barbería,
 * con CADA tipo de cuenta y CADA operación (ver, cambiar, crear, borrar),
 * contra tres locales que no son de esas cuentas (uno activo, uno en demo y uno
 * suspendido), compara lo que la base deja hacer con el cuadro de permisos
 * aprobado (docs/MULTITENANT.md, "Fase 2 — Plan aprobado", más lo decidido
 * después). Le habla a la base como la app: con la clave pública y la sesión.
 *
 * Y además, lo que no está en una tabla:
 *   - toda tabla con local está en la matriz: una nueva sin decidir sus permisos
 *     hace fallar (como verificar-locales con una tabla sin clasificar);
 *   - los permisos de Postgres: la clave pública no escribe nada, y nadie tiene
 *     los que no pasan por RLS (truncate, trigger, references). Migración 0013;
 *   - las funciones que pueden usar la clave pública o una sesión: cada una
 *     revisada. Una nueva expuesta sin revisar hace fallar: fue el agujero de
 *     `mark_order_paid` en Código Rojo;
 *   - el Storage: sin reglas, nadie sube, lista ni borra fotos salvo el servidor.
 *
 * Es la prueba "completa"; probar-aislamiento.mjs sigue con los casos puntuales
 * (las guardias, el cliente que reserva en dos locales, etc.).
 *
 * Solo DESARROLLO: arma sus locales y cuentas, y borra todo al final.
 *   node scripts/probar-matriz.mjs
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
const sello = Date.now()

// ─── El cuadro de permisos, escrito como reglas ─────────────────────────────
// r = la cuenta; L = el local de destino: B (activo, su dueño es "duenoB"),
// D (demo) o S (suspendido). Ninguna otra cuenta es de esos locales.

const ROLES = ['visitante', 'cliente', 'ajeno', 'barbero', 'duenoA', 'duenoB', 'comercial', 'admin']
const LOCALES = ['B', 'D', 'S']

/** Administra el local: el admin de la plataforma o su dueño. */
const administra = (r, L) => r === 'admin' || (r === 'duenoB' && L === 'B')
/** Edita el catálogo: quien administra y la comercial, en cualquier local. */
const editor = (r, L) => administra(r, L) || r === 'comercial'
/** Opera lo privado (turnos, pedidos, clientes): quien administra, y la comercial solo en las demos. */
const operaPrivado = (r, L) => administra(r, L) || (r === 'comercial' && L === 'D')
/** El local se muestra al público: en demo o activo; suspendido no. */
const publico = (L) => L === 'B' || L === 'D'
const conSesion = (r) => r !== 'visitante'
const nadie = () => false

/**
 * Por tabla: qué filas del local L puede VER la cuenta r (una regla por fila),
 * y si puede crear, cambiar o borrar.
 */
const REGLAS = {
  barberos: { ver: (r, L) => editor(r, L) || publico(L), crear: editor, cambiar: editor, borrar: administra },
  categorias: { ver: (r, L) => editor(r, L) || publico(L), crear: editor, cambiar: editor, borrar: administra },
  servicios: { ver: (r, L) => editor(r, L) || publico(L), crear: editor, cambiar: editor, borrar: administra },
  // Los productos inactivos y las reseñas ocultas los ve solo quien edita.
  productos: { ver: (r, L, f) => editor(r, L) || (publico(L) && f.activo), crear: editor, cambiar: editor, borrar: administra },
  // Reseñas a mano: solo en una muestra (Fase 7). En un local activo las dejan sus
  // clientes después del turno (dejar_resena, en probar-planes.mjs).
  resenas: { ver: (r, L, f) => editor(r, L) || (publico(L) && f.visible), crear: (r, L) => editor(r, L) && L === 'D', cambiar: editor, borrar: administra },
  horarios: { ver: (r, L) => editor(r, L) || publico(L), crear: editor, cambiar: editor, borrar: editor },
  // Las ausencias (vacaciones, feriados) son privadas: el motivo no lo ve el público.
  ausencias: { ver: editor, crear: editor, cambiar: editor, borrar: editor },
  // Cualquiera con sesión reserva en un local público, a su nombre (así anda la reserva).
  turnos: {
    ver: (r, L, f, uid) => operaPrivado(r, L) || f.cliente_id === uid,
    crear: (r, L) => (conSesion(r) && publico(L)) || operaPrivado(r, L),
    cambiar: operaPrivado, borrar: administra,
  },
  pedidos: { ver: (r, L, f, uid) => operaPrivado(r, L) || f.user_id === uid, crear: operaPrivado, cambiar: operaPrivado, borrar: administra },
  items_pedido: { ver: (r, L, f, uid) => operaPrivado(r, L) || f.de === uid, crear: operaPrivado, cambiar: operaPrivado, borrar: administra },
  transacciones: { ver: administra, crear: administra, cambiar: administra, borrar: administra },
  // Las membresías no se escriben desde afuera: las crea la base o el servidor.
  membresias: { ver: (r, L, f, uid) => operaPrivado(r, L) || f.user_id === uid, crear: nadie, cambiar: nadie, borrar: nadie },
  // Los tokens de Mercado Pago: nadie, ni el dueño ni el admin con su sesión.
  mp_conexion: { ver: nadie, crear: nadie, cambiar: nadie, borrar: nadie },
}

/** La columna que se "cambia" al mismo valor (no modifica nada, pero pide el permiso). */
const COLUMNA_INOFENSIVA = {
  barberos: 'nombre', categorias: 'nombre', servicios: 'nombre', productos: 'nombre', resenas: 'nombre',
  horarios: 'desde', ausencias: 'motivo', turnos: 'hora', pedidos: 'estado', items_pedido: 'nombre',
  transacciones: 'descripcion', membresias: 'rol', mp_conexion: 'mp_nickname',
}

/** Las funciones que pueden usar la clave pública o una sesión, revisadas una por una. */
const FUNCIONES_REVISADAS = {
  'datos_del_local(p_slug text)': 'devuelve solo los datos públicos de un local (0008/0010)',
  'permisos_en_local(p_local uuid)': 'dice qué puede hacer QUIEN PREGUNTA en un local',
  'es_equipo(roles text[])': 'sí o no sobre quien pregunta',
  'tiene_rol(p_local uuid, roles text[])': 'sí o no sobre quien pregunta',
  'local_publico(p_local uuid)': 'sí o no: si un local se muestra al público',
  'puede_administrar(p_local uuid)': 'sí o no sobre quien pregunta',
  'puede_editar_catalogo(p_local uuid)': 'sí o no sobre quien pregunta',
  'puede_operar_privado(p_local uuid)': 'sí o no sobre quien pregunta',
  'es_mi_agenda(p_local uuid, p_barbero uuid)': 'sí o no sobre quien pregunta',
  'puede_ver_persona(p_persona uuid)': 'sí o no sobre quien pregunta',
  'guardar_horarios(p_local uuid, p_barbero uuid, p_tramos jsonb)': 'security invoker: corre con los permisos de quien llama, y RLS decide',
  // La plataforma (Fase 6, 0014). Cada una revisa adentro quién la llama; lo
  // prueba en detalle probar-plataforma.mjs, para cada tipo de cuenta.
  'crear_local(p_nombre text, p_slug text, p_rubro text, p_datos jsonb, p_servicios jsonb, p_profesionales jsonb)': 'solo el equipo; crea en muestra y a nombre de quien llama',
  'activar_local(p_local uuid)': 'solo el equipo, solo una muestra con dueño; borra lo de prueba de ESE local',
  'cambiar_estado_local(p_local uuid, p_estado text)': 'muestra ↔ archivada el equipo; activo ↔ suspendido solo el admin; nada más',
  'puede_manejar_duenos(p_local uuid)': 'sí o no sobre quien pregunta',
  'sumar_dueno(p_local uuid, p_usuario uuid)': 'el admin, o la comercial en una muestra; nunca una cuenta del equipo como dueña',
  'quitar_dueno(p_local uuid, p_usuario uuid)': 'el admin, o la comercial en una muestra',
  'resumen_de_locales()': 'solo el equipo (si no, vacío); cuentas y sí/no, y los mails de dueños de un local activo solo al admin',
  'extender_muestra(p_local uuid)': 'solo el equipo, solo una muestra que vence: le suma 30 días (0015)',
  // Los planes (Fase 7, 0016). Lo prueba en detalle probar-planes.mjs.
  'plan_permite(p_local uuid, p_capacidad text)': 'sí o no sobre un local: el plan de un local no es secreto (lo usan las reglas de las tablas)',
  'activar_local(p_local uuid, p_plan text)': 'solo el equipo, solo una muestra con dueño y con los profesionales que entran en el plan',
  'cambiar_plan(p_local uuid, p_plan text)': 'en una muestra, el equipo; en un local activo, solo el admin (y revisa los profesionales)',
  'dejar_resena(p_turno uuid, p_rating integer, p_texto text)': 'solo el cliente de ESE turno, después del turno, una vez, si el plan trae reseñas',
  'reporte_del_local(p_local uuid, p_desde date, p_hasta date)': 'solo quien opera el local, y si el plan trae reportes: solo cuentas',
  'handle_new_user()': 'función de un disparador: Postgres no deja llamarla desde afuera',
  'rls_auto_enable()': 'función de un disparador de eventos de producción: no se puede llamar desde afuera',
}

// ─── Ayudantes ───────────────────────────────────────────────────────────────

/** Un pedido a Supabase como lo haría la app: clave pública + sesión (si hay). */
async function pedir(metodo, ruta, { token, cuerpo, llave = PUBLICA, tipo = 'application/json' } = {}) {
  const r = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { apikey: llave, Authorization: `Bearer ${token ?? llave}`, 'Content-Type': tipo, Prefer: 'return=representation' },
    body: cuerpo === undefined ? undefined : typeof cuerpo === 'string' || Buffer.isBuffer(cuerpo) ? cuerpo : JSON.stringify(cuerpo),
  })
  const texto = await r.text()
  let datos = null
  try { datos = texto ? JSON.parse(texto) : null } catch { datos = texto }
  return { ok: r.ok, estado: r.status, datos }
}
const filas = (r) => (r.ok && Array.isArray(r.datos) ? r.datos : [])

async function crearCuenta(nombre) {
  const email = `matriz.${nombre}.${sello}@example.com`
  const password = `Matriz-${sello}-x`
  const alta = await pedir('POST', '/auth/v1/admin/users', { llave: MAESTRA, cuerpo: { email, password, email_confirm: true, user_metadata: { nombre, apellido: 'Matriz' } } })
  if (!alta.ok || !alta.datos?.id) throw new Error(`no pude crear la cuenta ${nombre} (${alta.estado})`)
  const entrada = await pedir('POST', '/auth/v1/token?grant_type=password', { cuerpo: { email, password } })
  if (!entrada.datos?.access_token) throw new Error(`la cuenta ${nombre} no pudo iniciar sesión`)
  return { id: alta.datos.id, token: entrada.datos.access_token }
}

let fallas = 0
const detalles = []
const anotar = (ok, texto, detalle = '') => {
  if (!ok) fallas++
  console.log(`  ${ok ? '✓' : '✗'} ${texto}${!ok && detalle ? ` — ${detalle}` : ''}`)
}
const titulo = (t) => console.log(`\n${t}`)

// ─── Preparación ─────────────────────────────────────────────────────────────
console.log(`La matriz completa de permisos (${describirDestino(env)})`)
const db = await conectar(env)
const q = async (sql, p = []) => (await db.query(sql, p)).rows
const uno = async (sql, p = []) => (await q(sql, p))[0]
const creadas = []
const locales = {}
let hora = 0
/** Una hora distinta para cada turno (los turnos de un barbero no pueden empezar a la misma hora). */
const nuevaHora = () => { const m = 8 * 60 + (hora++ % 600); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00` }
const FECHA = '2031-06-02'

try {
  titulo('Preparación')
  const estados = { A: 'activo', B: 'activo', D: 'demo', S: 'suspendido' }
  for (const [L, estado] of Object.entries(estados)) {
    locales[L] = { id: (await uno(`insert into public.locales (slug, nombre, estado) values ($1, $2, $3) returning id`, [`matriz-${L.toLowerCase()}-${sello}`, `Matriz ${L}`, estado])).id }
  }
  const c = {}
  for (const nombre of ['cliente', 'ajeno', 'barbero', 'duenoA', 'duenoB', 'comercial', 'admin', 'otro']) {
    c[nombre] = await crearCuenta(nombre)
    creadas.push(c[nombre].id)
  }
  c.visitante = { id: null, token: undefined }

  // Lo de cada local: un barbero, una categoría, un servicio, un producto a la
  // vista y otro inactivo, una reseña a la vista y otra oculta, un horario, una
  // ausencia, un turno, un pedido con su renglón, un movimiento de caja, una
  // membresía de cliente y una conexión de Mercado Pago.
  for (const L of ['A', ...LOCALES]) {
    const id = locales[L].id
    const x = locales[L]
    x.barbero = (await uno(`insert into public.barberos (nombre, apellido, local_id) values ('Barbero', $2, $1) returning id`, [id, L])).id
    await q(`insert into public.categorias (nombre, slug, tipo, local_id) values ('Cat', $2, 'producto', $1)`, [id, `cat-${L.toLowerCase()}-${sello}`])
    x.servicio = (await uno(`insert into public.servicios (nombre, precio, duracion_minutos, local_id) values ('Corte', 1000, 30, $1) returning id`, [id])).id
    x.producto = (await uno(`insert into public.productos (nombre, descripcion, precio, stock, activo, local_id) values ('Pomada', 'x', 1000, 5, true, $1) returning id`, [id])).id
    await q(`insert into public.productos (nombre, descripcion, precio, stock, activo, local_id) values ('Pomada vieja', 'x', 1000, 5, false, $1)`, [id])
    await q(`insert into public.resenas (nombre, texto, rating, visible, local_id) values ('A la vista', 'x', 5, true, $1), ('Oculta', 'x', 5, false, $1)`, [id])
    await q(`insert into public.horarios (local_id, dia_semana, desde, hasta) values ($1, 1, '10:00', '20:00')`, [id])
    await q(`insert into public.ausencias (local_id, desde, hasta, motivo) values ($1, '2031-01-01', '2031-01-01', 'Feriado')`, [id])
    await q(`insert into public.turnos (local_id, cliente_id, barbero_id, servicio_id, fecha, hora, estado, metodo_pago, sena_monto, sena_estado)
             values ($1, $2, $3, $4, $5, $6, 'pendiente', 'transferencia', 100, 'pendiente')`, [id, c.otro.id, x.barbero, x.servicio, FECHA, nuevaHora()])
    x.pedido = (await uno(`insert into public.pedidos (local_id, user_id, estado, tipo_entrega, total) values ($1, $2, 'pendiente', 'retiro', 1000) returning id`, [id, c.otro.id])).id
    await q(`insert into public.items_pedido (local_id, pedido_id, producto_id, nombre, precio, cantidad) values ($1, $2, $3, 'Pomada', 1000, 1)`, [id, x.pedido, x.producto])
    await q(`insert into public.transacciones (local_id, tipo, categoria, monto, descripcion, fecha, origen, created_by) values ($1, 'ingreso', 'prueba', 1, 'matriz', $2, 'manual', $3)`, [id, FECHA, c.admin.id])
    await q(`insert into public.mp_conexion (local_id, mp_user_id, access_token) values ($1, '1', 'token-de-prueba-matriz')`, [id])
  }
  // El cliente reservó en A; el barbero y el dueño son de A; la dueña de B, de B.
  await q(`insert into public.turnos (local_id, cliente_id, barbero_id, servicio_id, fecha, hora, estado, metodo_pago, sena_monto, sena_estado)
           values ($1, $2, $3, $4, $5, $6, 'pendiente', 'transferencia', 100, 'pendiente')`, [locales.A.id, c.cliente.id, locales.A.barbero, locales.A.servicio, FECHA, nuevaHora()])
  await q(`insert into public.membresias (user_id, local_id, rol, barbero_id) values ($1, $2, 'barbero', $3)`, [c.barbero.id, locales.A.id, locales.A.barbero])
  await q(`insert into public.membresias (user_id, local_id, rol) values ($1, $2, 'dueno'), ($3, $4, 'dueno')`, [c.duenoA.id, locales.A.id, c.duenoB.id, locales.B.id])
  await q(`insert into public.equipo (user_id, rol) values ($1, 'comercial'), ($2, 'admin')`, [c.comercial.id, c.admin.id])
  console.log('  4 locales (A activo, B activo, D en demo, S suspendido), 8 cuentas y una fila de cada tabla en cada local: listos.')

  // ─── 0. Toda tabla con local, en la matriz ────────────────────────────────
  titulo('0. Toda tabla con local está en la matriz')
  const conLocal = (await q(`select c.relname as t from pg_class c join pg_attribute a on a.attrelid = c.oid and a.attname = 'local_id' and not a.attisdropped
                              where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' order by 1`)).map((f) => f.t)
  const sinReglas = conLocal.filter((t) => !REGLAS[t])
  anotar(sinReglas.length === 0, `las ${conLocal.length} tablas con local tienen sus permisos decididos acá`, `sin decidir: ${sinReglas.join(', ')} (agregalas a REGLAS)`)
  const reglasDeMas = Object.keys(REGLAS).filter((t) => !conLocal.includes(t))
  anotar(reglasDeMas.length === 0, 'y no hay reglas de tablas que ya no existen', reglasDeMas.join(', '))

  // Las filas de cada tabla en los locales de destino, tal como están en la base,
  // para calcular qué TENDRÍA que ver cada cuenta.
  const filasDe = async (tabla) => {
    const ids = LOCALES.map((L) => locales[L].id)
    if (tabla === 'items_pedido') {
      return q(`select i.id, i.local_id, pe.user_id as de from public.items_pedido i join public.pedidos pe on pe.id = i.pedido_id where i.local_id = any($1::uuid[])`, [ids])
    }
    return q(`select * from public.${tabla} where local_id = any($1::uuid[])`, [ids])
  }
  const letraDe = (localId) => LOCALES.find((L) => locales[L].id === localId)

  // ─── 1. Ver ───────────────────────────────────────────────────────────────
  titulo(`1. Ver: cada cuenta ve exactamente las filas que le corresponden (${ROLES.length} cuentas × ${LOCALES.length} locales)`)
  for (const tabla of conLocal) {
    const reglas = REGLAS[tabla]
    if (!reglas) continue
    const todas = await filasDe(tabla)
    let malas = 0
    for (const rol of ROLES) {
      const quien = c[rol]
      const visto = new Set(filas(await pedir('GET', `/rest/v1/${tabla}?select=id&local_id=in.(${LOCALES.map((L) => locales[L].id).join(',')})`, { token: quien.token })).map((f) => f.id))
      for (const fila of todas) {
        const L = letraDe(fila.local_id)
        const debe = Boolean(reglas.ver(rol, L, fila, quien.id))
        if (debe !== visto.has(fila.id)) {
          malas++
          detalles.push(`${tabla} · ver · ${rol} en ${L}: ${debe ? 'tendría que ver' : 'NO tendría que ver'} la fila ${fila.id.slice(0, 8)}`)
        }
      }
    }
    anotar(malas === 0, `${tabla}: ver`, `${malas} diferencia(s)`)
  }

  // ─── 2. Cambiar (al mismo valor: pide el permiso sin modificar nada) ───────
  titulo('2. Cambiar: cada cuenta cambia solo lo que le corresponde')
  for (const tabla of conLocal) {
    const reglas = REGLAS[tabla]
    if (!reglas) continue
    const columna = COLUMNA_INOFENSIVA[tabla]
    let malas = 0
    for (const L of LOCALES) {
      const fila = await uno(`select id, ${columna} as valor from public.${tabla} where local_id = $1 limit 1`, [locales[L].id])
      for (const rol of ROLES) {
        const r = await pedir('PATCH', `/rest/v1/${tabla}?id=eq.${fila.id}`, { token: c[rol].token, cuerpo: { [columna]: fila.valor } })
        const pudo = filas(r).length === 1
        const debe = Boolean(reglas.cambiar(rol, L))
        if (pudo !== debe) { malas++; detalles.push(`${tabla} · cambiar · ${rol} en ${L}: ${debe ? 'tendría que poder' : 'PUDO y no tendría que poder'} (${r.estado})`) }
      }
    }
    anotar(malas === 0, `${tabla}: cambiar`, `${malas} diferencia(s)`)
  }

  // ─── 3. Crear ─────────────────────────────────────────────────────────────
  // Lo que se crea con permiso se borra enseguida. Lo que no, se confirma en la
  // base que no quedó (no alcanza con que la respuesta diga que no).
  titulo('3. Crear: cada cuenta crea solo donde le corresponde')
  const nuevaFila = (tabla, L, uid) => {
    const x = locales[L]
    const marca = `matriz-${sello}-${Math.random().toString(36).slice(2, 8)}`
    switch (tabla) {
      case 'barberos': return { nombre: marca, apellido: 'x', local_id: x.id }
      case 'categorias': return { nombre: marca, slug: marca, tipo: 'producto', local_id: x.id }
      case 'servicios': return { nombre: marca, precio: 1, duracion_minutos: 30, local_id: x.id }
      case 'productos': return { nombre: marca, descripcion: 'x', precio: 1, stock: 1, local_id: x.id }
      case 'resenas': return { nombre: marca, texto: 'x', rating: 5, local_id: x.id }
      case 'horarios': return { local_id: x.id, dia_semana: 0, desde: '09:00', hasta: '10:00' }
      case 'ausencias': return { local_id: x.id, desde: '2031-02-02', hasta: '2031-02-02', motivo: marca }
      case 'turnos': return { local_id: x.id, cliente_id: uid ?? locales.A.barbero, barbero_id: x.barbero, servicio_id: x.servicio, fecha: FECHA, hora: nuevaHora(), estado: 'pendiente', metodo_pago: 'transferencia', sena_monto: 100, sena_estado: 'pendiente' }
      case 'pedidos': return { local_id: x.id, estado: 'pendiente', tipo_entrega: 'retiro', total: 1, cliente_nombre: marca }
      case 'items_pedido': return { local_id: x.id, pedido_id: x.pedido, producto_id: x.producto, nombre: marca, precio: 1, cantidad: 1 }
      case 'transacciones': return { local_id: x.id, tipo: 'ingreso', categoria: 'prueba', monto: 1, descripcion: marca, fecha: FECHA, origen: 'manual', created_by: uid ?? locales.A.barbero }
      case 'membresias': return { user_id: uid ?? locales.A.barbero, local_id: x.id, rol: 'cliente' }
      case 'mp_conexion': return { local_id: x.id, mp_user_id: '2', access_token: marca }
      default: return null
    }
  }
  const cuantasHay = async (tabla, localId) => (await uno(`select count(*)::int as n from public.${tabla} where local_id = $1`, [localId])).n
  for (const tabla of conLocal) {
    const reglas = REGLAS[tabla]
    if (!reglas) continue
    let malas = 0
    for (const L of LOCALES) {
      for (const rol of ROLES) {
        const cuerpo = nuevaFila(tabla, L, c[rol].id)
        const antes = await cuantasHay(tabla, locales[L].id)
        const r = await pedir('POST', `/rest/v1/${tabla}`, { token: c[rol].token, cuerpo })
        const creada = filas(r)[0]
        const despues = await cuantasHay(tabla, locales[L].id)
        const pudo = Boolean(creada) && despues === antes + 1
        if (creada) await q(`delete from public.${tabla} where id = $1`, [creada.id])
        // Reservar te hace cliente del local (Fase 2): esa membresía también se limpia.
        if (creada && tabla === 'turnos' && c[rol].id) await q(`delete from public.membresias where user_id = $1 and local_id = $2 and rol = 'cliente'`, [c[rol].id, locales[L].id])
        const debe = Boolean(reglas.crear(rol, L))
        if (pudo !== debe) { malas++; detalles.push(`${tabla} · crear · ${rol} en ${L}: ${debe ? 'tendría que poder' : 'PUDO y no tendría que poder'} (${r.estado}${r.ok ? '' : `: ${String(r.datos?.message ?? '').slice(0, 80)}`})`) }
        if (!pudo && despues !== antes) { malas++; detalles.push(`${tabla} · crear · ${rol} en ${L}: la respuesta dijo que no, pero quedó una fila`) }
      }
    }
    anotar(malas === 0, `${tabla}: crear`, `${malas} diferencia(s)`)
  }

  // ─── 4. Borrar ────────────────────────────────────────────────────────────
  // Cada intento sobre una fila de sacrificio, creada para eso. Las tablas con
  // una sola fila por local (tokens) o que nadie borra (membresías) se prueban
  // sobre la fila de siempre: nadie las tiene que poder borrar.
  titulo('4. Borrar: cada cuenta borra solo lo que le corresponde')
  const sacrificio = async (tabla, L) => {
    // A nombre de "otro", una cuenta de verdad que no es de ninguno de estos locales.
    const cuerpo = nuevaFila(tabla, L, c.otro.id)
    const columnas = Object.keys(cuerpo)
    const fila = await uno(`insert into public.${tabla} (${columnas.join(', ')}) values (${columnas.map((_, i) => `$${i + 1}`).join(', ')}) returning id`, Object.values(cuerpo))
    return fila.id
  }
  for (const tabla of conLocal) {
    const reglas = REGLAS[tabla]
    if (!reglas) continue
    let malas = 0
    const sinSacrificio = tabla === 'mp_conexion' || tabla === 'membresias'
    for (const L of LOCALES) {
      for (const rol of ROLES) {
        const id = sinSacrificio
          ? (await uno(`select id from public.${tabla} where local_id = $1 limit 1`, [locales[L].id])).id
          : await sacrificio(tabla, L)
        const r = await pedir('DELETE', `/rest/v1/${tabla}?id=eq.${id}`, { token: c[rol].token })
        const sigue = Boolean(await uno(`select 1 as hay from public.${tabla} where id = $1`, [id]))
        if (!sigue && sinSacrificio) throw new Error(`${rol} borró la fila de ${tabla} en ${L}`)
        if (sigue && !sinSacrificio) await q(`delete from public.${tabla} where id = $1`, [id])
        const debe = Boolean(reglas.borrar(rol, L))
        if (!sigue !== debe) { malas++; detalles.push(`${tabla} · borrar · ${rol} en ${L}: ${debe ? 'tendría que poder' : 'PUDO y no tendría que poder'} (${r.estado})`) }
      }
    }
    anotar(malas === 0, `${tabla}: borrar`, `${malas} diferencia(s)`)
  }

  // ─── 5. Los permisos de Postgres ──────────────────────────────────────────
  titulo('5. Los permisos de Postgres (migración 0013)')
  const DE_LA_BARBERIA = [...conLocal, 'profiles', 'locales', 'equipo', 'planes']
  const sobrantes = await q(`
    select table_name as t, grantee as quien, privilege_type as permiso
      from information_schema.role_table_grants
     where table_schema = 'public' and table_name = any($1::text[])
       and ((grantee in ('anon', 'PUBLIC') and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES'))
         or (grantee = 'authenticated' and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES')))`, [DE_LA_BARBERIA])
  anotar(sobrantes.length === 0, 'la clave pública no puede escribir en ninguna tabla de la barbería, y nadie tiene truncate, trigger ni references',
    sobrantes.map((f) => `${f.t}: ${f.quien} ${f.permiso}`).join(', '))

  // ─── 6. Las funciones expuestas ───────────────────────────────────────────
  titulo('6. Las funciones que pueden usar la clave pública o una sesión, revisadas')
  const expuestas = (await q(`
    select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as firma
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`)).map((f) => f.firma)
  const sinRevisar = expuestas.filter((f) => !FUNCIONES_REVISADAS[f])
  anotar(sinRevisar.length === 0, `las ${expuestas.length} funciones que se pueden llamar desde afuera están revisadas`, `SIN REVISAR: ${sinRevisar.join(', ')}`)
  const yaNoExpuestas = Object.keys(FUNCIONES_REVISADAS).filter((f) => !expuestas.includes(f))
  anotar(yaNoExpuestas.length === 0, 'y la lista revisada no tiene funciones que ya no están expuestas', yaNoExpuestas.join(', '))
  for (const f of ['confirmar_pago_sena', 'devolver_pago_sena', 'confirmar_pago_pedido', 'devolver_pago_pedido']) {
    anotar(!expuestas.some((e) => e.startsWith(`${f}(`)), `${f} (marca pagos) no está entre ellas`)
  }

  // ─── 7. El Storage ────────────────────────────────────────────────────────
  titulo('7. El Storage: solo el servidor sube, lista y borra')
  const reglasStorage = await q(`select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects'`)
  anotar(reglasStorage.length === 0, 'no hay ninguna regla que deje escribir en el Storage desde afuera', reglasStorage.map((f) => f.policyname).join(', '))
  const ruta = `${locales.B.id}/matriz-${sello}.webp`
  const subidaServidor = await pedir('POST', `/storage/v1/object/imagenes/${ruta}`, { llave: MAESTRA, cuerpo: Buffer.from('RIFF0000WEBP'), tipo: 'image/webp' })
  if (!subidaServidor.ok) throw new Error(`el servidor no pudo subir el archivo de prueba (${subidaServidor.estado})`)
  for (const rol of ['visitante', 'duenoA', 'duenoB', 'admin']) {
    const sube = await pedir('POST', `/storage/v1/object/imagenes/${locales.B.id}/intruso-${rol}-${sello}.webp`, { token: c[rol].token, cuerpo: Buffer.from('RIFF0000WEBP'), tipo: 'image/webp' })
    const lista = await pedir('POST', '/storage/v1/object/list/imagenes', { token: c[rol].token, cuerpo: { prefix: locales.B.id, limit: 100 } })
    const borra = await pedir('DELETE', '/storage/v1/object/imagenes', { token: c[rol].token, cuerpo: { prefixes: [ruta] } })
    const sigue = await pedir('POST', '/storage/v1/object/list/imagenes', { llave: MAESTRA, cuerpo: { prefix: locales.B.id, limit: 100 } })
    const nombres = filas(sigue).map((a) => a.name)
    anotar(!sube.ok && filas(lista).length === 0 && nombres.includes(`matriz-${sello}.webp`) && !nombres.some((n) => n.startsWith('intruso-')),
      `${rol}: no sube, no lista y no borra fotos (aunque sea el dueño o el admin con su sesión)`, `sube ${sube.estado}, lista ${filas(lista).length}, borra ${borra.estado}`)
  }
  await pedir('DELETE', '/storage/v1/object/imagenes', { llave: MAESTRA, cuerpo: { prefixes: [ruta] } })

  if (detalles.length) {
    console.log('\nLas diferencias, una por una:')
    for (const d of detalles.slice(0, 60)) console.log(`  · ${d}`)
    if (detalles.length > 60) console.log(`  · …y ${detalles.length - 60} más`)
  }
} catch (e) {
  fallas++
  console.error(`\n✗ La prueba se cortó: ${e.message}`)
} finally {
  // ─── Limpieza: todo lo que se creó ──────────────────────────────────────
  const ids = Object.values(locales).map((x) => x.id).filter(Boolean)
  if (ids.length) {
    for (const t of ['mp_conexion', 'transacciones', 'items_pedido', 'pedidos', 'turnos', 'horarios', 'ausencias', 'membresias', 'resenas', 'productos', 'servicios', 'categorias', 'barberos']) {
      await q(`delete from public.${t} where local_id = any($1::uuid[])`, [ids])
    }
    await q(`delete from public.locales where id = any($1::uuid[])`, [ids])
  }
  if (creadas.length) {
    await q(`delete from public.equipo where user_id = any($1::uuid[])`, [creadas])
    await q(`delete from public.membresias where user_id = any($1::uuid[])`, [creadas])
  }
  await db.end()
  for (const id of creadas) await pedir('DELETE', `/auth/v1/admin/users/${id}`, { llave: MAESTRA })
}

const total = ROLES.length * LOCALES.length
console.log(fallas === 0
  ? `\n✓ La matriz completa da como el cuadro: 13 tablas × ${total} combinaciones de cuenta y local × 4 operaciones, más permisos, funciones y Storage.`
  : `\n✗ ${fallas} control(es) fallaron.`)
process.exit(fallas === 0 ? 0 : 1)
