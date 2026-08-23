/**
 * tools/demo/brand/piezas.js
 *
 * Genera las piezas graficas publicables: posts, historias y portadas de
 * destacadas, con la identidad de andmar.studio.
 *
 * Uso:  node tools/demo/brand/piezas.js
 */
const fs = require('fs')
const path = require('path')
const { abrirRenderizador } = require('./render')
const T = require('./plantillas')
const ICO = require('./iconos')

const ROOT = path.join(process.cwd(), 'andmar-content/finos-barbers')
const CAP = path.join(ROOT, 'capturas')
const SOCIAL = path.join(ROOT, 'social')

/** Ruta file:// a una captura, para incrustarla en la plantilla. */
const img = (nombre) => 'file://' + path.join(CAP, nombre)

/* ── POSTS (1080×1350) ───────────────────────────────────────────────── */
const POSTS = [
  {
    id: 'post-01-proyecto',
    etiqueta: 'Proyecto desarrollado',
    titulo: 'Una barbería con sistema propio',
    bajada: 'Web, turnos online, tienda y panel de gestión. Diseñado y programado por nosotros, de cero.',
    pie: 'Demo funcional',
    imagen: img('home-hero-mobile.png'),
  },
  {
    id: 'post-02-todo-en-uno',
    etiqueta: 'Qué incluye',
    titulo: 'Turnos, servicios, barberos y tienda en un mismo sistema',
    bajada: 'Sin cinco herramientas distintas. Una sola, hecha para el negocio.',
    puntos: [
      'Reserva online en 3 pasos',
      'Agenda por barbero, sin superposiciones',
      'Tienda con control de stock',
      'Panel administrativo completo',
      'Panel financiero con gráficos',
    ],
    pie: 'Proyecto desarrollado · demo funcional',
  },
  {
    id: 'post-03-turnos',
    etiqueta: 'Sistema de turnos',
    titulo: 'El cliente reserva solo, a cualquier hora',
    bajada: 'Elige servicio, barbero y horario. Solo ve los horarios que están realmente libres.',
    pie: 'Demo funcional',
    imagen: img('reservar-3-horarios-mobile.png'),
  },
  {
    id: 'post-04-panel',
    etiqueta: 'Panel administrativo',
    titulo: 'Todo el negocio, en un panel',
    bajada: 'Turnos, servicios, productos, categorías, barberos, reseñas y cobros. Sin depender del programador.',
    pie: 'Demo funcional',
    imagen: img('admin-turnos-mobile.png'),
  },
  {
    id: 'post-05-calendario',
    etiqueta: 'Agenda',
    titulo: 'La semana entera, de un vistazo',
    bajada: 'Calendario semanal con un color por barbero y filtro por profesional.',
    pie: 'Demo funcional',
    imagen: img('admin-calendario-desktop.png'),
  },
  {
    id: 'post-06-tienda',
    etiqueta: 'Ecommerce',
    titulo: 'Una barbería que también vende online',
    bajada: 'Catálogo con buscador, filtros por categoría, stock real y aviso de últimas unidades.',
    pie: 'Demo funcional',
    imagen: img('tienda-catalogo-mobile.png'),
  },
  {
    id: 'post-07-finanzas',
    etiqueta: 'Panel financiero',
    titulo: 'Cuánto entra y cuánto sale',
    bajada: 'Ingresos, egresos y balance por mes, con gráficos. Los turnos y pedidos se registran solos.',
    pie: 'Demo funcional · datos de ejemplo',
    imagen: img('admin-finanzas-graficos-desktop.png'),
  },
  {
    id: 'post-08-roles',
    etiqueta: 'Permisos',
    titulo: 'Cada uno ve lo suyo',
    bajada: 'El dueño ve todo. El barbero, solo su agenda. El cliente, solo sus turnos.',
    puntos: ['Administrador', 'Barbero (acceso limitado)', 'Cliente'],
    pie: 'Demo funcional',
  },
  {
    id: 'post-09-que-hacemos',
    etiqueta: 'andmar.studio',
    titulo: 'Hacemos sistemas, no plantillas',
    bajada: 'Desarrollamos software a medida para negocios que ya no entran en una planilla.',
    puntos: [
      'Webs y landing pages',
      'Sistemas de turnos',
      'Tiendas online',
      'Paneles administrativos',
      'Automatizaciones',
    ],
    pie: 'Escribinos por DM',
  },
]

/* ── CARRUSEL (1080×1350, varias placas) ─────────────────────────────── */
const CARRUSEL = [
  {
    id: 'carrusel-turnos-1',
    etiqueta: 'Sistema de turnos',
    titulo: 'Así reserva un cliente',
    bajada: 'Deslizá →',
    pie: 'Proyecto desarrollado · demo funcional',
  },
  {
    id: 'carrusel-turnos-2',
    etiqueta: 'Paso 1',
    titulo: 'Elige el servicio',
    bajada: 'Con precio y duración a la vista. El catálogo se carga desde el panel.',
    imagen: img('reservar-1-servicio-mobile.png'),
  },
  {
    id: 'carrusel-turnos-3',
    etiqueta: 'Paso 2',
    titulo: 'Elige el barbero',
    bajada: 'Cada profesional tiene su perfil, su especialidad y sus días.',
    imagen: img('reservar-2-barbero-mobile.png'),
  },
  {
    id: 'carrusel-turnos-4',
    etiqueta: 'Paso 3',
    titulo: 'Elige día y hora',
    bajada: 'Solo aparecen los horarios libres: la duración del servicio define la grilla.',
    imagen: img('reservar-3-horarios-mobile.png'),
  },
  {
    id: 'carrusel-turnos-5',
    etiqueta: 'Paso 4',
    titulo: 'Confirma con la seña',
    bajada: 'Mercado Pago o transferencia. Menos turnos caídos, agenda más previsible.',
    imagen: img('reservar-4-sena-detalle.png'),
  },
  {
    id: 'carrusel-turnos-6',
    etiqueta: 'andmar.studio',
    titulo: '¿Tenés un negocio con turnos?',
    bajada: 'Podemos hacerte un sistema así, adaptado a cómo trabajás.',
    puntos: ['Escribinos por DM', 'Te mostramos la demo funcionando'],
    pie: 'andmar.studio',
  },
]

/* ── HISTORIAS (1080×1920) ───────────────────────────────────────────── */
const HISTORIAS = [
  // Secuencia: problema → solución → demostración → CTA
  {
    id: 'historia-01-problema',
    etiqueta: 'El problema',
    titulo: 'La agenda en papel<br>y 40 mensajes<br>sin responder',
    bajada: 'Turnos anotados a mano, clientes que escriben a la madrugada y horarios que se pisan.',
    nota: '1 / 4',
    cta: 'Deslizá →',
  },
  {
    id: 'historia-02-solucion',
    etiqueta: 'La solución',
    titulo: 'Un sistema<br>que atiende<br>solo',
    bajada: 'El cliente reserva desde el celular. El negocio ve todo desde un panel.',
    nota: '2 / 4',
    cta: 'Deslizá →',
  },
  {
    id: 'historia-03-demo',
    etiqueta: 'La demostración',
    titulo: 'Reservar<br>lleva 3 pasos',
    bajada: 'Servicio, barbero, día y hora. Y una seña para confirmar.',
    imagen: img('reservar-3-horarios-mobile.png'),
    nota: '3 / 4',
  },
  {
    id: 'historia-04-cta',
    etiqueta: 'andmar.studio',
    titulo: '¿Tu negocio<br>necesita algo<br>así?',
    bajada: 'Sistemas de turnos, tiendas online y paneles a medida.',
    cta: 'Escribinos por DM',
    nota: '4 / 4',
  },
  // Historias sueltas
  {
    id: 'historia-05-panel',
    etiqueta: 'Panel administrativo',
    titulo: 'Todo el negocio<br>en un panel',
    bajada: 'Turnos, productos, barberos, reseñas y cobros.',
    imagen: img('admin-dashboard-mobile.png'),
    cta: 'Escribinos por DM',
    nota: 'Demo funcional',
  },
  {
    id: 'historia-06-tienda',
    etiqueta: 'Ecommerce',
    titulo: 'Tienda propia,<br>stock incluido',
    bajada: 'Catálogo, buscador, filtros y checkout sin cuenta.',
    imagen: img('tienda-catalogo-mobile.png'),
    cta: 'Escribinos por DM',
    nota: 'Demo funcional',
  },
  {
    id: 'historia-07-finanzas',
    etiqueta: 'Panel financiero',
    titulo: 'Los números,<br>en un gráfico',
    bajada: 'Ingresos, egresos y balance mes a mes.',
    imagen: img('admin-finanzas-mobile.png'),
    cta: 'Escribinos por DM',
    nota: 'Datos de ejemplo',
  },
  {
    id: 'historia-08-detras',
    etiqueta: 'Detrás del proyecto',
    titulo: 'Next.js,<br>TypeScript<br>y Postgres',
    bajada: 'Autenticación por roles, permisos a nivel de base de datos y pagos con Mercado Pago.',
    cta: 'Escribinos por DM',
    nota: 'andmar.studio',
  },
]

/* ── DESTACADAS ──────────────────────────────────────────────────────── */
const DESTACADAS = [
  { id: 'destacada-proyectos', titulo: 'Proyectos', icono: ICO.proyectos },
  { id: 'destacada-sistemas', titulo: 'Sistemas', icono: ICO.sistemas },
  { id: 'destacada-turnos', titulo: 'Turnos', icono: ICO.turnos },
  { id: 'destacada-tienda', titulo: 'Tienda', icono: ICO.tienda },
  { id: 'destacada-panel', titulo: 'Panel', icono: ICO.panel },
  { id: 'destacada-proceso', titulo: 'Proceso', icono: ICO.proceso },
  { id: 'destacada-contacto', titulo: 'Contacto', icono: ICO.contacto },
]

;(async () => {
  const r = await abrirRenderizador()
  let n = 0

  for (const p of POSTS) {
    const destino = path.join(SOCIAL, 'posts', `${p.id}.png`)
    await r.png(T.post(p), { ancho: 1080, alto: 1350, destino })
    n++
  }
  for (const p of CARRUSEL) {
    const destino = path.join(SOCIAL, 'posts/carrusel-turnos', `${p.id}.png`)
    await r.png(T.post(p), { ancho: 1080, alto: 1350, destino })
    n++
  }
  for (const h of HISTORIAS) {
    const destino = path.join(SOCIAL, 'historias', `${h.id}.png`)
    await r.png(T.historia(h), { ancho: 1080, alto: 1920, destino })
    n++
  }
  for (const d of DESTACADAS) {
    const destino = path.join(SOCIAL, 'destacadas', `${d.id}.png`)
    await r.png(T.destacada(d), { ancho: 1080, alto: 1920, destino })
    n++
  }

  await r.cerrar()
  console.log(`✓ ${n} piezas generadas en ${path.relative(process.cwd(), SOCIAL)}`)
})()
