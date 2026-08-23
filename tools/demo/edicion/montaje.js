/**
 * tools/demo/edicion/montaje.js
 *
 * Monta un reel 1080×1920 a partir de una lista de segmentos.
 *
 * Segmentos soportados:
 *   { tipo: 'placa', png, dur, zoom }                     → placa estatica con zoom lento
 *   { tipo: 'clip', src, desde, hasta, vel, marca, capas } → tramo de una grabacion
 *
 * `capas` = [{ png, desde, hasta }] en segundos relativos al segmento ya cortado.
 */
const fs = require('fs')
const path = require('path')
const { ff, duracion } = require('./ffmpeg')

const W = 1080
const H = 1920
const FPS = 30

const CODEC = [
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-threads', '0',
  '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1',
  '-g', String(FPS * 2), '-movflags', '+faststart',
]

/** Placa estatica con un zoom muy leve (la fuente es una imagen: no vibra). */
function segmentoPlaca({ png, dur = 2.0, zoom = 1.05, salida, fundidoIn = 0.35, fundidoOut = 0.3 }) {
  const cuadros = Math.round(dur * FPS)
  const paso = (zoom - 1) / cuadros
  const vf = [
    `scale=${Math.round(W * 1.5)}:${Math.round(H * 1.5)}`,
    `zoompan=z='min(1+${paso.toFixed(8)}*on,${zoom})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${cuadros}:s=${W}x${H}:fps=${FPS}`,
    `fade=t=in:st=0:d=${fundidoIn}`,
    `fade=t=out:st=${(dur - fundidoOut).toFixed(2)}:d=${fundidoOut}`,
    'setsar=1',
  ].join(',')
  ff(['-loop', '1', '-i', png, '-t', String(dur), '-vf', vf, '-an', ...CODEC, salida])
  return salida
}

/** Tramo de grabacion con marca de agua y sobreimpresos temporizados. */
function segmentoClip({ src, desde = 0, hasta, vel = 1, marca, capas = [], salida, fundidoIn = 0, fundidoOut = 0 }) {
  const entradas = ['-ss', String(desde)]
  if (hasta !== undefined) entradas.push('-to', String(hasta))
  entradas.push('-i', src)

  const capasPng = []
  if (marca) capasPng.push({ png: marca, desde: 0, hasta: 9999, fundido: 0.4 })
  for (const c of capas) capasPng.push(c)

  const bruto = (hasta !== undefined ? hasta - desde : duracion(src) - desde)
  const dur = bruto / vel

  // Cada PNG entra como secuencia (loop + duracion): si entrara como imagen
  // suelta tendria un unico cuadro en t=0 y el fundido del alfa nunca avanzaria
  // (el sobreimpreso quedaria invisible).
  for (const c of capasPng) {
    entradas.push('-loop', '1', '-framerate', String(FPS), '-t', dur.toFixed(3), '-i', c.png)
  }

  const filtros = []
  let etiqueta = '0:v'
  filtros.push(`[${etiqueta}]fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,setpts=PTS/${vel}[base]`)
  etiqueta = 'base'

  capasPng.forEach((c, i) => {
    const idx = i + 1
    const fin = Math.min(c.hasta === undefined ? dur : c.hasta, dur)
    const ini = c.desde || 0
    const f = c.fundido === undefined ? 0.3 : c.fundido
    // Fundido de entrada/salida sobre el alfa del sobreimpreso.
    filtros.push(
      `[${idx}:v]format=rgba,fade=t=in:st=${ini.toFixed(2)}:d=${f}:alpha=1,` +
      `fade=t=out:st=${Math.max(ini, fin - f).toFixed(2)}:d=${f}:alpha=1[cap${idx}]`,
    )
    filtros.push(
      `[${etiqueta}][cap${idx}]overlay=0:0:enable='between(t,${ini.toFixed(2)},${fin.toFixed(2)})'[ov${idx}]`,
    )
    etiqueta = `ov${idx}`
  })

  const extras = []
  if (fundidoIn > 0) extras.push(`fade=t=in:st=0:d=${fundidoIn}`)
  if (fundidoOut > 0) extras.push(`fade=t=out:st=${(dur - fundidoOut).toFixed(2)}:d=${fundidoOut}`)
  if (extras.length) {
    filtros.push(`[${etiqueta}]${extras.join(',')}[fin]`)
    etiqueta = 'fin'
  }

  ff([...entradas, '-filter_complex', filtros.join(';'), '-map', `[${etiqueta}]`, '-an', ...CODEC, salida])
  return salida
}

/** Une los segmentos y agrega una pista de audio silenciosa (compatibilidad). */
function unir(segmentos, salida) {
  const lista = salida + '.txt'
  fs.writeFileSync(lista, segmentos.map((s) => `file '${path.resolve(s)}'`).join('\n'))
  const sinAudio = salida + '.tmp.mp4'
  ff(['-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', sinAudio])
  ff([
    '-i', sinAudio,
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-shortest', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart', salida,
  ])
  fs.unlinkSync(sinAudio)
  fs.unlinkSync(lista)
  return salida
}

/** Monta un reel completo. */
function montar({ segmentos, salida, temporal }) {
  fs.mkdirSync(temporal, { recursive: true })
  fs.mkdirSync(path.dirname(salida), { recursive: true })
  const partes = []
  segmentos.forEach((seg, i) => {
    const dest = path.join(temporal, `seg-${String(i).padStart(2, '0')}.mp4`)
    if (seg.tipo === 'placa') segmentoPlaca({ ...seg, salida: dest })
    else segmentoClip({ ...seg, salida: dest })
    partes.push(dest)
  })
  unir(partes, salida)
  return salida
}

module.exports = { montar, segmentoPlaca, segmentoClip, unir, W, H, FPS, CODEC }
