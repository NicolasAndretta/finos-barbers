/**
 * scripts/reloj.mjs
 *
 * El reloj de la base (pg_cron, desde la migración 0015): qué tareas tiene
 * programadas, cómo salieron las últimas veces que corrieron, y qué muestras
 * vencen pronto. Solo lee: se puede correr en producción sin --produccion.
 *
 * ─── Uso ─────────────────────────────────────────────────────────────────────
 *   node scripts/reloj.mjs
 *   node scripts/reloj.mjs --env .env.produccion.local
 */
import { describirDestino, leerArgumentos, leerEnv } from './lib/entorno.mjs'
import { abrirSoloLectura, conectar } from './lib/postgres.mjs'

const { opciones } = leerArgumentos(['env'])
const env = leerEnv(opciones.env || '.env.local')

console.log(`El reloj de la base (${describirDestino(env)})\n`)
const cliente = await conectar(env)
try {
  await abrirSoloLectura(cliente)
  const [{ hay }] = (await cliente.query(`select to_regclass('cron.job') is not null as hay`)).rows
  if (!hay) {
    console.log('  ✗ Esta base no tiene el reloj (falta la migración 0015).')
    process.exitCode = 1
  } else {
    const { rows: tareas } = await cliente.query(`select jobid, jobname, schedule, active from cron.job order by jobname`)
    if (!tareas.length) console.log('  (no hay tareas programadas)')
    for (const t of tareas) console.log(`  ${t.active ? '✓' : '⏸'} ${t.jobname}  (${t.schedule}, en UTC)`)

    const { rows: corridas } = await cliente.query(`
      select j.jobname, d.status, d.return_message,
             to_char(d.start_time at time zone 'America/Argentina/Buenos_Aires', 'DD/MM HH24:MI') as cuando
        from cron.job_run_details d join cron.job j on j.jobid = d.jobid
       order by d.start_time desc limit 5`)
    console.log('\n  Las últimas veces que corrió:')
    if (!corridas.length) console.log('    (todavía no corrió ninguna: la primera es esta noche a las 3)')
    for (const c of corridas) {
      console.log(`    ${c.status === 'succeeded' ? '✓' : '✗'} ${c.cuando}  ${c.jobname}  ${c.return_message ?? ''}`)
    }

    const { rows: vencen } = await cliente.query(`
      select slug, to_char(muestra_hasta at time zone 'America/Argentina/Buenos_Aires', 'DD/MM') as hasta
        from public.locales
       where estado = 'demo' and muestra_hasta is not null
       order by muestra_hasta limit 10`)
    console.log('\n  Las muestras que vencen (se archivan solas esa noche):')
    if (!vencen.length) console.log('    (ninguna: las que hay no vencen, como Roble)')
    for (const v of vencen) console.log(`    /${v.slug}  →  ${v.hasta}`)
  }
} finally {
  await cliente.end()
}
