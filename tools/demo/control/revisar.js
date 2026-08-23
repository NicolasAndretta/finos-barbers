/**
 * tools/demo/control/revisar.js
 *
 * Control final del material: resolucion, formato, duracion, archivos faltantes
 * y rastros de informacion privada.
 *
 * Uso:  node tools/demo/control/revisar.js
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { REELS, POSTS, CARRUSEL, HISTORIAS, DESTACADAS } = require('../contenido/piezas')

const ROOT = path.join(process.cwd(), 'andmar-content/finos-barbers')

/**
 * Datos privados que NUNCA deben aparecer en el material.
 *
 * Los del comercio (alias de cobro, telefono, email) se leen en vivo de
 * `src/lib/site.ts` en vez de estar copiados aca: duplicarlos seria repartir
 * el dato justamente en el archivo que existe para evitar que se filtre.
 */
function datosDelComercio() {
  const ruta = path.join(process.cwd(), 'src/lib/site.ts')
  let fuente = ''
  try { fuente = fs.readFileSync(ruta, 'utf8') } catch { return [] }
  const valores = []
  for (const clave of ['aliasPago', 'whatsapp', 'whatsappMostrar', 'email']) {
    const m = fuente.match(new RegExp(`${clave}\\s*:\\s*"([^"]+)"`))
    if (m && m[1].length > 5) valores.push(m[1])
  }
  return valores
}

const PROHIBIDO = [
  ...datosDelComercio(),
  'eyJhbGciOi',          // encabezado de un JWT real
  'APP_USR-',            // token de produccion de Mercado Pago
  're_live',             // API key de Resend
  'sk_live',
]

let errores = 0
let avisos = 0
const fallo = (m) => { console.log(`  ✗ ${m}`); errores++ }
const aviso = (m) => { console.log(`  ! ${m}`); avisos++ }

function ffprobe(archivo) {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,codec_name,r_frame_rate,pix_fmt',
    '-show_entries', 'format=duration',
    '-of', 'json', archivo,
  ]).toString()
  const j = JSON.parse(out)
  const s = j.streams[0] || {}
  return { w: s.width, h: s.height, codec: s.codec_name, fps: s.r_frame_rate, pix: s.pix_fmt, dur: parseFloat(j.format.duration) }
}

function dimPng(archivo) {
  const b = fs.readFileSync(archivo, { start: 0, end: 32 })
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
}

/* ── 1 · Videos ──────────────────────────────────────────────────────── */
console.log('\n1 · Videos (reels)')
for (const r of REELS) {
  const p = path.join(ROOT, r.archivo)
  if (!fs.existsSync(p)) { fallo(`falta ${r.archivo}`); continue }
  const i = ffprobe(p)
  const mb = fs.statSync(p).size / 1048576
  const problemas = []
  if (i.w !== 1080 || i.h !== 1920) problemas.push(`resolución ${i.w}×${i.h}`)
  if (i.codec !== 'h264') problemas.push(`códec ${i.codec}`)
  if (i.pix !== 'yuv420p') problemas.push(`pix_fmt ${i.pix}`)
  if (i.dur < 8) problemas.push(`muy corto (${i.dur.toFixed(1)}s)`)
  if (i.dur > 90) problemas.push(`muy largo (${i.dur.toFixed(1)}s)`)
  if (mb > 45) problemas.push(`pesa ${mb.toFixed(1)} MB`)
  if (problemas.length) fallo(`${path.basename(r.archivo)}: ${problemas.join(', ')}`)
  else console.log(`  ✓ ${path.basename(r.archivo).padEnd(38)} ${i.w}×${i.h} · ${i.dur.toFixed(1)}s · ${mb.toFixed(1)} MB`)
}

/* ── 2 · Imagenes ────────────────────────────────────────────────────── */
function revisarImagenes(titulo, lista, ancho, alto) {
  console.log(`\n${titulo}`)
  for (const rel of lista) {
    const p = path.join(ROOT, rel)
    if (!fs.existsSync(p)) { fallo(`falta ${rel}`); continue }
    const d = dimPng(p)
    if (d.w !== ancho || d.h !== alto) fallo(`${path.basename(rel)}: ${d.w}×${d.h} (esperado ${ancho}×${alto})`)
    else console.log(`  ✓ ${path.basename(rel).padEnd(38)} ${d.w}×${d.h}`)
  }
}

revisarImagenes('2 · Posts', POSTS.map((p) => p.archivo), 1080, 1350)
revisarImagenes('3 · Carrusel', CARRUSEL.placas.map((f) => path.join(CARRUSEL.archivo, f)), 1080, 1350)
revisarImagenes('4 · Historias', HISTORIAS.map((h) => h.archivo), 1080, 1920)
revisarImagenes('5 · Destacadas', DESTACADAS.map((d) => d.archivo), 1080, 1920)

/* ── 6 · Capturas ────────────────────────────────────────────────────── */
console.log('\n6 · Capturas')
const capDir = path.join(ROOT, 'capturas')
const caps = fs.existsSync(capDir) ? fs.readdirSync(capDir).filter((f) => f.endsWith('.png')) : []
let capMobile = 0, capDesktop = 0
for (const f of caps) {
  const d = dimPng(path.join(capDir, f))
  if (f.endsWith('-detalle.png')) continue   // recortes a medida, sin tamaño fijo
  if (f.endsWith('-mobile.png')) {
    capMobile++
    if (d.w !== 1080 || d.h !== 1920) aviso(`${f}: ${d.w}×${d.h}`)
  } else {
    capDesktop++
    if (d.w < 1400) aviso(`${f}: ${d.w}×${d.h}`)
  }
}
console.log(`  ✓ ${caps.length} capturas (${capMobile} celular · ${capDesktop} escritorio)`)

/* ── 7 · Material bruto ──────────────────────────────────────────────── */
console.log('\n7 · Material bruto')
const brutoDir = path.join(ROOT, 'videos/bruto')
const brutos = fs.existsSync(brutoDir) ? fs.readdirSync(brutoDir).filter((f) => f.endsWith('.mp4')) : []
for (const f of brutos) {
  const i = ffprobe(path.join(brutoDir, f))
  if (i.codec !== 'h264') fallo(`bruto ${f}: códec ${i.codec}`)
  if (i.dur < 3) aviso(`bruto ${f}: sólo ${i.dur.toFixed(1)}s`)
}
console.log(`  ✓ ${brutos.length} grabaciones en bruto`)

/* ── 8 · Informacion privada ─────────────────────────────────────────── */
console.log('\n8 · Información privada y secretos')
function recorrer(dir, fn) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) recorrer(p, fn)
    else fn(p)
  }
}
let revisados = 0
recorrer(ROOT, (p) => {
  if (!/\.(md|txt|json|srt|vtt)$/i.test(p)) return
  revisados++
  const t = fs.readFileSync(p, 'utf8')
  for (const s of PROHIBIDO) {
    if (t.includes(s)) fallo(`${path.relative(ROOT, p)} contiene "${s}"`)
  }
})
console.log(`  ✓ ${revisados} archivos de texto revisados`)

// El modo demo tambien tiene que estar limpio (es lo que se ve en pantalla).
const siteDemo = fs.readFileSync(path.join(process.cwd(), 'tools/demo/site-demo.js'), 'utf8')
for (const s of PROHIBIDO) {
  if (siteDemo.includes(s)) fallo(`tools/demo/site-demo.js contiene "${s}"`)
}
const seed = fs.readFileSync(path.join(process.cwd(), 'tools/demo/seed.json'), 'utf8')
for (const s of PROHIBIDO) {
  if (seed.includes(s)) fallo(`tools/demo/seed.json contiene "${s}"`)
}
console.log('  ✓ datos del modo demo sin información privada')

/* ── 9 · Documentacion ───────────────────────────────────────────────── */
console.log('\n9 · Documentación')
for (const doc of ['project.md', 'social/content-index.md', 'social/captions/reels.md',
  'social/captions/posts.md', 'social/captions/historias.md', 'social/captions/destacadas.md']) {
  if (!fs.existsSync(path.join(ROOT, doc))) fallo(`falta ${doc}`)
  else console.log(`  ✓ ${doc}`)
}

/* ── Resumen ─────────────────────────────────────────────────────────── */
console.log(`\n${'─'.repeat(60)}`)
console.log(errores === 0 ? `TODO OK · ${avisos} aviso(s)` : `${errores} error(es) · ${avisos} aviso(s)`)
process.exit(errores === 0 ? 0 : 1)
