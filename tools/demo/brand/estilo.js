/**
 * tools/demo/brand/estilo.js
 *
 * Sistema visual de andmar.studio para las piezas gráficas:
 * negro, blanco y violeta · fondos oscuros · tecnológico y minimalista.
 */

const COLORES = {
  fondo: '#08080B',
  fondoAlt: '#0C0A14',
  tinta: '#FFFFFF',
  suave: '#A1A1AA',
  tenue: '#52525B',
  violeta: '#8B5CF6',
  violetaClaro: '#C4B5FD',
  violetaOscuro: '#4C1D95',
  linea: 'rgba(255,255,255,0.08)',
}

// Tipografias incrustadas: el render no depende de la red.
const FUENTES =
  '<style>' + require('fs').readFileSync(require('path').join(__dirname, 'fonts.css'), 'utf8') + '</style>'

const BASE_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; }
  body {
    font-family: 'Inter', system-ui, sans-serif;
    background: ${COLORES.fondo};
    color: ${COLORES.tinta};
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    overflow: hidden;
  }
  .lienzo { position: relative; width: 100%; height: 100%; overflow: hidden; }

  /* Fondo: degradado profundo + halo violeta + grilla tecnica */
  .fondo {
    position: absolute; inset: 0;
    background:
      radial-gradient(120% 80% at 50% -10%, rgba(139,92,246,0.20) 0%, rgba(139,92,246,0) 55%),
      radial-gradient(90% 60% at 15% 110%, rgba(76,29,149,0.28) 0%, rgba(76,29,149,0) 60%),
      linear-gradient(180deg, ${COLORES.fondoAlt} 0%, ${COLORES.fondo} 60%, #050507 100%);
  }
  .grilla {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px);
    background-size: 72px 72px;
    mask-image: radial-gradient(85% 70% at 50% 40%, #000 0%, transparent 100%);
    -webkit-mask-image: radial-gradient(85% 70% at 50% 40%, #000 0%, transparent 100%);
  }
  .ruido {
    position: absolute; inset: 0; opacity: .18; mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/></filter><rect width='140' height='140' filter='url(%23n)' opacity='.5'/></svg>");
  }

  .capa { position: relative; z-index: 2; width: 100%; height: 100%; display: flex; flex-direction: column; }

  /* Marca */
  .marca { display: inline-flex; align-items: baseline;
    font-family: 'Space Grotesk','Inter',sans-serif; font-weight: 700; letter-spacing: -0.02em; }
  .marca .punto { color: ${COLORES.violeta}; }

  .chip {
    display: inline-flex; align-items: center; gap: 14px;
    border: 1px solid rgba(139,92,246,0.45);
    background: rgba(139,92,246,0.10);
    color: ${COLORES.violetaClaro};
    border-radius: 999px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.16em;
  }
  .chip .bolita { width: 10px; height: 10px; border-radius: 50%; background: ${COLORES.violeta}; }

  .degradado {
    background: linear-gradient(100deg, #FFFFFF 0%, #E9E4FF 40%, ${COLORES.violetaClaro} 100%);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .violeta { color: ${COLORES.violetaClaro}; }
  .suave { color: ${COLORES.suave}; }
  .regla { height: 1px; background: linear-gradient(90deg, rgba(139,92,246,.8), rgba(139,92,246,0)); }
`

function marca(tam = 40, color = COLORES.tinta) {
  return `<span class="marca" style="font-size:${tam}px;color:${color}">andmar<span class="punto">.</span>studio</span>`
}

function documento({ ancho, alto, css = '', cuerpo, fondo = true }) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">${FUENTES}
<style>${BASE_CSS}
  html, body { width:${ancho}px; height:${alto}px; }
  ${css}
</style></head><body><div class="lienzo">
${fondo ? '<div class="fondo"></div><div class="grilla"></div><div class="ruido"></div>' : ''}
<div class="capa">${cuerpo}</div>
</div></body></html>`
}

module.exports = { COLORES, FUENTES, BASE_CSS, marca, documento }
