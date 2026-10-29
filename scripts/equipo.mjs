/**
 * scripts/equipo.mjs
 *
 * Maneja el equipo de la plataforma: quién es admin (Nico) y quién es
 * comercial (Delfina). Quién es del equipo NUNCA se escribe en el repo (es
 * público): se carga con este comando, en cada base.
 *
 * ─── Uso ─────────────────────────────────────────────────────────────────────
 *   node scripts/equipo.mjs listar
 *   node scripts/equipo.mjs agregar <mail> admin
 *   node scripts/equipo.mjs agregar <mail> comercial
 *   node scripts/equipo.mjs quitar <mail>
 *
 *   En producción (a propósito, con copia de seguridad antes):
 *   node scripts/equipo.mjs --env .env.produccion.local --produccion agregar <mail> admin
 *
 * ─── Qué hace "agregar" ──────────────────────────────────────────────────────
 *   Anota a la persona en la tabla `equipo` con ese rol. Es lo único que la
 *   hace del equipo: la app y la base leen esa tabla. (Hasta la 0015 también le
 *   ponía `role = 'admin'` en el perfil; esa columna ya no existe, y con ella
 *   se fue "revisar", que buscaba las cuentas viejas con ese dato.)
 * La cuenta tiene que existir (la persona ya se registró en el sitio).
 *
 * "listar" solo lee. "agregar" y "quitar" escriben: fuera de desarrollo piden
 * --produccion, como migrate.mjs.
 */
import { describirDestino, exigirDesarrollo, leerArgumentos, leerEnv } from './lib/entorno.mjs'
import { conectar } from './lib/postgres.mjs'

const { opciones, archivos: args } = leerArgumentos(['env'])
const [accion, mailCrudo, rol] = args
const mail = (mailCrudo || '').trim().toLowerCase()
const ROLES = ['admin', 'comercial']

const uso = () => {
  console.error('Uso: node scripts/equipo.mjs [--env ARCHIVO] [--produccion] listar | agregar <mail> admin|comercial | quitar <mail>')
  process.exit(1)
}
if (!['listar', 'agregar', 'quitar'].includes(accion)) uso()
if (accion === 'agregar' && (!mail || !ROLES.includes(rol))) uso()
if (accion === 'quitar' && !mail) uso()

const env = leerEnv(opciones.env || '.env.local')
const escribe = accion === 'agregar' || accion === 'quitar'
if (escribe) exigirDesarrollo(env, { permitirProduccion: Boolean(opciones.produccion) })

console.log(`Equipo de la plataforma (${describirDestino(env)})\n`)
const cliente = await conectar(env)
try {
  const [{ hay }] = (await cliente.query(`select to_regclass('public.equipo') is not null as hay`)).rows
  if (!hay) {
    console.error('✗ Esta base todavía no tiene la tabla equipo (falta la migración 0007).')
    process.exitCode = 1
  } else if (accion === 'listar') {
    const { rows } = await cliente.query(`
      select p.email, e.rol, to_char(e.created_at, 'DD/MM/YYYY') as desde
        from public.equipo e join public.profiles p on p.id = e.user_id
       order by e.rol, p.email`)
    if (!rows.length) console.log('  (el equipo está vacío)')
    for (const r of rows) console.log(`  ${r.rol.padEnd(10)} ${r.email}  (desde ${r.desde})`)
  } else {
    const { rows: [persona] } = await cliente.query('select id from public.profiles where lower(email) = $1', [mail])
    if (!persona) {
      console.error(`✗ No hay ninguna cuenta con el mail ${mail}. Primero tiene que registrarse en el sitio.`)
      process.exitCode = 1
    } else {
      if (accion === 'agregar') {
        await cliente.query(
          `insert into public.equipo (user_id, rol) values ($1, $2)
           on conflict (user_id) do update set rol = excluded.rol`, [persona.id, rol])
      } else {
        await cliente.query('delete from public.equipo where user_id = $1', [persona.id])
      }
      console.log(accion === 'agregar' ? `✓ ${mail} es ${rol} del equipo.` : `✓ ${mail} ya no es del equipo.`)
    }
  }
} finally {
  await cliente.end()
}
