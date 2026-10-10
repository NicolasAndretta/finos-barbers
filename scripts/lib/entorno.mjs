/**
 * scripts/lib/entorno.mjs
 *
 * Herramientas compartidas por los scripts de base de datos (los .mjs de
 * scripts/). No se usa desde la app de Next: solo desde la terminal.
 *
 * Qué resuelve:
 *   1. Leer un archivo de variables (.env.local por defecto) sin instalar nada.
 *   2. Leer las opciones que le pasás a un script (--env, --produccion, ...).
 *   3. Averiguar a qué proyecto de Supabase apunta cada archivo.
 *   4. Frenar a tiempo si un script que ESCRIBE en la base apunta a producción.
 *
 * Por qué hace falta el punto 4: desde la Fase 0 hay DOS proyectos de Supabase.
 *   - producción: la base de la demo publicada en Hostinger (no se puede romper).
 *   - desarrollo: una copia donde se prueba todo antes.
 * Cada archivo .env dice a cuál apunta con la variable SUPABASE_ENTORNO.
 * Si un script de escritura no ve "SUPABASE_ENTORNO=desarrollo", se niega a
 * correr salvo que le agregues --produccion a propósito.
 */
import { existsSync, readFileSync } from 'fs'

/** Archivo donde se guardan las credenciales de producción (nunca se sube a git). */
export const ARCHIVO_PRODUCCION = '.env.produccion.local'

/**
 * Lee un archivo .env y devuelve sus variables como objeto { NOMBRE: 'valor' }.
 *
 * Es el mismo criterio que ya usaban migrate.mjs y crear-bucket.mjs:
 *   - acepta saltos de línea de Windows (\r\n),
 *   - ignora líneas vacías y comentarios (#),
 *   - saca las comillas que envuelven al valor ("valor" o 'valor').
 * Si el archivo no existe, corta el script con un mensaje claro.
 */
export function leerEnv(archivo = '.env.local') {
  if (!existsSync(archivo)) {
    console.error(`✗ No encuentro el archivo ${archivo}.`)
    console.error('  Revisá que estés parado en la carpeta del proyecto y que el archivo exista.')
    process.exit(1)
  }
  const env = {}
  for (const linea of readFileSync(archivo, 'utf8').split(/\r?\n/)) {
    // NOMBRE=valor  (el nombre en mayúsculas, números y guiones bajos)
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
  return env
}

/**
 * Separa lo que escribiste después de "node scripts/algo.mjs" en:
 *   - opciones: las que empiezan con -- (por ejemplo --env .env.local)
 *   - archivos: todo lo demás (por ejemplo rutas a archivos .sql)
 *
 * `conValor` lista las opciones que llevan un valor a continuación
 * (--env ARCHIVO). El resto son interruptores de sí/no (--produccion).
 *
 * Ejemplo:
 *   leerArgumentos(['--env', '.env.x', '--produccion', 'a.sql'], ['env'])
 *   → { opciones: { env: '.env.x', produccion: true }, archivos: ['a.sql'] }
 */
export function leerArgumentos(conValor = [], argv = process.argv.slice(2)) {
  const opciones = {}
  const archivos = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const nombre = arg.slice(2)
      if (conValor.includes(nombre)) {
        const valor = argv[i + 1]
        if (!valor || valor.startsWith('--')) {
          console.error(`✗ A la opción --${nombre} le falta el valor (por ejemplo: --${nombre} algo).`)
          process.exit(1)
        }
        opciones[nombre] = valor
        i++ // saltamos el valor, ya lo usamos
      } else {
        opciones[nombre] = true
      }
    } else {
      archivos.push(arg)
    }
  }
  return { opciones, archivos }
}

/**
 * Devuelve el "ref" del proyecto de Supabase: el código de 20 letras que
 * identifica a cada proyecto (aparece en la URL: https://<ref>.supabase.co).
 * No es secreto: está en la URL pública del sitio. Sirve para comparar si
 * dos archivos .env apuntan al mismo proyecto o a proyectos distintos.
 *
 * Lo busca en dos lugares, porque cada uno puede venir de un panel distinto:
 *   - NEXT_PUBLIC_SUPABASE_URL  → https://<ref>.supabase.co
 *   - SUPABASE_DB_URL           → usuario "postgres.<ref>" (pooler) o
 *                                 servidor "db.<ref>.supabase.co" (directa)
 */
export function refsDelProyecto(env) {
  let desdeUrl = null
  let desdeDb = null

  const url = env.NEXT_PUBLIC_SUPABASE_URL || ''
  const mUrl = url.match(/^https?:\/\/([a-z0-9]+)\.supabase\.co/i)
  if (mUrl) desdeUrl = mUrl[1].toLowerCase()

  if (env.SUPABASE_DB_URL) {
    try {
      const u = new URL(env.SUPABASE_DB_URL)
      const mUsuario = decodeURIComponent(u.username).match(/^postgres\.([a-z0-9]+)$/i)
      const mHost = u.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i)
      if (mUsuario) desdeDb = mUsuario[1].toLowerCase()
      else if (mHost) desdeDb = mHost[1].toLowerCase()
      // Una base local de pruebas no tiene ref: la identificamos por puerto y nombre.
      else if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') desdeDb = `local:${u.port || 5432}${u.pathname}`
    } catch {
      // URL mal escrita: la conexión va a fallar después con un mensaje propio.
    }
  }
  return { desdeUrl, desdeDb }
}

/** Texto corto para mostrar en pantalla a qué base se está por conectar. */
export function describirDestino(env) {
  const { desdeUrl, desdeDb } = refsDelProyecto(env)
  const entorno = (env.SUPABASE_ENTORNO || '').toLowerCase() || 'sin definir'
  return `proyecto ${desdeDb || desdeUrl || '(desconocido)'} — entorno: ${entorno}`
}

/**
 * Guardia para los scripts que ESCRIBEN en la base.
 *
 * Deja pasar solo si:
 *   - el archivo dice SUPABASE_ENTORNO=desarrollo, y
 *   - ese proyecto NO es el mismo que figura en .env.produccion.local
 *     (por si alguien copió las credenciales equivocadas y le puso la
 *     etiqueta de desarrollo a la base de producción).
 *
 * Si `permitirProduccion` es true (el usuario escribió --produccion),
 * avisa en grande y deja seguir: es una decisión consciente.
 */
export function exigirDesarrollo(env, { permitirProduccion = false } = {}) {
  const entorno = (env.SUPABASE_ENTORNO || '').toLowerCase()
  const { desdeUrl, desdeDb } = refsDelProyecto(env)
  const ref = desdeDb || desdeUrl

  if (entorno === 'desarrollo') {
    if (existsSync(ARCHIVO_PRODUCCION)) {
      const prod = refsDelProyecto(leerEnv(ARCHIVO_PRODUCCION))
      const refProd = prod.desdeDb || prod.desdeUrl
      if (ref && refProd && ref === refProd) {
        console.error('✗ ¡Frená! Este archivo dice "desarrollo" pero apunta al MISMO proyecto que')
        console.error(`  ${ARCHIVO_PRODUCCION} (producción). Revisá las credenciales de .env.local.`)
        process.exit(1)
      }
    }
    return
  }

  if (permitirProduccion) {
    console.warn('⚠️  Vas a ESCRIBIR en una base que NO está marcada como desarrollo')
    console.warn(`   (${describirDestino(env)}). Lo pediste con --produccion.`)
    return
  }

  console.error(`✗ Este script escribe en la base y el destino no está marcado como desarrollo`)
  console.error(`  (${describirDestino(env)}).`)
  console.error('  - Si es tu proyecto de desarrollo: agregá SUPABASE_ENTORNO=desarrollo al .env.')
  console.error('  - Si de verdad querés tocar producción: repetí el comando agregando --produccion.')
  process.exit(1)
}
