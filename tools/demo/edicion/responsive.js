/**
 * tools/demo/edicion/responsive.js
 *
 * Compone la pieza "responsive": la misma pantalla en escritorio y en celular,
 * dentro de un lienzo 1080×1920 con la identidad de andmar.studio.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { abrirRenderizador } = require('../brand/render')
const T = require('../brand/plantillas')
const { ff, info } = require('./ffmpeg')
const { montar } = require('./montaje')

const ROOT = path.join(process.cwd(), 'andmar-content/finos-barbers')
const BRUTO = path.join(ROOT, 'videos/bruto')
const SALIDA = path.join(ROOT, 'social/reels')


const PARES = [
  { id: 'home', desktop: 'desktop-home', mobile: 'hero', titulo: 'La misma web,<br>en cualquier pantalla', etiqueta: 'Responsive' },
  { id: 'panel', desktop: 'desktop-panel', mobile: 'agenda', titulo: 'El panel también<br>entra en el bolsillo', etiqueta: 'Panel · responsive' },
]

async function main() {
  const r = await abrirRenderizador()
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'resp-'))
  fs.mkdirSync(SALIDA, { recursive: true })

  const compuestos = []
  for (const par of PARES) {
    const dsk = path.join(BRUTO, `${par.desktop}.mp4`)
    const mob = path.join(BRUTO, `${par.mobile}.mp4`)
    if (!fs.existsSync(dsk) || !fs.existsSync(mob)) { console.log(`✗ ${par.id}: falta material`); continue }

    const fondo = path.join(tmp, `${par.id}-fondo.png`)
    const marco = path.join(tmp, `${par.id}-marco.png`)
    await r.png(T.marcoResponsive({ ...par, pieDer: 'Demo funcional' }), { ancho: 1080, alto: 1920, destino: fondo })
    // Medimos las ranuras sobre la plantilla ya renderizada: si el titulo ocupa
    // una linea mas, las posiciones cambian y no se pueden fijar a mano.
    const [ESCRITORIO, CELULAR] = await r.page.evaluate(() =>
      [...document.querySelectorAll('.pantalla')].map((e) => {
        const b = e.getBoundingClientRect()
        return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }
      }))
    await r.png(T.marcoResponsive({ ...par, pieDer: 'Demo funcional', variante: 'marco' }), { ancho: 1080, alto: 1920, destino: marco, transparente: true })

    const dur = Math.min(info(dsk).duracion, 14)
    const compuesto = path.join(tmp, `${par.id}.mp4`)
    ff([
      '-loop', '1', '-i', fondo,
      '-stream_loop', '-1', '-i', dsk,
      '-stream_loop', '-1', '-i', mob,
      '-i', marco,
      '-filter_complex',
      `[1:v]scale=${ESCRITORIO.w}:${ESCRITORIO.h},setsar=1[d];` +
      `[2:v]scale=${CELULAR.w}:${CELULAR.h},setsar=1[m];` +
      `[0:v][d]overlay=${ESCRITORIO.x}:${ESCRITORIO.y}[a];` +
      `[a][m]overlay=${CELULAR.x}:${CELULAR.y}[b];` +
      `[b][3:v]overlay=0:0,fps=25,format=yuv420p[v]`,
      '-map', '[v]', '-t', String(dur),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
      '-profile:v', 'high', '-level', '4.1', '-movflags', '+faststart',
      compuesto,
    ])
    compuestos.push({ par, compuesto, dur })
    console.log(`· compuesto ${par.id} (${dur.toFixed(1)}s)`)
  }

  if (compuestos.length) {
    const apertura = path.join(tmp, 'apertura.png')
    const cierre = path.join(tmp, 'cierre.png')
    await r.png(T.placaApertura({
      etiqueta: 'Responsive',
      titulo: 'Se usa<br>desde el<br><em class="violeta">celular</em>',
      subtitulo: 'Clientes y dueño entran desde donde estén. Y además se instala como app.',
      pie: 'Proyecto desarrollado · demo funcional',
    }), { ancho: 1080, alto: 1920, destino: apertura })
    await r.png(T.placaCierre({
      titulo: 'Una sola web,<br>todas las pantallas',
      lineas: ['Diseño responsive', 'Instalable como app (PWA)', 'Mismo sistema en los dos lados'],
      cta: 'Escribinos por DM',
    }), { ancho: 1080, alto: 1920, destino: cierre })

    const segmentos = [{ tipo: 'placa', png: apertura, dur: 2.6 }]
    for (const c of compuestos) {
      segmentos.push({ tipo: 'clip', src: c.compuesto, desde: 0, hasta: c.dur, fundidoIn: 0.25 })
    }
    segmentos.push({ tipo: 'placa', png: cierre, dur: 3.0 })

    const salida = path.join(SALIDA, 'reel-14-responsive.mp4')
    montar({ segmentos, salida, temporal: path.join(tmp, 'seg') })
    const meta = info(salida)
    console.log(`✓ reel-14-responsive          ${meta.duracion.toFixed(1)}s · ${meta.ancho}×${meta.alto}`)
  }

  await r.cerrar()
  fs.rmSync(tmp, { recursive: true, force: true })
}

main().catch((e) => { console.error(e); process.exit(1) })
