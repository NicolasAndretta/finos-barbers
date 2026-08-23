/**
 * tools/demo/edicion/reels.js
 *
 * Monta los reels finales (1080×1920, H.264) a partir del material bruto y de
 * las placas graficas de andmar.studio.
 *
 * Uso:  node tools/demo/edicion/reels.js [nombre-reel ...]
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { abrirRenderizador } = require('../brand/render')
const T = require('../brand/plantillas')
const { montar } = require('./montaje')
const { info } = require('./ffmpeg')
const ESPEC = require('./espec-reels')

const ROOT = path.join(process.cwd(), 'andmar-content/finos-barbers')
const BRUTO = path.join(ROOT, 'videos/bruto')
const SALIDA = path.join(ROOT, 'social/reels')

/** Resuelve 'marca:paso2' o un numero a segundos dentro del bruto. */
function tiempo(valor, marcas, duracion) {
  if (valor === undefined || valor === null) return undefined
  if (typeof valor === 'number') return valor
  if (valor === 'fin') return duracion
  const m = marcas.find((x) => x.nombre === valor.replace(/^marca:/, ''))
  if (!m) throw new Error(`marca desconocida: ${valor}`)
  return m.t
}

async function construir(nombres) {
  const r = await abrirRenderizador()
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'reels-'))
  fs.mkdirSync(SALIDA, { recursive: true })

  const firma = path.join(tmpBase, 'firma.png')
  await r.png(T.firma(), { ancho: 1080, alto: 1920, destino: firma, transparente: true })

  const hechos = []
  for (const espec of ESPEC) {
    if (nombres.length && !nombres.includes(espec.id)) continue

    const fuente = path.join(BRUTO, `${espec.fuente}.mp4`)
    if (!fs.existsSync(fuente)) { console.log(`✗ ${espec.id}: falta ${espec.fuente}.mp4`); continue }
    const sidecar = JSON.parse(fs.readFileSync(fuente.replace(/\.mp4$/, '.json'), 'utf8'))
    const durFuente = info(fuente).duracion

    const tmp = path.join(tmpBase, espec.id)
    fs.mkdirSync(tmp, { recursive: true })
    const segmentos = []

    // Placa de apertura
    if (espec.apertura) {
      const png = path.join(tmp, 'apertura.png')
      await r.png(T.placaApertura(espec.apertura), { ancho: 1080, alto: 1920, destino: png })
      segmentos.push({ tipo: 'placa', png, dur: espec.apertura.dur || 2.4 })
    }

    // Tramos del bruto
    for (const [i, tr] of espec.tramos.entries()) {
      const desde = tiempo(tr.desde, sidecar.marcas, durFuente) ?? 0
      const hasta = tiempo(tr.hasta, sidecar.marcas, durFuente) ?? durFuente
      const capas = []
      if (tr.capa) {
        const png = path.join(tmp, `capa-${i}.png`)
        await r.png(T.sobreimpreso(tr.capa), { ancho: 1080, alto: 1920, destino: png, transparente: true })
        const dur = (hasta - desde) / (tr.vel || 1)
        capas.push({
          png,
          desde: tr.capa.desde === undefined ? 0.25 : tr.capa.desde,
          hasta: tr.capa.hasta === undefined ? Math.min(dur - 0.15, (tr.capa.desde || 0.25) + 3.4) : tr.capa.hasta,
        })
      }
      segmentos.push({
        tipo: 'clip', src: fuente, desde, hasta, vel: tr.vel || 1,
        marca: firma, capas,
        fundidoIn: i === 0 && espec.apertura ? 0.25 : 0,
        fundidoOut: 0,
      })
    }

    // Placa de cierre
    if (espec.cierre) {
      const png = path.join(tmp, 'cierre.png')
      await r.png(T.placaCierre(espec.cierre), { ancho: 1080, alto: 1920, destino: png })
      segmentos.push({ tipo: 'placa', png, dur: espec.cierre.dur || 2.8, zoom: 1.04 })
    }

    const salida = path.join(SALIDA, `${espec.id}.mp4`)
    montar({ segmentos, salida, temporal: path.join(tmp, 'seg') })
    const meta = info(salida)
    console.log(`✓ ${espec.id.padEnd(28)} ${meta.duracion.toFixed(1)}s · ${meta.ancho}×${meta.alto} · ${(fs.statSync(salida).size / 1048576).toFixed(1)} MB`)
    hechos.push(salida)
  }

  await r.cerrar()
  fs.rmSync(tmpBase, { recursive: true, force: true })
  return hechos
}

construir(process.argv.slice(2)).catch((e) => { console.error(e); process.exit(1) })
