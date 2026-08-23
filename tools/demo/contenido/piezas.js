/**
 * tools/demo/contenido/piezas.js
 *
 * Fuente unica de verdad del contenido publicable: objetivo, caption, CTA y
 * estado de cada pieza. De aca salen los .md de captions y el content-index.
 *
 * Reglas de comunicacion (ver project.md):
 *  · Finos Barbers se presenta como PROYECTO DESARROLLADO / DEMO FUNCIONAL.
 *  · No se afirma que sea un cliente activo ni que este en produccion.
 *  · No se inventan metricas, resultados ni precios.
 */

const HASH_BASE = '#desarrolloweb #sistemasamedida #software #andmarstudio'
const HASH_TURNOS = '#sistemadeturnos #turnosonline #barberia #barbershop'
const HASH_TIENDA = '#ecommerce #tiendaonline #negocios'
const HASH_PANEL = '#paneladministrativo #gestion #pymes'

const FIRMA = 'andmar.studio · desarrollo web y sistemas a medida.'

const REELS = [
  {
    archivo: 'social/reels/reel-01-sistema-de-turnos.mp4',
    nombre: 'Reel 1 · Sistema de turnos',
    objetivo: 'Mostrar el flujo de reserva completo. Es la pieza más fuerte: úsala como primer post.',
    cta: 'Escribinos por DM',
    caption: `Reservar un turno, en 3 pasos.

Elegís el servicio, elegís al barbero, elegís día y hora. Solo aparecen los horarios que están realmente libres, porque el sistema calcula la duración de cada servicio y no deja que dos turnos se pisen.

Al final, una seña para confirmar: Mercado Pago o transferencia. Menos turnos caídos, agenda más previsible.

Esto es Fino's Barbers, un proyecto que desarrollamos de cero: web, turnos, tienda y panel de gestión.

${FIRMA}
¿Tenés un negocio con turnos? Escribinos por DM.

${HASH_TURNOS} ${HASH_BASE}`,
  },
  {
    archivo: 'social/reels/reel-02-el-proyecto.mp4',
    nombre: 'Reel 2 · El proyecto (hero)',
    objetivo: 'Presentar el proyecto completo y la calidad del diseño. Pieza de portfolio.',
    cta: 'Escribinos por DM',
    caption: `Una barbería con sistema propio.

No una plantilla: una web diseñada y programada desde cero, con todo lo que el negocio necesita adentro.

· Servicios con precio y duración
· Equipo con perfil y días de atención
· Reserva online en 3 pasos
· Reseñas administrables
· Tienda de productos

El equipo, las reseñas, el catálogo de la reserva y la tienda se administran desde un panel: el dueño entra, toca y el sistema se actualiza.

Proyecto desarrollado por ${FIRMA}

${HASH_BASE} #diseñoweb #portfolio`,
  },
  {
    archivo: 'social/reels/reel-03-eleccion-de-barbero.mp4',
    nombre: 'Reel 3 · Elección de barbero',
    objetivo: 'Destacar la agenda por profesional (diferencial para barberías, peluquerías y estudios).',
    cta: 'Escribinos por DM',
    caption: `Cada cliente elige con quién se atiende.

Y cada profesional tiene su propia agenda: sus días, su especialidad y sus turnos. El sistema no deja que se superpongan.

Cuando el negocio suma o saca gente del equipo, lo hace desde el panel. La web y el formulario de reserva se actualizan solos.

Del proyecto Fino's Barbers, desarrollado por ${FIRMA}

${HASH_TURNOS} ${HASH_BASE}`,
  },
  {
    archivo: 'social/reels/reel-04-servicios.mp4',
    nombre: 'Reel 4 · Alta de un servicio',
    objetivo: 'Mostrar que el catálogo lo maneja el dueño, sin depender del programador. Se ve el alta completa en cámara.',
    cta: 'Escribinos por DM',
    caption: `Sumaste un servicio nuevo. ¿A quién le escribís?

A nadie. Entrás al panel, cargás nombre, precio y duración, y guardás. Listo: el servicio ya está disponible para reservar.

Y la duración no es un dato decorativo: es lo que usa el sistema para armar la grilla de horarios y que no se pisen dos turnos.

Del proyecto Fino's Barbers, desarrollado por ${FIRMA}

${HASH_BASE} ${HASH_PANEL}`,
  },
  {
    archivo: 'social/reels/reel-05-tienda-online.mp4',
    nombre: 'Reel 5 · Tienda online',
    objetivo: 'Mostrar la parte de ecommerce: catálogo, buscador, filtros y stock.',
    cta: 'Escribinos por DM',
    caption: `Una barbería que también vende online.

Catálogo con buscador y filtros por categoría, stock real y aviso de últimas unidades. Cuando un producto se queda sin stock, la web deja de ofrecerlo.

Tienda propia, dentro de la misma web. Sin comisiones de terceros.

Del proyecto Fino's Barbers, desarrollado por ${FIRMA}

${HASH_TIENDA} ${HASH_BASE}`,
  },
  {
    archivo: 'social/reels/reel-06-carrito-y-checkout.mp4',
    nombre: 'Reel 6 · Carrito y checkout',
    objetivo: 'Mostrar la compra completa, incluido el checkout sin registro.',
    cta: 'Escribinos por DM',
    caption: `Comprar sin crear una cuenta.

El carrito se guarda aunque el cliente cierre la pestaña. En el checkout deja sus datos, elige retiro en el local o envío, y paga con Mercado Pago.

Cada paso que le pedís de más a un cliente es una venta menos.

Del proyecto Fino's Barbers, desarrollado por ${FIRMA}

${HASH_TIENDA} ${HASH_BASE}`,
  },
  {
    archivo: 'social/reels/reel-07-panel-administrativo.mp4',
    nombre: 'Reel 7 · Panel administrativo',
    objetivo: 'Mostrar el alcance del panel: es el argumento de venta más fuerte para negocios.',
    cta: 'Escribinos por DM',
    caption: `Todo el negocio, en un panel.

Turnos, servicios, productos, categorías, barberos, reseñas y cobros. Cada cosa con su alta, su edición y su baja.

El dueño no necesita saber programar, ni escribirle al desarrollador cada vez que cambia algo. Entra, toca y la web responde.

Del proyecto Fino's Barbers, desarrollado por ${FIRMA}

${HASH_PANEL} ${HASH_BASE}`,
  },
  {
    archivo: 'social/reels/reel-08-gestion-de-barberos.mp4',
    nombre: 'Reel 8 · Gestión de barberos',
    objetivo: 'Demostrar en vivo lo fácil que es administrar el equipo (alta real en cámara).',
    cta: 'Escribinos por DM',
    caption: `Sumar un barbero al equipo: 30 segundos.

Nombre, especialidad, días de atención, una bio y una foto. Guardás y ya aparece en la web y en el formulario de reserva.

Además, cada barbero puede tener su propia cuenta para ver su agenda. Sin acceso al stock, ni a los cobros, ni a las finanzas.

Del proyecto Fino's Barbers, desarrollado por ${FIRMA}

${HASH_PANEL} ${HASH_BASE}`,
  },
  {
    archivo: 'social/reels/reel-09-agenda-y-calendario.mp4',
    nombre: 'Reel 9 · Agenda y calendario',
    objetivo: 'Mostrar el calendario semanal, que visualmente es de lo mejor del sistema.',
    cta: 'Escribinos por DM',
    caption: `La semana entera, de un vistazo.

Lista de turnos con filtros por estado y por fecha, y un calendario semanal con un color por barbero. Confirmar, cancelar y controlar la seña, todo desde ahí.

Se acabó el cuaderno.

Del proyecto Fino's Barbers, desarrollado por ${FIRMA}

${HASH_TURNOS} ${HASH_PANEL} ${HASH_BASE}`,
  },
  {
    archivo: 'social/reels/reel-10-finanzas.mp4',
    nombre: 'Reel 10 · Panel financiero',
    objetivo: 'Mostrar la parte de gráficos y control financiero. Muy vendible para pymes.',
    cta: 'Escribinos por DM',
    caption: `Cuánto entra y cuánto sale.

Ingresos, egresos y balance del mes y acumulado. Gráficos de los últimos 6 meses y desglose de en qué se va la plata.

Lo mejor: los turnos confirmados y los pedidos pagados se registran solos. No hay que cargar nada a mano.

(Los números que se ven son datos de ejemplo del proyecto.)

Del proyecto Fino's Barbers, desarrollado por ${FIRMA}

${HASH_PANEL} ${HASH_BASE} #finanzas`,
  },
  {
    archivo: 'social/reels/reel-11-experiencia-del-cliente.mp4',
    nombre: 'Reel 11 · Experiencia del cliente',
    objetivo: 'Mostrar el lado del usuario final: no todo es panel de administración.',
    cta: 'Escribinos por DM',
    caption: `El cliente también tiene su panel.

Entra, ve sus turnos, el estado de cada uno, con qué barbero y a qué hora. Y si no puede ir, cancela él mismo.

Un mensaje menos para responder.

Del proyecto Fino's Barbers, desarrollado por ${FIRMA}

${HASH_TURNOS} ${HASH_BASE}`,
  },
  {
    archivo: 'social/reels/reel-12-cobros-y-sena.mp4',
    nombre: 'Reel 12 · Cobros y seña',
    objetivo: 'Atacar un dolor concreto (turnos caídos) con una solución concreta.',
    cta: 'Escribinos por DM',
    caption: `El que reserva y no viene.

La seña lo resuelve: el turno se confirma cuando el cliente paga por adelantado un porcentaje del servicio. Mercado Pago o transferencia, con el estado de cada seña a la vista en el panel.

Y como el cobro está conectado a la cuenta del negocio, la plata entra directo ahí.

Del proyecto Fino's Barbers, desarrollado por ${FIRMA}

${HASH_TURNOS} ${HASH_BASE} #mercadopago`,
  },
  {
    archivo: 'social/reels/reel-13-acceso-por-rol.mp4',
    nombre: 'Reel 13 · Acceso por rol',
    objetivo: 'Mostrar permisos y seguridad, algo que casi nadie muestra y genera confianza.',
    cta: 'Escribinos por DM',
    caption: `Cada uno ve lo suyo.

El dueño ve todo. El barbero entra a su agenda y a la lista de clientes, nada más: no ve el stock, ni los cobros, ni las finanzas. El cliente solo ve sus propios turnos.

Los permisos no son solo pantallas escondidas: están aplicados también en la base de datos.

Del proyecto Fino's Barbers, desarrollado por ${FIRMA}

${HASH_BASE} #seguridad`,
  },
  {
    archivo: 'social/reels/reel-14-responsive.mp4',
    nombre: 'Reel 14 · Responsive',
    objetivo: 'Mostrar que funciona en cualquier pantalla y que se instala como app.',
    cta: 'Escribinos por DM',
    caption: `La misma web, en cualquier pantalla.

En la computadora del local y en el celular del cliente. Y además se puede instalar como app en el teléfono, con su ícono en la pantalla de inicio.

Del proyecto Fino's Barbers, desarrollado por ${FIRMA}

${HASH_BASE} #responsive #pwa`,
  },
]

const POSTS = [
  { archivo: 'social/posts/post-01-proyecto.png', nombre: 'Post 1 · El proyecto',
    objetivo: 'Post de presentación del proyecto. Ideal como primer post del feed.',
    cta: 'Escribinos por DM',
    caption: `Fino's Barbers: una barbería con sistema propio.

Web, turnos online, tienda y panel de gestión. Diseñado y programado por nosotros, de cero.

Es un proyecto desarrollado por andmar.studio y hoy funciona como demo. Si querés verlo andando, escribinos.

${HASH_BASE} ${HASH_TURNOS}` },

  { archivo: 'social/posts/post-02-todo-en-uno.png', nombre: 'Post 2 · Todo en un sistema',
    objetivo: 'Resumir el alcance del sistema en una sola imagen. Muy compartible.',
    cta: 'Escribinos por DM',
    caption: `Turnos, servicios, barberos y tienda en un mismo sistema.

La mayoría de los negocios termina con una app para turnos, una planilla para la plata, Instagram para el catálogo y un cuaderno para el resto.

Nosotros hacemos una sola cosa que hace todo eso.

${HASH_BASE} ${HASH_PANEL}` },

  { archivo: 'social/posts/post-03-turnos.png', nombre: 'Post 3 · Turnos',
    objetivo: 'Explicar el sistema de turnos con una captura real.',
    cta: 'Escribinos por DM',
    caption: `El cliente reserva solo, a cualquier hora.

Elige servicio, barbero y horario. El sistema calcula la duración y muestra únicamente lo que está libre, así no hay dos turnos pisados.

Del proyecto Fino's Barbers, desarrollado por andmar.studio.

${HASH_TURNOS} ${HASH_BASE}` },

  { archivo: 'social/posts/post-04-panel.png', nombre: 'Post 4 · Panel administrativo',
    objetivo: 'Mostrar el panel: el argumento más fuerte para dueños de negocio.',
    cta: 'Escribinos por DM',
    caption: `Todo el negocio, en un panel.

Turnos, servicios, productos, categorías, barberos, reseñas y cobros. Sin depender del programador para cada cambio.

Del proyecto Fino's Barbers, desarrollado por andmar.studio.

${HASH_PANEL} ${HASH_BASE}` },

  { archivo: 'social/posts/post-05-calendario.png', nombre: 'Post 5 · Calendario semanal',
    objetivo: 'Pieza visual fuerte: el calendario es lo que más impresiona de un vistazo.',
    cta: 'Escribinos por DM',
    caption: `La semana entera, de un vistazo.

Calendario semanal con un color por barbero y filtro por profesional. Ideal para negocios con varias personas atendiendo al mismo tiempo.

Del proyecto Fino's Barbers, desarrollado por andmar.studio.

${HASH_TURNOS} ${HASH_PANEL} ${HASH_BASE}` },

  { archivo: 'social/posts/post-06-tienda.png', nombre: 'Post 6 · Tienda online',
    objetivo: 'Mostrar la parte de ecommerce y abrir la puerta a clientes que venden productos.',
    cta: 'Escribinos por DM',
    caption: `Una barbería que también vende online.

Catálogo con buscador, filtros por categoría, stock real y aviso de últimas unidades. Todo dentro de la misma web.

Del proyecto Fino's Barbers, desarrollado por andmar.studio.

${HASH_TIENDA} ${HASH_BASE}` },

  { archivo: 'social/posts/post-07-finanzas.png', nombre: 'Post 7 · Panel financiero',
    objetivo: 'Mostrar los gráficos. Pieza muy vendible para cualquier pyme.',
    cta: 'Escribinos por DM',
    caption: `Cuánto entra y cuánto sale.

Ingresos, egresos y balance mes a mes, con gráficos. Los turnos confirmados y los pedidos pagados se registran solos.

(Los números de la imagen son datos de ejemplo del proyecto.)

Del proyecto Fino's Barbers, desarrollado por andmar.studio.

${HASH_PANEL} ${HASH_BASE}` },

  { archivo: 'social/posts/post-08-roles.png', nombre: 'Post 8 · Permisos por rol',
    objetivo: 'Transmitir seriedad técnica y seguridad.',
    cta: 'Escribinos por DM',
    caption: `Cada uno ve lo suyo.

Administrador, barbero y cliente tienen accesos distintos. Y los permisos no son solo pantallas escondidas: están aplicados también a nivel de base de datos.

Del proyecto Fino's Barbers, desarrollado por andmar.studio.

${HASH_BASE} #seguridad` },

  { archivo: 'social/posts/post-09-que-hacemos.png', nombre: 'Post 9 · Qué hacemos',
    objetivo: 'Post de servicios del estudio. Fijalo en el perfil.',
    cta: 'Escribinos por DM',
    caption: `Hacemos sistemas, no plantillas.

· Webs y landing pages
· Sistemas de turnos
· Tiendas online
· Paneles administrativos
· Automatizaciones

Estamos arrancando, y hacemos productos reales. Si tenés un negocio que ya no entra en una planilla, escribinos.

andmar.studio

${HASH_BASE}` },
]

const CARRUSEL = {
  archivo: 'social/posts/carrusel-turnos/',
  nombre: 'Carrusel · Cómo reserva un cliente (6 placas)',
  objetivo: 'Carrusel educativo paso a paso. Alto guardado y buen alcance.',
  cta: 'Escribinos por DM',
  caption: `Así reserva un cliente. Deslizá →

1. Elige el servicio (con precio y duración)
2. Elige el barbero
3. Elige día y hora, solo entre los horarios libres
4. Confirma con una seña

Cuatro pasos, sin un solo mensaje de WhatsApp de por medio.

Del proyecto Fino's Barbers, desarrollado por andmar.studio.

${HASH_TURNOS} ${HASH_BASE}`,
  placas: [
    'carrusel-turnos-1.png', 'carrusel-turnos-2.png', 'carrusel-turnos-3.png',
    'carrusel-turnos-4.png', 'carrusel-turnos-5.png', 'carrusel-turnos-6.png',
  ],
}

const HISTORIAS = [
  { archivo: 'social/historias/historia-01-problema.png', nombre: 'Historia 1 · Problema',
    secuencia: 'Secuencia A (1/4)', objetivo: 'Abrir la secuencia con un dolor reconocible.', cta: 'Deslizá →',
    texto: 'Sticker sugerido: encuesta "¿Cómo anotás los turnos hoy?" · Cuaderno / WhatsApp / App' },
  { archivo: 'social/historias/historia-02-solucion.png', nombre: 'Historia 2 · Solución',
    secuencia: 'Secuencia A (2/4)', objetivo: 'Presentar la solución en una línea.', cta: 'Deslizá →', texto: '' },
  { archivo: 'social/historias/historia-03-demo.png', nombre: 'Historia 3 · Demostración',
    secuencia: 'Secuencia A (3/4)', objetivo: 'Mostrar el producto real funcionando.', cta: 'Deslizá →',
    texto: 'Alternativa: subir acá el Reel 1 en vez de la imagen.' },
  { archivo: 'social/historias/historia-04-cta.png', nombre: 'Historia 4 · CTA',
    secuencia: 'Secuencia A (4/4)', objetivo: 'Cerrar pidiendo el mensaje.', cta: 'Escribinos por DM',
    texto: 'Sticker sugerido: caja de preguntas "¿Qué necesita tu negocio?"' },
  { archivo: 'social/historias/historia-05-panel.png', nombre: 'Historia 5 · Panel',
    secuencia: 'Suelta', objetivo: 'Reforzar el panel administrativo.', cta: 'Escribinos por DM', texto: '' },
  { archivo: 'social/historias/historia-06-tienda.png', nombre: 'Historia 6 · Tienda',
    secuencia: 'Suelta', objetivo: 'Reforzar el ecommerce.', cta: 'Escribinos por DM', texto: '' },
  { archivo: 'social/historias/historia-07-finanzas.png', nombre: 'Historia 7 · Finanzas',
    secuencia: 'Suelta', objetivo: 'Reforzar el panel financiero.', cta: 'Escribinos por DM', texto: '' },
  { archivo: 'social/historias/historia-08-detras.png', nombre: 'Historia 8 · Detrás del proyecto',
    secuencia: 'Suelta', objetivo: 'Mostrar solidez técnica sin ponerse pesado.', cta: 'Escribinos por DM', texto: '' },
]

const DESTACADAS = [
  { archivo: 'social/destacadas/destacada-proyectos.png', nombre: 'PROYECTOS', objetivo: 'Portada para los trabajos hechos. Empezá con Fino\'s Barbers.' },
  { archivo: 'social/destacadas/destacada-sistemas.png', nombre: 'SISTEMAS', objetivo: 'Portada para sistemas a medida en general.' },
  { archivo: 'social/destacadas/destacada-turnos.png', nombre: 'TURNOS', objetivo: 'Portada específica para el sistema de turnos.' },
  { archivo: 'social/destacadas/destacada-tienda.png', nombre: 'TIENDA', objetivo: 'Portada para ecommerce.' },
  { archivo: 'social/destacadas/destacada-panel.png', nombre: 'PANEL', objetivo: 'Portada para paneles administrativos.' },
  { archivo: 'social/destacadas/destacada-proceso.png', nombre: 'PROCESO', objetivo: 'Portada para mostrar cómo trabajan.' },
  { archivo: 'social/destacadas/destacada-contacto.png', nombre: 'CONTACTO', objetivo: 'Portada para el contacto y presupuestos.' },
]

module.exports = { REELS, POSTS, CARRUSEL, HISTORIAS, DESTACADAS }
