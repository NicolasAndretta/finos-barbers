/**
 * scripts/respaldar-base.mjs
 *
 * Guarda en la PC una copia de seguridad de una base de Supabase. NO escribe
 * nada en la base: se conecta en modo solo lectura, igual que la foto.
 *
 * Por qué hace falta: el plan gratis de Supabase no hace copias de seguridad.
 * Antes de cualquier cambio en producción (donde están la demo y la web de
 * 369) se corre esto, así siempre hay de dónde recuperar los datos.
 *
 * ─── Uso ─────────────────────────────────────────────────────────────────────
 *   node scripts/respaldar-base.mjs --env .env.produccion.local
 *
 * Crea una carpeta nueva en respaldos/ (con fecha y hora) con dos archivos:
 *   esquema.sql → la estructura de la base en ese momento (la misma "foto"
 *                 que genera exportar-esquema.mjs)
 *   datos.json  → todas las filas de todas las tablas de public, más:
 *                 - storage.buckets y storage.objects: la LISTA de archivos
 *                   (nombre, carpeta, tamaño), no los archivos en sí;
 *                 - auth.users: las cuentas, SIN contraseñas ni códigos de acceso.
 *
 * La carpeta respaldos/ está en .gitignore: nunca se sube. Tiene datos
 * personales y los tokens de Mercado Pago, así que no se comparte.
 *
 * Recuperar datos (si alguna vez hace falta) se arma a medida, tabla por tabla
 * y con aprobación, a partir de datos.json: cada tabla se puede volver a cargar
 * con jsonb_populate_recordset(), la misma técnica que usa seed-desarrollo.sql.
 *
 * Opciones:
 *   --env ARCHIVO      de qué archivo leer las credenciales (por defecto .env.local)
 *   --carpeta CARPETA  dónde guardar (por defecto respaldos)
 */
import { existsSync, mkdirSync, statSync, writeFileSync } from 'fs'
import path from 'path'
import { describirDestino, leerArgumentos, leerEnv } from './lib/entorno.mjs'
import { generarSQL, leerEsquema } from './lib/esquema.mjs'
import { abrirSoloLectura, conectar, consultor } from './lib/postgres.mjs'

const { opciones } = leerArgumentos(['env', 'carpeta'])
const env = leerEnv(opciones.env || '.env.local')
const destino = describirDestino(env)

// Columnas de auth.users que NO se guardan: la contraseña (aunque esté
// cifrada) y los códigos de un solo uso (confirmar mail, recuperar clave...).
const SECRETOS_DE_CUENTAS = [
  'encrypted_password',
  'confirmation_token',
  'recovery_token',
  'email_change_token_new',
  'email_change_token_current',
  'phone_change_token',
  'reauthentication_token',
]

// Nombre de la carpeta: fecha y hora de la PC, sin ":" (Windows no los acepta).
const ahora = new Date()
const dos = (n) => String(n).padStart(2, '0')
const sello =
  `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}_` +
  `${dos(ahora.getHours())}-${dos(ahora.getMinutes())}-${dos(ahora.getSeconds())}`
const entorno = (env.SUPABASE_ENTORNO || 'sin-entorno').toLowerCase().replace(/[^a-z0-9-]/g, '')
let carpeta = path.join(opciones.carpeta || 'respaldos', `${sello}_${entorno}`)
for (let i = 2; existsSync(carpeta); i++) carpeta = path.join(opciones.carpeta || 'respaldos', `${sello}_${entorno}_${i}`)

console.log(`Haciendo una copia de seguridad de ${destino} (solo lectura)...`)
const cliente = await conectar(env)

/**
 * Lee todas las filas de una consulta como una lista (JSON). Si falla (por
 * ejemplo, porque falta permiso para leer esa tabla), avisa y sigue con el
 * resto: la copia de lo demás no se pierde.
 *
 * Cómo lo logra: dentro de una transacción, un error anula todo lo que viene
 * después. Un "savepoint" es un punto de retorno: si la consulta falla, se
 * vuelve a ese punto y la transacción sigue viva.
 */
async function leerFilas(nombre, sql) {
  await cliente.query('savepoint lectura')
  try {
    const { rows } = await cliente.query(sql)
    await cliente.query('release savepoint lectura')
    return rows[0]?.filas ?? []
  } catch (e) {
    await cliente.query('rollback to savepoint lectura')
    console.warn(`  ⚠️ No pude leer ${nombre}: ${e.message}. Sigo con el resto.`)
    return null
  }
}

/**
 * ¿Existe la tabla? Se pregunta al catálogo de Postgres, que cualquiera puede
 * leer: así no falla aunque falte permiso sobre esa tabla (ese caso lo maneja
 * leerFilas, que avisa y sigue).
 */
async function existeTabla(q, esquema, tabla) {
  const [{ hay }] = await q(
    `select exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                     where n.nspname = $1 and c.relname = $2) as hay`,
    [esquema, tabla],
  )
  return hay
}

try {
  await abrirSoloLectura(cliente)
  const q = consultor(cliente)
  const esquema = await leerEsquema(q)

  const tablas = {}
  const noLeidas = []
  const guardar = (nombre, filas) => {
    if (filas === null) noLeidas.push(nombre)
    else tablas[nombre] = filas
  }

  // 1. Todas las tablas de public (las de la barbería y las de cualquier otra
  //    app que comparta el proyecto, como la galería de 369).
  for (const t of esquema.tablas) {
    guardar(`public.${t.nombre}`, await leerFilas(t.nombre_q,
      `select coalesce(jsonb_agg(to_jsonb(t) order by t::text), '[]'::jsonb) as filas from ${t.nombre_q} as t`))
  }

  // 2. Storage: los buckets y la lista de archivos (no los archivos).
  if (await existeTabla(q, 'storage', 'objects')) {
    if (esquema.bucketsSinPermiso) noLeidas.push('storage.buckets')
    else tablas['storage.buckets'] = esquema.buckets
    guardar('storage.objects', await leerFilas('storage.objects',
      `select coalesce(jsonb_agg(to_jsonb(o) order by o.bucket_id, o.name), '[]'::jsonb) as filas
         from storage.objects as o`))
  }

  // 3. Cuentas de usuario, sin contraseñas ni códigos.
  if (await existeTabla(q, 'auth', 'users')) {
    const sacar = `array[${SECRETOS_DE_CUENTAS.map((c) => `'${c}'`).join(', ')}]::text[]`
    guardar('auth.users', await leerFilas('auth.users',
      `select coalesce(jsonb_agg(to_jsonb(u) - ${sacar} order by u.created_at, u.id), '[]'::jsonb) as filas
         from auth.users as u`))
  }

  const meta = { fecha: ahora.toISOString().slice(0, 10), origen: destino, version: esquema.version }
  const datos = {
    generado: ahora.toISOString(),
    origen: destino,
    postgres: esquema.version,
    aclaracion:
      'Copia de los datos de la base. No incluye los archivos de Storage (solo su lista) ' +
      'ni las contraseñas de las cuentas.',
    tablas,
    no_leidas: noLeidas,
  }

  mkdirSync(carpeta, { recursive: true })
  const rutaEsquema = path.join(carpeta, 'esquema.sql')
  const rutaDatos = path.join(carpeta, 'datos.json')
  writeFileSync(rutaEsquema, generarSQL(esquema, meta))
  writeFileSync(rutaDatos, JSON.stringify(datos, null, 2))

  const kb = (ruta) => {
    const bytes = statSync(ruta).size
    return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`
  }
  console.log(`\n✓ Copia de seguridad lista en ${carpeta}`)
  console.log(`  esquema.sql (${kb(rutaEsquema)}) · datos.json (${kb(rutaDatos)})\n`)
  for (const [nombre, filas] of Object.entries(tablas)) console.log(`  ${nombre}: ${filas.length} fila(s)`)
  if (noLeidas.length) console.log(`\n  ⚠️ Sin copia (no se pudieron leer): ${noLeidas.join(', ')}`)
  console.log('\n  Tiene datos personales y los tokens de Mercado Pago: no la compartas ni la subas a ningún lado.')
} finally {
  // Cerramos la transacción de solo lectura (no hay nada que guardar en la base) y la conexión.
  await cliente.query('rollback').catch(() => {})
  await cliente.end()
}
