/**
 * scripts/verificar-llave-servidor.mjs
 *
 * La llave del servidor (SUPABASE_SERVICE_ROLE_KEY, `createServiceClient()`)
 * saltea TODAS las reglas de la base. Donde se usa, el código tiene que filtrar
 * por local a mano: si se olvida, un local podría ver o tocar lo de otro.
 *
 * Este script busca cada lugar de la app que la usa y lo compara con la lista
 * revisada de abajo, donde cada uso dice por qué hace falta y cómo filtra por
 * local (Fase 4b). Falla si:
 *   - aparece un uso nuevo que nadie revisó (hay que revisarlo y anotarlo acá);
 *   - un uso anotado ya no existe (la lista tiene que decir la verdad);
 *   - alguien lee la llave directo de las variables fuera de lib/supabase.ts;
 *   - alguien usa las funciones de administrador de cuentas fuera de lo revisado.
 * Es como verificar-locales con una tabla sin clasificar. No necesita la base.
 *
 *   node scripts/verificar-llave-servidor.mjs
 */
import { readdirSync, readFileSync } from 'fs'
import path from 'path'

const PROYECTO = path.resolve(import.meta.dirname, '..')

// ─── Lo revisado: dónde se usa, por qué, y cómo filtra por local ────────────
// La clave es "archivo#función". Si un uso nuevo aparece, se revisa con el
// mismo criterio y se anota acá.
const REVISADOS = {
  // Mercado Pago (Fase 4a): la tabla de tokens no tiene políticas a propósito.
  'src/lib/mp-conexion.ts#guardarConexion': 'tokens: guarda la conexión del local que conectó (upsert por local_id, con permiso revisado en el callback)',
  'src/lib/mp-conexion.ts#leerConexion': 'tokens: lee la conexión de UN local (eq local_id)',
  'src/lib/mp-conexion.ts#cuentaDelLocal': 'tokens: renueva el de UN local (eq local_id)',
  'src/lib/mp-conexion.ts#desconectar': 'tokens: borra la de UN local (eq local_id), con permiso revisado en la acción',
  'src/lib/cobros.ts#verificarPago': 'aplica un pago ya verificado con las funciones de la 0011 (solo el servidor puede usarlas), que revisan local y monto',
  // Compras y reservas.
  'src/app/actions/checkout.ts#crearPedido': 'compra sin cuenta: productos filtrados por el local de la página (eq local_id); el pedido y sus renglones se crean con ese local',
  'src/app/actions/reservas.ts#getDisponibilidad': 'turnos de otros (solo hora y duración) y reglas privadas del local: filtrado por el local del servicio y un barbero de ese local; solo sale la lista de horarios',
  'src/app/actions/reservas.ts#crearReserva': 'guarda la referencia del cobro del turno recién creado (eq id y eq local_id)',
  'src/app/[local]/(tienda)/checkout/success/page.tsx#SuccessPage': 'estado de un pedido que pudo ser sin cuenta: solo id y estado, de un pedido de ESTE local (eq local_id)',
  // Cuentas de barbero.
  'src/app/actions/barberos.ts#adminCrearCuentaBarbero': 'crear una cuenta ya confirmada (auth.admin): permiso revisado en el local, el barbero tiene que ser de ESE local, y la membresía se crea en ESE local',
  // Los dueños (Fase 6): buscar una cuenta por su mail y crearla es administrar cuentas.
  'src/app/actions/plataforma.ts#invitarDueno': 'cuenta del dueño (auth.admin): busca el mail y, si no existe, crea la cuenta sin contraseña; la suma la base (sumar_dueno, con la sesión de quien invita: revisa el permiso en ESE local y que no sea del equipo); el link solo para una cuenta sin estrenar',
  'src/app/actions/plataforma.ts#otroLinkDeDueno': 'otro link para elegir contraseña: permiso revisado por la base (puede_manejar_duenos) en ESE local, la cuenta tiene que ser dueña de ESE local (eq local_id) y no haber entrado nunca',
  // Fotos (Fase 4b): Storage no tiene políticas de escritura a propósito.
  'src/lib/imagenes.ts#usoDelLocal': 'fotos: mide la carpeta de UN local (su id)',
  'src/lib/imagenes.ts#subirImagen': 'fotos: sube a la carpeta de UN local (su id), con permiso revisado en /api/imagenes',
  'src/lib/imagenes.ts#borrarFotoVieja': 'fotos: borra solo dentro de la carpeta de UN local, y solo después de que la base aceptó el cambio',
}

/** Dónde se pueden usar las funciones de administrador de cuentas (crear, borrar usuarios). */
const ADMIN_DE_CUENTAS = [
  'src/app/actions/barberos.ts#adminCrearCuentaBarbero',
  'src/app/actions/plataforma.ts#invitarDueno',
  'src/app/actions/plataforma.ts#otroLinkDeDueno',
  // Arma el link (generateLink) con la llave que le pasan esas dos: no la crea.
  'src/app/actions/plataforma.ts#linkParaElegirContrasena',
]

// ─── La búsqueda ─────────────────────────────────────────────────────────────

function archivos(dir) {
  const salida = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, e.name)
    if (e.isDirectory()) salida.push(...archivos(ruta))
    else if (/\.(ts|tsx)$/.test(e.name)) salida.push(ruta)
  }
  return salida
}

/** La función que encierra a una línea: la declaración más cercana hacia arriba. */
function funcionDe(lineas, i) {
  for (let j = i; j >= 0; j--) {
    const m = lineas[j].match(/^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+(\w+)/)
      ?? lineas[j].match(/^\s*(?:export\s+)?const\s+(\w+)\s*=\s*(?:cache\()?\s*async\b/)
    if (m) return m[1]
  }
  return '(fuera de una función)'
}

let fallas = 0
const anotar = (ok, texto, detalle = '') => {
  if (!ok) fallas++
  console.log(`  ${ok ? '✓' : '✗'} ${texto}${detalle ? ` — ${detalle}` : ''}`)
}

const usos = new Map() // "archivo#función" → líneas
const adminCuentas = new Set()
const leenLaLlave = []
for (const absoluta of archivos(path.join(PROYECTO, 'src'))) {
  const archivo = path.relative(PROYECTO, absoluta).split(path.sep).join('/')
  const lineas = readFileSync(absoluta, 'utf8').split(/\r?\n/)
  lineas.forEach((linea, i) => {
    const codigo = linea.replace(/\/\/.*$/, '') // sin comentarios de línea
    if (codigo.includes('createServiceClient(') && !/export function createServiceClient/.test(codigo)) {
      const clave = `${archivo}#${funcionDe(lineas, i)}`
      usos.set(clave, [...(usos.get(clave) ?? []), i + 1])
    }
    if (/\.auth\.admin\./.test(codigo)) adminCuentas.add(`${archivo}#${funcionDe(lineas, i)}`)
    if (/process\.env(\.SUPABASE_SERVICE_ROLE_KEY|\[['"]SUPABASE_SERVICE_ROLE_KEY)/.test(codigo) && archivo !== 'src/lib/supabase.ts') {
      leenLaLlave.push(`${archivo}:${i + 1}`)
    }
  })
}

console.log('La llave del servidor: cada uso, revisado\n')
for (const [clave, lineasDelUso] of [...usos].sort()) {
  const porQue = REVISADOS[clave]
  anotar(Boolean(porQue), `${clave} (línea ${lineasDelUso.join(', ')})`, porQue ? '' : 'USO NUEVO SIN REVISAR: revisá que filtre por local y anotalo en REVISADOS')
}
const viejos = Object.keys(REVISADOS).filter((clave) => !usos.has(clave))
anotar(viejos.length === 0, 'la lista revisada no tiene usos que ya no existen', viejos.length ? `sacalos de REVISADOS: ${viejos.join(', ')}` : '')
anotar(leenLaLlave.length === 0, 'la llave se lee solo en src/lib/supabase.ts', leenLaLlave.join(', '))
const adminDeMas = [...adminCuentas].filter((clave) => !ADMIN_DE_CUENTAS.includes(clave))
anotar(adminDeMas.length === 0, 'las funciones de administrador de cuentas se usan solo donde se revisó', adminDeMas.join(', '))

console.log(fallas === 0 ? `\n✓ ${usos.size} usos de la llave del servidor, todos revisados.` : `\n✗ ${fallas} control(es) fallaron.`)
process.exit(fallas === 0 ? 0 : 1)
