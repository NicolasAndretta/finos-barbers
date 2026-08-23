/**
 * tools/demo/brand/plantillas.js
 *
 * Plantillas HTML de las piezas graficas de andmar.studio.
 * Se renderizan con Chromium (Playwright) para tener tipografia real.
 */
const { COLORES, marca, documento } = require('./estilo')

const REEL = { ancho: 1080, alto: 1920 }
const POST = { ancho: 1080, alto: 1350 }

/* ── Placa de apertura de reel (hook) ─────────────────────────────────── */
function placaApertura({ etiqueta, titulo, subtitulo, pie }) {
  return documento({
    ...REEL,
    css: `
      .capa { padding: 150px 96px; justify-content: center; gap: 44px; }
      .chip { font-size: 26px; padding: 18px 34px; align-self: flex-start; }
      h1 { font-size: 132px; line-height: 0.94; font-weight: 800; letter-spacing: -0.045em; }
      h1 em { font-style: normal; }
      p.sub { font-size: 40px; line-height: 1.4; font-weight: 400; color: ${COLORES.suave}; max-width: 820px; }
      .pie { position: absolute; left: 96px; right: 96px; bottom: 120px; display: flex;
             align-items: center; justify-content: space-between; }
      .pie .nota { font-size: 24px; color: ${COLORES.tenue}; font-weight: 500; letter-spacing: .04em; }
      .regla { width: 320px; margin-top: 8px; }
    `,
    cuerpo: `
      <div class="chip"><span class="bolita"></span>${etiqueta}</div>
      <h1>${titulo}</h1>
      <div class="regla"></div>
      ${subtitulo ? `<p class="sub">${subtitulo}</p>` : ''}
      <div class="pie">${marca(38)}<span class="nota">${pie || ''}</span></div>
    `,
  })
}

/* ── Placa de cierre / CTA ────────────────────────────────────────────── */
function placaCierre({ titulo, lineas = [], cta }) {
  return documento({
    ...REEL,
    css: `
      .capa { padding: 150px 96px; justify-content: center; align-items: center; text-align: center; gap: 52px; }
      h2 { font-size: 104px; line-height: 1.0; font-weight: 800; letter-spacing: -0.04em; }
      ul { list-style: none; display: flex; flex-direction: column; gap: 26px; }
      li { font-size: 40px; color: ${COLORES.suave}; font-weight: 500; display: flex; align-items: center; gap: 20px; justify-content: center; }
      li b { color: #fff; font-weight: 700; }
      .punto { width: 12px; height: 12px; border-radius: 50%; background: ${COLORES.violeta}; }
      .cta { margin-top: 12px; font-size: 40px; font-weight: 700; color: #0A0A0A;
             background: linear-gradient(100deg, #EDE9FE, ${COLORES.violetaClaro});
             padding: 30px 60px; border-radius: 999px; }
      .pie { position: absolute; left: 0; right: 0; bottom: 130px; display: flex; flex-direction: column; align-items: center; gap: 14px; }
      .pie .handle { font-size: 30px; color: ${COLORES.tenue}; font-weight: 500; }
    `,
    cuerpo: `
      <h2 class="degradado">${titulo}</h2>
      <ul>${lineas.map((l) => `<li><span class="punto"></span>${l}</li>`).join('')}</ul>
      ${cta ? `<div class="cta">${cta}</div>` : ''}
      <div class="pie">${marca(44)}<span class="handle">desarrollo web · sistemas a medida</span></div>
    `,
  })
}

/* ── Sobreimpreso inferior (transparente) ─────────────────────────────── */
function sobreimpreso({ indice, titulo, detalle }) {
  return documento({
    ...REEL,
    fondo: false,
    css: `
      body { background: transparent; }
      .capa { justify-content: flex-end; padding: 0 0 132px 0; }
      .barra { margin: 0 64px; padding: 34px 40px; border-radius: 34px;
        background: rgba(8,8,11,0.86);
        border: 1px solid rgba(139,92,246,0.35);
        backdrop-filter: blur(18px);
        display: flex; align-items: center; gap: 30px; }
      .num { font-family: 'Space Grotesk', sans-serif; font-size: 34px; font-weight: 700;
        color: ${COLORES.violetaClaro}; background: rgba(139,92,246,0.16);
        border: 1px solid rgba(139,92,246,0.4); border-radius: 18px; padding: 12px 20px; }
      .txt h3 { font-size: 44px; font-weight: 800; letter-spacing: -0.02em; }
      .txt p { font-size: 28px; color: ${COLORES.suave}; margin-top: 6px; font-weight: 500; }
    `,
    cuerpo: `
      <div class="barra">
        ${indice ? `<span class="num">${indice}</span>` : ''}
        <div class="txt"><h3>${titulo}</h3>${detalle ? `<p>${detalle}</p>` : ''}</div>
      </div>
    `,
  })
}

/* ── Marca de agua superior (transparente) ────────────────────────────── */
function firma() {
  return documento({
    ...REEL,
    fondo: false,
    css: `
      body { background: transparent; }
      .capa { justify-content: flex-start; align-items: center; padding-top: 74px; }
      .caja { padding: 16px 30px; border-radius: 999px;
        background: rgba(8,8,11,0.72); border: 1px solid rgba(255,255,255,0.10);
        backdrop-filter: blur(14px); }
    `,
    cuerpo: `<div class="caja">${marca(28)}</div>`,
  })
}

/* ── Post cuadrado/vertical 1080×1350 ─────────────────────────────────── */
function post({ etiqueta, titulo, bajada, puntos = [], pie, imagen }) {
  return documento({
    ...POST,
    css: `
      .capa { padding: 92px 84px; gap: 34px; justify-content: ${imagen ? 'flex-start' : 'center'}; }
      .chip { font-size: 22px; padding: 14px 28px; align-self: flex-start; }
      h1 { font-size: ${titulo.length > 40 ? 78 : 96}px; line-height: 0.96; font-weight: 800; letter-spacing: -0.04em; }
      p.bajada { font-size: 34px; line-height: 1.42; color: ${COLORES.suave}; max-width: 820px; }
      ul { list-style: none; display: flex; flex-direction: column; gap: 20px; margin-top: 6px; }
      li { font-size: 31px; font-weight: 600; display: flex; align-items: center; gap: 18px; }
      li .p { width: 11px; height: 11px; border-radius: 50%; background: ${COLORES.violeta}; flex: none; }
      .marco { margin-top: 10px; border-radius: 30px; overflow: hidden; border: 1px solid ${COLORES.linea};
        box-shadow: 0 40px 90px rgba(0,0,0,.6); height: 620px; }
      .marco img { width: 100%; height: 100%; object-fit: cover; object-position: top center; }
      .pie { position: absolute; left: 84px; right: 84px; bottom: 74px;
             display: flex; align-items: center; justify-content: space-between; }
      .pie .nota { font-size: 22px; color: ${COLORES.tenue}; font-weight: 500; }
    `,
    cuerpo: `
      ${etiqueta ? `<div class="chip"><span class="bolita"></span>${etiqueta}</div>` : ''}
      <h1>${titulo}</h1>
      ${bajada ? `<p class="bajada">${bajada}</p>` : ''}
      ${puntos.length ? `<ul>${puntos.map((p) => `<li><span class="p"></span>${p}</li>`).join('')}</ul>` : ''}
      ${imagen ? `<div class="marco"><img src="${imagen}"></div>` : ''}
      <div class="pie">${marca(30)}<span class="nota">${pie || ''}</span></div>
    `,
  })
}

/* ── Historia 1080×1920 con captura enmarcada ─────────────────────────── */
function historia({ etiqueta, titulo, bajada, imagen, cta, nota }) {
  return documento({
    ...REEL,
    css: `
      .capa { padding: 190px 80px 170px; gap: 34px; align-items: flex-start;
              justify-content: ${imagen ? 'flex-start' : 'center'}; }
      .chip { font-size: 22px; padding: 14px 28px; }
      h1 { font-size: ${titulo.length > 34 ? 82 : 96}px; line-height: 0.98; font-weight: 800; letter-spacing: -0.04em; }
      p.bajada { font-size: 32px; line-height: 1.45; color: ${COLORES.suave}; max-width: 780px; }
      .marco { width: 100%; flex: 1; border-radius: 34px; overflow: hidden;
        border: 1px solid ${COLORES.linea}; box-shadow: 0 50px 110px rgba(0,0,0,.65); }
      .marco img { width: 100%; height: 100%; object-fit: cover; object-position: top center; }
      .cta { align-self: stretch; margin-top: ${imagen ? '0' : '26px'};
        text-align: center; font-size: 34px; font-weight: 700; color: #0A0A0A;
        background: linear-gradient(100deg, #EDE9FE, ${COLORES.violetaClaro});
        padding: 26px 40px; border-radius: 999px; }
      .pie { position: absolute; left: 80px; right: 80px; bottom: 76px;
             display: flex; align-items: center; justify-content: space-between; }
      .pie .nota { font-size: 22px; color: ${COLORES.tenue}; font-weight: 500; }
    `,
    cuerpo: `
      ${etiqueta ? `<div class="chip"><span class="bolita"></span>${etiqueta}</div>` : ''}
      <h1>${titulo}</h1>
      ${bajada ? `<p class="bajada">${bajada}</p>` : ''}
      ${imagen ? `<div class="marco"><img src="${imagen}"></div>` : ''}
      ${cta ? `<div class="cta">${cta}</div>` : ''}
      <div class="pie">${marca(28)}<span class="nota">${nota || ''}</span></div>
    `,
  })
}

/* ── Portada de destacada ─────────────────────────────────────────────── */
function destacada({ titulo, icono }) {
  return documento({
    ...REEL,
    css: `
      /* Instagram recorta la portada en un circulo centrado: el icono va
         exactamente en el centro y el texto, debajo. */
      .capa { align-items: center; justify-content: center; }
      .aro { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        width: 560px; height: 560px; border-radius: 50%;
        border: 2px solid rgba(139,92,246,0.45);
        background: radial-gradient(60% 60% at 50% 40%, rgba(139,92,246,0.22), rgba(139,92,246,0) 70%);
        display: flex; align-items: center; justify-content: center; }
      .icono svg { width: 240px; height: 240px; }
      h2 { position: absolute; top: 68%; font-size: 76px; font-weight: 800;
        letter-spacing: 0.02em; text-transform: uppercase; }
      .sub { position: absolute; top: 74.5%; font-size: 30px; color: ${COLORES.tenue};
        letter-spacing: 0.3em; text-transform: uppercase; font-weight: 600; }
    `,
    cuerpo: `
      <div class="aro"><div class="icono">${icono}</div></div>
      <h2>${titulo}</h2>
      <div class="sub">andmar.studio</div>
    `,
  })
}


/* ── Fondo para la pieza "responsive" (dos pantallas) ─────────────────── */
function marcoResponsive({ etiqueta, titulo, pieDer, variante = 'fondo' }) {
  return documento({
    ...REEL,
    css: `
      .capa { padding: 96px 50px 0; align-items: center; }
      .chip { font-size: 21px; padding: 12px 26px; }
      h1 { margin-top: 22px; font-size: 68px; line-height: 1.0; font-weight: 800;
           letter-spacing: -0.035em; text-align: center; }
      .escritorio { margin-top: 40px; width: 980px; border-radius: 22px; overflow: hidden;
        border: 1px solid rgba(255,255,255,0.10); box-shadow: 0 40px 90px rgba(0,0,0,.65); }
      .barra { height: 38px; background: #17171C; display: flex; align-items: center; gap: 9px; padding: 0 16px; }
      .barra i { width: 11px; height: 11px; border-radius: 50%; background: #3F3F46; display: block; }
      .barra .url { margin-left: 14px; height: 18px; flex: 1; border-radius: 999px; background: #0E0E12; }
      .pantalla { width: 980px; height: 612px; background: #000; }
      .telefono { margin-top: 40px; width: 436px; padding: 8px; border-radius: 44px;
        background: #17171C; border: 1px solid rgba(255,255,255,0.10);
        box-shadow: 0 40px 90px rgba(0,0,0,.7); }
      .telefono .pantalla { width: 420px; height: 747px; border-radius: 36px; }
      .pie { position: absolute; left: 60px; right: 60px; bottom: 52px;
             display: flex; align-items: center; justify-content: space-between; }
      .pie .nota { font-size: 21px; color: ${COLORES.tenue}; font-weight: 500; }
      ${variante === 'marco' ? `
        /* Solo los biseles: se superpone al video para recuperar las esquinas.
           El fondo tiene que ser transparente o taparia todo el video. */
        html, body, .lienzo, .capa { background: transparent !important; }
        .fondo, .grilla, .ruido, .chip, h1, .pie, .barra { opacity: 0 !important; }
        .escritorio { border-color: transparent; box-shadow: none; }
        .pantalla { background: transparent !important; }
        /* El cuerpo del telefono pasa de bloque lleno a marco hueco: si no,
           taparia el video que va debajo. */
        .telefono { background: transparent !important; padding: 0 !important;
                    border: 8px solid #17171C !important; box-shadow: none !important; }
      ` : ''}
    `,
    fondo: variante !== 'marco',
    cuerpo: `
      <div class="chip"><span class="bolita"></span>${etiqueta}</div>
      <h1>${titulo}</h1>
      <div class="escritorio">
        <div class="barra"><i></i><i></i><i></i><div class="url"></div></div>
        <div class="pantalla"></div>
      </div>
      <div class="telefono"><div class="pantalla"></div></div>
      <div class="pie">${marca(28)}<span class="nota">${pieDer || ''}</span></div>
    `,
  })
}

module.exports = { REEL, POST, marcoResponsive, placaApertura, placaCierre, sobreimpreso, firma, post, historia, destacada }
