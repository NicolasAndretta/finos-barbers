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
 *   node scripts/equipo.mjs revisar
 *       → las cuentas que tienen panel de admin pero no son del equipo (las
 *         que, desde la Fase 2, ya no ven datos). Sirve para decidir qué
 *         hacer con ellas al pasar a producción.
 *
 *   En producción (a propósito, con copia de seguridad antes):
 *   node scripts/equipo.mjs --env .env.produccion.local --produccion agregar <mail> admin
 *
 * ─── Qué hace "agregar" ──────────────────────────────────────────────────────
 *   1. Anota a la persona en la tabla `equipo` con ese rol.
 *   2. TEMPORAL: le pone `role = 'admin'` en el perfil. La app todavía elige
 *      qué panel mostrar con ese dato; hasta que el código lea el equipo, es lo
 *      que hace que vea el panel de admin. "quitar" lo vuelve a 'client'.
 * La cuenta tiene que existir (la persona ya se registró en el sitio).
 *
 * "listar" y "revisar" solo leen. "agregar" y "quitar" escriben: fuera de
 * desarrollo piden --produccion, como migrate.mjs.
 */
import { describirDestino, exigirDesarrollo, leerArgumentos, leerEnv } from './lib/entorno.mjs'
import { conectar } from './lib/postgres.mjs'

const { opciones, archivos: args } = leerArgumentos(['env'])
const [accion, mailCrudo, rol] = args
const mail = (mailCrudo || '').trim().toLowerCase()
const ROLES = ['admin', 'comercial']

const uso = () => {
  console.error('Uso: node scripts/equipo.mjs [--env ARCHIVO] [--produccion] listar | revisar | agregar <mail> admin|comercial | quitar <mail>')
  process.exit(1)
}
if (!['listar', 'revisar', 'agregar', 'quitar'].includes(accion)) uso()
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
  } else if (accion === 'revisar') {
    const { rows } = await cliente.query(`
      select p.email from public.profiles p
       where p.role = 'admin' and not exists (select 1 from public.equipo e where e.user_id = p.id)
       order by p.email`)
    if (!rows.length) console.log('  ✓ Todas las cuentas con panel de admin son del equipo.')
    else {
      console.log(`  ${rows.length} cuenta(s) con panel de admin que NO son del equipo (no ven datos):`)
      for (const r of rows) console.log(`    ${r.email}`)
      console.log('\n  Para que dejen de ver el panel: node scripts/equipo.mjs quitar <mail>')
    }
  } else {
    const { rows: [persona] } = await cliente.query('select id from public.profiles where lower(email) = $1', [mail])
    if (!persona) {
      console.error(`✗ No hay ninguna cuenta con el mail ${mail}. Primero tiene que registrarse en el sitio.`)
      process.exitCode = 1
    } else {
      // Las dos cosas juntas o ninguna: una transacción.
      await cliente.query('begin')
      try {
        if (accion === 'agregar') {
          await cliente.query(
            `insert into public.equipo (user_id, rol) values ($1, $2)
             on conflict (user_id) do update set rol = excluded.rol`, [persona.id, rol])
          await cliente.query(`update public.profiles set role = 'admin' where id = $1`, [persona.id])
        } else {
          await cliente.query('delete from public.equipo where user_id = $1', [persona.id])
          await cliente.query(`update public.profiles set role = 'client' where id = $1 and role = 'admin'`, [persona.id])
        }
        await cliente.query('commit')
        console.log(accion === 'agregar' ? `✓ ${mail} es ${rol} del equipo.` : `✓ ${mail} ya no es del equipo.`)
      } catch (e) {
        await cliente.query('rollback').catch(() => {})
        throw e
      }
    }
  }
} finally {
  await cliente.end()
}
