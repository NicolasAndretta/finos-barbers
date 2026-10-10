/**
 * Runner de migraciones SQL contra Supabase (Postgres).
 *
 * Lee SUPABASE_DB_URL del archivo .env (gitignoreado — el secreto nunca se
 * commitea ni pasa por el chat) y aplica los archivos .sql que le pases, en el
 * orden en que los escribas. Cada archivo va en su propia transacción: si uno
 * falla, ese se deshace entero y no se sigue con los demás.
 *
 * ─── Uso ─────────────────────────────────────────────────────────────────────
 *   En desarrollo (el .env.local dice SUPABASE_ENTORNO=desarrollo):
 *     node scripts/migrate.mjs supabase/migrations/0005_locales.sql
 *     node scripts/migrate.mjs supabase/migrations/0005_x.sql supabase/migrations/0006_y.sql
 *
 *   En producción (a propósito, con las credenciales de producción):
 *     node scripts/migrate.mjs --env .env.produccion.local --produccion supabase/migrations/0005_x.sql
 *
 * ─── Guardia ─────────────────────────────────────────────────────────────────
 * Si el archivo de credenciales no dice SUPABASE_ENTORNO=desarrollo, el script
 * se niega a correr salvo que agregues --produccion. Así una migración nueva
 * nunca llega a la demo publicada por un descuido: primero se prueba en
 * desarrollo y recién después se aplica en producción, a conciencia.
 */
import { existsSync } from 'fs'
import { describirDestino, exigirDesarrollo, leerArgumentos, leerEnv } from './lib/entorno.mjs'
import { aplicarArchivo, conectar } from './lib/postgres.mjs'

const { opciones, archivos } = leerArgumentos(['env'])
if (archivos.length === 0) {
  console.error('Uso: node scripts/migrate.mjs [--env ARCHIVO] [--produccion] <ruta.sql> [otra.sql ...]')
  process.exit(1)
}
for (const archivo of archivos) {
  if (!existsSync(archivo)) {
    console.error(`✗ No encuentro ${archivo}.`)
    process.exit(1)
  }
}

const env = leerEnv(opciones.env || '.env.local')
exigirDesarrollo(env, { permitirProduccion: Boolean(opciones.produccion) })

console.log(`Destino: ${describirDestino(env)}`)
const cliente = await conectar(env)
try {
  for (const archivo of archivos) {
    console.log(`Aplicando ${archivo} ...`)
    if (!(await aplicarArchivo(cliente, archivo))) {
      process.exitCode = 1
      break
    }
    console.log('✓ Migración aplicada correctamente.')
  }
} finally {
  await cliente.end()
}
