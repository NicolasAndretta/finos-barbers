/**
 * scripts/exportar-esquema.mjs
 *
 * Saca la "foto" de la estructura de una base de Supabase. NO escribe nada en
 * la base: se conecta en modo solo lectura (Postgres rechaza cualquier
 * escritura mientras dura la conexión).
 *
 * ─── Uso ─────────────────────────────────────────────────────────────────────
 *
 *   1) Exportar producción (se hace una sola vez, en la Fase 0):
 *        node scripts/exportar-esquema.mjs --env .env.produccion.local
 *
 *      Escribe tres archivos:
 *        supabase/migrations/0000_base.sql  → la foto: el SQL que rearma la base
 *        supabase/seed-desarrollo.sql       → datos de ejemplo del catálogo
 *        supabase/esquema-reporte.md        → resumen legible + alertas
 *
 *   2) Comparar una base contra la foto (por ejemplo, desarrollo):
 *        node scripts/exportar-esquema.mjs --comparar supabase/migrations/0000_base.sql
 *
 *      No escribe archivos: muestra sección por sección si son iguales.
 *
 * ─── Opciones ────────────────────────────────────────────────────────────────
 *   --env ARCHIVO      de qué archivo leer las credenciales (por defecto .env.local)
 *   --salida CARPETA   dónde escribir (por defecto supabase)
 *   --comparar ARCHIVO compara en vez de escribir
 *   --sobrescribir     permite reemplazar un 0000_base.sql que ya existe
 *
 * Solo necesita SUPABASE_DB_URL en el archivo de credenciales.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { describirDestino, leerArgumentos, leerEnv } from './lib/entorno.mjs'
import {
  calcularAlertas,
  compararSQL,
  generarReporte,
  generarSeed,
  generarSQL,
  imprimirComparacion,
  leerEsquema,
} from './lib/esquema.mjs'
import { abrirSoloLectura, conectar, consultor } from './lib/postgres.mjs'

const { opciones } = leerArgumentos(['env', 'salida', 'comparar'])
const archivoEnv = opciones.env || '.env.local'
const env = leerEnv(archivoEnv)
const salida = opciones.salida || 'supabase'
const rutaBase = path.join(salida, 'migrations', '0000_base.sql')

// Controles antes de conectarnos.
if (opciones.comparar && !existsSync(opciones.comparar)) {
  console.error(`✗ No encuentro ${opciones.comparar}.`)
  process.exit(1)
}
// Si vamos a escribir la foto y ya existe, frenamos: es la referencia de todo
// lo que viene y no se pisa por accidente.
if (!opciones.comparar && existsSync(rutaBase) && !opciones.sobrescribir) {
  console.error(`✗ Ya existe ${rutaBase}. Es la foto de referencia y no la piso.`)
  console.error('  - Para comparar una base contra ella: agregá --comparar ' + rutaBase)
  console.error('  - Si de verdad querés reemplazarla: agregá --sobrescribir')
  process.exit(1)
}

const destino = describirDestino(env)
console.log(`Leyendo la estructura de la base (${destino}) en modo solo lectura...`)

const cliente = await conectar(env)
let codigoSalida = 0
try {
  await abrirSoloLectura(cliente)
  const q = consultor(cliente)
  const esquema = await leerEsquema(q)
  const meta = {
    fecha: new Date().toISOString().slice(0, 10),
    origen: destino,
    version: esquema.version,
  }
  const sql = generarSQL(esquema, meta)

  if (opciones.comparar) {
    console.log(`\nComparando con ${opciones.comparar}:`)
    const ok = imprimirComparacion(compararSQL(readFileSync(opciones.comparar, 'utf8'), sql))
    console.log(ok
      ? '\n✓ La base coincide con la foto.'
      : '\n✗ Hay diferencias. Copiá este resultado y pasámelo para revisarlo.')
    codigoSalida = ok ? 0 : 1
  } else {
    const seed = await generarSeed(q, esquema, meta)
    const alertas = calcularAlertas(esquema)
    const reporte = generarReporte(esquema, meta, { seed, alertas })

    mkdirSync(path.join(salida, 'migrations'), { recursive: true })
    writeFileSync(rutaBase, sql)
    writeFileSync(path.join(salida, 'seed-desarrollo.sql'), seed.sql)
    writeFileSync(path.join(salida, 'esquema-reporte.md'), reporte)

    console.log('\n✓ Listo. Archivos escritos:')
    console.log(`  ${rutaBase}`)
    console.log(`  ${path.join(salida, 'seed-desarrollo.sql')}`)
    console.log(`  ${path.join(salida, 'esquema-reporte.md')}`)
    console.log(`\n  ${esquema.tablas.length} tablas · ${esquema.politicas.length} políticas · ` +
      `${esquema.funciones.length} funciones · ${esquema.disparadores.length} disparadores`)
    const graves = alertas.filter(([nivel]) => nivel === '🔴').length
    const revisar = alertas.filter(([nivel]) => nivel === '🟠').length
    console.log(`  Alertas: ${graves} graves, ${revisar} para revisar (detalle en esquema-reporte.md)`)
  }
} finally {
  // Cerramos la transacción de solo lectura (no hay nada que guardar) y la conexión.
  await cliente.query('rollback').catch(() => {})
  await cliente.end()
}
process.exit(codigoSalida)
