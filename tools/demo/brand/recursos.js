/**
 * tools/demo/brand/recursos.js
 *
 * Piezas graficas reutilizables (marca, placas y guia visual) para armar
 * contenido nuevo sin volver a empezar de cero.
 */
const path = require('path')
const fs = require('fs')
const { abrirRenderizador } = require('./render')
const { COLORES, marca, documento } = require('./estilo')
const T = require('./plantillas')

const OUT = path.join(process.cwd(), 'andmar-content/finos-barbers/recursos')

function guiaVisual() {
  const muestras = [
    ['Fondo', COLORES.fondo], ['Fondo alt', COLORES.fondoAlt],
    ['Violeta', COLORES.violeta], ['Violeta claro', COLORES.violetaClaro],
    ['Violeta oscuro', COLORES.violetaOscuro], ['Texto', COLORES.tinta],
    ['Texto suave', COLORES.suave], ['Texto tenue', COLORES.tenue],
  ]
  return documento({
    ancho: 1080, alto: 1350,
    css: `
      .capa { padding: 90px 80px; gap: 40px; }
      h1 { font-size: 72px; font-weight: 800; letter-spacing: -0.035em; }
      .sub { font-size: 28px; color: ${COLORES.suave}; }
      .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 8px; }
      .m { border-radius: 18px; border: 1px solid rgba(255,255,255,0.10); overflow: hidden; }
      .m .color { height: 120px; }
      .m .txt { padding: 12px 14px; background: rgba(255,255,255,0.03); }
      .m .txt b { display: block; font-size: 19px; font-weight: 600; }
      .m .txt span { font-size: 16px; color: ${COLORES.tenue}; font-family: 'Space Grotesk', monospace; }
      .tipos { margin-top: 10px; display: flex; flex-direction: column; gap: 14px; }
      .tipos .t1 { font-size: 64px; font-weight: 800; letter-spacing: -0.035em; }
      .tipos .t2 { font-size: 34px; font-weight: 600; }
      .tipos .t3 { font-size: 26px; color: ${COLORES.suave}; }
      .tipos small { display: block; font-size: 17px; color: ${COLORES.tenue}; margin-top: 4px; }
      .pie { position: absolute; left: 80px; bottom: 70px; }
    `,
    cuerpo: `
      <h1 class="degradado">Guía visual</h1>
      <p class="sub">Colores y tipografías de las piezas de andmar.studio.</p>
      <div class="grid">
        ${muestras.map(([n, c]) => `<div class="m"><div class="color" style="background:${c}"></div><div class="txt"><b>${n}</b><span>${c}</span></div></div>`).join('')}
      </div>
      <div class="tipos">
        <div><div class="t1">Inter 800</div><small>Titulares</small></div>
        <div><div class="t2">Inter 600</div><small>Subtítulos y listas</small></div>
        <div><div class="t3">Inter 400 · texto de apoyo</div><small>Bajadas</small></div>
        <div>${marca(44)}<small>Space Grotesk 700 · marca</small></div>
      </div>
      <div class="pie">${marca(28)}</div>
    `,
  })
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const r = await abrirRenderizador()

  await r.png(guiaVisual(), { ancho: 1080, alto: 1350, destino: path.join(OUT, 'guia-visual.png') })

  await r.png(T.placaApertura({
    etiqueta: 'Etiqueta',
    titulo: 'Título de<br>la <em class="violeta">placa</em>',
    subtitulo: 'Bajada de una o dos líneas para dar contexto.',
    pie: 'Proyecto desarrollado · demo funcional',
  }), { ancho: 1080, alto: 1920, destino: path.join(OUT, 'placa-apertura-modelo.png') })

  await r.png(T.placaCierre({
    titulo: 'Placa<br>de cierre',
    lineas: ['Primer punto', 'Segundo punto', 'Tercer punto'],
    cta: 'Escribinos por DM',
  }), { ancho: 1080, alto: 1920, destino: path.join(OUT, 'placa-cierre-modelo.png') })

  await r.png(T.sobreimpreso({
    indice: '01',
    titulo: 'Sobreimpreso',
    detalle: 'Se superpone al video, con fondo transparente',
  }), { ancho: 1080, alto: 1920, destino: path.join(OUT, 'sobreimpreso-modelo.png'), transparente: true })

  await r.png(T.firma(), { ancho: 1080, alto: 1920, destino: path.join(OUT, 'firma-andmar.png'), transparente: true })

  await r.cerrar()

  fs.writeFileSync(path.join(OUT, 'README.md'), `# Recursos

Piezas reutilizables para armar contenido nuevo con la misma identidad.

| Archivo | Qué es |
|---|---|
| \`guia-visual.png\` | Colores y tipografías de andmar.studio. |
| \`placa-apertura-modelo.png\` | Modelo de la placa que abre cada reel. |
| \`placa-cierre-modelo.png\` | Modelo de la placa de cierre con CTA. |
| \`sobreimpreso-modelo.png\` | Modelo del cartel que aparece sobre el video (fondo transparente). |
| \`firma-andmar.png\` | Marca de agua superior (fondo transparente). |

Las plantillas que generan todo esto están en \`tools/demo/brand/\`.
Para cambiar textos y volver a generar: \`node tools/demo/brand/piezas.js\`.
`)
  console.log('✓ recursos generados')
})()
