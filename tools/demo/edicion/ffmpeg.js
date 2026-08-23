/**
 * tools/demo/edicion/ffmpeg.js — envoltorio minimo sobre ffmpeg.
 */
const { execFileSync } = require('child_process')

const FFMPEG = process.env.FFMPEG_BIN || 'ffmpeg'
const FFPROBE = process.env.FFPROBE_BIN || 'ffprobe'

function ff(args, { silencioso = true } = {}) {
  return execFileSync(FFMPEG, ['-hide_banner', '-loglevel', silencioso ? 'error' : 'info', '-y', ...args], {
    stdio: silencioso ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    maxBuffer: 1024 * 1024 * 64,
  })
}

function duracion(archivo) {
  const out = execFileSync(FFPROBE, [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', archivo,
  ]).toString().trim()
  return parseFloat(out)
}

function info(archivo) {
  const out = execFileSync(FFPROBE, [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,r_frame_rate,codec_name',
    '-show_entries', 'format=duration',
    '-of', 'json', archivo,
  ]).toString()
  const j = JSON.parse(out)
  const s = j.streams[0] || {}
  return {
    ancho: s.width, alto: s.height, codec: s.codec_name,
    fps: s.r_frame_rate, duracion: parseFloat(j.format.duration),
  }
}

module.exports = { ff, duracion, info, FFMPEG, FFPROBE }
