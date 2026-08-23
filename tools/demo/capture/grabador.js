/**
 * tools/demo/capture/grabador.js
 *
 * Grabador por cuadros: en lugar de usar el video de Playwright (que no escala
 * el viewport y deja la pagina en una esquina), captura cuadros reales a
 * 1080×1920 y los arma con ffmpeg. Resultado: nitidez 1:1 y scrolls suaves.
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const FFMPEG = process.env.FFMPEG_BIN || 'ffmpeg'
const FPS = 25

const suave = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

class Grabador {
  constructor(page, dir, { fps = FPS } = {}) {
    this.page = page
    this.dir = dir
    this.fps = fps
    this.n = 0
    this.guion = [] // [{ archivo, cuadros }]
    this.marcas = [] // [{ nombre, t }] — puntos de interes para el montaje
    fs.mkdirSync(dir, { recursive: true })
  }

  async _capturar() {
    const archivo = path.join(this.dir, `c${String(this.n++).padStart(5, '0')}.jpg`)
    await this.page.screenshot({ path: archivo, type: 'jpeg', quality: 94 })
    return archivo
  }

  /** Un cuadro nuevo que dura `cuadros` fotogramas. */
  async _cuadro(cuadros = 1) {
    const archivo = await this._capturar()
    this.guion.push({ archivo, cuadros })
    return archivo
  }

  /** Deja una marca en el tiempo actual del video (para colocar sobreimpresos). */
  marca(nombre) {
    this.marcas.push({ nombre, t: Number(this.segundos.toFixed(2)) })
    return this
  }

  /** Plano fijo de `segundos`: una sola captura repetida. */
  async quieto(segundos) {
    await this._cuadro(Math.max(1, Math.round(segundos * this.fps)))
  }

  /** Scroll con easing, cuadro a cuadro. */
  async scroll({ distancia, duracion = 2, desde = null }) {
    const total = Math.max(2, Math.round(duracion * this.fps))
    const inicio = desde === null
      ? await this.page.evaluate(() => window.scrollY)
      : desde
    for (let i = 1; i <= total; i++) {
      const y = Math.round(inicio + distancia * suave(i / total))
      await this.page.evaluate((v) => window.scrollTo(0, v), y)
      await this._cuadro(1)
    }
  }

  /** Lleva el scroll a una posicion concreta (por ejemplo, al tope). */
  async scrollA(y, { duracion = 1.2 } = {}) {
    const actual = await this.page.evaluate(() => window.scrollY)
    await this.scroll({ distancia: y - actual, duracion, desde: actual })
  }

  /**
   * Lleva el scroll hasta un elemento concreto, en vez de avanzar una cantidad
   * fija de pixeles. Es la unica forma de garantizar que el sobreimpreso que se
   * agrega despues quede sobre la seccion que corresponde.
   */
  async irA(buscador, { duracion = 2, margen = 0 } = {}) {
    const destino = await this.page.evaluate(([b, m]) => {
      let el = null
      try { el = document.querySelector(b) } catch { el = null }
      if (!el) {
        el = [...document.querySelectorAll('h1, h2, h3, p, section')]
          .find((e) => e.textContent && e.textContent.trim().toLowerCase().includes(b.toLowerCase()))
      }
      if (!el) return null
      return Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY - m))
    }, [buscador, margen])
    if (destino === null) throw new Error(`no encontre "${buscador}" para hacer scroll`)
    await this.scrollA(destino, { duracion })
    return destino
  }

  /** Marca visual de toque sobre un elemento (para que se lea la interaccion). */
  async _pulso(selector) {
    const caja = await this.page.locator(selector).first().boundingBox()
    if (!caja) return
    const x = caja.x + caja.width / 2
    const y = caja.y + caja.height / 2
    await this.page.evaluate(([x, y]) => {
      const d = document.createElement('div')
      d.id = '__pulso'
      Object.assign(d.style, {
        position: 'fixed', left: x + 'px', top: y + 'px', width: '0px', height: '0px',
        border: '3px solid rgba(255,255,255,.95)', borderRadius: '50%',
        transform: 'translate(-50%,-50%)', zIndex: 2147483647, pointerEvents: 'none',
        boxShadow: '0 0 24px rgba(255,255,255,.5)',
      })
      document.body.appendChild(d)
      window.__pulsoPaso = (p) => {
        const t = 24 + p * 46
        d.style.width = t + 'px'; d.style.height = t + 'px'
        d.style.opacity = String(1 - p * 0.85)
      }
      window.__pulsoPaso(0)
    }, [x, y])
    for (let i = 1; i <= 5; i++) {
      await this.page.evaluate((p) => window.__pulsoPaso(p), i / 5)
      await this._cuadro(1)
    }
    await this.page.evaluate(() => {
      const d = document.getElementById('__pulso')
      if (d) d.remove()
    })
  }

  /** Click con marca visual + esperas antes y despues. */
  async click(selector, { antes = 0.4, despues = 1.2, pulso = true } = {}) {
    const loc = this.page.locator(selector).first()
    await loc.scrollIntoViewIfNeeded().catch(() => {})
    if (antes) await this.quieto(antes)
    if (pulso) await this._pulso(selector)
    await loc.click()
    await this.page.waitForTimeout(120)
    if (despues) await this.quieto(despues)
  }

  /** Tipeo cuadro a cuadro (se ve escribir de verdad). */
  async escribir(selector, texto, { porCuadro = 2, despues = 0.4 } = {}) {
    const loc = this.page.locator(selector).first()
    await loc.scrollIntoViewIfNeeded().catch(() => {})
    await loc.click()
    for (let i = 0; i < texto.length; i++) {
      await loc.type(texto[i], { delay: 0 })
      if (i % porCuadro === 0 || i === texto.length - 1) await this._cuadro(1)
    }
    if (despues) await this.quieto(despues)
  }

  /** Ejecuta algo y captura el resultado. */
  async accion(fn, { despues = 1.2 } = {}) {
    await fn(this.page)
    await this.page.waitForTimeout(150)
    await this.quieto(despues)
  }

  /** Arma el mp4 a partir de los cuadros capturados. */
  render(salida, { crf = 18 } = {}) {
    if (!this.guion.length) throw new Error('no hay cuadros grabados')
    const lista = path.join(this.dir, 'guion.ffconcat')
    const partes = ['ffconcat version 1.0']
    for (const g of this.guion) {
      partes.push(`file '${path.basename(g.archivo)}'`)
      partes.push(`duration ${(g.cuadros / this.fps).toFixed(5)}`)
    }
    // ffmpeg ignora la duracion del ultimo archivo si no se repite.
    partes.push(`file '${path.basename(this.guion[this.guion.length - 1].archivo)}'`)
    fs.writeFileSync(lista, partes.join('\n'))

    fs.mkdirSync(path.dirname(salida), { recursive: true })
    // Sidecar con las marcas y la duracion, para el montaje de los reels.
    fs.writeFileSync(
      salida.replace(/\.mp4$/, '.json'),
      JSON.stringify({ duracion: Number(this.segundos.toFixed(2)), fps: this.fps, marcas: this.marcas }, null, 2),
    )
    execFileSync(FFMPEG, [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'concat', '-safe', '0', '-i', lista,
      '-vf', `fps=${this.fps},format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf),
      '-profile:v', 'high', '-level', '4.1', '-movflags', '+faststart',
      salida,
    ], { stdio: ['ignore', 'pipe', 'pipe'] })
    return salida
  }

  get segundos() {
    return this.guion.reduce((a, g) => a + g.cuadros, 0) / this.fps
  }
}

module.exports = { Grabador, FPS }
