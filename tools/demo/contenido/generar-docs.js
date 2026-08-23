/**
 * tools/demo/contenido/generar-docs.js
 *
 * Genera los .md de captions y el content-index a partir de tools/demo/contenido/piezas.js
 * y de los archivos que existen de verdad en disco (si falta un archivo, se marca).
 */
const fs = require('fs')
const path = require('path')
const { REELS, POSTS, CARRUSEL, HISTORIAS, DESTACADAS } = require('./piezas')

const ROOT = path.join(process.cwd(), 'andmar-content/finos-barbers')
const existe = (rel) => fs.existsSync(path.join(ROOT, rel))
const estado = (rel) => (existe(rel) ? 'Listo para publicar' : 'FALTA EL ARCHIVO')

function tamano(rel) {
  try {
    const p = path.join(ROOT, rel)
    const st = fs.statSync(p)
    if (st.isDirectory()) return `${fs.readdirSync(p).length} archivos`
    return `${(st.size / 1048576).toFixed(1)} MB`
  } catch { return '—' }
}

/* ── captions/reels.md ───────────────────────────────────────────────── */
function reelsMd() {
  const partes = ['# Captions — Reels\n',
    'Copiá y pegá tal cual. Los textos ya respetan las reglas de comunicación del proyecto',
    '(ver `project.md`): Fino\'s Barbers se presenta como **proyecto desarrollado / demo funcional**.\n']
  for (const r of REELS) {
    partes.push(`\n---\n\n## ${r.nombre}\n`)
    partes.push(`- **Archivo:** \`${r.archivo}\`${existe(r.archivo) ? '' : ' ⚠️ falta'}`)
    partes.push(`- **Formato:** Reel 1080×1920 (9:16)`)
    partes.push(`- **Objetivo:** ${r.objetivo}`)
    partes.push(`- **CTA:** ${r.cta}\n`)
    partes.push('**Caption:**\n')
    partes.push('```')
    partes.push(r.caption)
    partes.push('```')
  }
  return partes.join('\n') + '\n'
}

/* ── captions/posts.md ───────────────────────────────────────────────── */
function postsMd() {
  const partes = ['# Captions — Posts\n']
  for (const p of POSTS) {
    partes.push(`\n---\n\n## ${p.nombre}\n`)
    partes.push(`- **Archivo:** \`${p.archivo}\`${existe(p.archivo) ? '' : ' ⚠️ falta'}`)
    partes.push(`- **Formato:** Post 1080×1350 (4:5)`)
    partes.push(`- **Objetivo:** ${p.objetivo}`)
    partes.push(`- **CTA:** ${p.cta}\n`)
    partes.push('**Caption:**\n')
    partes.push('```')
    partes.push(p.caption)
    partes.push('```')
  }
  partes.push(`\n---\n\n## ${CARRUSEL.nombre}\n`)
  partes.push(`- **Archivos:** \`${CARRUSEL.archivo}\` (en orden: ${CARRUSEL.placas.join(', ')})`)
  partes.push(`- **Formato:** Carrusel 1080×1350 (4:5)`)
  partes.push(`- **Objetivo:** ${CARRUSEL.objetivo}`)
  partes.push(`- **CTA:** ${CARRUSEL.cta}\n`)
  partes.push('**Caption:**\n')
  partes.push('```')
  partes.push(CARRUSEL.caption)
  partes.push('```')
  return partes.join('\n') + '\n'
}

/* ── captions/historias.md ───────────────────────────────────────────── */
function historiasMd() {
  const partes = ['# Historias\n',
    'La **Secuencia A** está pensada para publicarse seguida, en este orden:',
    'problema → solución → demostración → CTA. Las sueltas se pueden subir cualquier día.\n']
  for (const h of HISTORIAS) {
    partes.push(`\n---\n\n## ${h.nombre} — ${h.secuencia}\n`)
    partes.push(`- **Archivo:** \`${h.archivo}\`${existe(h.archivo) ? '' : ' ⚠️ falta'}`)
    partes.push(`- **Formato:** Historia 1080×1920 (9:16)`)
    partes.push(`- **Objetivo:** ${h.objetivo}`)
    partes.push(`- **CTA:** ${h.cta}`)
    if (h.texto) partes.push(`- **Nota:** ${h.texto}`)
  }
  return partes.join('\n') + '\n'
}

/* ── captions/destacadas.md ──────────────────────────────────────────── */
function destacadasMd() {
  const partes = ['# Destacadas (portadas)\n',
    'Subí la imagen como historia, después editá la destacada y elegí esa historia como portada.',
    'Instagram recorta la portada en círculo: el ícono ya está centrado para que quede bien.\n',
    '| Destacada | Archivo | Para qué |', '|---|---|---|']
  for (const d of DESTACADAS) {
    partes.push(`| ${d.nombre} | \`${d.archivo}\`${existe(d.archivo) ? '' : ' ⚠️' } | ${d.objetivo} |`)
  }
  partes.push('\n**Orden sugerido en el perfil:** PROYECTOS · TURNOS · TIENDA · PANEL · SISTEMAS · PROCESO · CONTACTO')
  return partes.join('\n') + '\n'
}

/* ── content-index.md ────────────────────────────────────────────────── */
function indiceMd() {
  const filas = []
  const fila = (nombre, formato, archivo, objetivo, cta) =>
    `| ${nombre} | ${formato} | \`${archivo}\` | ${objetivo} | ${cta} | ${estado(archivo)} |`

  for (const r of REELS) filas.push(fila(r.nombre, `Reel 9:16 · ${tamano(r.archivo)}`, r.archivo, r.objetivo, r.cta))
  for (const p of POSTS) filas.push(fila(p.nombre, 'Post 4:5', p.archivo, p.objetivo, p.cta))
  filas.push(fila(CARRUSEL.nombre, 'Carrusel 4:5', CARRUSEL.archivo, CARRUSEL.objetivo, CARRUSEL.cta))
  for (const h of HISTORIAS) filas.push(fila(h.nombre, 'Historia 9:16', h.archivo, h.objetivo, h.cta))
  for (const d of DESTACADAS) filas.push(fila(`Destacada ${d.nombre}`, 'Portada 9:16', d.archivo, d.objetivo, '—'))

  return `# Índice de contenido — Fino's Barbers × andmar.studio

Material listo para publicar. Los captions completos están en \`social/captions/\`.

**Regla de oro:** Fino's Barbers se comunica como **proyecto desarrollado / demo funcional**.
Nunca como cliente activo, sistema en producción ni con métricas de uso.

| PIEZA | FORMATO | ARCHIVO | OBJETIVO | CTA | ESTADO |
|---|---|---|---|---|---|
${filas.join('\n')}

## Orden de publicación sugerido

| Día | Pieza | Por qué |
|---|---|---|
| 1 | Reel 1 · Sistema de turnos | Es la pieza más fuerte y la que mejor explica qué hacemos. |
| 1 | Historias Secuencia A (1 a 4) | Acompañan el reel y abren conversación por DM. |
| 2 | Post 1 · El proyecto | Deja el feed presentado. |
| 3 | Reel 7 · Panel administrativo | El argumento de venta para dueños de negocio. |
| 4 | Carrusel · Cómo reserva un cliente | Contenido educativo, alto guardado. |
| 5 | Reel 5 · Tienda online | Abre la puerta a negocios que venden productos. |
| 6 | Post 9 · Qué hacemos | Fijalo en el perfil. |
| 7 | Reel 10 · Panel financiero | Muy vendible para cualquier pyme. |

Después, alternar el resto de reels y posts cada 2 o 3 días.

## Material de apoyo

| Carpeta | Qué hay |
|---|---|
| \`videos/bruto/\` | Grabaciones sin editar de cada pantalla (1080×1920 y escritorio). Sirven para armar piezas nuevas. |
| \`capturas/\` | Capturas de todas las pantallas, en celular y escritorio. |
| \`recursos/\` | Placas y elementos gráficos reutilizables. |
`
}

const CAPTIONS = path.join(ROOT, 'social/captions')
fs.mkdirSync(CAPTIONS, { recursive: true })
fs.writeFileSync(path.join(CAPTIONS, 'reels.md'), reelsMd())
fs.writeFileSync(path.join(CAPTIONS, 'posts.md'), postsMd())
fs.writeFileSync(path.join(CAPTIONS, 'historias.md'), historiasMd())
fs.writeFileSync(path.join(CAPTIONS, 'destacadas.md'), destacadasMd())
fs.writeFileSync(path.join(ROOT, 'social/content-index.md'), indiceMd())
console.log('✓ captions y content-index generados')
