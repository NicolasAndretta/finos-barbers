/**
 * scripts/lib/postgres.mjs
 *
 * Conexión directa a la base Postgres de Supabase (no a la API web): es la
 * que permite crear tablas, funciones y reglas. Usa la librería `pg`, que ya
 * está en el proyecto, y la variable SUPABASE_DB_URL del archivo .env.
 *
 * Tres herramientas:
 *   - conectar(env)                → abre la conexión.
 *   - abrirSoloLectura(cliente)    → desde ahí, la base RECHAZA cualquier
 *                                    escritura (lo usa el exportador).
 *   - aplicarArchivo(cliente, ruta)→ corre un .sql entero en una transacción:
 *                                    o se aplica completo o no se aplica nada.
 */
import { readFileSync } from 'fs'
import pg from 'pg'

/**
 * Abre la conexión usando SUPABASE_DB_URL.
 *
 * SSL: Supabase exige conexión cifrada. `rejectUnauthorized: false` acepta su
 * certificado sin validar la cadena completa (el mismo criterio que usaba
 * migrate.mjs). Para una base local de pruebas (localhost) no se usa SSL.
 */
export async function conectar(env) {
  if (!env.SUPABASE_DB_URL) {
    console.error('✗ Falta SUPABASE_DB_URL en el archivo .env.')
    console.error('  Está en Supabase → botón "Connect" → "Session pooler" (puerto 5432).')
    process.exit(1)
  }
  let host = ''
  try {
    host = new URL(env.SUPABASE_DB_URL).hostname
  } catch {
    console.error('✗ SUPABASE_DB_URL no tiene forma de URL (postgresql://usuario:clave@servidor:5432/postgres).')
    process.exit(1)
  }
  const local = host === 'localhost' || host === '127.0.0.1'
  const cliente = new pg.Client({
    connectionString: env.SUPABASE_DB_URL,
    ssl: local ? false : { rejectUnauthorized: false },
  })
  // Postgres manda "notices" (avisos que no son errores). La mayoría son ruido
  // ("la política no existía, se saltea"), así que solo mostramos los nuestros,
  // que empiezan con ⚠️ (por ejemplo, una extensión que no se pudo instalar).
  cliente.on('notice', (aviso) => {
    if (aviso.message?.startsWith('⚠️')) console.warn(`  ${aviso.message}`)
  })
  try {
    await cliente.connect()
  } catch (e) {
    // Nunca mostramos la URL: tiene la contraseña adentro.
    console.error(`✗ No me pude conectar a la base: ${e.message}`)
    console.error('  Revisá la contraseña dentro de SUPABASE_DB_URL y que sea la del "Session pooler".')
    process.exit(1)
  }
  return cliente
}

/**
 * Pone la conexión en modo SOLO LECTURA hasta que se cierre la transacción.
 *
 * - "read only": si por error alguna consulta intentara escribir, Postgres la
 *   rechaza. Es la garantía de que exportar no puede romper nada.
 * - "repeatable read": todas las consultas ven la base en el MISMO instante,
 *   así la foto es coherente aunque alguien esté usando la demo mientras tanto.
 * - search_path vacío: hace que Postgres escriba los nombres completos
 *   (public.turnos, auth.users, public.is_admin()) en todo lo que genera.
 *   Así el SQL resultante no depende de "en qué esquema estoy parado".
 */
export async function abrirSoloLectura(cliente) {
  await cliente.query('begin transaction isolation level repeatable read read only')
  await cliente.query("set local search_path = ''")
  await cliente.query("set local statement_timeout = '120s'")
}

/** Devuelve una función q(sql, params) que corre una consulta y devuelve las filas. */
export function consultor(cliente) {
  return async (sql, params = []) => (await cliente.query(sql, params)).rows
}

/**
 * Aplica un archivo .sql completo dentro de UNA transacción.
 * Si cualquier instrucción falla, se deshace todo (rollback) y la base queda
 * exactamente como estaba antes de correrlo.
 * Devuelve true si salió bien, false si falló (el error ya se mostró).
 */
export async function aplicarArchivo(cliente, ruta) {
  const sql = readFileSync(ruta, 'utf8')
  try {
    await cliente.query('begin')
    await cliente.query(sql)
    await cliente.query('commit')
    return true
  } catch (e) {
    await cliente.query('rollback').catch(() => {})
    console.error(`✗ Falló ${ruta} — se deshizo todo lo de ese archivo.`)
    console.error(`  Motivo: ${e.message}`)
    if (e.position) {
      // e.position es el carácter donde Postgres encontró el problema:
      // lo traducimos a número de línea para poder ir a mirarlo.
      const linea = sql.slice(0, Number(e.position)).split('\n').length
      console.error(`  Cerca de la línea ${linea} de ${ruta}.`)
    }
    return false
  }
}
