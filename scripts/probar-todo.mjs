/**
 * scripts/probar-todo.mjs
 *
 * Todas las pruebas, con un solo comando, y un resumen al final (Fase 5):
 *
 *   npm run probar
 *
 * 1. Las de la base (siempre): verificar-locales, verificar-llave-servidor,
 *    probar-seguridad, probar-aislamiento y probar-matriz (la matriz completa).
 * 2. Las de navegador, si la app está levantada en http://127.0.0.1:3000
 *    (o APP_URL): reservas, locales, horarios, imágenes, panel del barbero y
 *    cobros. Cobros necesita la app levantada contra el Mercado Pago de
 *    mentira (ver arriba de probar-cobros.mjs); si no lo está, se avisa.
 *
 * Solo DESARROLLO: cada prueba arma sus datos y los borra al final. Termina con
 * error si alguna prueba falló, o si no se pudieron correr todas.
 */
import { spawnSync } from 'child_process'
import { resolve } from 'path'

const PROYECTO = resolve(import.meta.dirname, '..')
const APP = (process.env.APP_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '')

const DE_LA_BASE = ['verificar-locales', 'verificar-llave-servidor', 'probar-seguridad', 'probar-aislamiento', 'probar-matriz']
const DE_NAVEGADOR = ['probar-reservas', 'probar-locales', 'probar-horarios', 'probar-imagenes', 'probar-panel-barbero', 'probar-cobros']

const appAnda = await fetch(`${APP}/roble`, { signal: AbortSignal.timeout(10_000) }).then((r) => r.ok).catch(() => false)

const resultados = []
for (const nombre of [...DE_LA_BASE, ...(appAnda ? DE_NAVEGADOR : [])]) {
  // "… nombre" mientras corre, solo en una terminal (en un archivo quedaría pegado al resultado).
  if (process.stdout.isTTY) process.stdout.write(`… ${nombre}`)
  const desde = Date.now()
  const corrida = spawnSync(process.execPath, [resolve(PROYECTO, 'scripts', `${nombre}.mjs`)], { cwd: PROYECTO, encoding: 'utf8', env: process.env, maxBuffer: 50 * 1024 * 1024 })
  const salida = `${corrida.stdout ?? ''}${corrida.stderr ?? ''}`
  const bien = (salida.match(/^ {2}✓/gm) ?? []).length
  const mal = (salida.match(/^ {2}✗/gm) ?? []).length
  // probar-cobros se niega a correr si la app no apunta al Mercado Pago de mentira.
  const sinConfigurar = /no apunta al Mercado Pago de mentira|Falta configurar|MP_CLIENT_ID \/ MP_CLIENT_SECRET de prueba/.test(salida)
  const estado = sinConfigurar ? 'sin_configurar' : corrida.status === 0 ? 'bien' : 'mal'
  resultados.push({ nombre, bien, mal, estado, segundos: Math.round((Date.now() - desde) / 1000), salida })
  process.stdout.write(`${process.stdout.isTTY ? '\r' : ''}${estado === 'bien' ? '✓' : estado === 'mal' ? '✗' : '⚠'} ${nombre}${' '.repeat(30 - nombre.length)}${String(bien).padStart(4)} ✓ ${String(mal).padStart(3)} ✗   ${resultados.at(-1).segundos} s\n`)
}

// Lo que salió mal, con su detalle (las líneas ✗ y por qué se cortó).
for (const r of resultados.filter((x) => x.estado === 'mal')) {
  console.log(`\n── ${r.nombre} ──`)
  for (const linea of r.salida.split(/\r?\n/).filter((l) => /^ {2}✗|se cortó|^ {2}· /.test(l)).slice(0, 25)) console.log(linea)
}

const total = resultados.reduce((s, r) => s + r.bien, 0)
const fallaron = resultados.filter((r) => r.estado === 'mal')
const sinConfigurar = resultados.filter((r) => r.estado === 'sin_configurar')
console.log('')
if (!appAnda) {
  console.log(`⚠ No es la prueba completa: la app no responde en ${APP}, así que no se corrieron las de navegador.`)
  console.log('  Levantala con: NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 npm run build  y después el "npx next start" de arriba de probar-cobros.mjs.')
}
for (const r of sinConfigurar) console.log(`⚠ ${r.nombre} no se pudo correr: la app no está levantada contra el Mercado Pago de mentira (ver arriba de probar-cobros.mjs).`)
console.log(fallaron.length === 0 && appAnda && sinConfigurar.length === 0
  ? `✓ Todo en verde: ${resultados.length} pruebas, ${total} controles.`
  : fallaron.length
    ? `✗ ${fallaron.length} prueba(s) con fallas: ${fallaron.map((r) => r.nombre).join(', ')}.`
    : `✓ Lo que se corrió está en verde (${total} controles), pero faltan pruebas: mirá los avisos de arriba.`)
process.exit(fallaron.length === 0 && appAnda && sinConfigurar.length === 0 ? 0 : 1)
